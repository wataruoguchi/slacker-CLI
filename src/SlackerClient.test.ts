const nock = require("nock");
import { SlackerClient, LogLevel } from "./SlackerClient";
const conversationsHistory = require("../mock/responses/conversations.history.json");
const conversationsListPagination = require("../mock/responses/conversations.list.pagination.json");

describe("SlackerClient", () => {
  let slackerClient: SlackerClient;
  let scope;
  beforeEach(() => {
    scope = nock("https://slack.com");
    slackerClient = new SlackerClient("xoxb-faketoken1234", {
      logLevel: LogLevel.ERROR,
    });
  });

  describe("getList", () => {
    test("getList with no cursor", async () => {
      scope.post("/api/conversations.history").reply(200, conversationsHistory);
      const list = await slackerClient.getList("conversations.history");
      expect(Array.isArray(list)).toBeTruthy();
      expect(list.length).toBe(4);
    });

    test("Get list with cursor (pagination)", async () => {
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

      const channels = await slackerClient.getList("conversations.list");
      expect(channels.length).toBe(3);
      const [channel1, channel2, channel3] = channels;
      expect(channel1.id).toBe("1");
      expect(channel2.id).toBe("2");
      expect(channel3.id).toBe("3");
    });
  });

  describe("cache", () => {
    beforeEach(() => {
      scope.post("/api/conversations.history").reply(200, conversationsHistory);
    });

    test("getCacheDates - cacheDates is empty", async () => {
      const cacheDates = slackerClient.getCacheDates();
      expect(cacheDates).toEqual({});
    });

    test("getList - add data to cache. cacheDates has a value", async () => {
      await slackerClient.getList("conversations.history");
      const cachedList = slackerClient.cache.get("1234-conversations.history");
      expect(cachedList.length).toBe(4);

      // cacheDates has value.
      const cacheDates = slackerClient.getCacheDates();
      expect(cacheDates).not.toEqual({});
      const [key] = Object.keys(cacheDates);
      expect(key).toBe("1234-conversations.history");
      expect(typeof cacheDates[key]).toBe("number");
    });

    test("bustCache - remove cache values", async () => {
      // Prepare cache values.
      await slackerClient.getList("conversations.history");
      const cachedList = slackerClient.cache.get("1234-conversations.history");
      expect(cachedList.length).toBe(4);
      const cacheDates = slackerClient.getCacheDates();
      expect(cacheDates).not.toEqual({});

      // Bust cache values.
      slackerClient.bustCache();
      expect(slackerClient.cache.get("1234-conversations.history")).toEqual(
        undefined
      );
      expect(slackerClient.getCacheDates()).toEqual({});
    });
  });
});
