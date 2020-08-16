import { WebClient } from "@slack/web-api";
type channel = {
  id: string;
  name: string;
  name_normalized: string;
  is_archived: boolean;
  is_general: boolean;
  is_private: boolean;
};

type message = {
  type: string;
  subtype: string;
  text: string;
  ts: number;
};

export class SlackerClient {
  client: WebClient;
  isDryRun: boolean;
  constructor(client: WebClient, isDryRun: boolean = true) {
    this.client = client;
    this.isDryRun = isDryRun;
  }
  async getActiveChannels(): Promise<channel[]> {
    const list = await this.client.conversations.list({
      types: "public_channel",
    });
    if (!Array.isArray(list.channels)) return [];
    // Ignore archived channels.
    const channels = list.channels.filter((channel) => !channel.is_archived);

    for (const channel of channels) {
      // Let the bot join all channels.
      await this.client.conversations.join({ channel: channel.id });
    }
    return channels;
  }
  async getLastWorthwhileMessage(
    channel: channel,
    lastOldestMessage: { ts: number } = { ts: 0 }
  ): Promise<message | null> {
    const { messages } = await this.client.conversations.history({
      channel: channel.id,
      latest: lastOldestMessage.ts.toString() || "now",
      limit: 5,
    });

    if (!Array.isArray(messages) || messages.length === 0) return null;
    const lastWorthwhileMessages = messages.filter((message) => {
      // Filter out "<This bot> has joined the channel".
      return message.subtype !== "channel_join" && message.ts;
    });
    if (lastWorthwhileMessages.length) {
      const [lastWorthwhileMessage] = lastWorthwhileMessages;
      return lastWorthwhileMessage;
    } else {
      // Try fetching more messages.
      const [oldestMessage] = messages;
      return this.getLastWorthwhileMessage(channel, oldestMessage);
    }
  }
  async archiveChannel(channel: channel): Promise<boolean> {
    // This is a POST request. It should guarded by `isDryRun`.
    if (this.isDryRun) return true;
    const { ok } = await this.client.conversations.archive({
      channel: channel.id,
    });
    return ok;
  }
}
