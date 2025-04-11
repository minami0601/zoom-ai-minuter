import app from './app';

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // 定期的なバックグラウンドジョブの処理をここに記述
    console.log('Scheduled event:', event.cron);
  },
};

export interface Env {
  // KV名前空間
  MEETING_DATA: KVNamespace;

  // 環境変数
  ZOOM_WEBHOOK_SECRET: string;
  GEMINI_API_KEY: string;
  NOTION_API_KEY: string;
}
