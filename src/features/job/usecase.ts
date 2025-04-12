/**
 * ジョブ管理機能のユースケース
 * @module JobUsecase
 */
import { randomUUID } from 'crypto';
import { createJobStorage } from '../../lib/storage/kv';
import { asyncErrorHandler } from '../../utils/error';
import {
  type CreateJobRequest,
  type JobData,
  JobStatus,
  type JobStatusResponse,
  type ListJobsResponse,
  type UpdateJobRequest,
  initializeJob,
} from './domain';

/**
 * 新規ジョブを作成する
 * @param env Workers環境変数
 * @param createJobRequest ジョブ作成リクエスト
 * @returns 作成されたジョブID
 */
export const createJob = asyncErrorHandler(
  async (env: { JOB_KV: KVNamespace }, createJobRequest: CreateJobRequest): Promise<string> => {
    const jobStorage = createJobStorage(env.JOB_KV);

    // UUIDを生成
    const jobId = randomUUID();

    // ジョブデータを初期化
    const jobData = initializeJob(jobId, createJobRequest);

    // KVストレージに保存
    await jobStorage.saveJob(jobId, jobData);

    return jobId;
  }
);

/**
 * ジョブデータを取得する
 * @param env Workers環境変数
 * @param jobId ジョブID
 * @returns ジョブデータ（存在しない場合はnull）
 */
export const getJob = asyncErrorHandler(
  async (env: { JOB_KV: KVNamespace }, jobId: string): Promise<JobStatusResponse | null> => {
    const jobStorage = createJobStorage(env.JOB_KV);

    // KVストレージからジョブを取得
    const jobData = await jobStorage.getJob<JobData>(jobId);

    if (!jobData) {
      return null;
    }

    // 必要な情報だけを抽出して返却
    return {
      jobId: jobData.jobId,
      status: jobData.status,
      createdAt: jobData.createdAt,
      processingStartedAt: jobData.processingStartedAt,
      completedAt: jobData.completedAt,
      category: jobData.category,
      notionPageId: jobData.notionPageId,
      notionPageUrl: jobData.notionPageUrl,
      error: jobData.error,
    };
  }
);

/**
 * 生のジョブデータを取得する
 * @param env Workers環境変数
 * @param jobId ジョブID
 * @returns 生のジョブデータ（存在しない場合はnull）
 */
export const getRawJobData = asyncErrorHandler(
  async (env: { JOB_KV: KVNamespace }, jobId: string): Promise<JobData | null> => {
    const jobStorage = createJobStorage(env.JOB_KV);

    // KVストレージからジョブを取得
    return await jobStorage.getJob<JobData>(jobId);
  }
);

/**
 * ジョブデータを更新する
 * @param env Workers環境変数
 * @param jobId ジョブID
 * @param updateJobRequest 更新データ
 * @returns 更新されたジョブデータ
 */
export const updateJob = asyncErrorHandler(
  async (
    env: { JOB_KV: KVNamespace },
    jobId: string,
    updateJobRequest: UpdateJobRequest
  ): Promise<JobStatusResponse | null> => {
    const jobStorage = createJobStorage(env.JOB_KV);

    // ジョブデータを更新
    await jobStorage.updateJob<JobData>(jobId, (currentData) => {
      if (!currentData) {
        throw new Error(`Job with ID ${jobId} not found`);
      }

      // 更新日時を記録
      const now = new Date().toISOString();

      // 状態変更に応じて日時も記録
      if (
        updateJobRequest.status === JobStatus.PROCESSING &&
        currentData.status !== JobStatus.PROCESSING
      ) {
        updateJobRequest.processingStartedAt = now;
      }

      if (
        (updateJobRequest.status === JobStatus.COMPLETED ||
          updateJobRequest.status === JobStatus.FAILED ||
          updateJobRequest.status === JobStatus.SKIPPED) &&
        currentData.status !== JobStatus.COMPLETED &&
        currentData.status !== JobStatus.FAILED &&
        currentData.status !== JobStatus.SKIPPED
      ) {
        updateJobRequest.completedAt = now;
      }

      // データを更新して返す
      return {
        ...currentData,
        ...updateJobRequest,
      };
    });

    // 更新後のジョブデータを返却
    return await getJob(env, jobId);
  }
);

/**
 * ジョブのステータスを更新する便利関数
 * @param env Workers環境変数
 * @param jobId ジョブID
 * @param status 新しいステータス
 * @param error エラー情報（失敗時）
 * @returns 更新されたジョブデータ
 */
export const updateJobStatus = asyncErrorHandler(
  async (
    env: { JOB_KV: KVNamespace },
    jobId: string,
    status: JobStatus,
    error?: string
  ): Promise<JobStatusResponse | null> => {
    const updateRequest: UpdateJobRequest = { status };

    if (error && status === JobStatus.FAILED) {
      updateRequest.error = error;
    }

    return await updateJob(env, jobId, updateRequest);
  }
);

/**
 * ジョブの文字起こしデータを保存する
 * @param env Workers環境変数
 * @param jobId ジョブID
 * @param transcript 文字起こしデータ
 */
export const saveTranscript = asyncErrorHandler(
  async (env: { JOB_KV: KVNamespace }, jobId: string, transcript: string): Promise<void> => {
    const jobStorage = createJobStorage(env.JOB_KV);
    await jobStorage.saveTranscript(jobId, transcript);
  }
);

/**
 * ジョブの文字起こしデータを取得する
 * @param env Workers環境変数
 * @param jobId ジョブID
 * @returns 文字起こしデータ
 */
export const getTranscript = asyncErrorHandler(
  async (env: { JOB_KV: KVNamespace }, jobId: string): Promise<string | null> => {
    const jobStorage = createJobStorage(env.JOB_KV);
    return await jobStorage.getTranscript(jobId);
  }
);

/**
 * 全てのジョブ一覧を取得する
 * @param env Workers環境変数
 * @returns ジョブ一覧
 */
export const listJobs = asyncErrorHandler(
  async (env: { JOB_KV: KVNamespace }, limit = 100): Promise<ListJobsResponse> => {
    const jobStorage = createJobStorage(env.JOB_KV);

    // すべてのジョブIDを取得
    const jobIds = await jobStorage.getAllJobIds(limit);

    // 各ジョブのデータを取得
    const jobs = await Promise.all(
      jobIds.map(async (jobId) => {
        const jobData = await getJob(env, jobId);
        return jobData!;
      })
    );

    // nullでないジョブだけをフィルタリング
    const validJobs = jobs.filter((job): job is JobStatusResponse => job !== null);

    return {
      jobs: validJobs,
      total: validJobs.length,
    };
  }
);
