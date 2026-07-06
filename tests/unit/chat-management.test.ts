/**
 * Unit tests for v1.7.0 chat management (all via socket.chatModify):
 * archive/unarchive, pin/unpin, mute/unmute, markChatRead/Unread, clear,
 * delete, and star/unstar. A fake socket is injected; no real connection.
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

const PHONE = "6281234567890";
const JID = "6281234567890@s.whatsapp.net";
const chatModifyMock = jest.fn<(...a: unknown[]) => Promise<unknown>>();

function makeConnectedClient(): any {
  const client: any = new MiawClient({ instanceId: "test-chat" });
  client.connectionState = "connected";
  client.socket = { chatModify: chatModifyMock };
  return client;
}

describe("v1.7.0 chat management", () => {
  beforeEach(() => {
    chatModifyMock.mockReset().mockResolvedValue(undefined);
  });

  describe("archive / unarchive (need lastMessages)", () => {
    it("archiveChat sends { archive:true, lastMessages } with the stored last message", async () => {
      const client = makeConnectedClient();
      const key = { id: "M1", remoteJid: JID, fromMe: false };
      client.messagesStore.set(JID, [
        { id: "M1", timestamp: 1, raw: { key, messageTimestamp: 1710 } },
      ]);

      const res = await client.archiveChat(PHONE);

      expect(res).toEqual({ success: true });
      expect(chatModifyMock).toHaveBeenCalledWith(
        { archive: true, lastMessages: [{ key, messageTimestamp: 1710 }] },
        JID
      );
    });

    it("unarchiveChat sends { archive:false } and falls back to [] with no stored message", async () => {
      const client = makeConnectedClient();
      await client.unarchiveChat(JID);
      expect(chatModifyMock).toHaveBeenCalledWith(
        { archive: false, lastMessages: [] },
        JID
      );
    });
  });

  describe("pin / unpin", () => {
    it("pinChat sends { pin:true } and sets the cached flag", async () => {
      const client = makeConnectedClient();
      client.chatsStore.set(JID, { jid: JID });

      await client.pinChat(PHONE);

      expect(chatModifyMock).toHaveBeenCalledWith({ pin: true }, JID);
      expect(client.chatsStore.get(JID).isPinned).toBe(true);
    });

    it("unpinChat sends { pin:false }", async () => {
      const client = makeConnectedClient();
      await client.unpinChat(JID);
      expect(chatModifyMock).toHaveBeenCalledWith({ pin: false }, JID);
    });
  });

  describe("mute / unmute", () => {
    it("muteChat sends an absolute future mute-end timestamp", async () => {
      const client = makeConnectedClient();
      const before = Date.now();
      await client.muteChat(JID, 60_000);
      const mod = chatModifyMock.mock.calls[0][0] as { mute: number };

      expect(typeof mod.mute).toBe("number");
      expect(mod.mute).toBeGreaterThanOrEqual(before + 60_000);
      expect(mod.mute).toBeLessThanOrEqual(Date.now() + 60_000);
    });

    it("unmuteChat sends { mute:null }", async () => {
      const client = makeConnectedClient();
      await client.unmuteChat(JID);
      expect(chatModifyMock).toHaveBeenCalledWith({ mute: null }, JID);
    });
  });

  describe("markRead / clear / delete (need lastMessages)", () => {
    const seed = (client: any) => {
      const key = { id: "M1", remoteJid: JID, fromMe: false };
      client.messagesStore.set(JID, [
        { id: "M1", timestamp: 1, raw: { key, messageTimestamp: 99 } },
      ]);
      return key;
    };

    it("markChatRead → { markRead:true, lastMessages }", async () => {
      const client = makeConnectedClient();
      const key = seed(client);
      await client.markChatRead(JID);
      expect(chatModifyMock).toHaveBeenCalledWith(
        { markRead: true, lastMessages: [{ key, messageTimestamp: 99 }] },
        JID
      );
    });

    it("markChatUnread → { markRead:false, ... }", async () => {
      const client = makeConnectedClient();
      seed(client);
      await client.markChatUnread(JID);
      const mod = chatModifyMock.mock.calls[0][0] as { markRead: boolean };
      expect(mod.markRead).toBe(false);
    });

    it("clearChat → { clear:true, lastMessages }", async () => {
      const client = makeConnectedClient();
      const key = seed(client);
      await client.clearChat(JID);
      expect(chatModifyMock).toHaveBeenCalledWith(
        { clear: true, lastMessages: [{ key, messageTimestamp: 99 }] },
        JID
      );
    });

    it("deleteChat → { delete:true, lastMessages }", async () => {
      const client = makeConnectedClient();
      seed(client);
      await client.deleteChat(JID);
      const mod = chatModifyMock.mock.calls[0][0] as { delete: boolean };
      expect(mod.delete).toBe(true);
    });
  });

  describe("star / unstar (message-based)", () => {
    const message = {
      id: "M1",
      from: JID,
      timestamp: 1,
      isGroup: false,
      fromMe: false,
      type: "text",
      raw: { key: { id: "M1", remoteJid: JID, fromMe: false } },
    };

    it("starMessage sends { star: { messages, star:true } } to the chat", async () => {
      const client = makeConnectedClient();
      await client.starMessage(message);
      expect(chatModifyMock).toHaveBeenCalledWith(
        { star: { messages: [{ id: "M1", fromMe: false }], star: true } },
        JID
      );
    });

    it("unstarMessage sends star:false", async () => {
      const client = makeConnectedClient();
      await client.unstarMessage(message);
      const mod = chatModifyMock.mock.calls[0][0] as { star: { star: boolean } };
      expect(mod.star.star).toBe(false);
    });

    it("returns an error result when the message has no raw key", async () => {
      const client = makeConnectedClient();
      const res = await client.starMessage({ id: "x" });
      expect(res.success).toBe(false);
      expect(chatModifyMock).not.toHaveBeenCalled();
    });
  });

  describe("connection guard", () => {
    it("returns { success:false } when not connected", async () => {
      const client: any = new MiawClient({ instanceId: "test-chat-disc" });
      const res = await client.archiveChat(JID);
      expect(res.success).toBe(false);
      expect(res.error).toBeTruthy();
    });
  });
});
