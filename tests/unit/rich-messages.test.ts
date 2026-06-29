/**
 * Unit tests for v1.6.0 rich message types:
 * sendLocation, sendContact (vCard), sendSticker, sendPoll, the `mentions`
 * option on sendText, and poll-vote decoding (poll_vote event).
 *
 * A fake socket is injected; no real WhatsApp connection is used.
 */

import { jest, describe, beforeEach, it, expect } from "@jest/globals";

const sendMessageMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();
const aggregateMock = jest.fn();

jest.unstable_mockModule("@whiskeysockets/baileys", () => ({
  default: jest.fn(),
  makeWASocket: jest.fn(),
  DisconnectReason: { loggedOut: 401 },
  fetchLatestBaileysVersion: jest
    .fn<() => Promise<unknown>>()
    .mockResolvedValue({ version: [2, 2413, 1] }),
  makeCacheableSignalKeyStore: jest.fn(),
  Browsers: { macOS: jest.fn(() => ["macOS", "Desktop", "1.0"]) },
  useMultiFileAuthState: jest.fn(),
  downloadMediaMessage: jest.fn(),
  jidNormalizedUser: jest.fn((jid: string) => jid),
  getAggregateVotesInPollMessage: aggregateMock,
}));

const { MiawClient } = await import("../../src/client/MiawClient.js");

function makeConnectedClient(): any {
  const client: any = new MiawClient({ instanceId: "test-rich" });
  client.connectionState = "connected";
  client.socket = {
    sendMessage: sendMessageMock,
    user: { id: "628999000000@s.whatsapp.net" },
  };
  return client;
}

const TO = "6281234567890";
const JID = "6281234567890@s.whatsapp.net";

describe("v1.6.0 rich messages", () => {
  beforeEach(() => {
    sendMessageMock.mockReset().mockResolvedValue({ key: { id: "MID" } });
    aggregateMock.mockReset();
  });

  describe("mentions on sendText", () => {
    it("adds mentions (formatted to JIDs) to the content", async () => {
      const client = makeConnectedClient();
      const res = await client.sendText(TO, "hi @6289", {
        mentions: ["6289"],
      });

      expect(res.success).toBe(true);
      expect(sendMessageMock).toHaveBeenCalledWith(
        JID,
        expect.objectContaining({
          text: "hi @6289",
          mentions: ["6289@s.whatsapp.net"],
        }),
        undefined
      );
    });

    it("omits the mentions key when none are given", async () => {
      const client = makeConnectedClient();
      await client.sendText(TO, "plain");

      const content = sendMessageMock.mock.calls[0][1] as Record<string, unknown>;
      expect(content).toEqual({ text: "plain" });
      expect("mentions" in content).toBe(false);
    });
  });

  describe("sendLocation", () => {
    it("sends a location content object", async () => {
      const client = makeConnectedClient();
      const res = await client.sendLocation(TO, 1.23, 4.56, {
        name: "Office",
        address: "123 St",
      });

      expect(res).toEqual({ success: true, messageId: "MID" });
      expect(sendMessageMock).toHaveBeenCalledWith(
        JID,
        {
          location: {
            degreesLatitude: 1.23,
            degreesLongitude: 4.56,
            name: "Office",
            address: "123 St",
          },
        },
        undefined
      );
    });
  });

  describe("sendContact", () => {
    it("builds a single vCard with FN, ORG and waid", async () => {
      const client = makeConnectedClient();
      await client.sendContact(TO, {
        fullName: "John Doe",
        phone: "6285555",
        organization: "Acme",
      });

      const content = sendMessageMock.mock.calls[0][1] as any;
      expect(content.contacts.displayName).toBe("John Doe");
      const vcard = content.contacts.contacts[0].vcard as string;
      expect(vcard).toContain("FN:John Doe");
      expect(vcard).toContain("ORG:Acme");
      expect(vcard).toContain("waid=6285555");
      expect(vcard).toContain("BEGIN:VCARD");
    });

    it("supports an array of contacts", async () => {
      const client = makeConnectedClient();
      await client.sendContact(TO, [
        { fullName: "A", phone: "621" },
        { fullName: "B", phone: "622" },
      ]);

      const content = sendMessageMock.mock.calls[0][1] as any;
      expect(content.contacts.displayName).toBe("2 contacts");
      expect(content.contacts.contacts).toHaveLength(2);
    });
  });

  describe("sendSticker", () => {
    it("passes a Buffer sticker through", async () => {
      const client = makeConnectedClient();
      const buf = Buffer.from("webp");
      await client.sendSticker(TO, buf);

      expect(sendMessageMock).toHaveBeenCalledWith(JID, { sticker: buf }, undefined);
    });

    it("wraps a URL/path sticker as { url }", async () => {
      const client = makeConnectedClient();
      await client.sendSticker(TO, "https://x/y.webp");

      expect(sendMessageMock).toHaveBeenCalledWith(
        JID,
        { sticker: { url: "https://x/y.webp" } },
        undefined
      );
    });
  });

  describe("sendPoll", () => {
    it("sends a poll with values and selectableCount", async () => {
      const client = makeConnectedClient();
      const res = await client.sendPoll(TO, "Lunch?", ["Pizza", "Sushi"], {
        selectableCount: 2,
      });

      expect(res.success).toBe(true);
      expect(sendMessageMock).toHaveBeenCalledWith(
        JID,
        { poll: { name: "Lunch?", values: ["Pizza", "Sushi"], selectableCount: 2 } },
        undefined
      );
    });

    it("defaults selectableCount to 1", async () => {
      const client = makeConnectedClient();
      await client.sendPoll(TO, "Q", ["a", "b"]);
      const content = sendMessageMock.mock.calls[0][1] as any;
      expect(content.poll.selectableCount).toBe(1);
    });

    it("rejects fewer than 2 options without calling the socket", async () => {
      const client = makeConnectedClient();
      const res = await client.sendPoll(TO, "Q", ["only-one"]);
      expect(res.success).toBe(false);
      expect(sendMessageMock).not.toHaveBeenCalled();
    });
  });

  describe("poll-vote decoding (handlePollVote)", () => {
    it("aggregates votes and emits poll_vote", async () => {
      const client = makeConnectedClient();
      const chatId = "62810@s.whatsapp.net";
      // Seed the original poll-creation message into the store.
      client.messagesStore.set(chatId, [
        { id: "POLLID", raw: { key: { id: "POLLID" }, message: { pollCreationMessage: {} } } },
      ]);
      aggregateMock.mockReturnValue([
        { name: "Pizza", voters: ["x@s.whatsapp.net"] },
        { name: "Sushi", voters: [] },
      ]);

      const events: any[] = [];
      client.on("poll_vote", (v: any) => events.push(v));

      await client.handlePollVote({ id: "POLLID", remoteJid: chatId }, [{ vote: 1 }]);

      expect(aggregateMock).toHaveBeenCalledWith(
        expect.objectContaining({ pollUpdates: [{ vote: 1 }] }),
        "628999000000@s.whatsapp.net"
      );
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        pollMessageId: "POLLID",
        chatId,
        results: [
          { option: "Pizza", voters: ["x@s.whatsapp.net"] },
          { option: "Sushi", voters: [] },
        ],
      });
    });

    it("does nothing when the poll message is not in the store", async () => {
      const client = makeConnectedClient();
      const events: any[] = [];
      client.on("poll_vote", (v: any) => events.push(v));

      await client.handlePollVote({ id: "UNKNOWN", remoteJid: "62810@s.whatsapp.net" }, [{}]);

      expect(aggregateMock).not.toHaveBeenCalled();
      expect(events).toHaveLength(0);
    });
  });

  describe("connection guard", () => {
    it("sendLocation returns an error result when not connected", async () => {
      const client: any = new MiawClient({ instanceId: "test-rich-disc" });
      const res = await client.sendLocation(TO, 1, 2);
      expect(res.success).toBe(false);
      expect(res.error).toBeTruthy();
    });
  });
});
