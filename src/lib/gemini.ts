/**
 * Google Gemini API連携機能を提供します
 * @module GeminiLib
 */
import { asyncErrorHandler } from "../utils/error";

/**
 * Gemini API設定インターフェース
 */
export interface GeminiApiConfig {
  apiKey: string;
  baseUrl: string;
  modelName: string;
}

/**
 * Gemini API呼び出しオプション
 */
export interface GeminiRequestOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

/**
 * Gemini APIレスポンスインターフェース
 */
export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
  }>;
}

/**
 * Google Gemini API連携クラス
 */
export class GeminiClient {
  private config: GeminiApiConfig;

  /**
   * デフォルトのAPIリクエストオプション
   */
  private defaultOptions: GeminiRequestOptions = {
    temperature: 0.2,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  };

  /**
   * GeminiClientのコンストラクタ
   * @param config Gemini API設定
   */
  constructor(config: GeminiApiConfig) {
    this.config = config;
  }

  /**
   * テキストプロンプトを送信してレスポンスを取得します
   * @param prompt プロンプト文字列
   * @param options APIリクエストオプション
   * @returns 生成されたテキスト
   */
  generateText = asyncErrorHandler(
    async (prompt: string, options?: GeminiRequestOptions): Promise<string> => {
      const requestOptions = { ...this.defaultOptions, ...options };
      const apiUrl = `${this.config.baseUrl}/models/${this.config.modelName}:generateContent?key=${this.config.apiKey}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: requestOptions.temperature,
            topP: requestOptions.topP,
            topK: requestOptions.topK,
            maxOutputTokens: requestOptions.maxOutputTokens,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as GeminiResponse;

      // レスポンスからテキスト部分を抽出
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("No response from Gemini API");
      }

      return data.candidates[0].content.parts[0].text;
    }
  );

  /**
   * JSONデータを生成します（スキーマに従った出力）
   * @param prompt プロンプト文字列
   * @param options APIリクエストオプション
   * @returns 生成されたJSONオブジェクト
   */
  generateJson = asyncErrorHandler(
    async <T extends Record<string, any>>(prompt: string, options?: GeminiRequestOptions): Promise<T> => {
      const jsonText = await this.generateText(prompt, {
        ...options,
        temperature: 0.1, // JSONの生成には低い温度を使用
      });

      try {
        // JSONテキストを抽出（Markdownのコードブロックから取り出す必要がある場合も）
        const jsonPattern = /```(?:json)?\s*(\{[\s\S]*?\})\s*```|(\{[\s\S]*?\})/m;
        const match = jsonText.match(jsonPattern);

        if (match) {
          const jsonStr = (match[1] || match[2]).trim();
          return JSON.parse(jsonStr) as T;
        } else {
          // コードブロックが見つからない場合は全体を解析
          return JSON.parse(jsonText) as T;
        }
      } catch (error) {
        console.error("JSON parsing error:", error);
        console.error("Raw text:", jsonText);
        throw new Error("Failed to parse JSON from Gemini response");
      }
    }
  );

  /**
   * テキストを分類します
   * @param text 分類するテキスト
   * @param categories カテゴリーリスト
   * @param instructions 分類指示
   * @returns 分類結果
   */
  classifyText = asyncErrorHandler(
    async <T extends { category: string; reason: string }>(
      text: string,
      categories: string[],
      instructions: string
    ): Promise<T> => {
      const prompt = `
${instructions}

カテゴリー:
${categories.map(cat => `- ${cat}`).join("\n")}

以下のテキストを上記カテゴリーのいずれかに分類し、理由も示してください。
回答は必ずJSON形式で返してください。

テキスト:
${text}
`;

      return await this.generateJson<T>(prompt, { temperature: 0.1 });
    }
  );

  /**
   * テキストを要約します
   * @param text 要約するテキスト
   * @param maxLength 要約の最大長
   * @param instructions 要約指示
   * @returns 要約されたテキスト
   */
  summarizeText = asyncErrorHandler(
    async (
      text: string,
      maxLength: number = 1000,
      instructions: string = "以下のテキストを簡潔に要約してください。"
    ): Promise<string> => {
      const prompt = `
${instructions}
要約は最大${maxLength}文字以内にしてください。

テキスト:
${text}
`;

      return await this.generateText(prompt, { temperature: 0.3 });
    }
  );
}

/**
 * デフォルトのGemini API設定を使用してGeminiClientのインスタンスを作成します
 * @param env 環境変数
 * @returns GeminiClientインスタンス
 */
export function createGeminiClient(env: {
  GEMINI_API_KEY: string;
  GEMINI_MODEL_NAME?: string;
}): GeminiClient {
  return new GeminiClient({
    apiKey: env.GEMINI_API_KEY,
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    modelName: env.GEMINI_MODEL_NAME || "gemini-1.5-pro",
  });
}
