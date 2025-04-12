/**
 * Notion出力のユースケース
 * @module NotionUsecase
 */
import { createNotionClient } from '../../lib/notion';
import { asyncErrorHandler } from '../../utils/error';
import { JobStatus } from '../job/domain';
import { updateJob } from '../job/usecase';
import {
  CATEGORY_EMOJI_MAP,
  type NotionOutputConfig,
  type NotionOutputRequest,
  type NotionOutputResult,
  mapMinutesToNotionProperties,
} from './domain';
import { generateFullMinutesMarkdown, markdownToNotionBlocks } from './templates';

/**
 * 議事録をNotionデータベースに出力する
 * @param env 環境変数
 * @param request 出力リクエスト
 * @returns 出力結果
 */
export const outputMinutesToNotion = asyncErrorHandler(
  async (
    env: {
      NOTION_API_KEY: string;
      NOTION_DATABASE_ID: string;
      JOB_KV: KVNamespace;
    },
    request: NotionOutputRequest
  ): Promise<NotionOutputResult> => {
    const { jobId, minutes, config } = request;
    const startTime = Date.now();

    try {
      console.log(`ジョブ ${jobId}: Notion出力を開始します`);

      // Notionクライアント作成
      const notionClient = createNotionClient({
        NOTION_API_KEY: env.NOTION_API_KEY,
        NOTION_DATABASE_ID: config?.databaseId || env.NOTION_DATABASE_ID,
      });

      // オプション設定
      const outputConfig: NotionOutputConfig = {
        databaseId: config?.databaseId || env.NOTION_DATABASE_ID,
        iconEmoji: config?.iconEmoji || CATEGORY_EMOJI_MAP[minutes.meetingCategory],
        addTableOfContents: config?.addTableOfContents !== false,
      };

      // ページプロパティをマッピング
      const properties = mapMinutesToNotionProperties(minutes);

      // マークダウン全文を生成
      const fullMarkdown = generateFullMinutesMarkdown(minutes, {
        addTableOfContents: outputConfig.addTableOfContents,
      });

      // Notionブロックに変換（実際には lib/notion.ts 内で実装）
      const blocks = markdownToNotionBlocks(fullMarkdown);

      // ページを作成
      console.log(`ジョブ ${jobId}: Notionページを作成中...`);
      const pageId = await notionClient.createPage({
        properties,
        content: fullMarkdown,
        iconEmoji: outputConfig.iconEmoji,
      });

      // NotionのページURLを構築
      const pageUrl = `https://www.notion.so/${pageId.replace(/-/g, '')}`;

      // ジョブステータス更新
      await updateJob(env, jobId, {
        notionPageId: pageId,
        notionPageUrl: pageUrl,
        status: JobStatus.COMPLETED,
      });

      console.log(`ジョブ ${jobId}: Notionページを作成しました - ${pageUrl}`);

      return {
        success: true,
        notionPageId: pageId,
        notionPageUrl: pageUrl,
      };
    } catch (error) {
      console.error(`ジョブ ${jobId}: Notion出力中にエラーが発生しました`, error);

      // エラーメッセージを取得
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';

      // ジョブステータスを更新
      await updateJob(env, jobId, {
        status: JobStatus.FAILED,
        error: `Notionページ作成エラー: ${errorMessage}`,
      });

      return {
        success: false,
        notionPageId: '',
        notionPageUrl: '',
        error: errorMessage,
      };
    }
  }
);

/**
 * 議事録を指定されたNotionデータベースに出力する
 * @param env 環境変数
 * @param jobId ジョブID
 * @param minutes 議事録データ
 * @param databaseId 出力先データベースID（指定がなければ環境変数から）
 * @returns Notionページ情報
 */
export const createNotionMinutes = asyncErrorHandler(
  async (
    env: {
      NOTION_API_KEY: string;
      NOTION_DATABASE_ID: string;
      JOB_KV: KVNamespace;
    },
    jobId: string,
    minutes: any,
    databaseId?: string
  ): Promise<{
    pageId: string;
    pageUrl: string;
  }> => {
    const result = await outputMinutesToNotion(env, {
      jobId,
      minutes,
      config: {
        databaseId: databaseId || env.NOTION_DATABASE_ID,
      },
    });

    if (!result.success) {
      throw new Error(result.error || 'Notionページの作成に失敗しました');
    }

    return {
      pageId: result.notionPageId,
      pageUrl: result.notionPageUrl,
    };
  }
);

/**
 * Notionページを更新する
 * @param env 環境変数
 * @param pageId 更新対象ページID
 * @param minutes 更新用議事録データ
 * @returns 更新成功フラグ
 */
export const updateNotionMinutes = asyncErrorHandler(
  async (env: { NOTION_API_KEY: string }, pageId: string, minutes: any): Promise<boolean> => {
    try {
      const notionClient = createNotionClient({
        NOTION_API_KEY: env.NOTION_API_KEY,
        NOTION_DATABASE_ID: '', // ページ更新時は不要
      });

      // プロパティとマークダウンを生成
      const properties = mapMinutesToNotionProperties(minutes);
      const markdown = generateFullMinutesMarkdown(minutes);

      // ページ更新
      await notionClient.updatePage(pageId, {
        properties,
        content: markdown,
      });

      return true;
    } catch (error) {
      console.error('Notionページ更新エラー:', error);
      return false;
    }
  }
);
