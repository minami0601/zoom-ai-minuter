/**
 * Notionページ用テンプレート
 * @module NotionTemplates
 */
import type { MinutesData } from '../summarization/domain';
import type { ActionItem } from '../summarization/domain';
import { NotionPageSection } from './domain';

/**
 * テンプレートオプション
 */
export interface TemplateOptions {
  addTableOfContents?: boolean;
}

/**
 * マークダウンをNotionブロックに変換するヘルパー関数
 * @param markdown マークダウン形式のテキスト
 * @returns Notionブロックの配列
 */
export function markdownToNotionBlocks(markdown: string): any[] {
  // 実際の実装ではNotionのブロックオブジェクトに変換するロジックを記述
  // 簡易実装として、テキストブロックとして扱う
  return [
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: '※ このページのコンテンツはマークダウンから自動生成されています',
            },
          },
        ],
      },
    },
  ];
}

/**
 * 議事録全体のマークダウンテンプレートを生成
 * @param minutes 議事録データ
 * @param options テンプレートオプション
 * @returns マークダウン形式の議事録
 */
export function generateFullMinutesMarkdown(
  minutes: MinutesData,
  options?: TemplateOptions
): string {
  const { addTableOfContents = true } = options || {};

  // 各セクションのマークダウンを生成
  const overviewSection = generateOverviewSection(minutes);
  const summarySection = generateSummarySection(minutes);
  const decisionsSection = generateDecisionsSection(minutes);
  const actionItemsSection = generateActionItemsSection(minutes);
  const timelineSection = generateTimelineSection(minutes);

  // 目次生成（オプション）
  let tableOfContents = '';
  if (addTableOfContents) {
    tableOfContents = `
## 目次

- [会議概要](#会議概要)
- [サマリ](#サマリ)
- [決定事項](#決定事項)
- [アクションアイテム](#アクションアイテム)
- [タイムライン](#タイムライン)

---

`;
  }

  // 全セクションを結合
  return `# ${minutes.meetingTitle}

${tableOfContents}
${overviewSection}

${summarySection}

${decisionsSection}

${actionItemsSection}

${timelineSection}
`;
}

/**
 * 会議概要セクションを生成
 * @param minutes 議事録データ
 * @returns マークダウン形式の会議概要
 */
export function generateOverviewSection(minutes: MinutesData): string {
  const { meetingTitle, meetingDate, meetingCategory, meetingDuration, participants } = minutes;

  const formattedDuration = `${Math.floor(meetingDuration / 60)}時間${meetingDuration % 60}分`;
  const participantsList =
    participants.length > 0 ? participants.map((p) => `- ${p}`).join('\n') : '- 参加者情報なし';

  return `## 会議概要

- **会議名**: ${meetingTitle}
- **日時**: ${meetingDate}
- **所要時間**: ${formattedDuration}
- **カテゴリ**: ${meetingCategory}
- **参加者** (${participants.length}名):
${participantsList}

---`;
}

/**
 * 会議要約セクションを生成
 * @param minutes 議事録データ
 * @returns マークダウン形式の会議要約
 */
export function generateSummarySection(minutes: MinutesData): string {
  const { globalSummary } = minutes;

  return `## サマリ

${globalSummary.summary}

---`;
}

/**
 * 決定事項セクションを生成
 * @param minutes 議事録データ
 * @returns マークダウン形式の決定事項
 */
export function generateDecisionsSection(minutes: MinutesData): string {
  const { decisions } = minutes.globalSummary;

  const decisionsContent =
    decisions.length > 0
      ? decisions.map((decision) => `- ${decision}`).join('\n')
      : '特に決定事項はありませんでした。';

  return `## 決定事項

${decisionsContent}

---`;
}

/**
 * アクションアイテムセクションを生成
 * @param minutes 議事録データ
 * @returns マークダウン形式のアクションアイテム
 */
export function generateActionItemsSection(minutes: MinutesData): string {
  const { actionItems } = minutes.globalSummary;

  // アクションアイテムを優先度でソート
  const sortedItems = [...actionItems].sort((a, b) => {
    const priorityMap: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return priorityMap[a.priority || 'medium'] - priorityMap[b.priority || 'medium'];
  });

  const actionItemsContent =
    sortedItems.length > 0
      ? sortedItems.map(formatActionItem).join('\n')
      : '特にアクションアイテムはありませんでした。';

  return `## アクションアイテム

${actionItemsContent}

---`;
}

/**
 * アクションアイテムをフォーマット
 * @param item アクションアイテム
 * @returns フォーマットされたマークダウン
 */
function formatActionItem(item: ActionItem): string {
  const priorityEmoji: Record<string, string> = {
    high: '🔴',
    medium: '🟡',
    low: '🟢',
  };

  const assignee = item.assignee ? `**担当者**: ${item.assignee}` : '';
  const dueDate = item.dueDate ? `**期限**: ${item.dueDate}` : '';
  const priority = `**優先度**: ${priorityEmoji[item.priority || 'medium']} ${item.priority || 'medium'}`;

  const meta = [assignee, dueDate, priority].filter(Boolean).join(' | ');

  return `- ${item.task}\n  ${meta}`;
}

/**
 * タイムラインセクションを生成
 * @param minutes 議事録データ
 * @returns マークダウン形式のタイムライン
 */
export function generateTimelineSection(minutes: MinutesData): string {
  return `## タイムライン

${minutes.timeline.rawMarkdown}`;
}

/**
 * 指定されたセクションのみを生成
 * @param minutes 議事録データ
 * @param section セクション名
 * @returns マークダウン形式のセクション
 */
export function generateSection(minutes: MinutesData, section: NotionPageSection): string {
  switch (section) {
    case NotionPageSection.OVERVIEW:
      return generateOverviewSection(minutes);
    case NotionPageSection.SUMMARY:
      return generateSummarySection(minutes);
    case NotionPageSection.DECISIONS:
      return generateDecisionsSection(minutes);
    case NotionPageSection.ACTION_ITEMS:
      return generateActionItemsSection(minutes);
    case NotionPageSection.TIMELINE:
      return generateTimelineSection(minutes);
    default:
      return '';
  }
}

/**
 * 議事録統合プロンプトを生成
 * @param globalSummary 全体要約
 * @param timeline タイムライン
 * @param meetingData 会議メタデータ
 * @returns プロンプト文字列
 */
export function generateMinutesIntegrationPrompt(
  globalSummary: string,
  timeline: string,
  meetingData: {
    title: string;
    date: string;
    duration: number;
    participants: string[];
  }
): string {
  return `
あなたは高品質な会議議事録を作成するAIアシスタントです。

## 指示
以下の要約とタイムラインを統合して、一貫性のある議事録を作成してください。
会議のメタデータと全体要約を前半に、詳細なタイムラインを後半に配置してください。

## 会議メタデータ
- タイトル: ${meetingData.title}
- 日時: ${meetingData.date}
- 所要時間: ${meetingData.duration}分
- 参加者: ${meetingData.participants.join(', ')}

## 全体要約
${globalSummary}

## タイムライン
${timeline}

以上を統合して、一貫性のある議事録を作成してください。重複する情報は適宜整理してください。
`;
}
