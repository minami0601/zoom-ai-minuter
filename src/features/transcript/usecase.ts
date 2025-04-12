/**
 * 文字起こし処理のユースケース
 * @module TranscriptUsecase
 */
import { createZoomClient } from '../../lib/zoom';
import { asyncErrorHandler } from '../../utils/error';
import { type JobData, JobStatus } from '../job/domain';
import { getJob, getRawJobData, saveTranscript, updateJobStatus } from '../job/usecase';
import type {
  ProcessTranscriptRequest,
  ProcessTranscriptResult,
  StructuredTranscript,
  TranscriptMetadata,
  VttParseOptions,
} from './domain';
import { parseVttTranscript } from './format';

/**
 * VTT文字起こしファイルをダウンロードして処理する
 * @param env Workers環境変数
 * @param jobId 処理対象のジョブID
 * @returns 処理結果
 */
export const processTranscript = asyncErrorHandler(
  async (
    env: {
      ZOOM_API_KEY: string;
      ZOOM_API_SECRET: string;
      ZOOM_VERIFICATION_TOKEN: string;
      JOB_KV: KVNamespace;
    },
    jobId: string
  ): Promise<ProcessTranscriptResult> => {
    const startTime = Date.now();
    let jobData: JobData | null = null;

    try {
      // ジョブステータスを処理中に更新
      await updateJobStatus(env, jobId, JobStatus.PROCESSING);

      // 生のジョブデータを取得
      jobData = await getRawJobData(env, jobId);
      if (!jobData) {
        throw new Error(`ジョブ ${jobId} が見つかりません`);
      }

      // ZoomClientを作成
      const zoomClient = createZoomClient(env);

      // ジョブデータから必要な情報を抽出
      const meetingUUID = jobData.payload.object.uuid;
      const downloadToken = jobData.downloadToken;

      console.log(
        `ジョブ ${jobId}: 文字起こしファイルの情報を取得します - 会議UUID: ${meetingUUID}`
      );

      // 文字起こしファイルの情報を取得
      const transcriptFileInfo = await zoomClient.getTranscriptFileInfo(meetingUUID, downloadToken);

      if (!transcriptFileInfo) {
        throw new Error(`会議 ${meetingUUID} の文字起こしファイルが見つかりません`);
      }

      console.log(
        `ジョブ ${jobId}: 文字起こしファイルをダウンロードします - URL: ${transcriptFileInfo.downloadUrl}`
      );

      // 文字起こしファイルをダウンロード
      const vttContent = await zoomClient.downloadTranscript(
        transcriptFileInfo.downloadUrl,
        downloadToken
      );

      console.log(
        `ジョブ ${jobId}: 文字起こしファイルをパースします - サイズ: ${vttContent.length} バイト`
      );

      // メタデータを作成
      const metadata: TranscriptMetadata = {
        meetingUuid: meetingUUID,
        meetingTopic: jobData.payload.object.topic,
        meetingDate: jobData.payload.object.start_time,
        durationSeconds: jobData.payload.object.duration * 60, // 分をから秒に変換
      };

      // パースオプション
      const parseOptions: VttParseOptions = {
        extractSpeakers: true,
        combineLines: true,
        removeFiller: true,
      };

      // VTTを構造化データに変換
      const structuredTranscript = await parseVttTranscript(vttContent, metadata, parseOptions);

      console.log(
        `ジョブ ${jobId}: 文字起こしデータを構造化しました - エントリ数: ${structuredTranscript.entries.length}`
      );

      // 構造化データをKVストレージに保存
      await saveTranscript(env, jobId, JSON.stringify(structuredTranscript));

      const processingTimeMs = Date.now() - startTime;
      console.log(
        `ジョブ ${jobId}: 文字起こし処理が完了しました - 処理時間: ${processingTimeMs}ms`
      );

      // 処理成功
      await updateJobStatus(env, jobId, JobStatus.COMPLETED);

      return {
        success: true,
        jobId,
        transcript: structuredTranscript,
        processingTimeMs,
      };
    } catch (error) {
      console.error(`ジョブ ${jobId}: 文字起こし処理中にエラーが発生しました`, error);

      // エラーメッセージを取得
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';

      // エラーステータスを設定
      await updateJobStatus(env, jobId, JobStatus.FAILED, errorMessage);

      return {
        success: false,
        jobId,
        error: errorMessage,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }
);

/**
 * 文字起こし処理を開始する
 * @param env Workers環境変数
 * @param request 処理リクエスト
 * @returns 処理開始結果
 */
export const startTranscriptProcessing = asyncErrorHandler(
  async (
    env: {
      ZOOM_API_KEY: string;
      ZOOM_API_SECRET: string;
      ZOOM_VERIFICATION_TOKEN: string;
      JOB_KV: KVNamespace;
    },
    request: ProcessTranscriptRequest
  ): Promise<{ success: boolean; jobId: string; message: string }> => {
    const { jobId } = request;

    // ジョブが存在するか確認
    const job = await getJob(env, jobId);
    if (!job) {
      return {
        success: false,
        jobId,
        message: `ジョブ ${jobId} が見つかりません`,
      };
    }

    // 既に処理中または完了済みかチェック
    if (job.status !== JobStatus.PENDING) {
      return {
        success: false,
        jobId,
        message: `ジョブ ${jobId} は既に ${job.status} 状態です`,
      };
    }

    // 処理を非同期で開始（後でWorkerの処理時間制限に注意）
    // 実際のシステムでは、この部分はワーカーに処理を渡すか、Queueを利用する
    void processTranscript(env, jobId).catch((err) => {
      console.error(`ジョブ ${jobId} の非同期処理中にエラー:`, err);
    });

    return {
      success: true,
      jobId,
      message: `ジョブ ${jobId} の処理を開始しました`,
    };
  }
);

/**
 * ジョブIDに紐づく文字起こしデータを取得する
 * @param env Workers環境変数
 * @param jobId ジョブID
 * @returns 構造化された文字起こしデータ（存在しない場合はnull）
 */
export const getTranscriptByJobId = asyncErrorHandler(
  async (env: { JOB_KV: KVNamespace }, jobId: string): Promise<StructuredTranscript | null> => {
    const jobStorage = await import('../../lib/storage/kv').then((m) =>
      m.createJobStorage(env.JOB_KV)
    );

    // KVから文字起こしデータを取得
    const transcriptJson = await jobStorage.getTranscript(jobId);
    if (!transcriptJson) {
      return null;
    }

    try {
      // JSON解析
      return JSON.parse(transcriptJson) as StructuredTranscript;
    } catch (error) {
      console.error(`ジョブ ${jobId} の文字起こしデータのパースに失敗:`, error);
      return null;
    }
  }
);
