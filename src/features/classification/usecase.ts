/**
 * 会議分類機能のユースケース
 * @module ClassificationUsecase
 */
import { createGeminiClient } from '../../lib/gemini';
import { asyncErrorHandler } from '../../utils/error';
import { JobData, JobStatus, MeetingCategory } from '../job/domain';
import { getRawJobData, updateJob } from '../job/usecase';
import { getTranscriptByJobId } from '../transcript/usecase';
import {
  type ClassificationOptions,
  type ClassificationResult,
  type ClassifyMeetingRequest,
  parseMeetingCategory,
  shouldProcessMeeting,
} from './domain';
import { generateClassifyMeetingPrompt, prepareTextSample } from './prompts';

/**
 * 会議テキストを分類する
 * @param env 環境変数
 * @param text 分類対象のテキスト
 * @param options 分類オプション
 * @returns 分類結果
 */
export const classifyText = asyncErrorHandler(
  async (
    env: { GEMINI_API_KEY: string; GEMINI_MODEL_NAME?: string },
    text: string,
    options?: ClassificationOptions
  ): Promise<ClassificationResult> => {
    // テキストサンプルの準備
    const sampleText = prepareTextSample(text, options);

    // Geminiクライアント作成
    const geminiClient = createGeminiClient(env);

    // プロンプト生成
    const prompt = generateClassifyMeetingPrompt(sampleText);

    console.log('会議分類を実行中...');

    try {
      // AIによる分類実行
      const result = await geminiClient.generateJson<{
        category: string;
        reason: string;
      }>(prompt);

      // 文字列からEnum値に変換
      const category = parseMeetingCategory(result.category);

      // 結果をログ出力
      console.log(`会議分類結果: ${category}, 理由: ${result.reason}`);

      return {
        category,
        reason: result.reason,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('会議分類中にエラーが発生しました:', error);
      // エラー時はその他カテゴリとして処理
      return {
        category: MeetingCategory.OTHER,
        reason: '分類処理中にエラーが発生したためその他カテゴリとしました',
        timestamp: new Date().toISOString(),
      };
    }
  }
);

/**
 * ジョブの文字起こしデータを取得して分類
 * @param env 環境変数
 * @param request 分類リクエスト
 * @param options 分類オプション
 * @returns 分類結果
 */
export const classifyMeeting = asyncErrorHandler(
  async (
    env: { GEMINI_API_KEY: string; GEMINI_MODEL_NAME?: string; JOB_KV: KVNamespace },
    request: ClassifyMeetingRequest,
    options?: ClassificationOptions
  ): Promise<ClassificationResult> => {
    const { jobId, text } = request;

    // テキストが直接指定されている場合はそれを使用
    if (text) {
      return await classifyText(env, text, options);
    }

    // 文字起こしデータを取得
    const transcript = await getTranscriptByJobId(env, jobId);
    if (!transcript) {
      throw new Error(`ジョブID ${jobId} の文字起こしデータが見つかりません`);
    }

    // 生テキストを抽出
    const rawText = transcript.rawText;

    // テキスト分類実行
    const result = await classifyText(env, rawText, options);

    // 生テキスト参照を追加
    result.rawText = rawText;

    return result;
  }
);

/**
 * ジョブの文字起こしデータを分類し、結果をジョブデータに保存
 * @param env 環境変数
 * @param jobId 分類対象のジョブID
 * @returns 分類結果と処理続行の判断
 */
export const classifyMeetingForJob = asyncErrorHandler(
  async (
    env: { GEMINI_API_KEY: string; GEMINI_MODEL_NAME?: string; JOB_KV: KVNamespace },
    jobId: string
  ): Promise<{ result: ClassificationResult; shouldProcess: boolean }> => {
    console.log(`ジョブ ${jobId}: 会議分類を開始します`);

    // ジョブデータ取得
    const jobData = await getRawJobData(env, jobId);
    if (!jobData) {
      throw new Error(`ジョブID ${jobId} が見つかりません`);
    }

    // 既に分類済みかチェック
    if (jobData.category) {
      console.log(`ジョブ ${jobId}: 既に分類されています (${jobData.category})`);

      const result: ClassificationResult = {
        category: jobData.category as MeetingCategory,
        reason: jobData.reason || '既存の分類結果を使用',
        timestamp: jobData.processingStartedAt || new Date().toISOString(),
      };

      return {
        result,
        shouldProcess: shouldProcessMeeting(result.category),
      };
    }

    // 分類を実行
    const result = await classifyMeeting(env, { jobId });

    // 分類結果を保存
    await updateJob(env, jobId, {
      category: result.category,
      reason: result.reason,
      status: shouldProcessMeeting(result.category)
        ? JobStatus.PROCESSING // 処理を続行する場合
        : JobStatus.SKIPPED, // 処理をスキップする場合
    });

    // 処理続行の判断
    const shouldProcess = shouldProcessMeeting(result.category);

    console.log(
      `ジョブ ${jobId}: 会議分類完了 - カテゴリ: ${result.category}, 処理続行: ${shouldProcess}`
    );

    return { result, shouldProcess };
  }
);

/**
 * 分類結果に応じて処理を続行すべきかを判断
 * @param result 分類結果
 * @returns 処理を続行すべきかどうか
 */
export const shouldContinueProcessing = (result: ClassificationResult): boolean => {
  return shouldProcessMeeting(result.category);
};
