/**
 * Clean environment-based logging for the frontend React app.
 * 
 * - In development: Info and debug logs are executed.
 * - In production (vite prod mode): Only critical logs are executed.
 */
// Provide a safe fallback if import.meta.env is undefined in some scopes
const isDev = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.DEV : process.env.NODE_ENV !== 'production';

export const Logger = {
  info: (message, ...options) => {
    if (isDev) {
      console.log(`[INFO] ${message}`, ...options);
    }
  },
  
  prod: (message, ...options) => {
    console.log(`[SYS] ${message}`, ...options);
  },

  debug: (message, ...options) => {
    if (isDev) {
      console.log(`[DEBUG] ${message}`, ...options);
    }
  },

  error: (message, error) => {
    console.error(`[ERROR] ${message}`, error || '');
  },

  warn: (message, ...options) => {
    console.warn(`[WARN] ${message}`, ...options);
  }
};
