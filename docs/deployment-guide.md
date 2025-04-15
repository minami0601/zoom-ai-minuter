# Cloudflare Workersデプロイガイド

このドキュメントでは、Zoom AI Minuter アプリケーションを Cloudflare Workers にデプロイする手順を説明します。

## 目次

1. [前提条件](#前提条件)
2. [プロジェクト設定](#プロジェクト設定)
3. [環境変数の設定](#環境変数の設定)
4. [デプロイ手順](#デプロイ手順)
5. [カスタムドメインの設定](#カスタムドメインの設定)
6. [トラブルシューティング](#トラブルシューティング)

## 前提条件

デプロイを開始する前に、以下のツールとアカウントを用意してください：

1. **Node.js と pnpm**: 最新の安定版をインストール
   ```bash
   # mise (asdf) を使用している場合
   mise install node@lts
   npm install -g pnpm
   ```

2. **Cloudflare アカウント**: まだ持っていない場合は [Cloudflare](https://dash.cloudflare.com/sign-up) で無料アカウントを作成

3. **Wrangler CLI**: Cloudflare Workers 用のコマンドラインツール
   ```bash
   # プロジェクト内にすでにインストールされています
   # グローバルにインストールする場合：
   pnpm install -g wrangler
   ```

## プロジェクト設定

### Wrangler 設定の確認

プロジェクトルートにある `wrangler.toml` ファイルを確認し、必要に応じて編集します：

```toml
name = "zoom-ai-minuter"
main = "src/index.ts"
compatibility_date = "2023-08-01"
node_compat = true

[[kv_namespaces]]
binding = "JOB_KV"
id = "your_kv_id_here"
preview_id = "your_preview_kv_id_here"

[triggers]
crons = []

[vars]
APP_ENV = "production"
```

### KV ネームスペースの作成

1. Cloudflare ダッシュボードにログイン
2. Workers & Pages > KV に移動
3. 「Create namespace」をクリック
4. 名前を入力（例: "zoom-ai-minuter-jobs"）して作成
5. 作成された KV ネームスペースの ID をコピーして `wrangler.toml` の `id` に設定

または、Wrangler CLI を使用して作成:

```bash
wrangler kv:namespace create "JOB_KV"
wrangler kv:namespace create "JOB_KV" --preview
```

コマンド出力で表示された ID を `wrangler.toml` の対応する箇所に設定します。

## 環境変数の設定

本番環境の秘密情報を安全に管理するため、Cloudflare の Secret を使用します。

```bash
# Zoom API 認証情報の設定
wrangler secret put ZOOM_API_KEY
wrangler secret put ZOOM_API_SECRET
wrangler secret put ZOOM_VERIFICATION_TOKEN

# Gemini API 設定
wrangler secret put GEMINI_API_KEY

# Notion API 設定
wrangler secret put NOTION_API_KEY
wrangler secret put NOTION_DATABASE_ID
```

各コマンド実行時に、値の入力を求められます。このシークレットは安全に保存され、デプロイされた Worker からアクセスできるようになります。

## デプロイ手順

プロジェクトをデプロイするには、以下のコマンドを実行します：

### 1. ビルドとテスト

```bash
# プロジェクトの依存関係をインストール
pnpm install

# リント実行
pnpm lint

# テスト実行
pnpm test

# ビルド
pnpm build
```

### 2. デプロイ

```bash
# 本番環境へデプロイ
pnpm deploy
```

または、Wrangler を直接使用:

```bash
wrangler deploy
```

デプロイが成功すると、Worker の URL が表示されます（例: `https://zoom-ai-minuter.<your-subdomain>.workers.dev`）

### 3. 確認

ブラウザで表示された URL にアクセスし、アプリケーションが正常に動作していることを確認します。ヘルスチェックエンドポイントにアクセスして状態を確認できます：

```
https://zoom-ai-minuter.<your-subdomain>.workers.dev/api/health
```

正常に動作している場合、以下のような JSON レスポンスが返ります：

```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2023-08-01T12:34:56.789Z"
}
```

## カスタムドメインの設定

プロジェクトをカスタムドメインで提供したい場合は、以下の手順で設定します：

1. Cloudflare ダッシュボードで、該当のドメインを管理下に置く
2. Workers & Pages > your-worker に移動
3. 「トリガー」タブを選択
4. 「カスタムドメイン」セクションで「カスタムドメインを追加」をクリック
5. 使用したいドメイン/サブドメインを入力して追加

または、`wrangler.toml` に以下を追加してデプロイ:

```toml
[routes]
pattern = "api.yourdomain.com/*"
custom_domain = true
```

## トラブルシューティング

### デプロイエラー

**問題**: `Error: Unable to fetch...` というエラーが表示される

**解決策**: Cloudflare にログインしていることを確認
```bash
wrangler login
```

**問題**: KV バインディングエラー

**解決策**: `wrangler.toml` の KV 設定を確認し、正しい ID が設定されていることを確認

### ランタイムエラー

**問題**: API キーの検証エラー

**解決策**: 各 API キーが正しく設定されていることを確認
```bash
wrangler secret list
```

**問題**: タイムアウトエラー

**解決策**: Workers のタイムアウト制限（10-30秒）を超える処理がある場合は、非同期処理やバッチ処理に分割することを検討

### ログの確認

Worker のログを確認するには:

```bash
wrangler tail
```

または、Cloudflare ダッシュボードの Workers > your-worker > Logs から確認できます。
