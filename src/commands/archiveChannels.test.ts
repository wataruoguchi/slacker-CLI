const nock = require("nock");
import { SlackerClient, channel, LogLevel } from "../SlackerClient";
import { archiveChannels } from "./archiveChannels";
const conversationsHistory = require("../../mock/responses/conversations.history.json");

const channels: channel[] = [
  {
    id: "1",
    name: "foo",
    name_normalized: "foo",
    is_archived: false,
    is_general: false,
    is_private: false,
  },
  {
    id: "2",
    name: "bar",
    name_normalized: "bar",
    is_archived: false,
    is_general: false,
    is_private: false,
  },
];

describe("archiveChannels", () => {
  let slackerClient: SlackerClient;
  let scope;

  beforeEach(() => {
    scope = nock("https://slack.com");
    slackerClient = new SlackerClient("xoxb-faketoken1234", {
      logLevel: LogLevel.ERROR,
    });
  });

  test("It archives channels.", async () => {
    scope
      .persist()
      .post(/api\/conversations\.history/)
      .reply(200, conversationsHistory);
    const [resultForChannel1, resultForChannel2] = await archiveChannels.call(
      slackerClient,
      channels
    );
    expect(resultForChannel1).toBe(true);
    expect(resultForChannel2).toBe(true);
  });
});
