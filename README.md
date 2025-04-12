# Zoom AI Minuter

Zoom会議の文字起こしデータを自動的に議事録化するシステム

## 環境設定

### 必要な環境変数

このプロジェクトでは以下の環境変数が必要です：

1. **Zoom API 関連**
   - `ZOOM_API_KEY`: Zoom APIキー
   - `ZOOM_API_SECRET`: Zoom APIシークレット
   - `ZOOM_VERIFICATION_TOKEN`: Zoom Webhook検証トークン

2. **Gemini API 関連**
   - `GEMINI_API_KEY`: Google Gemini APIキー
   - `GEMINI_MODEL_NAME`: 使用するモデル名（デフォルト: gemini-1.5-pro）

3. **Notion API 関連**
   - `NOTION_API_KEY`: Notion APIキー
   - `NOTION_DATABASE_ID`: 出力先NotionデータベースID

### ローカル開発環境のセットアップ

1. `.env.example` を `.env` にコピーして、必要な値を設定します。
   ```bash
   cp .env.example .env
   ```

2. Cloudflare Workers KV名前空間を作成します。
   ```bash
   wrangler kv:namespace create "JOB_KV"
   wrangler kv:namespace create "JOB_KV" --preview
   ```

3. 作成されたKV名前空間IDを `wrangler.toml` ファイルの該当箇所に設定します。

### 本番環境のセットアップ

1. Cloudflareダッシュボードで必要なSecretを設定します。
   ```bash
   wrangler secret put ZOOM_API_KEY
   wrangler secret put ZOOM_API_SECRET
   wrangler secret put ZOOM_VERIFICATION_TOKEN
   wrangler secret put GEMINI_API_KEY
   wrangler secret put NOTION_API_KEY
   wrangler secret put NOTION_DATABASE_ID
   ```

2. Cloudflareダッシュボードで本番用のKV名前空間を作成し、`wrangler.toml`に設定します。
