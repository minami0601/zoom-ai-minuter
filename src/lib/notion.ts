/**
 * Notion API連携機能を提供します
 * @module NotionLib
 */
import { Client as NotionClient } from '@notionhq/client';
import { asyncErrorHandler } from '../utils/error';

/**
 * Notion API設定インターフェース
 */
export interface NotionApiConfig {
  apiKey: string;
  databaseId: string;
}

/**
 * Notionページ作成オプション
 */
export interface CreatePageOptions {
  properties: Record<string, any>;
  content: string;
  iconEmoji?: string;
}

/**
 * Notionページ更新オプション
 */
export interface UpdatePageOptions {
  properties?: Record<string, any>;
  content?: string;
  iconEmoji?: string;
}

/**
 * Notion API連携クラス
 */
export class NotionService {
  private client: NotionClient;
  private config: NotionApiConfig;

  /**
   * NotionServiceのコンストラクタ
   * @param config Notion API設定
   */
  constructor(config: NotionApiConfig) {
    this.config = config;
    this.client = new NotionClient({
      auth: config.apiKey,
    });
  }

  /**
   * Notionデータベースにページを作成します
   * @param options ページ作成オプション
   * @returns 作成されたページID
   */
  createPage = asyncErrorHandler(async (options: CreatePageOptions): Promise<string> => {
    const { properties, content, iconEmoji } = options;

    // ページ作成パラメータを構築
    const createParams: any = {
      parent: {
        database_id: this.config.databaseId,
      },
      properties: properties,
    };

    // アイコンの追加（指定されている場合）
    if (iconEmoji) {
      createParams.icon = {
        type: 'emoji',
        emoji: iconEmoji,
      };
    }

    try {
      // Notionクライアントを使用してページを作成
      const response = await this.client.pages.create(createParams);

      // コンテンツを追加
      if (content) {
        await this.appendContentToPage(response.id, content);
      }

      return response.id;
    } catch (error: any) {
      throw new Error(`Notionページ作成エラー: ${error.message}`);
    }
  });

  /**
   * Notionページを更新します
   * @param pageId 更新対象のページID
   * @param options 更新オプション
   */
  updatePage = asyncErrorHandler(
    async (pageId: string, options: UpdatePageOptions): Promise<void> => {
      const { properties, content, iconEmoji } = options;

      try {
        // プロパティの更新
        if (properties || iconEmoji) {
          const updateParams: any = {
            page_id: pageId,
          };

          if (properties) {
            updateParams.properties = properties;
          }

          if (iconEmoji) {
            updateParams.icon = {
              type: 'emoji',
              emoji: iconEmoji,
            };
          }

          await this.client.pages.update(updateParams);
        }

        // コンテンツの更新
        if (content) {
          // 既存のブロックを取得
          const { results } = await this.client.blocks.children.list({
            block_id: pageId,
          });

          // 既存のブロックを削除（最初のブロックは保持）
          for (const block of results.slice(1)) {
            await this.client.blocks.delete({
              block_id: block.id,
            });
          }

          // 新しいコンテンツを追加
          await this.appendContentToPage(pageId, content);
        }
      } catch (error: any) {
        throw new Error(`Notionページ更新エラー: ${error.message}`);
      }
    }
  );

  /**
   * 既存のNotionページにコンテンツを追加します
   * @param pageId ページID
   * @param content マークダウン形式のコンテンツ
   */
  private appendContentToPage = asyncErrorHandler(
    async (pageId: string, content: string): Promise<void> => {
      try {
        // マークダウンをNotionブロックに変換
        const blocks = this.markdownToNotionBlocks(content);

        // ブロックを追加
        await this.client.blocks.children.append({
          block_id: pageId,
          children: blocks,
        });
      } catch (error: any) {
        throw new Error(`Notionコンテンツ追加エラー: ${error.message}`);
      }
    }
  );

  /**
   * マークダウンからNotionブロックへの変換
   * @param markdown マークダウンテキスト
   * @returns Notionブロックの配列
   */
  private markdownToNotionBlocks(markdown: string): any[] {
    // 簡易実装: マークダウンブロックとして追加
    return [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content: markdown,
              },
            },
          ],
        },
      },
    ];
  }
}

/**
 * NotionServiceのインスタンスを作成します
 * @param config API設定
 * @returns NotionServiceインスタンス
 */
export function createNotionClient(config: {
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;
}): NotionService {
  return new NotionService({
    apiKey: config.NOTION_API_KEY,
    databaseId: config.NOTION_DATABASE_ID,
  });
}
