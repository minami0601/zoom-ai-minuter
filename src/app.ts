import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';

// アプリケーションインスタンスの作成
const app = new Hono();

// ミドルウェアの設定
app.use('*', logger());
app.use('*', cors());
app.use('*', secureHeaders());

// ルートハンドラー
app.get('/', (c) => {
  return c.json({
    message: 'Zoom AI Minuter API',
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ヘルスチェックエンドポイント
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 他のルートはここに追加されます...
// app.route('/api/zoom-webhook', webhookRouter);
// app.route('/api/job', jobRouter);

export default app;
