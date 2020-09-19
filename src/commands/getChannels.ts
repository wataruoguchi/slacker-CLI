import { channel, WebAPICallOptions, SlackerClient } from "../SlackerClient";

/**
 * Fetch channels. See default options for more details.
 * @param options
 */
export async function getChannels(
  options?: WebAPICallOptions
): Promise<channel[]> {
  const slackerClient = this as SlackerClient;
  const defaultOptions: WebAPICallOptions = {
    types: "public_channel",
    exclude_archived: true,
  };

  const channels: channel[] = await slackerClient.getList(
    "conversations.list",
    {
      ...defaultOptions,
      ...options,
    }
  );

  for (const channel of channels) {
    // Let the bot join all the channels.
    await slackerClient.client.conversations.join({ channel: channel.id });
  }
  return channels;
}
