/**
 * 会議分類機能のドメインモデルと型定義
 * @module ClassificationDomain
 */

/**
 * 会議分類カテゴリ
 */
export enum MeetingCategory {
  INTERNAL_MEETING = 'internalMeeting', // 業務ミーティング
  SMALL_TALK = 'smallTalk', // 雑談
  PRIVATE = 'private', // プライベート
  OTHER = 'other', // その他
}

/**
 * 会議分類結果インターフェース
 */
export interface ClassificationResult {
  category: MeetingCategory;
  reason: string;
  rawText?: string;
  timestamp: string;
}

/**
 * 会議分類リクエスト
 */
export interface ClassifyMeetingRequest {
  jobId: string;
  text?: string; // テキストを直接指定する場合（オプション）
}

/**
 * 会議テキスト分類オプション
 */
export interface ClassificationOptions {
  maxTextLength?: number; // 分類に使用するテキストの最大長
  sampleMethod?: 'start' | 'middle' | 'end' | 'random' | 'all'; // テキストサンプリング方法
  minConfidence?: number; // 分類信頼度の最小値
}

/**
 * 処理続行が必要なカテゴリかどうかを判定
 * @param category 会議カテゴリ
 * @returns 処理を続行すべきかどうか
 */
export function shouldProcessMeeting(category: MeetingCategory): boolean {
  // 業務ミーティングのみ処理を続行
  return category === MeetingCategory.INTERNAL_MEETING;
}

/**
 * 文字列からMeetingCategoryへの変換
 * @param categoryStr カテゴリ文字列
 * @returns MeetingCategory型の値
 */
export function parseMeetingCategory(categoryStr: string): MeetingCategory {
  // 大文字小文字を無視して比較
  const normalizedCategory = categoryStr.toLowerCase();

  if (normalizedCategory.includes('internal') || normalizedCategory.includes('business')) {
    return MeetingCategory.INTERNAL_MEETING;
  } else if (normalizedCategory.includes('small') || normalizedCategory.includes('chat')) {
    return MeetingCategory.SMALL_TALK;
  } else if (normalizedCategory.includes('private') || normalizedCategory.includes('personal')) {
    return MeetingCategory.PRIVATE;
  } else {
    return MeetingCategory.OTHER;
  }
}
