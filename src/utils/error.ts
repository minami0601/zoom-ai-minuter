/**
 * アプリケーションのエラー定義とエラーハンドリング機能を提供します
 * @module ErrorUtils
 */

/**
 * アプリケーション内で使用するエラーコード
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * アプリケーション基本エラークラス
 */
export class AppError extends Error {
  code: ErrorCode;
  statusCode: number;
  details?: Record<string, any>;

  /**
   * AppErrorのコンストラクタ
   * @param message エラーメッセージ
   * @param code エラーコード
   * @param statusCode HTTPステータスコード
   * @param details 追加のエラー詳細
   */
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    statusCode: number = 500,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Errorオブジェクトのプロトタイプチェーンを正しく設定
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * エラーオブジェクトをJSON形式に変換
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
    };
  }
}

/**
 * バリデーションエラークラス
 */
export class ValidationError extends AppError {
  /**
   * ValidationErrorのコンストラクタ
   * @param message エラーメッセージ
   * @param details バリデーションエラーの詳細
   */
  constructor(message: string, details?: Record<string, any>) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
    this.name = 'ValidationError';

    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * API関連エラークラス
 */
export class APIError extends AppError {
  /**
   * APIErrorのコンストラクタ
   * @param message エラーメッセージ
   * @param statusCode HTTPステータスコード
   * @param details APIエラーの詳細
   */
  constructor(message: string, statusCode: number = 500, details?: Record<string, any>) {
    super(message, ErrorCode.API_ERROR, statusCode, details);
    this.name = 'APIError';

    Object.setPrototypeOf(this, APIError.prototype);
  }
}

/**
 * エラーハンドラ関数
 * エラーオブジェクトをキャッチして適切な形式に変換します
 * @param error キャッチしたエラー
 * @returns 統一されたエラーオブジェクト
 */
export const handleError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message);
  }

  return new AppError(
    typeof error === 'string' ? error : '不明なエラーが発生しました'
  );
};

/**
 * 非同期エラーをキャッチするための高階関数
 * @param fn 非同期関数
 * @returns エラーをハンドルする非同期関数
 */
export const asyncErrorHandler = <T, A extends any[]>(
  fn: (...args: A) => Promise<T>
) => {
  return async (...args: A): Promise<T> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw handleError(error);
    }
  };
};
