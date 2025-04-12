/**
 * Notion API連携機能を提供します
 * @module NotionLib
 */
import { Client } from '@notionhq/client';
import {
  CreatePageParameters,
  PageObjectResponse,
  BlockObjectRequest,
  ListBlockChildrenResponse,
  PartialBlockObjectResponse,
  BlockObjectResponse
  // EmojiRequestは外部にエクスポートされていないので削除
} from '@notionhq/client/build/src/api-endpoints';
import { asyncErrorHandler } from "../utils/error";

/**
 * Notion API設定インターフェース
 */
export interface NotionApiConfig {
  apiKey: string;
  databaseId: string;
}

/**
 * Notionページプロパティ型
 */
export type NotionPropertyValue =
  | { type: "title"; value: string }
  | { type: "rich_text"; value: string }
  | { type: "date"; value: { start: string; end?: string } }
  | { type: "select"; value: string }
  | { type: "multi_select"; value: string[] }
  | { type: "number"; value: number }
  | { type: "url"; value: string }
  | { type: "checkbox"; value: boolean };

/**
 * Notionページプロパティインターフェース
 */
export interface NotionPageProperties {
  [key: string]: NotionPropertyValue;
}

/**
 * Notionページ作成オプション
 */
export interface CreatePageOptions {
  properties: NotionPageProperties;
  content?: string;
  iconEmoji?: string;
}

/**
 * Notionの絵文字アイコンの型定義
 * Notionの公式型が外部公開されていないため独自に定義
 */
interface EmojiObject {
  type: "emoji";
  emoji: string;
}

/**
 * 絵文字文字列からNotion用のEmoji型オブジェクトを作成します
 * @param emoji 絵文字文字列
 * @returns Notion API用のEmojiオブジェクト
 */
function createEmojiObject(emoji: string): any {
  return {
    type: "emoji",
    emoji: emoji
  };
}

/**
 * Notion API連携クラス
 */
export class NotionClient {
  private client: Client;
  private databaseId: string;

  /**
   * NotionClientのコンストラクタ
   * @param config Notion API設定
   */
  constructor(config: NotionApiConfig) {
    this.databaseId = config.databaseId;
    this.client = new Client({
      auth: config.apiKey,
    });
  }

  /**
   * プロパティ値をNotion API形式に変換します
   * @param property プロパティ値
   * @returns Notion API形式のプロパティオブジェクト
   */
  private convertPropertyValue(property: NotionPropertyValue): any {
    switch (property.type) {
      case "title":
        return {
          title: [
            {
              text: {
                content: property.value,
              },
            },
          ],
        };
      case "rich_text":
        return {
          rich_text: [
            {
              text: {
                content: property.value,
              },
            },
          ],
        };
      case "date":
        return {
          date: {
            start: property.value.start,
            end: property.value.end,
          },
        };
      case "select":
        return {
          select: {
            name: property.value,
          },
        };
      case "multi_select":
        return {
          multi_select: property.value.map(name => ({ name })),
        };
      case "number":
        return {
          number: property.value,
        };
      case "url":
        return {
          url: property.value,
        };
      case "checkbox":
        return {
          checkbox: property.value,
        };
      default:
        throw new Error(`Unsupported property type: ${(property as any).type}`);
    }
  }

  /**
   * マークダウンテキストをNotion APIブロック形式に変換します
   * @param markdown マークダウンテキスト
   * @returns Notion APIブロック形式
   */
  private markdownToBlocks(markdown: string): BlockObjectRequest[] {
    // 簡易実装: 段落ごとにテキストブロックを作成
    const paragraphs = markdown.split(/\n\s*\n/);

    return paragraphs.map(paragraph => {
      if (paragraph.trim().startsWith("# ")) {
        // 見出し1
        return {
          object: "block",
          type: "heading_1",
          heading_1: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: paragraph.trim().replace(/^# /, ""),
                },
              },
            ],
          },
        };
      } else if (paragraph.trim().startsWith("## ")) {
        // 見出し2
        return {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: paragraph.trim().replace(/^## /, ""),
                },
              },
            ],
          },
        };
      } else if (paragraph.trim().startsWith("### ")) {
        // 見出し3
        return {
          object: "block",
          type: "heading_3",
          heading_3: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: paragraph.trim().replace(/^### /, ""),
                },
              },
            ],
          },
        };
      } else if (paragraph.trim().startsWith("- ")) {
        // 箇条書き
        const items = paragraph.split("\n").map(line => line.trim().replace(/^- /, ""));
        return {
          object: "block",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: items.join("\n"),
                },
              },
            ],
          },
        };
      } else {
        // 通常の段落
        return {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: paragraph,
                },
              },
            ],
          },
        };
      }
    });
  }

  /**
   * データベースにページを作成します
   * @param options ページ作成オプション
   * @returns 作成されたページID
   */
  createPage = asyncErrorHandler(
    async (options: CreatePageOptions): Promise<string> => {
      const properties: Record<string, any> = {};

      // プロパティの変換
      Object.entries(options.properties).forEach(([key, value]) => {
        properties[key] = this.convertPropertyValue(value);
      });

      const payload: CreatePageParameters = {
        parent: {
          database_id: this.databaseId,
        },
        properties,
      };

      // コンテンツがある場合はブロックの配列を用意
      const blocks = options.content ? this.markdownToBlocks(options.content) : [];

      // アイコン設定 - 独自定義の型でオブジェクトを作成
      if (options.iconEmoji) {
        payload.icon = createEmojiObject(options.iconEmoji);
      }

      // ページを作成
      const response = await this.client.pages.create(payload);

      // コンテンツがある場合は、作成したページにブロックを追加
      if (blocks.length > 0) {
        await this.client.blocks.children.append({
          block_id: response.id,
          children: blocks,
        });
      }

      return response.id;
    }
  );

  /**
   * 既存ページの内容を更新します
   * @param pageId 更新するページID
   * @param content 更新するマークダウンコンテンツ
   * @returns 更新が成功したかどうか
   */
  updatePageContent = asyncErrorHandler(
    async (pageId: string, content: string): Promise<boolean> => {
      const blocks = this.markdownToBlocks(content);

      await this.client.blocks.children.append({
        block_id: pageId,
        children: blocks,
      });

      return true;
    }
  );

  /**
   * データベースからページを取得します
   * @param filter フィルター条件
   * @param pageSize 取得件数
   * @returns ページデータの配列
   */
  queryDatabase = asyncErrorHandler(
    async (
      filter?: any,
      pageSize: number = 100
    ): Promise<PageObjectResponse[]> => {
      const response = await this.client.databases.query({
        database_id: this.databaseId,
        filter,
        page_size: pageSize,
      });

      return response.results as PageObjectResponse[];
    }
  );

  /**
   * ページの既存ブロックをすべて削除してから新しいコンテンツを追加します
   * @param pageId ページID
   * @param content 新しいマークダウンコンテンツ
   * @returns 更新が成功したかどうか
   */
  replacePageContent = asyncErrorHandler(
    async (pageId: string, content: string): Promise<boolean> => {
      // 既存のブロックを取得
      const existingBlocks = await this.client.blocks.children.list({
        block_id: pageId,
      });

      // 既存のブロックをすべて削除
      for (const block of existingBlocks.results) {
        await this.client.blocks.delete({
          block_id: block.id,
        });
      }

      // 新しいコンテンツを追加
      const blocks = this.markdownToBlocks(content);
      await this.client.blocks.children.append({
        block_id: pageId,
        children: blocks,
      });

      return true;
    }
  );

  /**
   * ページのプロパティを更新します
   * @param pageId ページID
   * @param properties 更新するプロパティ
   * @returns 更新が成功したかどうか
   */
  updatePageProperties = asyncErrorHandler(
    async (pageId: string, properties: NotionPageProperties): Promise<boolean> => {
      const convertedProperties: Record<string, any> = {};

      Object.entries(properties).forEach(([key, value]) => {
        convertedProperties[key] = this.convertPropertyValue(value);
      });

      await this.client.pages.update({
        page_id: pageId,
        properties: convertedProperties,
      });

      return true;
    }
  );
}

/**
 * デフォルトのNotion API設定を使用してNotionClientのインスタンスを作成します
 * @param env 環境変数
 * @returns NotionClientインスタンス
 */
export function createNotionClient(env: {
  NOTION_API_KEY: string;
  NOTION_DATABASE_ID: string;
}): NotionClient {
  return new NotionClient({
    apiKey: env.NOTION_API_KEY,
    databaseId: env.NOTION_DATABASE_ID,
  });
}
