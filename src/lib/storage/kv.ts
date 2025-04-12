/**
 * Cloudflare Workers KV操作機能を提供します
 * @module KVStorageLib
 */
import { asyncErrorHandler } from '../../utils/error';

/**
 * KVストレージ操作インターフェース
 */
export interface KVStorage {
  get<T>(key: string): Promise<T | null>;
  put<T>(key: string, value: T, options?: KVPutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string, limit?: number): Promise<string[]>;
}

/**
 * KV保存オプション
 */
export interface KVPutOptions {
  expirationTtl?: number; // 秒単位のTTL
  expiration?: number; // Unix時間（秒）での有効期限
}

/**
 * Cloudflare Workers KV操作クラス
 */
export class WorkersKV implements KVStorage {
  private namespace: KVNamespace;

  /**
   * WorkersKVのコンストラクタ
   * @param namespace KVNamespace
   */
  constructor(namespace: KVNamespace) {
    this.namespace = namespace;
  }

  /**
   * KVストレージからデータを取得します
   * @param key キー
   * @returns 取得したデータ（無い場合はnull）
   */
  get = asyncErrorHandler(async <T>(key: string): Promise<T | null> => {
    const value = await this.namespace.get(key, 'json');
    return value as T | null;
  });

  /**
   * KVストレージにデータを保存します
   * @param key キー
   * @param value 保存するデータ
   * @param options 保存オプション
   */
  put = asyncErrorHandler(
    async <T>(key: string, value: T, options?: KVPutOptions): Promise<void> => {
      await this.namespace.put(key, JSON.stringify(value), options);
    }
  );

  /**
   * KVストレージからデータを削除します
   * @param key キー
   */
  delete = asyncErrorHandler(async (key: string): Promise<void> => {
    await this.namespace.delete(key);
  });

  /**
   * KVストレージのキー一覧を取得します
   * @param prefix キーのプレフィックス
   * @param limit 取得上限数
   * @returns キーのリスト
   */
  list = asyncErrorHandler(async (prefix?: string, limit = 100): Promise<string[]> => {
    const result = await this.namespace.list({ prefix, limit });
    return result.keys.map((k) => k.name);
  });

  /**
   * 生のテキストデータを取得します（大きなデータ用）
   * @param key キー
   * @returns テキストデータ
   */
  getText = asyncErrorHandler(async (key: string): Promise<string | null> => {
    return await this.namespace.get(key, 'text');
  });

  /**
   * 生のテキストデータを保存します（大きなデータ用）
   * @param key キー
   * @param value テキストデータ
   * @param options 保存オプション
   */
  putText = asyncErrorHandler(
    async (key: string, value: string, options?: KVPutOptions): Promise<void> => {
      await this.namespace.put(key, value, options);
    }
  );
}

/**
 * ジョブデータ用のKVストレージラッパー
 */
export class JobStorage {
  private kv: WorkersKV;

  /**
   * JobStorageのコンストラクタ
   * @param kv KVストレージ
   */
  constructor(kv: WorkersKV) {
    this.kv = kv;
  }

  /**
   * ジョブデータを保存します
   * @param jobId ジョブID
   * @param data ジョブデータ
   */
  saveJob = asyncErrorHandler(async <T>(jobId: string, data: T): Promise<void> => {
    await this.kv.put(`job:${jobId}`, data);
  });

  /**
   * ジョブデータを取得します
   * @param jobId ジョブID
   * @returns ジョブデータ
   */
  getJob = asyncErrorHandler(async <T>(jobId: string): Promise<T | null> => {
    return await this.kv.get<T>(`job:${jobId}`);
  });

  /**
   * 文字起こしデータを保存します
   * @param jobId ジョブID
   * @param transcript 文字起こしデータ
   */
  saveTranscript = asyncErrorHandler(async (jobId: string, transcript: string): Promise<void> => {
    await this.kv.putText(`transcript:${jobId}`, transcript);
  });

  /**
   * 文字起こしデータを取得します
   * @param jobId ジョブID
   * @returns 文字起こしデータ
   */
  getTranscript = asyncErrorHandler(async (jobId: string): Promise<string | null> => {
    return await this.kv.getText(`transcript:${jobId}`);
  });

  /**
   * すべてのジョブIDを取得します
   * @param limit 取得上限数
   * @returns ジョブIDのリスト
   */
  getAllJobIds = asyncErrorHandler(async (limit = 100): Promise<string[]> => {
    const keys = await this.kv.list('job:', limit);
    return keys.map((key) => key.replace('job:', ''));
  });

  /**
   * ジョブデータを更新します
   * @param jobId ジョブID
   * @param updater 更新関数
   */
  updateJob = asyncErrorHandler(
    async <T extends Record<string, any>>(
      jobId: string,
      updater: (data: T | null) => T
    ): Promise<void> => {
      const currentData = await this.getJob<T>(jobId);
      const updatedData = updater(currentData);
      await this.saveJob(jobId, updatedData);
    }
  );
}

/**
 * KVストレージとJobStorageのインスタンスを作成します
 * @param namespace KVNamespace
 * @returns JobStorageインスタンス
 */
export function createJobStorage(namespace: KVNamespace): JobStorage {
  const kv = new WorkersKV(namespace);
  return new JobStorage(kv);
}
