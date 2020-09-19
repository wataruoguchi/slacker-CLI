import {
  WebClient,
  WebClientOptions,
  LogLevel,
  WebAPICallResult,
  WebAPICallOptions,
} from "@slack/web-api";
const NodeCache = require("node-cache");
const listAttributes = require("./listAttributes.json");

export { LogLevel, WebAPICallOptions, WebAPICallResult };

export type channel = {
  id: string;
  name: string;
  name_normalized: string;
  is_archived: boolean;
  is_general: boolean;
  is_private: boolean;
};

export type message = {
  type: string;
  subtype: string;
  text: string;
  ts: number;
};

export type user = {
  id: string;
};

type breakCondition = (
  page: WebAPICallResult,
  result: WebAPICallResult[]
) => boolean;

export class SlackerClient {
  private readonly token: string;
  public readonly client: WebClient;
  public readonly isDryRun: boolean;
  public readonly cache: any;

  constructor(
    token: string,
    options?: WebClientOptions & { isDryRun?: boolean }
  ) {
    const defaultOptions = {
      logLevel: LogLevel.DEBUG,
    };
    this.isDryRun = (options && options.isDryRun) || true;
    this.token = token;
    this.client = new WebClient(token, {
      ...defaultOptions,
      ...options,
    });
    this.cache = new NodeCache();
    this.cache.on("set", (key: string) => {
      const dateKey = "dates";
      if (key === dateKey) return;
      const dates = this.cache.get(dateKey) || {};
      dates[key] = Math.round(new Date().getTime() / 1000);
      // throw new Error(
      //   "SET is invoked with " + dateKey + " " + JSON.stringify(dates)
      // );
      this.cache.set(dateKey, dates);
      return;
    });
  }

  /**
   * @param key cache key = method name. e.g., conversations.history.
   */
  private buildCacheKey(key: string, options?: WebAPICallOptions): string {
    const defaultCacheKeys = [this.token.slice(-4), key];
    return (options && Object.keys(options).length
      ? [...defaultCacheKeys, JSON.stringify(options)]
      : defaultCacheKeys
    ).join("-");
  }

  /**
   * Get cached dates (Unix time).
   */
  public getCacheDates() {
    return this.cache.get("dates") || {};
  }

  /**
   * @param key Optional. cache key = method name. e.g., conversations.history. If this is not set, bust all caches.
   */
  public bustCache(key?: string): number {
    const cacheKey = key ? this.buildCacheKey(key) : undefined;
    const allKeys = this.cache.keys();
    const keys: string[] =
      cacheKey && allKeys.includes(cacheKey) ? [cacheKey] : allKeys;
    return this.cache.del(keys);
  }

  /**
   * @param method e.g., conversations.history
   * @param options
   * @param breakCondition `result` - pages we fetched. `page` - the last page we fetched.
   * https://github.com/slackapi/node-slack-sdk/blob/c379711831e7077762fcbec016788b9b0bee49f1/docs/_packages/web_api.md#pagination
   */
  private async paginate(
    method: string,
    options?: WebAPICallOptions,
    breakCondition?: breakCondition
  ): Promise<WebAPICallResult[]> {
    const result = [];
    for await (const page of this.client.paginate(method, options)) {
      if (!page.ok) break;
      result.push(page);
      if (breakCondition && breakCondition(page, result)) {
        break;
      }
    }
    return result;
  }

  /**
   * @param method e.g., conversations.history
   * @param options
   * @param breakCondition `result` - pages we fetched. `page` - the last page we fetched.
   */
  public async getList(
    method: string,
    options?: WebAPICallOptions,
    breakCondition?: breakCondition
  ): Promise<any[]> {
    if (!listAttributes[method])
      throw new Error(
        `Endpoint ${method} was not found in listAttributes.json. The JSON needs to be maintained.`
      );

    const cacheKey = this.buildCacheKey(method, options);

    // See if we have values cached.
    const cachedValue = this.cache.get(cacheKey);
    if (cachedValue) return cachedValue;

    // Let's fetch if the data is not cached.
    const lists = await this.paginate(method, options, breakCondition);
    const list = flattenWebAPICallResultByAttrName(
      lists,
      listAttributes[method]
    );
    this.cache.set(cacheKey, list);
    return list;
  }
}

/**
 *
 * @param responses An array of WebAPICallResult. Something like... { ok: boolean, [index:string]: any[], response_metadata: {next_cursor: string}}[]
 * @param attrName name of an array attribute that the response would have.
 */
function flattenWebAPICallResultByAttrName(
  responses: WebAPICallResult[],
  attrName: string
): any[] {
  return responses
    .reduce((acc, response) => {
      // It should be similar to Array.prototype.flat() but for the specified attribute.
      if (!response[attrName])
        throw new Error(
          `NOSUCHATTR: ${attrName} - response: ${JSON.stringify(response)}`
        );
      const _acc = response[attrName];
      acc = acc.concat(_acc);
      return acc;
    }, [])
    .sort((a, b) => {
      if (a.ts && b.ts) {
        return Number(a.ts) - Number(b.ts);
      }
      return 0;
    });
}
