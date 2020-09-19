import yargs from "yargs";
import { SlackerClient, LogLevel } from "./SlackerClient";
import { archiveChannels, inviteAllMembers, getChannels } from "./commands";
function getVersion() {
  const version = require("../package.json").version;
  return `v. ${version}`;
}

async function run(): Promise<void> {
  const usage = `Run with your SLACK_TOKEN.
e.g.,) SLACK_TOKEN=xoxb-1234567890 slacker --dryRun=0`;
  const commands = ["archiveDatedChannels", "inviteAllMembers", "cache"];
  const argv = yargs
    .version(getVersion())
    .usage(usage)
    .options({
      command: {
        alias: "c",
        describe: "Command you want to run",
        demandOption: true,
        choices: commands,
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
      channelName: {
        describe: "Channel name to invite members.",
        default: "",
      },
      daysToArchive: {
        describe: "Number of channel expiry days.",
        default: 31,
      },
      bustCacheKey: {
        describe: "Key name you want to bust.",
        default: "",
      },
    }).argv;
  const isDryRun: boolean = argv.dryRun === 0 ? false : true;
  if (isDryRun) console.log("Dry Run...", isDryRun);

  const token: string | undefined = process.env.SLACK_TOKEN;
  if (!token) {
    return Promise.reject("SLACK_TOKEN is required.");
  }
  const slackerClient = new SlackerClient(token, {
    isDryRun,
    logLevel: LogLevel[argv.logLevel],
  });

  const daysToArchive: number = argv.daysToArchive;
  const channelName: string = argv.channelName;

  const channels = await getChannels.call(slackerClient);

  switch (argv.command) {
    case commands[0]:
      await archiveChannels.call(slackerClient, channels, daysToArchive);
      break;
    case commands[1]:
      await inviteAllMembers.call(slackerClient, channels, channelName);
      break;
    case commands[2]:
      if (argv.bustCacheKey === "") {
        console.log(slackerClient.getCacheDates());
      } else {
        slackerClient.bustCache(argv.bustCacheKey);
      }
      break;
    default:
  }
}

export { run };
