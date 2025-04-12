/**
 * 会議要約機能のドメインモデルと型定義
 * @module SummarizationDomain
 */
import { MeetingCategory } from "../classification/domain";
import { TranscriptEntry } from "../transcript/domain";

/**
 * 要約リクエスト
 */
export interface SummarizeRequest {
  jobId: string;
  fullText?: string; // テキストを直接指定する場合（オプション）
  transcriptEntries?: TranscriptEntry[]; // 文字起こしエントリを直接指定する場合
  meetingDate?: string; // 会議日時
  meetingTopic?: string; // 会議タイトル
}

/**
 * 全体要約結果
 */
export interface GlobalSummary {
  purpose: string; // 会議の目的
  participants: string[]; // 参加者リスト
  date: string; // 会議日時
  location: string; // 開催場所（通常はオンライン）
  summary: string; // 会議全体の要約
  decisions: string[]; // 決定事項リスト
  actionItems: ActionItem[]; // アクションアイテムリスト
  rawMarkdown: string; // 生成された元のマークダウン
}

/**
 * テキストチャンク
 */
export interface TextChunk {
  id: number; // チャンクID
  text: string; // チャンクテキスト
  startTime?: string; // チャンク内の最初の発言時間
  endTime?: string; // チャンク内の最後の発言時間
  speakers?: string[]; // チャンク内の話者リスト
}

/**
 * アクションアイテム
 */
export interface ActionItem {
  task: string; // タスク内容
  assignee?: string; // 担当者
  dueDate?: string; // 期限
  priority?: 'high' | 'medium' | 'low'; // 優先度
}

/**
 * 会議トピック
 */
export interface MeetingTopic {
  id: number; // トピックID
  title: string; // トピック名
  startTime: string; // 開始時間
  endTime: string; // 終了時間
  speakers: string[]; // 発言者リスト
  summary: string; // トピックの要約
  keyPoints: string[]; // 重要ポイント
}

/**
 * 会議タイムライン
 */
export interface MeetingTimeline {
  topics: MeetingTopic[]; // トピックリスト
  rawMarkdown: string; // 生成されたマークダウン
}

/**
 * 議事録データ
 */
export interface MinutesData {
  meetingTitle: string; // 会議タイトル
  meetingDate: string; // 会議日時
  meetingCategory: MeetingCategory; // 会議カテゴリ
  meetingDuration: number; // 会議時間（分）
  participantCount: number; // 参加者数
  participants: string[]; // 参加者リスト
  globalSummary: GlobalSummary; // 全体要約
  timeline: MeetingTimeline; // タイムライン
  generatedAt: string; // 生成日時
}

/**
 * 要約生成オプション
 */
export interface SummarizationOptions {
  chunkSize?: number; // チャンクサイズ（文字数）
  chunkOverlap?: number; // チャンク間のオーバーラップ（文字数）
  maxTopics?: number; // 最大トピック数
  language?: 'ja' | 'en'; // 出力言語
  includeTimestamps?: boolean; // タイムスタンプを含めるか
  includeSpeakers?: boolean; // 話者名を含めるか
}

/**
 * 要約生成結果
 */
export interface SummarizationResult {
  success: boolean;
  jobId: string;
  minutes?: MinutesData;
  error?: string;
  processingTimeMs?: number;
}

/**
 * AIモデル処理制限
 */
export const AI_MODEL_LIMITS = {
  maxInputTokens: 30000, // 約15,000語または120,000文字
  maxOutputTokens: 8192, // 約4,000語または16,000文字
  defaultChunkSize: 8000, // 文字数
  defaultChunkOverlap: 500, // 文字数
};

/**
 * デフォルトの要約オプション
 */
export const DEFAULT_SUMMARIZATION_OPTIONS: SummarizationOptions = {
  chunkSize: AI_MODEL_LIMITS.defaultChunkSize,
  chunkOverlap: AI_MODEL_LIMITS.defaultChunkOverlap,
  maxTopics: 5,
  language: 'ja',
  includeTimestamps: true,
  includeSpeakers: true,
};
