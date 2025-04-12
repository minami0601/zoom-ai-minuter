/**
 * VTT形式の文字起こしデータを構造化テキストに変換する機能
 * @module TranscriptFormat
 */
import { TranscriptEntry, StructuredTranscript, TranscriptMetadata, VttParseOptions } from './domain';
import { asyncErrorHandler } from '../../utils/error';

/**
 * VTTのタイムスタンプを秒数に変換
 * @param timestamp HH:MM:SS.mmm形式のタイムスタンプ
 * @returns 秒数（浮動小数点）
 */
export function timeToSeconds(timestamp: string): number {
  const parts = timestamp.split(':');
  let seconds = 0;

  // 時間の部分
  if (parts.length >= 3) {
    seconds += parseInt(parts[0], 10) * 3600; // 時間を秒に
    seconds += parseInt(parts[1], 10) * 60;   // 分を秒に
    seconds += parseFloat(parts[2]);          // 秒とミリ秒
  }
  // MM:SS.mmm形式の場合
  else if (parts.length === 2) {
    seconds += parseInt(parts[0], 10) * 60;   // 分を秒に
    seconds += parseFloat(parts[1]);          // 秒とミリ秒
  }

  return seconds;
}

/**
 * 秒数をHH:MM:SS形式に変換
 * @param totalSeconds 秒数
 * @returns HH:MM:SS形式の文字列
 */
export function secondsToTimeString(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * VTT形式の文字列から話者名を抽出
 * @param line VTTの行テキスト
 * @returns 抽出された話者名または空文字
 */
export function extractSpeaker(line: string): string {
  // 典型的な話者パターン: <v 鈴木太郎>こんにちは
  const speakerMatch = line.match(/<v[^>]*>([^<]*)<\/v>/i) || line.match(/<v[^>]*>([^<]*)/i);

  if (speakerMatch && speakerMatch[1]) {
    return speakerMatch[1].trim();
  }

  // 別のパターン: 鈴木太郎: こんにちは
  const colonMatch = line.match(/^([^:]+):\s*(.*)/);
  if (colonMatch && colonMatch[1]) {
    return colonMatch[1].trim();
  }

  return '';
}

/**
 * VTT形式の文字列からテキスト部分のみを抽出
 * @param line VTTの行テキスト
 * @param removeSpeaker 話者部分を除去するかどうか
 * @returns クリーンなテキスト
 */
export function extractCleanText(line: string, removeSpeaker: boolean = true): string {
  // HTMLタグを除去
  let cleanText = line.replace(/<[^>]*>/g, '');

  // 話者部分を除去（例: "鈴木太郎: "）
  if (removeSpeaker) {
    const colonMatch = cleanText.match(/^([^:]+):\s*(.*)/);
    if (colonMatch && colonMatch[2]) {
      cleanText = colonMatch[2];
    }
  }

  return cleanText.trim();
}

/**
 * VTT形式の文字起こしを解析して構造化する
 * @param vttContent VTTファイルの内容
 * @param metadata 文字起こしメタデータ
 * @param options 解析オプション
 * @returns 構造化された文字起こしデータ
 */
export const parseVttTranscript = asyncErrorHandler(
  async (
    vttContent: string,
    metadata: TranscriptMetadata,
    options: VttParseOptions = {}
  ): Promise<StructuredTranscript> => {
    const { extractSpeakers = true, combineLines = true, removeFiller = false } = options;

    // 結果格納用の配列
    const entries: TranscriptEntry[] = [];
    // 話者リスト
    const speakerSet = new Set<string>();

    // VTTを行に分割
    const lines = vttContent.split('\n');

    let i = 0;
    // VTTヘッダーをスキップ
    while (i < lines.length && !lines[i].includes('-->')) {
      i++;
    }

    // エントリを解析
    let currentEntry: Partial<TranscriptEntry> | null = null;

    for (; i < lines.length; i++) {
      const line = lines[i].trim();

      // タイムスタンプ行
      if (line.includes('-->')) {
        // 前のエントリを追加
        if (currentEntry?.text && currentEntry.startTime && currentEntry.endTime) {
          entries.push(currentEntry as TranscriptEntry);
        }

        // 新しいエントリの開始
        const timeParts = line.split(' --> ');
        currentEntry = {
          startTime: timeParts[0],
          endTime: timeParts[1],
          text: '',
        };
      }
      // テキスト行
      else if (line && currentEntry) {
        // 話者の抽出
        if (extractSpeakers && !currentEntry.speaker) {
          const speaker = extractSpeaker(line);
          if (speaker) {
            currentEntry.speaker = speaker;
            speakerSet.add(speaker);
          }
        }

        // テキストを追加
        const cleanText = extractCleanText(line);
        if (cleanText) {
          if (currentEntry.text) {
            currentEntry.text += ' ' + cleanText;
          } else {
            currentEntry.text = cleanText;
          }
        }
      }
    }

    // 最後のエントリを追加
    if (currentEntry?.text && currentEntry.startTime && currentEntry.endTime) {
      entries.push(currentEntry as TranscriptEntry);
    }

    // 同一話者の連続した発言を結合
    const finalEntries = combineLines ? combineConsecutiveSpeakerLines(entries) : entries;

    // フィラーワードを除去
    const cleanedEntries = removeFiller ? removeFillerWords(finalEntries) : finalEntries;

    // メタデータを更新
    metadata.speakerCount = speakerSet.size;
    metadata.speakers = Array.from(speakerSet);

    // すべてのテキストを結合
    const rawText = cleanedEntries.map(entry => entry.text).join('\n');

    return {
      metadata,
      entries: cleanedEntries,
      rawText,
    };
  }
);

/**
 * 同一話者の連続した発言を結合
 * @param entries 文字起こしエントリの配列
 * @returns 結合されたエントリの配列
 */
function combineConsecutiveSpeakerLines(entries: TranscriptEntry[]): TranscriptEntry[] {
  const result: TranscriptEntry[] = [];
  let currentGroup: TranscriptEntry | null = null;

  for (const entry of entries) {
    // 最初のエントリまたは話者が変わった場合、新しいグループを作成
    if (!currentGroup || currentGroup.speaker !== entry.speaker) {
      if (currentGroup) {
        result.push(currentGroup);
      }

      currentGroup = { ...entry };
    }
    // 同じ話者の場合、テキストを結合して終了時間を更新
    else {
      currentGroup.text += ' ' + entry.text;
      currentGroup.endTime = entry.endTime;
    }
  }

  // 最後のグループを追加
  if (currentGroup) {
    result.push(currentGroup);
  }

  return result;
}

/**
 * フィラーワードを除去
 * @param entries 文字起こしエントリの配列
 * @returns フィラーワードを除去したエントリの配列
 */
function removeFillerWords(entries: TranscriptEntry[]): TranscriptEntry[] {
  // 日本語と英語の一般的なフィラーワード
  const fillerPatterns = [
    /\bあの(?:\s|$|\b)/g,
    /\bえーと(?:\s|$|\b)/g,
    /\bえっと(?:\s|$|\b)/g,
    /\bあー(?:\s|$|\b)/g,
    /\bまあ(?:\s|$|\b)/g,
    /\bうーん(?:\s|$|\b)/g,
    /\bその(?:\s|$|\b)/g,
    /\bなんか(?:\s|$|\b)/g,
    /\bum+(?:\s|$|\b)/gi,
    /\buh+(?:\s|$|\b)/gi,
    /\bah+(?:\s|$|\b)/gi,
    /\blike(?:\s|$|\b)/gi,
    /\byou\s+know(?:\s|$|\b)/gi,
    /\bwell(?:\s|$|\b)/gi,
    /\bso(?:\s|$|\b)/gi,
    /\bbasically(?:\s|$|\b)/gi,
    /\bactually(?:\s|$|\b)/gi,
    /\bliterally(?:\s|$|\b)/gi,
  ];

  // 冗長表現
  const redundantPatterns = [
    /\bあのですね(?:\s|$|\b)/g,
    /\bということで(?:\s|$|\b)/g,
    /\bといいますか(?:\s|$|\b)/g,
    /\bというか(?:\s|$|\b)/g,
  ];

  return entries.map(entry => {
    let cleanedText = entry.text;

    // フィラーワードを除去
    for (const pattern of [...fillerPatterns, ...redundantPatterns]) {
      cleanedText = cleanedText.replace(pattern, ' ');
    }

    // 複数の空白を1つに置換
    cleanedText = cleanedText.replace(/\s+/g, ' ').trim();

    return {
      ...entry,
      text: cleanedText,
    };
  });
}

/**
 * 構造化された文字起こしデータをマークダウンに変換
 * @param transcript 構造化された文字起こしデータ
 * @returns マークダウン形式のテキスト
 */
export function transcriptToMarkdown(transcript: StructuredTranscript): string {
  // メタデータセクション
  let markdown = `# 会議文字起こし: ${transcript.metadata.meetingTopic || '無題'}\n\n`;

  if (transcript.metadata.meetingDate) {
    markdown += `日時: ${transcript.metadata.meetingDate}\n\n`;
  }

  markdown += '## 参加者\n\n';
  const speakers = transcript.metadata.speakers || [];
  speakers.forEach(speaker => {
    markdown += `- ${speaker}\n`;
  });

  markdown += '\n## 会話内容\n\n';

  // 発言内容
  transcript.entries.forEach(entry => {
    const timeStr = entry.startTime.split('.')[0]; // ミリ秒部分を除去
    const speaker = entry.speaker ? `**${entry.speaker}**` : '匿名';

    markdown += `### ${timeStr}\n\n${speaker}: ${entry.text}\n\n`;
  });

  return markdown;
}
