/**
 * 文字起こし処理に関連するドメインモデルと型定義
 * @module TranscriptDomain
 */

/**
 * VTTファイルの文字起こしエントリ
 */
export interface TranscriptEntry {
  startTime: string; // 開始時間 (HH:MM:SS.mmm)
  endTime: string; // 終了時間 (HH:MM:SS.mmm)
  speaker?: string; // 話者名（存在する場合）
  text: string; // 発言内容
}

/**
 * 構造化された文字起こしデータ
 */
export interface StructuredTranscript {
  metadata: TranscriptMetadata;
  entries: TranscriptEntry[];
  rawText: string; // 全テキストを結合した生データ
}

/**
 * 文字起こしメタデータ
 */
export interface TranscriptMetadata {
  meetingUuid: string;
  meetingTopic?: string;
  meetingDate?: string;
  durationSeconds?: number;
  speakerCount?: number;
  speakers?: string[];
}

/**
 * 文字起こし処理リクエスト
 */
export interface ProcessTranscriptRequest {
  jobId: string;
}

/**
 * 文字起こし処理結果
 */
export interface ProcessTranscriptResult {
  success: boolean;
  jobId: string;
  transcript?: StructuredTranscript;
  error?: string;
  processingTimeMs?: number;
}

/**
 * VTTファイルの解析オプション
 */
export interface VttParseOptions {
  extractSpeakers?: boolean; // 話者名を抽出するかどうか
  combineLines?: boolean; // 同一話者の連続した発言を結合するかどうか
  removeFiller?: boolean; // フィラーワードを除去するかどうか
}
