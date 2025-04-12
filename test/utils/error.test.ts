import { describe, expect, it } from 'vitest';
import {
  AppError,
  ValidationError,
  APIError,
  ErrorCode,
  handleError,
  asyncErrorHandler
} from '../../src/utils/error';

describe('Error Utilities', () => {
  describe('AppError', () => {
    it('should create an AppError with default values', () => {
      const error = new AppError('テストエラー');
      expect(error.name).toBe('AppError');
      expect(error.message).toBe('テストエラー');
      expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(error.statusCode).toBe(500);
      expect(error.details).toBeUndefined();
    });

    it('should create an AppError with custom values', () => {
      const details = { field: 'testField' };
      const error = new AppError('テストエラー', ErrorCode.NOT_FOUND, 404, details);
      expect(error.code).toBe(ErrorCode.NOT_FOUND);
      expect(error.statusCode).toBe(404);
      expect(error.details).toEqual(details);
    });

    it('should convert AppError to JSON', () => {
      const details = { field: 'testField' };
      const error = new AppError('テストエラー', ErrorCode.NOT_FOUND, 404, details);
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'AppError',
        message: 'テストエラー',
        code: ErrorCode.NOT_FOUND,
        statusCode: 404,
        details
      });
    });
  });

  describe('ValidationError', () => {
    it('should create a ValidationError with correct defaults', () => {
      const error = new ValidationError('検証エラー');
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('検証エラー');
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(error.statusCode).toBe(400);
    });
  });

  describe('APIError', () => {
    it('should create an APIError with correct defaults', () => {
      const error = new APIError('API接続エラー');
      expect(error.name).toBe('APIError');
      expect(error.message).toBe('API接続エラー');
      expect(error.code).toBe(ErrorCode.API_ERROR);
      expect(error.statusCode).toBe(500);
    });

    it('should create an APIError with custom status code', () => {
      const error = new APIError('APIリソース未検出', 404);
      expect(error.statusCode).toBe(404);
    });
  });

  describe('handleError', () => {
    it('should return the same error if it is an AppError', () => {
      const originalError = new ValidationError('元のエラー');
      const handledError = handleError(originalError);
      expect(handledError).toBe(originalError);
    });

    it('should wrap standard Error in AppError', () => {
      const originalError = new Error('標準エラー');
      const handledError = handleError(originalError);
      expect(handledError).toBeInstanceOf(AppError);
      expect(handledError.message).toBe('標準エラー');
    });

    it('should handle string error messages', () => {
      const handledError = handleError('エラー文字列');
      expect(handledError).toBeInstanceOf(AppError);
      expect(handledError.message).toBe('エラー文字列');
    });

    it('should handle unknown error types', () => {
      const handledError = handleError(123);
      expect(handledError).toBeInstanceOf(AppError);
      expect(handledError.message).toBe('不明なエラーが発生しました');
    });
  });

  describe('asyncErrorHandler', () => {
    it('should pass through successful function results', async () => {
      const successFn = async () => 'success';
      const handled = asyncErrorHandler(successFn);
      await expect(handled()).resolves.toBe('success');
    });

    it('should convert errors to AppErrors', async () => {
      const failFn = async () => {
        throw new Error('非同期エラー');
      };
      const handled = asyncErrorHandler(failFn);
      await expect(handled()).rejects.toBeInstanceOf(AppError);
      await expect(handled()).rejects.toHaveProperty('message', '非同期エラー');
    });
  });
});
