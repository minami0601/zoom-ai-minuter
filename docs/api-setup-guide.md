# API設定ガイド

このドキュメントでは、Zoom AI Minuter アプリケーションで使用する各種 API キーとトークンの取得方法について説明します。

## 目次

1. [Zoom API 設定](#zoom-api-設定)
2. [Notion API 設定](#notion-api-設定)
3. [Gemini API 設定](#gemini-api-設定)
4. [環境変数の設定](#環境変数の設定)

## Zoom API 設定

### 1. Zoom Developer アカウントの作成

1. [Zoom Developer Portal](https://marketplace.zoom.us/develop) にアクセスします
2. 「Sign Up Free」ボタンをクリックして、Zoom アカウントでログインします（アカウントがない場合は新規作成）
3. 必要な情報を入力して登録を完了します

### 2. アプリケーションの登録

1. ログイン後、「Build App」ボタンをクリックします
2. 「Server-to-Server OAuth」アプリケーションタイプを選択します
   - このアプリタイプは、サーバーからZoom APIに直接アクセスするために使用します
   - ユーザー認証が不要でバックグラウンド処理に最適です
3. アプリ名を入力し（例: "Zoom AI Minuter"）、「Create」をクリックします

### 3. API Key と API Secret の取得

1. アプリケーション作成後、「App Credentials」セクションに移動します
2. このセクションに表示される以下の情報をメモします：
   - **Client ID**: これが `.env` ファイルの `ZOOM_API_KEY` として使用します
   - **Client Secret**: これが `.env` ファイルの `ZOOM_API_SECRET` として使用します
   - これらの認証情報は再表示されないため、安全な場所に保管してください

### 4. スコープの設定

1. 左側メニューから「Scopes」を選択します
2. 以下のスコープを追加します：
   - `recording:read` - 録画情報の取得に必要
   - `recording:write` - 必要に応じて（録画操作を行う場合）

### 5. アクティベーションとインストール

1. 左側メニューから「Activation」を選択します
2. 「Activate your app」ボタンをクリックして、アプリケーションを有効化します
3. これにより、APIキーとシークレットが使用可能になります

### 6. Webhook の設定（文字起こし通知を受け取るために必要）

1. 左側メニューから「Feature」を選択し、「Event Subscriptions」を選択します
2. 「Add Event Subscription」をクリックします
3. 名前を入力し（例: "Recording Transcripts"）、Webhook URLを設定します (例: `https://yourdomain.com/api/zoom-webhook`)
4. 「Event Types」セクションで、`Recording Transcript Completed` を選択します
5. 「Verification Token」をメモします (これが `ZOOM_VERIFICATION_TOKEN` になります)
6. 「Save」をクリックします

## Notion API 設定

### 1. Notion インテグレーションの作成

1. [Notion Developers](https://www.notion.so/my-integrations) にアクセスします
2. 右上の「+ New integration」ボタンをクリックします
3. インテグレーション名を入力し（例: "Zoom AI Minuter"）、関連するワークスペースを選択します
4. ケイパビリティとして以下を選択します：
   - 「Read content」
   - 「Update content」
   - 「Insert content」
5. 「Submit」をクリックして統合を作成します

### 2. APIキーの取得

1. 作成した統合の「Secrets」セクションにある「Internal Integration Token」をメモします
2. これが `NOTION_API_KEY` になります

### 3. データベースIDの取得

1. Notionで、議事録を保存したいデータベースを作成または開きます（既存のデータベースも使用可能）
2. データベースには少なくとも以下のプロパティが必要です：
   - `Title` (タイトル型)
   - `Date` (日付型)
   - `Category` (セレクト型)
   - `Duration` (数値型)
   - `Participant Count` (数値型)
   - `Participants` (リッチテキスト型)
   - `Summary` (リッチテキスト型)
   - `Decisions` (リッチテキスト型)
   - `Action Items` (リッチテキスト型)
3. データベースを開いた状態で、ブラウザのURLをコピーします
4. URLの形式は `https://www.notion.so/{workspace_name}/{database_id}?v={view_id}` のようになっています
5. このURLから `{database_id}` 部分を抽出します (通常32文字のIDで、ダッシュを含む場合があります)
6. これが `NOTION_DATABASE_ID` になります

### 4. インテグレーションとデータベースの接続

1. Notionで議事録用データベースを開きます
2. 右上の「...」（メニュー）をクリックします
3. 「+ Add connections」を選択します
4. 先ほど作成したインテグレーション名を検索して選択します
5. これにより、インテグレーションがデータベースにアクセスできるようになります

## Gemini API 設定

### 1. Google AI Studio へのアクセス

1. [Google AI Studio](https://makersuite.google.com/) にアクセスします
2. Googleアカウントでログインします (まだログインしていない場合)

### 2. API キーの取得

1. 画面右上のプロフィールアイコンをクリックします
2. メニューから「Settings」（設定）を選択します
3. 「API keys」タブを選択します
4. 「Create API key」ボタンをクリックします
5. 任意の名前を入力し（例: "Zoom AI Minuter"）、「Create」をクリックします
6. 生成されたAPIキーをメモします（これが `GEMINI_API_KEY` になります）

### 3. APIキーの制限設定（オプション）

1. 生成したAPIキーの「Manage key」をクリックします
2. 必要に応じて「HTTP Referrers」などの制限を設定します
3. 設定が完了したら「Save」をクリックします

### 4. モデルの確認

1. Geminiには複数のモデルバリエーションがあります
2. このアプリケーションでは `gemini-1.5-pro` を使用します
3. APIキーはすべてのGeminiモデルに対して使用できますが、利用可能なモデルは定期的に変更される場合があります

## 環境変数の設定

上記の手順で取得した各APIキーとトークンを`.env`ファイルに設定します。

1. プロジェクトルートにある `.env.example` ファイルを `.env` にコピーします:

```bash
cp .env.example .env
```

2. テキストエディタで `.env` ファイルを開き、取得した値を入力します:

```bash
# Zoom API認証情報
ZOOM_API_KEY=your_zoom_api_key_here
ZOOM_API_SECRET=your_zoom_api_secret_here
ZOOM_VERIFICATION_TOKEN=your_zoom_webhook_verification_token_here

# Gemini API設定
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL_NAME=gemini-1.5-pro

# Notion API設定
NOTION_API_KEY=your_notion_api_key_here
NOTION_DATABASE_ID=your_notion_database_id_here

# アプリケーション設定
APP_ENV=development
```

3. ファイルを保存します

## トラブルシューティング

### Zoom API関連の問題

- アプリがアクティブ状態になっていることを確認してください
- スコープが正しく設定されていることを確認してください
- Webhookエンドポイントが公開アクセス可能であることを確認してください

### Notion API関連の問題

- インテグレーションがデータベースと接続されていることを確認してください
- データベースIDが正確に抽出されていることを確認してください
- データベースに必要なプロパティがすべて存在することを確認してください

### Gemini API関連の問題

- APIキーが正確にコピーされていることを確認してください
- 指定のモデルが現在利用可能であることを確認してください
- APIの使用量制限に達していないことを確認してください
