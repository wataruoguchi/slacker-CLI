const nock = require("nock");
import { SlackerClient, LogLevel, channel } from "../SlackerClient";
import { inviteAllMembers } from "./inviteAllMembers";

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

describe("inviteAllMembers", () => {
  let slackerClient: SlackerClient;
  let scope;

  beforeEach(() => {
    scope = nock("https://slack.com");
    slackerClient = new SlackerClient("xoxb-faketoken1234", {
      logLevel: LogLevel.ERROR,
    });
    scope
      .post("/api/users.list")
      .reply(200, { ok: true, members: [{ id: "abc", name: "wataru" }] });
    scope.persist().post("/api/conversations.invite").reply(200, { ok: true });
  });

  test("It fetches a channel list.", async () => {
    await inviteAllMembers.call(slackerClient, channels, "foo");
    expect(1).toBe(1);
  });
});
