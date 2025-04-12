/**
 * Zoom Webhook APIエンドポイント
 * @module WebhookRoutes
 */
import { Hono } from 'hono';
import type { WebhookVerificationRequest } from '../features/webhook/domain';
import { handleZoomWebhook } from '../features/webhook/usecase';

// 環境変数の型定義
interface Env {
  ZOOM_API_KEY: string;
  ZOOM_API_SECRET: string;
  ZOOM_VERIFICATION_TOKEN: string;
  JOB_KV: KVNamespace;
}

// Webhook関連APIのルーター
const app = new Hono<{ Bindings: Env }>();

// Zoom Webhook受信エンドポイント
app.post('/zoom-webhook', async (c) => {
  try {
    // リクエストヘッダーから署名と時刻を取得
    const signature = c.req.header('x-zm-signature') || '';
    const timestamp = c.req.header('x-zm-request-timestamp') || '';

    // リクエストボディを取得（ArrayBuffer形式）
    const payload = await c.req.arrayBuffer();

    // リクエストボディをテキストに変換
    const payloadText = new TextDecoder().decode(payload);

    // 安全にJSONをパース
    let eventType = '不明';
    try {
      const jsonData = JSON.parse(payloadText);
      eventType = jsonData.event || 'イベント情報なし';
    } catch (jsonError) {
      console.warn('Webhookペイロードの解析に失敗しました:', jsonError);
      eventType = '無効なJSON形式';
    }

    // ログ出力
    console.log('Zoom Webhook受信:', {
      signature: signature.substring(0, 10) + '...',
      timestamp,
      event: eventType,
    });

    // 検証用リクエストオブジェクト作成
    const verificationReq: WebhookVerificationRequest = {
      payload,
      signature,
      timestamp,
    };

    // Webhookハンドラの呼び出し
    const result = await handleZoomWebhook(c.env, verificationReq, payloadText);

    // 処理結果に応じてレスポンスを返却
    if (result.success) {
      return c.json(result, 200);
    } else {
      return c.json(result, 400);
    }
  } catch (error) {
    // エラー発生時の処理
    console.error('Webhook処理エラー:', error);

    return c.json(
      {
        success: false,
        message: 'Webhookの処理中にエラーが発生しました',
        error: error instanceof Error ? error.message : '不明なエラー',
      },
      500
    );
  }
});

// このルーターをエクスポート
export default app;
