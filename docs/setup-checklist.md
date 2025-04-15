# Zoom AI Minuter セットアップチェックリスト

システムを完全に機能させるためのチェックリストです。デプロイとAPIキーの設定に続いて以下の手順を完了させてください。

## 1. Zoom設定の確認

### クラウド録画と文字起こしの有効化

1. [Zoom管理ポータル](https://zoom.us/profile/setting)にログイン
2. 「録画」タブを選択
3. 「クラウド録画」が有効になっていることを確認
4. 「録画のオーディオトランスクリプト」が有効になっていることを確認
5. 設定を保存

### 会議設定での確認

1. 会議をスケジュールする際に「クラウド録画を自動的に開始」オプションを選択（任意）
2. 「録画中にクローズドキャプションを有効にする」を選択（AI文字起こしを使用）

## 2. Cloudflare Workersの設定確認

1. デプロイされたWorkerのURLを確認（例: `https://zoom-ai-minuter.yourdomain.workers.dev`）
2. 以下のエンドポイントにアクセスしてヘルスチェック
   ```
   https://zoom-ai-minuter.yourdomain.workers.dev/api/health
   ```
3. `{ "status": "ok" }` のようなレスポンスが返ることを確認

## 3. Zoom WebhookとWorkerの連携確認

1. Zoom Developer Portal で作成したアプリの「Webhook」設定に移動
2. 「Event Subscriptions」で設定したエンドポイントが以下の形式になっていることを確認
   ```
   https://zoom-ai-minuter.yourdomain.workers.dev/api/zoom-webhook
   ```
3. 「Recording Transcript Completed」イベントが購読されていることを確認
4. 「Test」ボタンでテスト通知を送信し、成功することを確認

## 4. 実際のテスト手順

1. Zoomで新しい会議を開始
2. 「Record」ボタンをクリックして「Record to Cloud」を選択
3. 「CC」ボタンをクリックして「Live Transcript」を有効にする
4. 数分間会話を録音（テスト用のダミー会議内容）
5. 会議を終了
6. Zoomクラウド録画の処理が完了するまで待機（数分〜数十分）
7. 文字起こし処理が完了すると、WebhookがトリガーされてシステムがAI処理を開始
8. Workerのログを確認（`wrangler tail` コマンドを使用）
   ```bash
   wrangler tail zoom-ai-minuter
   ```
9. 処理が完了すると、Notionに議事録が自動的に作成される

## 5. CloudflareのSecret設定確認

すべてのAPIキーがCloudflareのSecret環境変数として設定されていることを確認:

```bash
wrangler secret list
```

以下のシークレットが表示されるはずです:
- ZOOM_API_KEY
- ZOOM_API_SECRET
- ZOOM_VERIFICATION_TOKEN
- GEMINI_API_KEY
- NOTION_API_KEY
- NOTION_DATABASE_ID

もし表示されない場合は、以下のコマンドで設定:

```bash
wrangler secret put ZOOM_API_KEY
# 残りのシークレットについても同様に設定
```

## トラブルシューティング

システムが正常に動作しない場合は以下を確認:

1. Workerのログにエラーがないか確認
2. Zoomの文字起こしが正常に生成されているか確認
3. Webhook URLが公開アクセス可能かつ正しいか確認
4. APIキーとシークレットが正しいか確認

問題が解決しない場合は、詳細なログを添えてサポートチームに連絡してください。
