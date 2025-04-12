/**
 * 文字起こし処理APIエンドポイント
 * @module ProcessRoutes
 */
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { startTranscriptProcessing, getTranscriptByJobId } from "../features/transcript/usecase";
import { ProcessTranscriptRequest } from "../features/transcript/domain";

// 環境変数の型定義
interface Env {
  ZOOM_API_KEY: string;
  ZOOM_API_SECRET: string;
  ZOOM_VERIFICATION_TOKEN: string;
  JOB_KV: KVNamespace;
}

// 処理APIのルーター
const app = new Hono<{ Bindings: Env }>();

// 文字起こし処理リクエストのバリデーションスキーマ
const processRequestSchema = z.object({
  jobId: z.string().uuid()
});

/**
 * 文字起こし処理を開始するエンドポイント
 */
app.post("/process-transcript", zValidator("json", processRequestSchema), async (c) => {
  const request = c.req.valid("json") as ProcessTranscriptRequest;
  const env = c.env;

  try {
    const result = await startTranscriptProcessing(env, request);

    if (result.success) {
      return c.json(result, 202); // Accepted
    } else {
      return c.json(result, 400); // Bad Request
    }
  } catch (error) {
    console.error("文字起こし処理の開始に失敗:", error);

    return c.json({
      success: false,
      jobId: request.jobId,
      message: "文字起こし処理の開始に失敗しました",
      error: error instanceof Error ? error.message : "不明なエラー"
    }, 500);
  }
});

/**
 * 文字起こしデータを取得するエンドポイント
 */
app.get("/transcript/:jobId", async (c) => {
  const jobId = c.req.param("jobId");
  const env = c.env;

  try {
    const transcript = await getTranscriptByJobId(env, jobId);

    if (!transcript) {
      return c.json({
        success: false,
        message: `ジョブ ${jobId} の文字起こしデータが見つかりません`
      }, 404);
    }

    return c.json({
      success: true,
      transcript
    });
  } catch (error) {
    console.error(`文字起こしデータ取得エラー (jobId: ${jobId}):`, error);

    return c.json({
      success: false,
      message: "文字起こしデータの取得に失敗しました",
      error: error instanceof Error ? error.message : "不明なエラー"
    }, 500);
  }
});

export default app;
