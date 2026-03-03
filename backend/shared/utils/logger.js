const isDev = process.env.NODE_ENV !== 'production';

/**
 * Clean environment-based logging for the MERN Stack.
 * 
 * - In development: Info and debug logs show up.
 * - In production: Only critical logs and errors show up.
 */
export const Logger = {
  info: (message, ...options) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, ...options);
    }
  },
  
  prod: (message, ...options) => {
    // Explicitly kept for production
    console.log(`[SYS] ${message}`, ...options);
  },

  debug: (message, ...options) => {
    if (isDev) {
      console.log(`[DEBUG] ${message}`, ...options);
    }
  },

  error: (message, error) => {
    // Always log errors
    console.error(`[ERROR] ${message}`, error || '');
  },
  
  warn: (message, ...options) => {
    console.warn(`[WARN] ${message}`, ...options);
  }
};
