/**
 * Cloudflare KV ストレージのラッパークラス
 */
export class KVStorage {
  private namespace: KVNamespace;

  constructor(namespace: KVNamespace) {
    this.namespace = namespace;
  }

  /**
   * データを保存する
   */
  async save<T>(key: string, data: T): Promise<void> {
    await this.namespace.put(key, JSON.stringify(data));
  }

  /**
   * データを取得する
   */
  async get<T>(key: string): Promise<T | null> {
    const data = await this.namespace.get(key);
    return data ? JSON.parse(data) as T : null;
  }

  /**
   * データを削除する
   */
  async delete(key: string): Promise<void> {
    await this.namespace.delete(key);
  }

  /**
   * キーの一覧を取得する
   */
  async listKeys(prefix?: string): Promise<string[]> {
    const list = await this.namespace.list({ prefix });
    return list.keys.map(key => key.name);
  }
}
