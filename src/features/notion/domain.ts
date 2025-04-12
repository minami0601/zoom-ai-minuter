/**
 * Notion連携のドメインモデルと型定義
 * @module NotionDomain
 */
import type { MeetingCategory } from '../classification/domain';
import type { MinutesData } from '../summarization/domain';

/**
 * Notion出力設定インターフェース
 */
export interface NotionOutputConfig {
  databaseId: string;
  iconEmoji?: string; // デフォルトのアイコン絵文字
  addTableOfContents?: boolean; // 目次を追加するかどうか
}

/**
 * Notion出力リクエスト
 */
export interface NotionOutputRequest {
  jobId: string;
  minutes: MinutesData;
  config?: NotionOutputConfig;
}

/**
 * Notion出力結果
 */
export interface NotionOutputResult {
  success: boolean;
  notionPageId: string;
  notionPageUrl: string;
  error?: string;
}

/**
 * Notionページのセクション
 */
export enum NotionPageSection {
  OVERVIEW = 'overview',
  SUMMARY = 'summary',
  DECISIONS = 'decisions',
  ACTION_ITEMS = 'actionItems',
  TIMELINE = 'timeline',
}

/**
 * NotionプロパティマッピングのOprion設定
 */
export interface PropertyMappingOptions {
  categoryEmojis?: Record<MeetingCategory, string>;
  defaultIconEmoji?: string;
}

/**
 * カテゴリとNotion用の絵文字マッピング
 */
export const CATEGORY_EMOJI_MAP: Record<MeetingCategory, string> = {
  internalMeeting: '📊',
  smallTalk: '☕',
  private: '🔒',
  other: '❓',
};

/**
 * 会議議事録データをNotionプロパティに変換
 * @param minutes 議事録データ
 * @param options オプション設定
 * @returns Notionプロパティマッピング
 */
export function mapMinutesToNotionProperties(
  minutes: MinutesData,
  options?: PropertyMappingOptions
): Record<string, any> {
  // デフォルトオプションとマージ
  const opts = {
    categoryEmojis: CATEGORY_EMOJI_MAP,
    defaultIconEmoji: '📝',
    ...options,
  };

  // 決定事項のテキスト化
  const decisionsText =
    minutes.globalSummary.decisions.length > 0
      ? minutes.globalSummary.decisions.join('\n')
      : '特に決定事項はありませんでした';

  // アクションアイテムのテキスト化
  const actionItemsText =
    minutes.globalSummary.actionItems.length > 0
      ? minutes.globalSummary.actionItems
          .map(
            (item) => `- ${item.task} (担当: ${item.assignee || '未定'}, 優先度: ${item.priority})`
          )
          .join('\n')
      : '特にアクションアイテムはありませんでした';

  // カテゴリに対応する絵文字を取得
  const categoryEmoji = opts.categoryEmojis[minutes.meetingCategory] || '';

  // Notionプロパティを組み立て
  return {
    // タイトルプロパティ
    Title: {
      title: [
        {
          text: {
            content: `${categoryEmoji} ${minutes.meetingTitle}`,
          },
        },
      ],
    },
    // 日付プロパティ
    Date: {
      date: {
        start: minutes.meetingDate,
      },
    },
    // カテゴリプロパティ
    Category: {
      select: {
        name: minutes.meetingCategory,
      },
    },
    // 会議時間プロパティ
    Duration: {
      number: minutes.meetingDuration,
    },
    // 参加者数プロパティ
    'Participant Count': {
      number: minutes.participantCount,
    },
    // 参加者プロパティ
    Participants: {
      rich_text: [
        {
          text: {
            content: minutes.participants.join(', '),
          },
        },
      ],
    },
    // 要約プロパティ
    Summary: {
      rich_text: [
        {
          text: {
            content: minutes.globalSummary.summary.substring(0, 2000), // Notionの制限に対応
          },
        },
      ],
    },
    // 決定事項プロパティ
    Decisions: {
      rich_text: [
        {
          text: {
            content: decisionsText.substring(0, 2000), // Notionの制限に対応
          },
        },
      ],
    },
    // アクションアイテムプロパティ
    'Action Items': {
      rich_text: [
        {
          text: {
            content: actionItemsText.substring(0, 2000), // Notionの制限に対応
          },
        },
      ],
    },
    // Zoom会議IDプロパティ
    'Zoom Meeting ID': {
      rich_text: [
        {
          text: {
            content: minutes.meetingTitle.split(' ')[0] || 'Unknown', // 会議IDがあれば抽出
          },
        },
      ],
    },
  };
}
