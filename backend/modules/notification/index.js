import express from 'express';
import { authenticate } from '../auth/middleware/auth.js';
import { authenticate as authenticateDelivery } from '../delivery/middleware/deliveryAuth.js';
import { authenticateAdmin } from '../admin/middleware/adminAuth.js';
import {
  saveUserFcmToken,
  saveDeliveryFcmToken,
  sendAdminPushNotification
} from './controllers/notificationController.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({ success: true, message: 'Notification module is running' });
});

router.post('/user/token', authenticate, saveUserFcmToken);
router.post('/delivery/token', authenticateDelivery, saveDeliveryFcmToken);
router.post('/admin/send', authenticateAdmin, sendAdminPushNotification);

export default router;

