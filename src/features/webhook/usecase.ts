/**
 * Zoom Webhook処理のユースケース
 * @module WebhookUsecase
 */
import { createZoomClient } from "../../lib/zoom";
import { createJob } from "../job/usecase";
import { asyncErrorHandler } from "../../utils/error";
import { CreateJobRequest } from "../job/domain";
import {
  WebhookVerificationRequest,
  WebhookProcessingResponse,
  ZoomWebhookPayload,
  isTranscriptCompletedEvent,
  zoomWebhookSchema,
} from "./domain";

/**
 * Zoom Webhookの署名を検証する
 * @param env 環境変数
 * @param req Webhook検証リクエスト
 * @returns 検証結果
 */
export const verifyWebhookSignature = asyncErrorHandler(
  async (
    env: { ZOOM_API_KEY: string; ZOOM_API_SECRET: string; ZOOM_VERIFICATION_TOKEN: string },
    req: WebhookVerificationRequest
  ): Promise<boolean> => {
    const zoomClient = createZoomClient(env);
    return await zoomClient.verifyWebhook(
      req.signature,
      req.timestamp,
      req.payload
    );
  }
);

/**
 * Webhookペイロードを解析してバリデーションを行う
 * @param payload Webhookペイロード（文字列）
 * @returns バリデーション済みのペイロードオブジェクト
 */
export const parseAndValidateWebhookPayload = asyncErrorHandler(
  async (payload: string): Promise<ZoomWebhookPayload> => {
    const jsonData = JSON.parse(payload);
    return zoomWebhookSchema.parse(jsonData) as ZoomWebhookPayload;
  }
);

/**
 * Zoom Webhookイベントを処理する
 * @param env 環境変数
 * @param payload バリデーション済みWebhookペイロード
 * @returns 処理結果
 */
export const processWebhookEvent = asyncErrorHandler(
  async (
    env: { JOB_KV: KVNamespace },
    payload: ZoomWebhookPayload
  ): Promise<WebhookProcessingResponse> => {
    // 文字起こし完了イベント以外は処理しない
    if (!isTranscriptCompletedEvent(payload)) {
      return {
        success: true,
        message: "イベントタイプが処理対象外のため無視しました",
      };
    }

    // ジョブ作成リクエストの作成
    const jobRequest: CreateJobRequest = {
      payload: {
        object: payload.payload.object,
      },
      downloadToken: payload.download_token,
    };

    // ジョブの作成
    const jobId = await createJob(env, jobRequest);

    // 成功レスポンス
    return {
      success: true,
      message: "Webhook正常に処理され、ジョブが作成されました",
      jobId,
    };
  }
);

/**
 * Webhookを受信して処理する主要ユースケース
 * @param env 環境変数
 * @param verificationReq Webhook検証リクエスト
 * @param payloadText Webhookペイロードテキスト
 * @returns 処理結果
 */
export const handleZoomWebhook = asyncErrorHandler(
  async (
    env: { ZOOM_API_KEY: string; ZOOM_API_SECRET: string; ZOOM_VERIFICATION_TOKEN: string; JOB_KV: KVNamespace },
    verificationReq: WebhookVerificationRequest,
    payloadText: string
  ): Promise<WebhookProcessingResponse> => {
    // 1. Webhookの署名を検証
    const isValid = await verifyWebhookSignature(env, verificationReq);
    if (!isValid) {
      return {
        success: false,
        message: "Webhook署名の検証に失敗しました",
      };
    }

    // 2. ペイロードを解析してバリデーション
    const payload = await parseAndValidateWebhookPayload(payloadText);

    // 3. Webhookイベントの処理
    return await processWebhookEvent(env, payload);
  }
);
