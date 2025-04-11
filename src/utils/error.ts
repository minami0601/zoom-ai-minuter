// エラーハンドリングユーティリティ
export class AppError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
  }
}

// エラーレスポンスを生成する関数
export const createErrorResponse = (error: Error, statusCode = 500) => {
  const code = error instanceof AppError ? error.statusCode : statusCode;
  return {
    success: false,
    error: error.message,
    statusCode: code,
    timestamp: new Date().toISOString(),
  };
};
