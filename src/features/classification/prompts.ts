/**
 * 会議分類用のGemini AIプロンプトテンプレート
 * @module ClassificationPrompts
 */
import { ClassificationOptions } from './domain';

/**
 * テキストサンプルを準備する
 * @param fullText 文字起こしの全文
 * @param options 分類オプション
 * @returns サンプリングされたテキスト
 */
export function prepareTextSample(fullText: string, options?: ClassificationOptions): string {
  const maxLength = options?.maxTextLength || 8000; // デフォルト8000文字
  const sampleMethod = options?.sampleMethod || 'start'; // デフォルトは先頭から

  // テキストが最大長より短い場合はそのまま使用
  if (fullText.length <= maxLength) {
    return fullText;
  }

  // テキストをサンプリング
  switch (sampleMethod) {
    case 'start':
      // 先頭から指定文字数
      return fullText.substring(0, maxLength);
    case 'end':
      // 末尾から指定文字数
      return fullText.substring(fullText.length - maxLength);
    case 'middle':
      // 中間部分から指定文字数
      const startPos = Math.floor((fullText.length - maxLength) / 2);
      return fullText.substring(startPos, startPos + maxLength);
    case 'random':
      // ランダムな位置から指定文字数（ただし末尾を超えないよう調整）
      const maxStartPos = fullText.length - maxLength;
      const randomStart = Math.floor(Math.random() * maxStartPos);
      return fullText.substring(randomStart, randomStart + maxLength);
    case 'all':
      // 全文から均等にサンプリング
      const totalChunks = Math.ceil(fullText.length / maxLength);
      const chunkSize = Math.floor(fullText.length / totalChunks);
      let result = '';
      for (let i = 0; i < totalChunks; i++) {
        // 各チャンクの先頭部分を少しだけ抽出
        const chunkStart = i * chunkSize;
        const sampleSize = Math.min(chunkSize / 4, 500); // チャンクの1/4か500文字のうち小さい方
        result += fullText.substring(chunkStart, chunkStart + sampleSize) + '\n...\n';
      }
      return result;
    default:
      // デフォルトは先頭から
      return fullText.substring(0, maxLength);
  }
}

/**
 * 会議分類用のプロンプトを生成する
 * @param text 分類対象のテキスト
 * @returns プロンプト文字列
 */
export const generateClassifyMeetingPrompt = (text: string): string => {
  return `あなたは会議の文字起こしデータを高精度で分類する専門AIです。
以下の分類基準に従って、入力される会議テキストを分析してください。

# 分類カテゴリーと判断基準

## smallTalk
- 業務に直接関係のない雑談
- キーワード例: 週末の予定、天気、食事

## internalMeeting
- プロジェクト進捗や課題の共有
- キーワード例: タスク、進捗、スケジュール

## private
- 個人的な相談や評価
- キーワード例: 相談、キャリア、評価

## other
- 上記に分類できない場合

# 出力形式
必ず以下のJSON形式で出力し、余分なテキストは含めないでください：
{
  "category": "選択したカテゴリー",
  "reason": "選択理由の簡潔な説明（100文字以内）"
}

文字起こしは以下です:
${text}
`;
};

/**
 * より詳細な分類のためのプロンプト（ただし処理時間とトークン数が増加）
 * @param text 分類対象のテキスト
 * @returns プロンプト文字列
 */
export const generateDetailedClassifyMeetingPrompt = (text: string): string => {
  return `あなたは会議の文字起こしデータを高精度で分類する専門AIです。
以下の分類基準に従って、入力される会議テキストを徹底的に分析してください。

# 分類カテゴリーと詳細な判断基準

## smallTalk (雑談)
- 業務に直接関係のない雑談、私的な会話
- 判断基準:
  * 週末の予定、趣味、天気、食事などの私的なトピック
  * ビジネス上の意思決定や行動につながらない会話
  * 業務の本題に入る前の軽いやりとり

## internalMeeting (業務ミーティング)
- プロジェクトや業務に関する情報共有、意思決定の場
- 判断基準:
  * プロジェクト進捗、課題共有、タスク割り当て
  * スケジュール調整、締め切り、マイルストーンの議論
  * 製品やサービスに関する議論、ビジネス戦略の検討
  * チーム内コミュニケーションや業務プロセスの改善

## private (個人的)
- 個人的な評価、キャリア、相談など秘匿性が高い内容
- 判断基準:
  * 個人の評価面談、1on1ミーティング
  * キャリア相談、個人的な悩みの相談
  * 給与、昇進、人事に関わる秘密性の高い会話
  * 特定の個人に関する評価や批評

## other (その他)
- 上記に分類できない会議
- 判断基準:
  * 複数のカテゴリにまたがる内容
  * 分類するための情報が不足している
  * トレーニングや講義など特殊な形式の会議

# 分析ステップ
1. テキスト全体のトピックと文脈を把握する
2. 会話の目的と内容を特定する
3. 分類基準と照らし合わせて最も適切なカテゴリを選択する
4. 選択理由を明確に説明する

# 出力形式
必ず以下のJSON形式で出力し、余分なテキストは含めないでください：
{
  "category": "選択したカテゴリー（internalMeeting, smallTalk, private, otherのいずれか）",
  "reason": "選択理由の簡潔な説明（100文字以内）",
  "confidence": "高／中／低（分類の確信度）"
}

文字起こしテキスト:
${text}
`;
};
