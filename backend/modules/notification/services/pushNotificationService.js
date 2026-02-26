import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import User from '../../auth/models/User.js';
import Delivery from '../../delivery/models/Delivery.js';
import { getFirebaseCredentials } from '../../../shared/utils/envService.js';

function normalizePrivateKey(privateKey) {
  if (!privateKey || typeof privateKey !== 'string') return privateKey;
  return privateKey.includes('\\n') ? privateKey.replace(/\\n/g, '\n') : privateKey;
}

function dedupeTokens(tokens = []) {
  const seen = new Set();
  return tokens
    .map((token) => (typeof token === 'string' ? token.trim() : ''))
    .filter((token) => token && !seen.has(token) && seen.add(token));
}

async function tryInitializeFirebaseFromEnvOrFile() {
  if (admin.apps.length > 0) return true;

  const credentials = await getFirebaseCredentials();
  let projectId = credentials.projectId || process.env.FIREBASE_PROJECT_ID;
  let clientEmail = credentials.clientEmail || process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = normalizePrivateKey(credentials.privateKey || process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    const candidates = [
      process.env.FIREBASE_SERVICE_ACCOUNT_PATH
        ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
        : null,
      path.resolve(process.cwd(), 'config', 'firebase-service-account.json'),
      path.resolve(process.cwd(), 'config', 'zomato-607fa-firebase-adminsdk-fbsvc-f5f782c2cc.json'),
      path.resolve(process.cwd(), 'firebaseconfig.json')
    ].filter(Boolean);

    for (const candidatePath of candidates) {
      try {
        if (!fs.existsSync(candidatePath)) continue;
        const raw = fs.readFileSync(candidatePath, 'utf-8');
        const json = JSON.parse(raw);
        projectId = projectId || json.project_id;
        clientEmail = clientEmail || json.client_email;
        privateKey = privateKey || normalizePrivateKey(json.private_key);
        if (projectId && clientEmail && privateKey) break;
      } catch {
        // Continue trying next candidate file.
      }
    }
  }

  if (!projectId || !clientEmail || !privateKey) return false;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey
    })
  });
  return true;
}

export async function ensureFirebaseMessagingReady() {
  try {
    if (admin.apps.length > 0) return true;
    return await tryInitializeFirebaseFromEnvOrFile();
  } catch (error) {
    if (error?.code === 'app/duplicate-app') return true;
    return false;
  }
}

export async function sendPushNotificationToAudience({
  audience,
  title,
  body,
  data = {}
}) {
  const isReady = await ensureFirebaseMessagingReady();
  if (!isReady) {
    return {
      success: false,
      message: 'Firebase Admin is not configured for messaging.',
      sentCount: 0,
      totalTokens: 0,
      failedTokens: []
    };
  }

  let docs = [];
  if (audience === 'delivery') {
    docs = await Delivery.find({}, { fcmTokenWeb: 1, fcmTokenMobile: 1 }).lean();
  } else {
    docs = await User.find({ role: 'user' }, { fcmTokenWeb: 1, fcmTokenMobile: 1 }).lean();
  }

  const allTokens = dedupeTokens(
    docs.flatMap((doc) => [doc.fcmTokenWeb, doc.fcmTokenMobile])
  );

  if (allTokens.length === 0) {
    return {
      success: true,
      message: `No ${audience} FCM tokens found.`,
      sentCount: 0,
      totalTokens: 0,
      failedTokens: []
    };
  }

  const message = {
    tokens: allTokens,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data).map(([k, v]) => [String(k), String(v ?? '')])
    )
  };

  const response = await admin.messaging().sendEachForMulticast(message);
  const failedTokens = [];
  response.responses.forEach((r, i) => {
    if (!r.success) failedTokens.push(allTokens[i]);
  });

  return {
    success: response.successCount > 0,
    sentCount: response.successCount,
    failedCount: response.failureCount,
    totalTokens: allTokens.length,
    failedTokens
  };
}
