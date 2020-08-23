const nock = require("nock");
import { SlackerClient, channel } from "./SlackerClient";
const conversationsHistory = require("../mock/responses/conversations.history.json");
const conversationsList = require("../mock/responses/conversations.list.json");

const channel: channel = {
  id: "1",
  name: "foo",
  name_normalized: "foo",
  is_archived: false,
  is_general: false,
  is_private: false,
};

describe("SlackerClient", () => {
  let slackerClient;
  let scope = nock("https://slack.com").persist();
  beforeEach(() => {
    // TODO - single page. We should test for pagination.
    scope.post("/api/conversations.history").reply(200, conversationsHistory);
    // TODO - single page. We should test for pagination.
    scope.post("/api/conversations.list").reply(200, conversationsList);
    scope.post("/api/conversations.join").reply(200, { ok: true });
    slackerClient = new SlackerClient("xoxb-faketoken");
  });

  describe("General", () => {
    test("archiveChannel", async () => {
      const ok = await slackerClient.archiveChannel(channel);
      expect(ok).toBe(true);
    });
  });
  describe("Without cursor", () => {
    test("getLastWorthwhileMessage", async () => {
      const message = await slackerClient.getLastWorthwhileMessage(channel);
      expect(message).toEqual({
        text: "What, you want to smell my shoes better?",
        ts: "1512104434.000490",
        type: "message",
        user: "U061F7AUR",
      });
    });

    test("getChannels", async () => {
      const [channel1, channel2] = await slackerClient.getChannels();
      expect(channel1).toEqual({
        id: "1",
        name: "valid",
        name_normalized: "is_valid",
        is_archived: false,
        is_general: false,
        is_private: false,
      });
      expect(channel2).toEqual({
        id: "3",
        name: "second valid",
        name_normalized: "is_also_valid",
        is_archived: false,
        is_general: true,
        is_private: false,
      });
    });
  });
});
