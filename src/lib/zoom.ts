/**
 * Zoom API連携機能を提供します
 * @module ZoomLib
 */
import { asyncErrorHandler } from '../utils/error';

/**
 * Zoom API設定インターフェース
 */
export interface ZoomApiConfig {
  apiKey: string;
  apiSecret: string;
  verificationToken: string;
}

/**
 * Zoom文字起こしファイル情報
 */
export interface TranscriptFileInfo {
  fileName: string;
  fileType: string;
  downloadUrl: string;
}

/**
 * Zoom Webhookペイロードインターフェース
 */
export interface ZoomWebhookPayload {
  event: string;
  payload: {
    object: {
      uuid: string;
      id: string;
      topic: string;
      host_id: string;
      start_time: string;
      duration: number;
      recording_files?: ZoomRecordingFile[];
    };
  };
  download_token: string;
  event_ts: number;
}

/**
 * Zoom録画ファイル情報インターフェース
 */
export interface ZoomRecordingFile {
  id: string;
  file_type: string;
  recording_type: string;
  download_url: string;
  status: string;
  recording_start: string;
  recording_end: string;
  file_name?: string;
}

/**
 * Zoom録画情報APIレスポンス
 */
export interface ZoomRecordingsResponse {
  uuid: string;
  id: number;
  account_id: string;
  host_id: string;
  topic: string;
  start_time: string;
  duration: number;
  total_size: number;
  recording_count: number;
  recording_files: ZoomRecordingFile[];
}

/**
 * Zoom API連携クラス
 */
export class ZoomClient {
  private config: ZoomApiConfig;

  /**
   * ZoomClientのコンストラクタ
   * @param config Zoom API設定
   */
  constructor(config: ZoomApiConfig) {
    this.config = config;
  }

  /**
   * Zoom Webhookの検証を行います
   * @param signature リクエストヘッダーのx-zm-signature
   * @param timestamp リクエストヘッダーのx-zm-timestamp
   * @param requestBody リクエストボディの生データ
   * @returns 検証が成功したかどうか
   */
  async verifyWebhook(
    signature: string,
    timestamp: string,
    requestBody: ArrayBuffer
  ): Promise<boolean> {
    try {
      const message = timestamp + '.' + new TextDecoder().decode(requestBody);
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(this.config.verificationToken),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
      );

      const msgBuffer = new TextEncoder().encode(message);
      const signatureBuffer = await crypto.subtle.sign('HMAC', key, msgBuffer);
      const computedSignature =
        'v0=' +
        Array.from(new Uint8Array(signatureBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

      return signature === computedSignature;
    } catch (error) {
      console.error('Webhook verification error:', error);
      return false;
    }
  }

  /**
   * 文字起こしファイルをダウンロードします
   * @param downloadUrl ダウンロードURL
   * @param downloadToken ダウンロードトークン
   * @returns ファイルの内容（テキスト）
   */
  downloadTranscript = asyncErrorHandler(
    async (downloadUrl: string, downloadToken: string): Promise<string> => {
      const url = new URL(downloadUrl);
      url.searchParams.append('access_token', downloadToken);

      const response = await fetch(url.toString(), {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download transcript: ${response.status} ${response.statusText}`);
      }

      return await response.text();
    }
  );

  /**
   * 文字起こしファイルの情報を取得します
   * @param meetingUUID 会議のUUID
   * @param downloadToken ダウンロードトークン
   * @returns 文字起こしファイル情報
   */
  getTranscriptFileInfo = asyncErrorHandler(
    async (meetingUUID: string, downloadToken: string): Promise<TranscriptFileInfo | null> => {
      // Zoom API から録画一覧を取得
      const url = `https://api.zoom.us/v2/meetings/${meetingUUID}/recordings`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${downloadToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get recording info: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as ZoomRecordingsResponse;

      // VTTファイルを探す
      const transcriptFile = data.recording_files?.find((file) => file.file_type === 'TRANSCRIPT');

      if (!transcriptFile) {
        return null;
      }

      return {
        fileName: transcriptFile.file_name || `transcript_${meetingUUID}.vtt`,
        fileType: transcriptFile.file_type,
        downloadUrl: transcriptFile.download_url,
      };
    }
  );
}

/**
 * デフォルトのZoom API設定を使用してZoomClientのインスタンスを作成します
 * @param env 環境変数
 * @returns ZoomClientインスタンス
 */
export function createZoomClient(env: {
  ZOOM_API_KEY: string;
  ZOOM_API_SECRET: string;
  ZOOM_VERIFICATION_TOKEN: string;
}): ZoomClient {
  return new ZoomClient({
    apiKey: env.ZOOM_API_KEY,
    apiSecret: env.ZOOM_API_SECRET,
    verificationToken: env.ZOOM_VERIFICATION_TOKEN,
  });
}
