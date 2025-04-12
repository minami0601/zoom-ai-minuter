/**
 * Zoom Webhook処理に関連するドメインモデルと型定義
 * @module WebhookDomain
 */
import { z } from "zod";

/**
 * サポートするZoom Webhookイベントタイプ
 */
export enum ZoomEventType {
  RECORDING_TRANSCRIPT_COMPLETED = "recording.transcript_completed",
}

/**
 * Zoom録画ファイル情報インターフェース
 */
export interface ZoomRecordingFile {
  id: string;
  file_type: string;
  recording_type: string;
  download_url: string;
  status: string;
  recording_start: string;
  recording_end: string;
  file_name?: string;
}

/**
 * Zoom Webhookペイロードインターフェース
 */
export interface ZoomWebhookPayload {
  event: string;
  payload: {
    object: {
      uuid: string;
      id: string;
      topic: string;
      host_id: string;
      start_time: string;
      duration: number;
      recording_files?: ZoomRecordingFile[];
    };
  };
  download_token: string;
  event_ts: number;
}

/**
 * Webhook検証リクエスト
 */
export interface WebhookVerificationRequest {
  payload: ArrayBuffer;
  signature: string;
  timestamp: string;
}

/**
 * Webhook処理レスポンス
 */
export interface WebhookProcessingResponse {
  success: boolean;
  message: string;
  jobId?: string;
}

/**
 * Zoom Webhookペイロードのバリデーションスキーマ
 */
export const zoomWebhookSchema = z.object({
  event: z.string(),
  payload: z.object({
    object: z.object({
      uuid: z.string(),
      id: z.string().or(z.number().transform(n => String(n))),
      topic: z.string(),
      host_id: z.string(),
      start_time: z.string(),
      duration: z.number(),
      recording_files: z.array(
        z.object({
          id: z.string(),
          file_type: z.string(),
          recording_type: z.string(),
          download_url: z.string(),
          status: z.string(),
          recording_start: z.string(),
          recording_end: z.string(),
          file_name: z.string().optional(),
        })
      ).optional(),
    }),
  }),
  download_token: z.string(),
  event_ts: z.number(),
});

/**
 * 文字起こしファイルを含むかどうかをチェックする
 * @param payload Webhookペイロード
 * @returns 文字起こしファイルがあればtrue
 */
export function hasTranscriptFile(payload: ZoomWebhookPayload): boolean {
  return payload.payload.object.recording_files?.some(
    file => file.file_type === "TRANSCRIPT"
  ) ?? false;
}

/**
 * 特定のイベントタイプかどうかをチェックする
 * @param eventType チェックするイベントタイプ
 * @param payload Webhookペイロード
 * @returns 指定されたイベントタイプであればtrue
 */
export function isEventType(
  eventType: ZoomEventType,
  payload: ZoomWebhookPayload
): boolean {
  return payload.event === eventType;
}

/**
 * 文字起こし完了イベントかどうかをチェックする
 * @param payload Webhookペイロード
 * @returns 文字起こし完了イベントであればtrue
 */
export function isTranscriptCompletedEvent(payload: ZoomWebhookPayload): boolean {
  return (
    isEventType(ZoomEventType.RECORDING_TRANSCRIPT_COMPLETED, payload) &&
    hasTranscriptFile(payload)
  );
}
