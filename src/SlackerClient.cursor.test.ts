const nock = require("nock");
import { SlackerClient, LogLevel } from "./SlackerClient";
const conversationsListPagination = require("../mock/responses/conversations.list.pagination.json");

describe("SlackerClient (with cursor)", () => {
  let slackerClient;
  let scope;

  beforeEach(() => {
    scope = nock("https://slack.com:443");
    scope
      .persist() // This `persist` is important for this test.
      .post(/api\/conversations\.join/)
      .reply(200, { ok: true });

    const [page1, page2, page3] = conversationsListPagination.pagination;
    scope
      .post(/api\/conversations\.list/, (body) => {
        return body.cursor && body.cursor === "dummy2=";
      })
      .reply(200, page2);
    scope
      .post(/api\/conversations\.list/, (body) => {
        return body.cursor && body.cursor === "dummy3=";
      })
      .reply(200, page3);
    scope
      .post(/api\/conversations\.list/, (body) => {
        return !body.cursor || body.corsor === "";
      })
      .reply(200, page1);

    slackerClient = new SlackerClient("xoxb-faketoken", {
      logLevel: LogLevel.ERROR,
    });
  });

  describe("with cursor", () => {
    test("getChannels", async () => {
      const channels = await slackerClient.getChannels({
        limit: 1,
      });
      expect(channels.length).toBe(3);
      const [channel1, channel2, channel3] = channels;
      expect(channel1.id).toBe("1");
      expect(channel2.id).toBe("2");
      expect(channel3.id).toBe("3");
    });
  });
});
