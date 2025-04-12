/**
 * データバリデーション機能を提供します
 * @module ValidationUtils
 */
import { ValidationError } from './error';

/**
 * バリデーションルールのインターフェース
 */
interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
}

/**
 * バリデーション結果のインターフェース
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 値が空でないことを確認します
 * @param value 検証する値
 * @param fieldName フィールド名（エラーメッセージ用）
 * @throws {ValidationError} 値が空の場合
 */
export function validateRequired<T>(value: T, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName}は必須項目です`, { field: fieldName });
  }
}

/**
 * 文字列の長さを検証します
 * @param value 検証する文字列
 * @param min 最小長
 * @param max 最大長
 * @param fieldName フィールド名（エラーメッセージ用）
 * @throws {ValidationError} 文字列の長さが範囲外の場合
 */
export function validateLength(value: string, min: number, max: number, fieldName: string): void {
  if (value.length < min || value.length > max) {
    throw new ValidationError(`${fieldName}は${min}文字以上${max}文字以下である必要があります`, {
      field: fieldName,
      min,
      max,
      actual: value.length,
    });
  }
}

/**
 * メールアドレスの形式を検証します
 * @param email 検証するメールアドレス
 * @returns 検証結果
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * URLの形式を検証します
 * @param url 検証するURL
 * @returns 検証結果
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * 数値の範囲を検証します
 * @param value 検証する数値
 * @param min 最小値
 * @param max 最大値
 * @param fieldName フィールド名（エラーメッセージ用）
 * @throws {ValidationError} 数値が範囲外の場合
 */
export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): void {
  if (value < min || value > max) {
    throw new ValidationError(`${fieldName}は${min}から${max}までの範囲である必要があります`, {
      field: fieldName,
      min,
      max,
      actual: value,
    });
  }
}

/**
 * 複数のルールで値を検証します
 * @param value 検証する値
 * @param rules 検証ルールのリスト
 * @returns 検証結果
 */
export function validate<T>(value: T, rules: ValidationRule<T>[]): ValidationResult {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.validate(value)) {
      errors.push(rule.message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * オブジェクトのプロパティを検証します
 * @param obj 検証するオブジェクト
 * @param schema 検証スキーマ
 * @returns 検証エラーのリスト
 */
export function validateObject<T extends Record<string, any>>(
  obj: T,
  schema: Record<keyof T, (value: any) => boolean | void>
): string[] {
  const errors: string[] = [];

  for (const key in schema) {
    if (Object.prototype.hasOwnProperty.call(schema, key)) {
      try {
        const result = schema[key](obj[key]);
        if (result === false) {
          errors.push(`${String(key)}の値が無効です`);
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push(error.message);
        } else if (error instanceof Error) {
          errors.push(error.message);
        }
      }
    }
  }

  return errors;
}
