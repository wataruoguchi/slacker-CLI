import {
  SlackerClient,
  WebAPICallOptions,
  WebAPICallResult,
  channel,
  message,
} from "../SlackerClient";

export async function archiveChannels(
  channels,
  daysToArchive = 31
): Promise<boolean[]> {
  const slackerClient = this as SlackerClient;
  const currentEpoch = Date.now() / 1000;
  const oneMonthEpoch = daysToArchive * 24 * 60 * 60; // 31 days. It does not need to be accurate.

  return await Promise.all(
    channels.map(async (channel: channel) => {
      const lastWorthwhileMessage = await getLastWorthwhileMessage.call(
        slackerClient,
        channel
      );
      if (lastWorthwhileMessage && lastWorthwhileMessage.ts && oneMonthEpoch) {
        if (currentEpoch - lastWorthwhileMessage.ts > oneMonthEpoch) {
          const result = await archiveChannel.call(slackerClient, channel);
          console.log(
            `Archiving '${channel.name}' - ${result ? "succeeded" : "failed"}.`
          );
          return true;
        }
        return false;
      } else {
        console.log(`${channel.name} has no conversations.`);
        return false;
      }
    })
  );
}

async function archiveChannel(channel: channel): Promise<boolean> {
  const slackerClient = this as SlackerClient;
  // This is a POST request. It should guarded by `isDryRun`.
  if (slackerClient.isDryRun) return true;
  const { ok } = await slackerClient.client.conversations.archive({
    channel: channel.id,
  });
  return ok;
}

async function getLastWorthwhileMessage(
  channel: channel
): Promise<message | null> {
  const slackerClient = this as SlackerClient;
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

  const lastMessages = await slackerClient.getList(
    "conversations.history",
    {
      ...defaultOptions,
      channel: channel.id,
    },
    breakCondition
  );

  const lastWorthwhileMessages = lastMessages.filter(messageFilter);
  return lastWorthwhileMessages.length
    ? lastWorthwhileMessages.slice(-1)[0]
    : null;
}
