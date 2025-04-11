/**
 * シンプルなロギングユーティリティ
 */
export const logger = {
  info: (message: string, data?: unknown) => {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data) : '');
  },

  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error instanceof Error ? error.stack : error);
  },

  warn: (message: string, data?: unknown) => {
    console.warn(`[WARN] ${message}`, data ? JSON.stringify(data) : '');
  },

  debug: (message: string, data?: unknown) => {
    if (process.env.DEBUG === 'true') {
      console.debug(`[DEBUG] ${message}`, data ? JSON.stringify(data) : '');
    }
  }
};
