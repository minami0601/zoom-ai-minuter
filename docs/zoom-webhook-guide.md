# Zoom Webhook設定ガイド

このドキュメントでは、Zoom AI Minuter アプリケーションで使用する Zoom Webhook の設定方法を説明します。

## 目次

1. [前提条件](#前提条件)
2. [Zoom Developper アカウント設定](#zoom-developper-アカウント設定)
3. [アプリケーションの作成](#アプリケーションの作成)
4. [Webhook URLの設定](#webhook-urlの設定)
5. [検証トークンの取得](#検証トークンの取得)
6. [Webhookイベントの購読](#webhookイベントの購読)
7. [環境変数の設定](#環境変数の設定)
8. [Webhookのテスト](#webhookのテスト)
9. [トラブルシューティング](#トラブルシューティング)

## 前提条件

- Zoom アカウント（Pro、Business、または Enterprise）
- デプロイ済みの Zoom AI Minuter アプリケーション（[デプロイガイド](./deployment-guide.md)を参照）
- パブリックにアクセス可能な API エンドポイント

## Zoom Developper アカウント設定

### 1. Zoom Developer Portal にアクセス

1. [Zoom App Marketplace](https://marketplace.zoom.us/develop) にアクセス
2. Zoom アカウントでログインします（まだログインしていない場合）

### 2. 開発者プロフィールを設定

1. まだ開発者アカウントを持っていない場合は、「Sign Up」をクリックして必要な情報を入力
2. 企業内部で使用する場合は会社情報を正確に入力

## アプリケーションの作成

### 1. アプリケーションタイプの選択

1. 「Build App」ボタンをクリック
2. アプリタイプとして「Webhook Only」を選択
   - このアプリタイプは、ユーザーの認証なしで Webhook イベントのみを受信するために使用します

### 2. アプリケーション情報の入力

1. 基本情報を入力：
   - アプリ名: "Zoom AI Minuter"（または任意の名前）
   - 会社名: あなたの会社名
   - 連絡先名: あなたの名前
   - 連絡先メール: あなたのメールアドレス
2. 「Create」ボタンをクリック

## Webhook URLの設定

### 1. Webhook エンドポイントを設定

Zoom AI Minuter アプリケーションのデプロイ URL に `/api/zoom-webhook` パスを追加したものを Webhook URL として設定します。

1. 作成したアプリの「Feature」タブに移動
2. 「Webhook」セクションで「+ Add Event Subscriptions」をクリック
3. サブスクリプション名として "AI Minuter Webhook" と入力
4. Webhook URL に以下を入力：
   ```
   https://your-worker-url.workers.dev/api/zoom-webhook
   ```
   - `your-worker-url` の部分は実際にデプロイした Worker の URL に置き換えてください
   - カスタムドメインを設定している場合は、そのドメインを使用

## 検証トークンの取得

Webhook の検証トークンは、Zoom からの通知が本物であることを確認するために使用されます。

1. 「Event Subscriptions」設定画面で、「Verification Token」をメモ
   - このトークンは後で環境変数 `ZOOM_VERIFICATION_TOKEN` として設定します

## Webhookイベントの購読

録画の文字起こしファイルが利用可能になったときに通知を受け取るために、特定のイベントを購読する必要があります。

1. 「Event Types」セクションで、以下のイベントを選択：
   - 「Recording」カテゴリから「Recording Transcript Completed」を選択
   - 必要に応じて「Recording Completed」も選択可能（録画が完了した時点で通知を受け取る場合）

2. 「Save」ボタンをクリック

## 環境変数の設定

Webhook からの通知を正しく処理するために、必要な環境変数を設定します。

### ローカル開発環境

`.env` ファイルに以下を追加：

```
ZOOM_VERIFICATION_TOKEN=your_verification_token_here
```

### 本番環境 (Cloudflare Workers)

```bash
wrangler secret put ZOOM_VERIFICATION_TOKEN
```

コマンドを実行し、プロンプトが表示されたら先ほどメモした検証トークンを入力します。

## Webhookのテスト

Webhook の設定を確認するには、テスト機能を使用するか、実際に会議の録画と文字起こしを行います。

### 1. Zoom開発者ポータルでのテスト

1. アプリの「Event Subscriptions」画面で、設定した Webhook の右側にある「Test」ボタンをクリック
2. テストペイロードが自動的に生成され、設定した Webhook URL に送信されます
3. 応答が正常であれば、「Test was successful」という確認メッセージが表示されます

### 2. 実際の会議でのテスト

1. Zoom で会議を開始
2. 「Record」ボタンをクリックして会議を録画（クラウド録画を選択）
3. 「Closed Caption」または「Transcription」を有効にする
4. 会議終了後、文字起こしファイルが処理されるのを待ちます
5. Webhook イベントが正常に処理されたかを確認するには、アプリケーションのログを確認：
   ```bash
   wrangler tail
   ```

## トラブルシューティング

### Webhookが呼び出されない

**問題**: イベントが発生しても Webhook が呼び出されない

**確認点**:
1. Zoom アカウントでクラウド録画と自動文字起こしが有効になっていることを確認
2. 正しいイベント（`Recording Transcript Completed`）を購読していることを確認
3. Webhook URL が公開アクセス可能であることを確認

### 検証エラー

**問題**: Webhook は呼び出されるが、検証エラーが発生する

**確認点**:
1. `ZOOM_VERIFICATION_TOKEN` が正しく設定されていることを確認
2. Zoom Developer Portal に表示されているトークンと一致していることを確認
3. Webhook ハンドラーで検証ロジックが正しく実装されていることを確認

### ペイロード解析エラー

**問題**: Webhook は呼び出されるが、ペイロードの解析に失敗する

**確認点**:
1. Webhook ハンドラーのリクエストボディ解析ロジックを確認
2. テストイベントとログを比較して、期待されるJSON構造を確認

### イベント欠落

**問題**: 一部のイベントが欠落している

**確認点**:
1. Zoom アカウントの制限（無料アカウントでは一部機能が制限される）を確認
2. 会議ホストが文字起こし機能を有効にしていることを確認
3. イベントの配信に遅延がある場合があるため、数分待ってみる

### API制限の問題

**問題**: API呼び出し制限に達した

**確認点**:
1. Zoom API使用量をモニタリング
2. リクエスト頻度を下げる戦略を検討（バックオフ、キューイングなど）
