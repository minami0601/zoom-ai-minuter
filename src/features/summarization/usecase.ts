/**
 * 議事録生成（要約）機能のユースケース
 * @module SummarizationUsecase
 */
import { createGeminiClient } from '../../lib/gemini';
import { JobStatus } from '../job/domain';
import { asyncErrorHandler } from '../../utils/error';
import { updateJob, getRawJobData } from '../job/usecase';
import { getTranscriptByJobId } from '../transcript/usecase';
import {
  AI_MODEL_LIMITS,
  DEFAULT_SUMMARIZATION_OPTIONS,
  GlobalSummary,
  MeetingTimeline,
  MeetingTopic,
  MinutesData,
  SummarizationOptions,
  SummarizationResult,
  SummarizeRequest,
  TextChunk,
} from './domain';
import {
  generateActionItemExtractionPrompt,
  generateDecisionExtractionPrompt,
  generateDirectTimelinePrompt,
  generateGlobalSummaryPrompt,
  generateMinutesIntegrationPrompt,
  generateTimelineIntegrationPrompt,
  generateTopicAnalysisPrompt,
} from './prompts';

/**
 * テキストをチャンクに分割する
 * @param text 全体テキスト
 * @param options チャンク分割オプション
 * @returns テキストチャンクの配列
 */
export function splitTextIntoChunks(
  text: string,
  options?: { chunkSize?: number; chunkOverlap?: number }
): TextChunk[] {
  const chunkSize = options?.chunkSize || AI_MODEL_LIMITS.defaultChunkSize;
  const chunkOverlap = options?.chunkOverlap || AI_MODEL_LIMITS.defaultChunkOverlap;

  const chunks: TextChunk[] = [];
  let startPos = 0;
  let chunkId = 0;

  while (startPos < text.length) {
    // チャンクの終了位置を計算
    let endPos = startPos + chunkSize;
    if (endPos > text.length) {
      endPos = text.length;
    } else {
      // 文の途中で切れないようにする
      const nextPeriodPos = text.indexOf('.', endPos - 100);
      const nextNewlinePos = text.indexOf('\n', endPos - 100);

      // 次の文末か改行を探す
      if (nextPeriodPos > 0 && nextPeriodPos < endPos + 200) {
        endPos = nextPeriodPos + 1;
      } else if (nextNewlinePos > 0 && nextNewlinePos < endPos + 200) {
        endPos = nextNewlinePos + 1;
      }
    }

    // チャンクを追加
    chunks.push({
      id: chunkId++,
      text: text.substring(startPos, endPos),
    });

    // 次のチャンクの開始位置を計算（オーバーラップを考慮）
    startPos = endPos - chunkOverlap;
  }

  return chunks;
}

/**
 * 全体要約を生成する
 * @param env 環境変数
 * @param fullText 会議の全文テキスト
 * @param meetingDate 会議日時
 * @param meetingTopic 会議タイトル
 * @returns 全体要約のマークダウン
 */
export const generateGlobalSummary = asyncErrorHandler(
  async (
    env: { GEMINI_API_KEY: string; GEMINI_MODEL_NAME?: string },
    fullText: string,
    meetingDate?: string,
    meetingTopic?: string
  ): Promise<string> => {
    const geminiClient = createGeminiClient(env);

    // 全体のテキストが長すぎる場合は分割する（先頭部分のみ）
    const textToSummarize = fullText.length > AI_MODEL_LIMITS.maxInputTokens / 2
      ? fullText.substring(0, AI_MODEL_LIMITS.maxInputTokens / 2) + "\n...(以下省略)..."
      : fullText;

    // 全体要約プロンプトを生成
    const prompt = generateGlobalSummaryPrompt(textToSummarize, meetingDate, meetingTopic);

    console.log("全体要約を生成中...");

    // AIによる要約生成
    const summaryMarkdown = await geminiClient.generateText(prompt, {
      temperature: 0.2,
      maxOutputTokens: 4096,
    });

    return summaryMarkdown;
  }
);

/**
 * トピック分析を行う
 * @param env 環境変数
 * @param chunk テキストチャンク
 * @param options 要約オプション
 * @returns トピック分析結果
 */
export const analyzeTopicFromChunk = asyncErrorHandler(
  async (
    env: { GEMINI_API_KEY: string; GEMINI_MODEL_NAME?: string },
    chunk: TextChunk,
    options?: SummarizationOptions
  ): Promise<MeetingTopic> => {
    const geminiClient = createGeminiClient(env);

    // トピック分析プロンプトを生成
    const prompt = generateTopicAnalysisPrompt(chunk, options);

    // AIによるトピック分析
    const topicJson = await geminiClient.generateJson<MeetingTopic>(prompt, {
      temperature: 0.2,
    });

    return {
      ...topicJson,
      id: chunk.id,
    };
  }
);

/**
 * 全てのチャンクからトピック分析を実行
 * @param env 環境変数
 * @param chunks テキストチャンクの配列
 * @param options 要約オプション
 * @returns トピック分析結果の配列
 */
export const analyzeAllTopics = asyncErrorHandler(
  async (
    env: { GEMINI_API_KEY: string; GEMINI_MODEL_NAME?: string },
    chunks: TextChunk[],
    options?: SummarizationOptions
  ): Promise<MeetingTopic[]> => {
    // 並列処理数を制限して分析
    const topics: MeetingTopic[] = [];
    const maxConcurrent = 3; // 並列処理数

    console.log(`${chunks.length}個のチャンクからトピック分析を開始...`);

    // チャンクを小さなバッチに分けて処理
    for (let i = 0; i < chunks.length; i += maxConcurrent) {
      const batch = chunks.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map(chunk => analyzeTopicFromChunk(env, chunk, options))
      );

      topics.push(...batchResults);
      console.log(`トピック分析進捗: ${Math.min(i + maxConcurrent, chunks.length)}/${chunks.length}`);
    }

    return topics;
  }
);

/**
 * トピックからタイムラインを生成
 * @param env 環境変数
 * @param topics トピックの配列
 * @returns タイムライン
 */
export const generateTimelineFromTopics = asyncErrorHandler(
  async (
    env: { GEMINI_API_KEY: string; GEMINI_MODEL_NAME?: string },
    topics: MeetingTopic[]
  ): Promise<MeetingTimeline> => {
    const geminiClient = createGeminiClient(env);

    // タイムラインを時系列順に整理
    const sortedTopics = [...topics].sort((a, b) => {
      // 時間情報がある場合は時間順、なければID順
      if (a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      return a.id - b.id;
    });

    console.log("タイムラインを生成中...");

    // タイムライン統合プロンプトを生成
    const prompt = generateTimelineIntegrationPrompt(sortedTopics);

    // AIによるタイムライン生成
    const timelineMarkdown = await geminiClient.generateText(prompt, {
      temperature: 0.2,
      maxOutputTokens: 4096,
    });

    return {
      topics: sortedTopics,
      rawMarkdown: timelineMarkdown,
    };
  }
);

/**
 * チャンクから直接タイムラインを生成する
 * @param env 環境変数
 * @param chunk テキストチャンク
 * @returns タイムラインのマークダウン
 */
export const generateDirectTimelineFromChunk = asyncErrorHandler(
  async (
    env: { GEMINI_API_KEY: string; GEMINI_MODEL_NAME?: string },
    chunk: TextChunk
  ): Promise<string> => {
    const geminiClient = createGeminiClient(env);

    // 直接タイムライン生成プロンプトを使用
    const prompt = generateDirectTimelinePrompt(chunk.text);

    // AIによるタイムライン直接生成
    return await geminiClient.generateText(prompt, {
      temperature: 0.2,
    });
  }
);

/**
 * テキストから決定事項を抽出
 * @param env 環境変数
 * @param text テキスト
 * @returns 決定事項の配列
 */
export const extractDecisions = asyncErrorHandler(
  async (
    env: { GEMINI_API_KEY: string; GEMINI_MODEL_NAME?: string },
    text: string
  ): Promise<string[]> => {
    const geminiClient = createGeminiClient(env);

    // トピック分析プロンプトを生成
    const prompt = generateDecisionExtractionPrompt(text);

    // AIによる決定事項抽出
    const decisionsText = await geminiClient.generateText(prompt, {
      temperature: 0.1,
    });

    // テキストを行に分割して配列に変換
    const decisions = decisionsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('- ') || line.startsWith('* '))
      .map(line => line.substring(2).trim());

    // 「明確な決定事項はありません」などの場合は空配列を返す
    if (decisions.length === 1 && decisions[0].includes('決定事項はありません')) {
      return [];
    }

    return decisions;
  }
);

/**
 * テキストからアクションアイテムを抽出
 * @param env 環境変数
 * @param text テキスト
 * @returns アクションアイテムの配列
 */
export const extractActionItems = asyncErrorHandler(
  async (
    env: { GEMINI_API_KEY: string; GEMINI_MODEL_NAME?: string },
    text: string
  ): Promise<any[]> => {
    const geminiClient = createGeminiClient(env);

    // アクションアイテム抽出プロンプトを生成
    const prompt = generateActionItemExtractionPrompt(text);

    // AIによるアクションアイテム抽出
    const actionItems = await geminiClient.generateJson<any[]>(prompt, {
      temperature: 0.1,
    });

    return actionItems || [];
  }
);

/**
 * 全体要約から構造化されたデータを抽出
 * @param summaryMarkdown 全体要約のマークダウン
 * @returns 構造化された全体要約
 */
export const parseGlobalSummary = (summaryMarkdown: string): GlobalSummary => {
  // 目的を抽出
  const purposeMatch = summaryMarkdown.match(/ミーティングの目的:([^\n]+)/);
  const purpose = purposeMatch ? purposeMatch[1].trim() : '不明';

  // 参加者を抽出
  const participantsMatch = summaryMarkdown.match(/参加者:([^\n]+)/);
  const participantsText = participantsMatch ? participantsMatch[1].trim() : '不明';
  const participants = participantsText
    .split(',')
    .map(p => p.trim())
    .filter(p => p && p !== '不明');

  // 日時を抽出
  const dateMatch = summaryMarkdown.match(/日時:([^\n]+)/);
  const date = dateMatch ? dateMatch[1].trim() : '不明';

  // 場所を抽出
  const locationMatch = summaryMarkdown.match(/場所:([^\n]+)/);
  const location = locationMatch ? locationMatch[1].trim() : 'オンライン';

  // 決定事項を抽出
  const decisionsSection = summaryMarkdown.split(/^## 決まったこと/m)[1]?.split(/^##/m)[0] || '';
  const decisions = decisionsSection
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- ') || line.startsWith('* '))
    .map(line => line.substring(2).trim());

  // サマリーを抽出
  const summarySection = summaryMarkdown.split(/^## サマリ/m)[1]?.split(/^##/m)[0] || '';
  const summary = summarySection.trim();

  // アクションアイテムを抽出
  const actionSection = summaryMarkdown.split(/^## ネクストアクション/m)[1]?.split(/^##/m)[0] || '';
  const actionItems = actionSection
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- ') || line.startsWith('* '))
    .map(line => {
      const actionText = line.substring(2).trim();
      const assigneeMatch = actionText.match(/\[(.*?)\]/);
      const assignee = assigneeMatch ? assigneeMatch[1] : undefined;

      // priority の型を明示的にリテラル型に制限する
      let priority: "high" | "medium" | "low" = "medium"; // デフォルト値

      if (actionText.toLowerCase().includes('高') ||
          actionText.toLowerCase().includes('重要') ||
          actionText.toLowerCase().includes('urgent') ||
          actionText.toLowerCase().includes('high')) {
        priority = "high";
      } else if (actionText.toLowerCase().includes('低') ||
                actionText.toLowerCase().includes('minor') ||
                actionText.toLowerCase().includes('low')) {
        priority = "low";
      }

      return {
        task: actionText,
        assignee,
        priority,
        dueDate: undefined, // 明示的に undefined を設定
      };
    });

  return {
    purpose,
    participants,
    date,
    location,
    summary,
    decisions,
    actionItems,
    rawMarkdown: summaryMarkdown,
  };
};

/**
 * 会議の文字起こしから議事録を生成する
 * @param env 環境変数
 * @param fullText 全文テキスト
 * @param meetingData 会議メタデータ
 * @param options 要約オプション
 * @returns 議事録データ
 */
export const generateMinutes = asyncErrorHandler(
  async (
    env: { GEMINI_API_KEY: string; GEMINI_MODEL_NAME?: string },
    fullText: string,
    meetingData: {
      title: string;
      date: string;
      duration: number;
      category: string;
    },
    options?: SummarizationOptions
  ): Promise<MinutesData> => {
    const startTime = Date.now();
    const opts = { ...DEFAULT_SUMMARIZATION_OPTIONS, ...options };

    console.log(`議事録生成を開始: ${meetingData.title}`);

    // 1. テキストをチャンクに分割
    const chunks = splitTextIntoChunks(fullText, opts);
    console.log(`テキストを${chunks.length}個のチャンクに分割しました`);

    // 2. 全体要約の生成
    const globalSummaryMarkdown = await generateGlobalSummary(
      env,
      fullText,
      meetingData.date,
      meetingData.title
    );

    // 3. 全体要約から構造化データを抽出
    const globalSummary = parseGlobalSummary(globalSummaryMarkdown);
    console.log("全体要約を生成しました");

    // 4. 各チャンクのトピック分析
    const topics = await analyzeAllTopics(env, chunks, opts);
    console.log(`${topics.length}個のトピックを抽出しました`);

    // 5. トピックからタイムラインを生成
    const timeline = await generateTimelineFromTopics(env, topics);
    console.log("タイムラインを生成しました");

    // 6. 話者リストを収集
    const allSpeakers = new Set<string>();
    topics.forEach(topic => {
      topic.speakers.forEach(speaker => {
        if (speaker && speaker !== '不明') {
          allSpeakers.add(speaker);
        }
      });
    });

    // グローバル要約から検出した参加者も追加
    globalSummary.participants.forEach(participant => {
      if (participant && participant !== '不明') {
        allSpeakers.add(participant);
      }
    });

    const participants = Array.from(allSpeakers);

    // 7. 議事録データをまとめる
    const minutesData: MinutesData = {
      meetingTitle: meetingData.title,
      meetingDate: meetingData.date,
      meetingCategory: meetingData.category as any,
      meetingDuration: meetingData.duration,
      participantCount: participants.length,
      participants,
      globalSummary,
      timeline,
      generatedAt: new Date().toISOString(),
    };

    console.log(`議事録生成完了: 処理時間 ${Date.now() - startTime}ms`);

    return minutesData;
  }
);

/**
 * ジョブの文字起こしデータから議事録を生成する
 * @param env 環境変数
 * @param request 要約リクエスト
 * @param options 要約オプション
 * @returns 要約結果
 */
export const summarizeJobTranscript = asyncErrorHandler(
  async (
    env: { GEMINI_API_KEY: string; GEMINI_MODEL_NAME?: string; JOB_KV: KVNamespace },
    request: SummarizeRequest,
    options?: SummarizationOptions
  ): Promise<SummarizationResult> => {
    const { jobId, fullText, transcriptEntries } = request;
    const startTime = Date.now();

    try {
      console.log(`ジョブ ${jobId}: 議事録生成を開始します`);

      // ジョブデータを取得
      const jobData = await getRawJobData(env, jobId);
      if (!jobData) {
        throw new Error(`ジョブID ${jobId} が見つかりません`);
      }

      // ジョブステータスを処理中に更新
      await updateJob(env, jobId, { status: JobStatus.PROCESSING });

      let text = fullText;

      // テキストが指定されていない場合は文字起こしデータから取得
      if (!text) {
        if (transcriptEntries) {
          text = transcriptEntries.map(entry => {
            const speaker = entry.speaker ? `${entry.speaker}: ` : '';
            return `${speaker}${entry.text}`;
          }).join('\n');
        } else {
          // 文字起こしデータを取得
          const transcript = await getTranscriptByJobId(env, jobId);
          if (!transcript) {
            throw new Error(`ジョブID ${jobId} の文字起こしデータが見つかりません`);
          }
          text = transcript.rawText;
        }
      }

      // 会議メタデータの設定
      const meetingData = {
        title: jobData.payload.object.topic || '無題会議',
        date: jobData.payload.object.start_time,
        duration: jobData.payload.object.duration || 0,
        category: jobData.category || 'internalMeeting',
      };

      // 議事録を生成
      const minutes = await generateMinutes(env, text, meetingData, options);

      // 処理成功
      await updateJob(env, jobId, {
        status: JobStatus.COMPLETED,
      });

      return {
        success: true,
        jobId,
        minutes,
        processingTimeMs: Date.now() - startTime,
      };

    } catch (error) {
      console.error(`ジョブ ${jobId}: 議事録生成中にエラーが発生しました`, error);

      // エラーメッセージを取得
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';

      // エラーステータスを設定
      await updateJob(env, jobId, {
        status: JobStatus.FAILED,
        error: errorMessage,
      });

      return {
        success: false,
        jobId,
        error: errorMessage,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }
);

/**
 * 議事録生成処理を開始する
 * @param env 環境変数
 * @param request 要約リクエスト
 * @returns 処理開始結果
 */
export const startSummarization = asyncErrorHandler(
  async (
    env: { GEMINI_API_KEY: string; GEMINI_MODEL_NAME?: string; JOB_KV: KVNamespace },
    request: SummarizeRequest
  ): Promise<{ success: boolean; jobId: string; message: string }> => {
    const { jobId } = request;

    // ジョブが存在するか確認
    const job = await getRawJobData(env, jobId);
    if (!job) {
      return {
        success: false,
        jobId,
        message: `ジョブ ${jobId} が見つかりません`,
      };
    }

    // 既に処理中または完了済みかチェック
    if (job.status === JobStatus.COMPLETED) {
      return {
        success: false,
        jobId,
        message: `ジョブ ${jobId} は既に完了しています`,
      };
    }

    // 処理を非同期で開始（後でWorkerの処理時間制限に注意）
    // 実際のシステムでは、この部分はワーカーに処理を渡すか、Queueを利用する
    void summarizeJobTranscript(env, request).catch(err => {
      console.error(`ジョブ ${jobId} の非同期処理中にエラー:`, err);
    });

    return {
      success: true,
      jobId,
      message: `ジョブ ${jobId} の議事録生成を開始しました`,
    };
  }
);
