/**
 * 要約生成用のAIプロンプトテンプレート
 * @module SummarizationPrompts
 */
import type { SummarizationOptions, TextChunk } from './domain';

/**
 * 全体要約プロンプトを生成
 * @param fullText 会議の文字起こし全文
 * @param date 会議日時
 * @param topic 会議タイトル
 * @returns プロンプト文字列
 */
export const generateGlobalSummaryPrompt = (
  fullText: string,
  date?: string,
  topic?: string
): string => {
  const meetingTopic = topic || '不明なトピック';
  const meetingDate = date || '不明な日時';

  return `
以下は会議の不完全な文字起こしです。
あなたの仕事は、この会議の議事録を明確なMarkdown形式でまとめることです。

## 全体の概要
- ミーティングの目的: [議論の主題、もしくは「不明」]
- 参加者: [参加者名または「不明」]
- 日時: ${meetingDate}
- 場所: [オンラインまたは「不明」]

## サマリ
要約のガイドライン:
- 議論の流れを論理的に整理して記載
- 重要な決定事項や懸念事項を優先的に含める
- 技術的な詳細は正確に記録
- 数値や具体的な指標は必ず含める
- 各項目は2-3文程度で具体的に記述

## 決まったこと
記載基準:
- 明確な合意が得られた事項
- 承認された計画や方針
- リソース配分に関する決定
- スケジュールの確定事項
- 技術的な選択や方向性
※ 暫定的な決定は「暫定的な決定事項：」と明記

## ネクストアクション
記載要件:
- タスクの具体的な内容
- 担当者（名前または役割)
- 期限または目標時期
- 優先順位（高/中/低）
- 依存関係がある場合はその旨を明記
※ 重要度に応じて並び替えて記載
※ タスクがない場合はセクションを省略

# 解析の注意点
- 略語や専門用語は可能な限り正式名称に展開
- 不明確な表現は文脈から補完
- 個人的な雑談は除外
- 重要な数値や指標は明確に記録
- 議論の背景や意図も可能な限り補足

以下が会議「${meetingTopic}」の文字起こしです：
${fullText}

以上の形式で議事録を作成してください。
`;
};

/**
 * トピック抽出・分析プロンプトを生成
 * @param chunk テキストチャンク
 * @param options 要約オプション
 * @returns プロンプト文字列
 */
export const generateTopicAnalysisPrompt = (
  chunk: TextChunk,
  options?: SummarizationOptions
): string => {
  const includeTimestamps = options?.includeTimestamps !== false;
  const includeSpeakers = options?.includeSpeakers !== false;
  const language = options?.language || 'ja';

  const langPrompt =
    language === 'ja'
      ? 'すべての出力を日本語で行ってください。'
      : 'Please provide all output in English.';

  return `
あなたは会議の文字起こしデータから議論のトピックを特定し、タイムライン形式で要約する専門AIです。
${langPrompt}

## 指示
以下の文字起こしデータを分析し、この部分で議論されている主なトピックを特定してください。
そして、そのトピックに関する議論の内容を簡潔に要約してください。

## 出力形式
以下のJSON形式で出力してください：

\`\`\`json
{
  "topic": "識別されたトピックのタイトル（20文字以内）",
  "startTime": "${includeTimestamps ? 'この部分の開始時間（文字起こしから取得）' : '含めない'}",
  "endTime": "${includeTimestamps ? 'この部分の終了時間（文字起こしから取得）' : '含めない'}",
  "speakers": ${includeSpeakers ? '["この部分で発言している人のリスト"]' : '[]'},
  "summary": "トピックの要約（100-200文字）",
  "keyPoints": [
    "重要なポイント1",
    "重要なポイント2",
    "重要なポイント3（最大5つまで）"
  ]
}
\`\`\`

## 文字起こしデータ（チャンク #${chunk.id}）:
${chunk.text}

注意：このチャンクに複数のトピックが含まれていると判断した場合でも、最も主要なトピック1つのみを抽出してください。
`;
};

/**
 * 決定事項抽出プロンプトを生成
 * @param text 会議文字起こし
 * @returns プロンプト文字列
 */
export const generateDecisionExtractionPrompt = (text: string): string => {
  return `
あなたは会議の文字起こしから決定事項を高精度で抽出するAIアシスタントです。

## 指示
以下の会議の文字起こしを分析し、明確に決定された事項を抽出してください。
決定事項は、参加者間で合意されたアイデア、計画、行動方針などです。

## 決定事項の判断基準
- 明示的に「決定しました」「合意しました」などの表現がある
- 全員（または権限を持つ人）が同意している
- 具体的な行動、日程、方針が決まっている
- 「〜することにしましょう」「〜する予定です」など、合意形成の表現がある

## 出力形式
決定事項をリスト形式で出力してください。各決定事項は完結した文で表現し、可能な限り以下の要素を含めてください：
- 何が決定されたか（内容）
- 誰が実行するか（担当者）
- いつまでに実行するか（期限）
- どのように実行するか（方法）

リスト形式で箇条書きにしてください。決定事項が見つからない場合は「明確な決定事項はありませんでした」と出力してください。

## 文字起こしデータ:
${text}
`;
};

/**
 * アクションアイテム抽出プロンプトを生成
 * @param text 会議文字起こし
 * @returns プロンプト文字列
 */
export const generateActionItemExtractionPrompt = (text: string): string => {
  return `
あなたは会議の文字起こしからアクションアイテム（タスク）を高精度で抽出するAIアシスタントです。

## 指示
以下の会議の文字起こしを分析し、参加者に割り当てられたタスクや「やるべきこと」を抽出してください。

## アクションアイテムの判断基準
- 「〜やっておきます」「〜調べておきます」などの約束
- 「〜お願いします」「〜担当してください」などの依頼
- 誰かに割り当てられた明確なタスク
- 期限や優先度が明示されているもの

## 出力形式
以下のJSON形式でアクションアイテムのリストを出力してください：

\`\`\`json
[
  {
    "task": "タスクの内容",
    "assignee": "担当者名または役割（不明な場合は「未定」）",
    "dueDate": "期限（明示されている場合のみ、「未定」の場合もあり）",
    "priority": "優先度（高・中・低、文脈から判断、不明な場合は「中」）"
  },
  {...}
]
\`\`\`

アクションアイテムが見つからない場合は空の配列を返してください。

## 文字起こしデータ:
${text}
`;
};

/**
 * 単一チャンクから直接タイムラインを生成するプロンプト
 * @param chunkText チャンクテキスト
 * @returns プロンプト文字列
 */
export const generateDirectTimelinePrompt = (chunkText: string): string => {
  return `
以下は会議文字起こしの一部です。
このチャンクから判別できるトピックと、その発言タイムラインをMarkdown形式で出力してください。

## トピックごとの発言タイムライン
### [トピック名]：開始時刻-終了時刻
- [HH:MM] [発話者]: [発言内容の要約]

以下がチャンク文字起こしです：
${chunkText}

上記の形式で出力してください。
`;
};

/**
 * 会議全体のタイムライン生成プロンプトを生成
 * @param topics トピックの配列
 * @returns プロンプト文字列
 */
export const generateTimelineIntegrationPrompt = (topics: any[]): string => {
  const topicsJson = JSON.stringify(topics, null, 2);

  return `
あなたは会議のタイムラインを構造化して整理するAIアシスタントです。

## 指示
以下の複数のトピック分析結果を統合して、一貫性のある会議のタイムラインを作成してください。
時系列順に並べ、繰り返しや矛盾を解消してください。

## 出力形式
以下のマークダウン形式で出力してください：

# 会議タイムライン

## トピック1：[トピック名]
- 時間帯: [開始時間] 〜 [終了時間]
- 主な話者: [話者リスト]
- 概要: [トピックの要約]
- 重要ポイント:
  - [ポイント1]
  - [ポイント2]
  - ...

## トピック2：[トピック名]
...

以下のトピック分析結果を統合してタイムラインを作成してください：
${topicsJson}
`;
};

/**
 * 議事録統合プロンプトを生成
 * @param globalSummary 全体要約
 * @param timeline タイムライン
 * @param meetingData 会議メタデータ
 * @returns プロンプト文字列
 */
export const generateMinutesIntegrationPrompt = (
  globalSummary: string,
  timeline: string,
  meetingData: {
    title: string;
    date: string;
    duration: number;
    participants: string[];
  }
): string => {
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
};
