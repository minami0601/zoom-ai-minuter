/**
 * 日付操作ユーティリティを提供します
 * @module DateUtils
 */
import {
  addDays,
  addMonths,
  addYears,
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  endOfDay,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isEqual,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { ja } from 'date-fns/locale';

/**
 * 日付フォーマットの種類
 */
export enum DateFormat {
  /** YYYY/MM/DD */
  DATE_SLASH = 'yyyy/MM/dd',
  /** YYYY-MM-DD */
  DATE_HYPHEN = 'yyyy-MM-dd',
  /** YYYY年MM月DD日 */
  DATE_JP = 'yyyy年MM月dd日',
  /** HH:mm */
  TIME = 'HH:mm',
  /** HH:mm:ss */
  TIME_WITH_SECONDS = 'HH:mm:ss',
  /** YYYY/MM/DD HH:mm */
  DATETIME_SLASH = 'yyyy/MM/dd HH:mm',
  /** YYYY-MM-DD HH:mm */
  DATETIME_HYPHEN = 'yyyy-MM-dd HH:mm',
  /** YYYY年MM月DD日 HH時mm分 */
  DATETIME_JP = 'yyyy年MM月dd日 HH時mm分',
  /** iso8601 */
  ISO = "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
}

/**
 * 日付を指定されたフォーマットの文字列に変換します
 * @param date 日付オブジェクト
 * @param formatStr フォーマット文字列
 * @returns フォーマットされた日付文字列
 */
export function formatDate(date: Date, formatStr: string = DateFormat.DATE_SLASH): string {
  return format(date, formatStr, { locale: ja });
}

/**
 * 指定されたフォーマットの文字列をDateオブジェクトに変換します
 * @param dateStr 日付文字列
 * @param formatStr フォーマット文字列
 * @returns Dateオブジェクト
 */
export function parseDate(dateStr: string, formatStr: string = DateFormat.DATE_SLASH): Date {
  return parse(dateStr, formatStr, new Date());
}

/**
 * 日付が有効かどうかをチェックします
 * @param date チェックする日付
 * @returns 有効な日付であればtrue
 */
export function isValidDate(date: any): boolean {
  if (date instanceof Date) {
    return isValid(date);
  }

  if (typeof date === 'string') {
    try {
      return isValid(new Date(date));
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * 2つの日付間の日数差を計算します
 * @param dateLeft 比較元の日付
 * @param dateRight 比較先の日付
 * @returns 日数差
 */
export function getDayDifference(dateLeft: Date, dateRight: Date): number {
  return differenceInDays(dateLeft, dateRight);
}

/**
 * 指定された日付に日数を加算します
 * @param date 元の日付
 * @param days 加算する日数
 * @returns 加算後の日付
 */
export function addDaysToDate(date: Date, days: number): Date {
  return addDays(date, days);
}

/**
 * 指定された日付に月数を加算します
 * @param date 元の日付
 * @param months 加算する月数
 * @returns 加算後の日付
 */
export function addMonthsToDate(date: Date, months: number): Date {
  return addMonths(date, months);
}

/**
 * 日付が範囲内かどうかをチェックします
 * @param date チェックする日付
 * @param startDate 範囲の開始日
 * @param endDate 範囲の終了日
 * @returns 範囲内であればtrue
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return (
    (isAfter(date, startDate) || isEqual(date, startDate)) &&
    (isBefore(date, endDate) || isEqual(date, endDate))
  );
}

/**
 * 日付を日本語の曜日表記で取得します
 * @param date 日付
 * @returns 日本語の曜日文字列
 */
export function getJapaneseDayOfWeek(date: Date): string {
  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
  return daysOfWeek[date.getDay()];
}

/**
 * 相対的な時間表記を取得します（例: 3時間前、2日後）
 * @param date 対象の日付
 * @param baseDate 基準日（デフォルトは現在時刻）
 * @returns 相対的な時間表記
 */
export function getRelativeTimeString(date: Date, baseDate: Date = new Date()): string {
  const diffMinutes = differenceInMinutes(date, baseDate);
  const diffHours = differenceInHours(date, baseDate);
  const diffDays = differenceInDays(date, baseDate);

  if (diffMinutes === 0) {
    return 'たった今';
  }

  if (diffMinutes < 0) {
    // 過去
    if (diffMinutes > -60) return `${Math.abs(diffMinutes)}分前`;
    if (diffHours > -24) return `${Math.abs(diffHours)}時間前`;
    return `${Math.abs(diffDays)}日前`;
  } else {
    // 未来
    if (diffMinutes < 60) return `${diffMinutes}分後`;
    if (diffHours < 24) return `${diffHours}時間後`;
    return `${diffDays}日後`;
  }
}

/**
 * 日付の開始時刻（00:00:00）を取得します
 * @param date 対象の日付
 * @returns 日付の開始時刻
 */
export function getStartOfDay(date: Date): Date {
  return startOfDay(date);
}

/**
 * 日付の終了時刻（23:59:59.999）を取得します
 * @param date 対象の日付
 * @returns 日付の終了時刻
 */
export function getEndOfDay(date: Date): Date {
  return endOfDay(date);
}

/**
 * 月の初日を取得します
 * @param date 対象の日付
 * @returns 月の初日
 */
export function getStartOfMonth(date: Date): Date {
  return startOfMonth(date);
}

/**
 * 月の最終日を取得します
 * @param date 対象の日付
 * @returns 月の最終日
 */
export function getEndOfMonth(date: Date): Date {
  return endOfMonth(date);
}
