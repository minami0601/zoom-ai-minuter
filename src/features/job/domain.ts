/**
 * ジョブ管理機能のドメインモデルと型定義
 * @module JobDomain
 */

/**
 * ジョブステータス種別
 */
export enum JobStatus {
  PENDING = 'pending', // 処理待ち
  PROCESSING = 'processing', // 処理中
  COMPLETED = 'completed', // 完了
  FAILED = 'failed', // 失敗
  SKIPPED = 'skipped', // スキップ（処理対象外）
}

/**
 * 会議分類カテゴリ
 */
export enum MeetingCategory {
  INTERNAL_MEETING = 'internalMeeting', // 業務ミーティング
  SMALL_TALK = 'smallTalk', // 雑談
  PRIVATE = 'private', // プライベート
  OTHER = 'other', // その他
}

/**
 * Zoom録画ファイル情報
 */
export interface RecordingFile {
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
 * Zoom会議オブジェクト
 */
export interface ZoomObject {
  uuid: string;
  id: string;
  topic: string;
  host_id: string;
  start_time: string;
  duration: number;
  recording_files?: RecordingFile[];
}

/**
 * ジョブデータモデル
 * 文字起こし処理ジョブの状態と関連データを表す
 */
export interface JobData {
  // 基本情報
  jobId: string;
  createdAt: string;

  // Zoomデータ
  payload: {
    object: ZoomObject;
  };
  downloadToken: string;

  // 処理状態
  status: JobStatus;
  processingStartedAt?: string;
  completedAt?: string;

  // 分類結果
  category?: MeetingCategory;
  reason?: string;

  // 出力情報
  notionPageId?: string;
  notionPageUrl?: string;

  // エラー情報
  error?: string;
}

/**
 * 新規ジョブ作成リクエスト
 */
export interface CreateJobRequest {
  payload: {
    object: ZoomObject;
  };
  downloadToken: string;
}

/**
 * ジョブステータス応答
 */
export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  createdAt: string;
  processingStartedAt?: string;
  completedAt?: string;
  category?: MeetingCategory;
  notionPageId?: string;
  notionPageUrl?: string;
  error?: string;
}

/**
 * ジョブ一覧応答
 */
export interface ListJobsResponse {
  jobs: JobStatusResponse[];
  total: number;
}

/**
 * ジョブ更新リクエスト
 */
export interface UpdateJobRequest {
  status?: JobStatus;
  category?: MeetingCategory;
  reason?: string;
  notionPageId?: string;
  notionPageUrl?: string;
  error?: string;
  processingStartedAt?: string; // これを追加
  completedAt?: string; // これを追加
}

/**
 * ジョブの初期化
 * @param jobId 一意のジョブID
 * @param createJobRequest 作成リクエスト
 * @returns 初期化されたジョブデータ
 */
export function initializeJob(jobId: string, createJobRequest: CreateJobRequest): JobData {
  return {
    jobId,
    createdAt: new Date().toISOString(),
    payload: createJobRequest.payload,
    downloadToken: createJobRequest.downloadToken,
    status: JobStatus.PENDING,
  };
}
