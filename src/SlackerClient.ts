import {
  WebClient,
  WebClientOptions,
  LogLevel,
  WebAPICallResult,
  WebAPICallOptions,
} from "@slack/web-api";
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

export class SlackerClient {
  private readonly client: WebClient;
  public readonly isDryRun: boolean;

  constructor(
    token: string,
    options?: WebClientOptions & { isDryRun: boolean }
  ) {
    const defaultOptions = {
      logLevel: LogLevel.DEBUG,
    };
    this.isDryRun = (options && options.isDryRun) || true;
    this.client = new WebClient(token, {
      ...defaultOptions,
      ...options,
    });
  }

  // TODO This might be expensive. We should have the result cached. Maybe by timestamp.
  /**
   * https://github.com/slackapi/node-slack-sdk/blob/c379711831e7077762fcbec016788b9b0bee49f1/docs/_packages/web_api.md#pagination
   *
   * @param method e.g., conversations.history
   * @param options
   * @param breakCondition `result` - pages we fetched. `page` - the last page we fetched.
   */
  private async paginate(
    method: string,
    options?: WebAPICallOptions,
    breakCondition?: (
      page: WebAPICallResult,
      result: WebAPICallResult[]
    ) => boolean
  ): Promise<WebAPICallResult[]> {
    const result = [];
    for await (const page of this.client.paginate(method, options)) {
      result.push(page);
      if (breakCondition && breakCondition(page, result)) {
        break;
      }
    }
    return result;
  }

  /**
   * Fetch channels. See default options for more details.
   * @param options
   */
  public async getChannels(options?: WebAPICallOptions): Promise<channel[]> {
    const defaultOptions: WebAPICallOptions = {
      types: "public_channel",
      exclude_archived: true,
    };
    const lists = await this.paginate("conversations.list", {
      ...defaultOptions,
      ...options,
    });
    const channels: channel[] = flattenWebAPICallResultByAttrName(
      lists,
      "channels"
    );

    for (const channel of channels) {
      // Let the bot join all the channels.
      await this.client.conversations.join({ channel: channel.id });
    }
    return channels;
  }

  public async getLastWorthwhileMessage(
    channel: channel,
    options?: WebAPICallOptions
  ): Promise<message | null> {
    const defaultOptions: WebAPICallOptions = {
      limit: 5,
    };

    /**
     * Ignore the message that has no `subtype` - It tends to be a message from bots.
     * Filter out "<This bot> has joined the channel".
     * @param message
     */
    function messageFilter(message: any) {
      return !message.subtype && message.ts;
    }

    /**
     * Break when there's a message that doesn't have `subtype`.
     * @param page
     */
    function breakCondition(page: WebAPICallResult): boolean {
      return (
        page.messages &&
        Array.isArray(page.messages) &&
        page.messages.filter(messageFilter).length > 0
      );
    }

    const histories = await this.paginate(
      "conversations.history",
      {
        ...defaultOptions,
        ...options,
        channel: channel.id,
      },
      breakCondition
    );
    const lastWorthwhileMessages = flattenWebAPICallResultByAttrName(
      histories,
      "messages"
    ).filter(messageFilter);
    return lastWorthwhileMessages.length
      ? lastWorthwhileMessages.slice(-1)[0]
      : null;
  }

  public async archiveChannel(
    channel: channel,
    options?: WebAPICallOptions
  ): Promise<boolean> {
    const defaultOptions: WebAPICallOptions = {};
    // This is a POST request. It should guarded by `isDryRun`.
    if (this.isDryRun) return true;
    const { ok } = await this.client.conversations.archive({
      ...defaultOptions,
      ...options,
      channel: channel.id,
    });
    return ok;
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
      // It should be similar to Array.prototype.flat() but for the specific attribute.
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
