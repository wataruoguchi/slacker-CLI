import { SlackerClient, user, channel } from "../SlackerClient";

export async function inviteAllMembers(
  channels: channel[],
  channelName: string
) {
  const slackerClient = this as SlackerClient;
  if (channelName.length === 0) {
    console.log("No channel name given. Use `channelName`");
    return;
  }
  const [channel] = channels.filter(
    (channel: channel) => channel.name === channelName
  );
  if (!channel) {
    console.log(`No channel found: ${channelName}`);
    return;
  }
  const users = await getAllUsers.call(slackerClient);
  const ok = await inviteUsersToChannel.call(slackerClient, channel, users);
  if (ok) {
    console.log(`All members have been invited to ${channelName}`);
  } else {
    console.log(`Failed on inviting users to ${channelName}`);
  }
}

async function getAllUsers(): Promise<user[]> {
  const slackerClient = this as SlackerClient;
  const users: user[] = await slackerClient.getList("users.list");
  return users;
}

async function inviteUsersToChannel(
  channel: channel,
  users: user[]
): Promise<boolean> {
  const slackerClient = this as SlackerClient;
  // This is a POST request. It should guarded by `isDryRun`.
  if (slackerClient.isDryRun) return true;
  const { ok } = await slackerClient.client.conversations.invite({
    channel: channel.id,
    users: users.map((user) => user.id).join(","),
  });
  return ok;
}
