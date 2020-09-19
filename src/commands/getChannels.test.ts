const nock = require("nock");
import { SlackerClient, LogLevel } from "../SlackerClient";
import { getChannels } from "./getChannels";
const conversationsList = require("../../mock/responses/conversations.list.json");

describe("getChannels", () => {
  let slackerClient: SlackerClient;
  let scope;

  beforeEach(() => {
    scope = nock("https://slack.com");
    slackerClient = new SlackerClient("xoxb-faketoken1234", {
      logLevel: LogLevel.ERROR,
    });
    scope.post("/api/conversations.list").reply(200, conversationsList);
    scope.persist().post("/api/conversations.join").reply(200, { ok: true });
  });

  test("It fetches a channel list.", async () => {
    const list = await getChannels.call(slackerClient);
    expect(list.length).toBe(2);
  });
});
