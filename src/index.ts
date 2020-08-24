import yargs from "yargs";
import { SlackerClient, LogLevel } from "./SlackerClient";
function getVersion() {
  const version = require("../package.json").version;
  return `v. ${version}`;
}

async function run(): Promise<void> {
  const usage = `Run with your SLACK_TOKEN.
e.g.,) SLACK_TOKEN=xoxb-1234567890 slacker --dryRun=0`;
  const argv = yargs
    .version(getVersion())
    .usage(usage)
    .options({
      command: {
        alias: "c",
        describe: "Command you want to run",
        demandOption: true,
        choices: ["archiveDatedChannels"],
      },
      logLevel: {
        alias: "l",
        describe: "Slack Client Log Level.",
        choices: ["DEBUG", "INFO", "WARN", "ERROR"],
        default: "DEBUG",
      },
      dryRun: {
        alias: "dr",
        describe: "It prevents critical actions such as archiving channels.",
        choices: [1, 0],
        default: 1,
      },
    }).argv;
  const isDryRun: boolean = argv.dryRun === 0 ? false : true;
  if (isDryRun) console.log("Dry Run...", isDryRun);

  const devDate: number =
    argv.devDate && !Number.isNaN(Number(argv.devDate))
      ? Number(argv.devDate)
      : 31; // For development purpose. Not clean :(

  const token: string | undefined = process.env.SLACK_TOKEN;
  if (!token) {
    return Promise.reject("SLACK_TOKEN is required.");
  }
  const slackerClient = new SlackerClient(token, {
    isDryRun,
    logLevel: LogLevel[argv.logLevel],
  });
  await archiveDatedChannels(slackerClient, devDate);
}

async function archiveDatedChannels(
  slackerClient: SlackerClient,
  devDate: number
) {
  const channels = await slackerClient.getChannels();
  const currentEpoch = Date.now() / 1000;
  const oneMonthEpoch = devDate * 24 * 60 * 60; // 31 days. It does not need to be accurate.

  return await Promise.all(
    channels.map(async (channel) => {
      const lastWorthwhileMessage = await slackerClient.getLastWorthwhileMessage(
        channel
      );
      if (lastWorthwhileMessage) {
        if (currentEpoch - lastWorthwhileMessage.ts > oneMonthEpoch) {
          const result = await slackerClient.archiveChannel(channel);
          console.log(
            `Archiving '${channel.name}' - ${result ? "succeeded" : "failed"}.`
          );
        }
      } else {
        console.log(`${channel.name} has no conversations.`);
      }
    })
  );
}

export { run };
