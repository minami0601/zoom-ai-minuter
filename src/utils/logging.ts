/**
 * アプリケーションのログ出力機能を提供します
 * @module LoggingUtils
 */

/**
 * ログレベルの定義
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

/**
 * ログレベルに対応する文字列表現
 */
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

/**
 * ロガーの設定インターフェース
 */
export interface LoggerConfig {
  minLevel: LogLevel;
  enableTimestamp: boolean;
  service?: string;
}

/**
 * デフォルトのロガー設定
 */
const DEFAULT_CONFIG: LoggerConfig = {
  minLevel: LogLevel.INFO,
  enableTimestamp: true,
};

/**
 * 現在の設定
 */
let currentConfig: LoggerConfig = { ...DEFAULT_CONFIG };

/**
 * ロガーの設定を変更します
 * @param config 新しい設定
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * タイムスタンプを生成します
 * @returns 現在のタイムスタンプ文字列
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * メッセージとコンテキストからログエントリを生成します
 * @param level ログレベル
 * @param message ログメッセージ
 * @param context 追加のコンテキスト情報
 * @returns フォーマットされたログエントリ
 */
function formatLogEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, any>
): Record<string, any> {
  const entry: Record<string, any> = {
    level: LOG_LEVEL_NAMES[level],
    message,
  };

  if (currentConfig.enableTimestamp) {
    entry.timestamp = getTimestamp();
  }

  if (currentConfig.service) {
    entry.service = currentConfig.service;
  }

  if (context) {
    entry.context = context;
  }

  return entry;
}

/**
 * 指定されたレベルでログを出力します
 * @param level ログレベル
 * @param message ログメッセージ
 * @param context 追加のコンテキスト情報
 */
export function log(level: LogLevel, message: string, context?: Record<string, any>): void {
  if (level < currentConfig.minLevel) {
    return;
  }

  const entry = formatLogEntry(level, message, context);

  switch (level) {
    case LogLevel.DEBUG:
      console.debug(JSON.stringify(entry));
      break;
    case LogLevel.INFO:
      console.info(JSON.stringify(entry));
      break;
    case LogLevel.WARN:
      console.warn(JSON.stringify(entry));
      break;
    case LogLevel.ERROR:
      console.error(JSON.stringify(entry));
      break;
  }
}

/**
 * DEBUGレベルのログを出力します
 * @param message ログメッセージ
 * @param context 追加のコンテキスト情報
 */
export function debug(message: string, context?: Record<string, any>): void {
  log(LogLevel.DEBUG, message, context);
}

/**
 * INFOレベルのログを出力します
 * @param message ログメッセージ
 * @param context 追加のコンテキスト情報
 */
export function info(message: string, context?: Record<string, any>): void {
  log(LogLevel.INFO, message, context);
}

/**
 * WARNレベルのログを出力します
 * @param message ログメッセージ
 * @param context 追加のコンテキスト情報
 */
export function warn(message: string, context?: Record<string, any>): void {
  log(LogLevel.WARN, message, context);
}

/**
 * ERRORレベルのログを出力します
 * @param message ログメッセージ
 * @param context 追加のコンテキスト情報
 */
export function error(message: string, context?: Record<string, any>): void {
  log(LogLevel.ERROR, message, context);
}

/**
 * エラーオブジェクトの詳細をログに出力します
 * @param err エラーオブジェクト
 * @param context 追加のコンテキスト情報
 */
export function logError(err: Error, context?: Record<string, any>): void {
  const errorContext = {
    ...context,
    name: err.name,
    stack: err.stack,
  };
  error(err.message, errorContext);
}
