/**
 * Unit tests for v1.8.0 status posting (postTextStatus / postImageStatus /
 * postVideoStatus) — via sendMessage('status@broadcast', ...). Fake socket; no
 * real connection.
 */

import { jest, describe, beforeEach, it, expect } from "@jest/globals";

jest.unstable_mockModule("@whiskeysockets/baileys", () => ({
  default: jest.fn(),
  makeWASocket: jest.fn(),
  DisconnectReason: { loggedOut: 401 },
  fetchLatestBaileysVersion: jest
    .fn<() => Promise<unknown>>()
    .mockResolvedValue({ version: [2, 2413, 1] }),
  fetchLatestWaWebVersion: jest
    .fn<() => Promise<unknown>>()
    .mockResolvedValue({ version: [2, 2413, 1], isLatest: true }),
  DEFAULT_CONNECTION_CONFIG: { version: [2, 2413, 1] },
  makeCacheableSignalKeyStore: jest.fn(),
  Browsers: { macOS: jest.fn(() => ["macOS", "Chrome", "1.0"]) },
  useMultiFileAuthState: jest.fn(),
  downloadMediaMessage: jest.fn(),
  jidNormalizedUser: jest.fn((jid: string) => jid),
  getAggregateVotesInPollMessage: jest.fn(),
}));

const { MiawClient } = await import("../../src/client/MiawClient.js");

const STATUS = "status@broadcast";
const sendMessageMock = jest.fn<(...a: unknown[]) => Promise<unknown>>();

function makeConnectedClient(): any {
  const client: any = new MiawClient({ instanceId: "test-status" });
  client.connectionState = "connected";
  client.socket = { sendMessage: sendMessageMock };
  return client;
}

describe("v1.8.0 status posting", () => {
  beforeEach(() => {
    sendMessageMock.mockReset().mockResolvedValue({ key: { id: "SID" } });
  });

  describe("postTextStatus", () => {
    it("posts to status@broadcast with explicit recipients + text options", async () => {
      const client = makeConnectedClient();
      const res = await client.postTextStatus("hello", ["6281", "6282"], {
        backgroundColor: "#0a7cff",
        font: 3,
      });

      expect(res).toEqual({ success: true, messageId: "SID" });
      expect(sendMessageMock).toHaveBeenCalledWith(
        STATUS,
        { text: "hello" },
        {
          statusJidList: ["6281@s.whatsapp.net", "6282@s.whatsapp.net"],
          backgroundColor: "#0a7cff",
          font: 3,
        }
      );
    });

    it("defaults the audience to all individual contacts when recipients omitted", async () => {
      const client = makeConnectedClient();
      client.contactsStore.set("a", { jid: "6281@s.whatsapp.net" });
      client.contactsStore.set("b", { jid: "6282@s.whatsapp.net" });
      client.contactsStore.set("g", { jid: "123@g.us" }); // group — excluded
      client.contactsStore.set("l", { jid: "555@lid" }); // lid — excluded

      await client.postTextStatus("hi");

      const opts = sendMessageMock.mock.calls[0][2] as { statusJidList: string[] };
      expect(opts.statusJidList.sort()).toEqual([
        "6281@s.whatsapp.net",
        "6282@s.whatsapp.net",
      ]);
    });
  });

  describe("postImageStatus / postVideoStatus", () => {
    it("wraps a URL image and passes caption + audience", async () => {
      const client = makeConnectedClient();
      await client.postImageStatus("https://x/y.jpg", ["6281"], { caption: "hey" });

      expect(sendMessageMock).toHaveBeenCalledWith(
        STATUS,
        { image: { url: "https://x/y.jpg" }, caption: "hey" },
        expect.objectContaining({ statusJidList: ["6281@s.whatsapp.net"] })
      );
    });

    it("passes a Buffer video through", async () => {
      const client = makeConnectedClient();
      const buf = Buffer.from("vid");
      await client.postVideoStatus(buf, ["6281"]);

      const content = sendMessageMock.mock.calls[0][1] as { video: unknown };
      expect(content.video).toBe(buf);
    });
  });

  describe("connection guard", () => {
    it("returns { success:false } when not connected", async () => {
      const client: any = new MiawClient({ instanceId: "test-status-disc" });
      const res = await client.postTextStatus("x");
      expect(res.success).toBe(false);
      expect(res.error).toBeTruthy();
      expect(sendMessageMock).not.toHaveBeenCalled();
    });
  });
});
