/**
 * データフォーマット変換ユーティリティを提供します
 * @module FormatUtils
 */

/**
 * 文字列をキャメルケースに変換します
 * @param str 変換する文字列
 * @returns キャメルケースの文字列
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
    .replace(/^(.)/, (c) => c.toLowerCase());
}

/**
 * 文字列をスネークケースに変換します
 * @param str 変換する文字列
 * @returns スネークケースの文字列
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * 文字列をケバブケースに変換します
 * @param str 変換する文字列
 * @returns ケバブケースの文字列
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * 文字列の先頭を大文字にします
 * @param str 変換する文字列
 * @returns 先頭が大文字の文字列
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 文字列の先頭を小文字にします
 * @param str 変換する文字列
 * @returns 先頭が小文字の文字列
 */
export function uncapitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * 数値を通貨形式にフォーマットします
 * @param value 変換する数値
 * @param locale ロケール（デフォルトは日本語）
 * @param currency 通貨コード（デフォルトは日本円）
 * @returns 通貨形式の文字列
 */
export function formatCurrency(
  value: number,
  locale: string = 'ja-JP',
  currency: string = 'JPY'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * 数値をパーセント形式にフォーマットします
 * @param value 変換する数値（0-1の範囲）
 * @param locale ロケール（デフォルトは日本語）
 * @param digits 小数点以下の桁数
 * @returns パーセント形式の文字列
 */
export function formatPercent(
  value: number,
  locale: string = 'ja-JP',
  digits: number = 0
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * 数値を区切り文字入りにフォーマットします
 * @param value 変換する数値
 * @param locale ロケール（デフォルトは日本語）
 * @returns 区切り文字入りの数値文字列
 */
export function formatNumber(value: number, locale: string = 'ja-JP'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * 文字列を指定された長さに切り詰めます
 * @param str 切り詰める文字列
 * @param length 最大長
 * @param suffix 省略記号（デフォルトは...）
 * @returns 切り詰められた文字列
 */
export function truncate(str: string, length: number, suffix: string = '...'): string {
  if (!str) return str;
  if (str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
}

/**
 * オブジェクトのキーをキャメルケースに変換します
 * @param obj 変換するオブジェクト
 * @returns キーがキャメルケースのオブジェクト
 */
export function keysToCamelCase<T = any>(obj: Record<string, any>): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => keysToCamelCase(item)) as any;
  } else if (obj !== null && obj !== undefined && typeof obj === 'object') {
    const result: Record<string, any> = {};
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      const newKey = toCamelCase(key);
      result[newKey] = keysToCamelCase(value);
    });
    return result as T;
  }
  return obj as T;
}

/**
 * オブジェクトのキーをスネークケースに変換します
 * @param obj 変換するオブジェクト
 * @returns キーがスネークケースのオブジェクト
 */
export function keysToSnakeCase<T = any>(obj: Record<string, any>): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => keysToSnakeCase(item)) as any;
  } else if (obj !== null && obj !== undefined && typeof obj === 'object') {
    const result: Record<string, any> = {};
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      const newKey = toSnakeCase(key);
      result[newKey] = keysToSnakeCase(value);
    });
    return result as T;
  }
  return obj as T;
}

/**
 * 文字列を指定された長さになるように左側にパディングします
 * @param str パディングする文字列
 * @param length 目標の長さ
 * @param char パディング文字（デフォルトは空白）
 * @returns パディングされた文字列
 */
export function padLeft(str: string, length: number, char: string = ' '): string {
  return str.padStart(length, char);
}

/**
 * 文字列を指定された長さになるように右側にパディングします
 * @param str パディングする文字列
 * @param length 目標の長さ
 * @param char パディング文字（デフォルトは空白）
 * @returns パディングされた文字列
 */
export function padRight(str: string, length: number, char: string = ' '): string {
  return str.padEnd(length, char);
}
