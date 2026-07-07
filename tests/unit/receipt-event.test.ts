/**
 * Unit tests for v1.9.1 message receipts (message_receipt event).
 * Exercises handleReceiptUpdate's type derivation + emission. No real connection.
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

const KEY = {
  id: "MID",
  remoteJid: "6281234567890@s.whatsapp.net",
  fromMe: true,
};

function makeClient(): any {
  return new MiawClient({ instanceId: "test-receipt" });
}

function capture(client: any): any[] {
  const events: any[] = [];
  client.on("message_receipt", (u: any) => events.push(u));
  return events;
}

describe("v1.9.1 message receipts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("emits a delivery receipt (receiptTimestamp only)", () => {
    const client = makeClient();
    const events = capture(client);

    client.handleReceiptUpdate(KEY, {
      userJid: "6281234567890@s.whatsapp.net",
      receiptTimestamp: 1700000000,
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      messageId: "MID",
      chatId: "6281234567890@s.whatsapp.net",
      recipientId: "6281234567890@s.whatsapp.net",
      type: "delivery",
      timestamp: 1700000000,
      fromMe: true,
      raw: expect.anything(),
    });
  });

  it("derives 'read' when readTimestamp is set (even if delivered)", () => {
    const client = makeClient();
    const events = capture(client);
    client.handleReceiptUpdate(KEY, {
      userJid: "62811@s.whatsapp.net",
      receiptTimestamp: 100,
      readTimestamp: 200,
    });
    expect(events[0].type).toBe("read");
    expect(events[0].timestamp).toBe(200);
  });

  it("derives 'played' when playedTimestamp is set (highest priority)", () => {
    const client = makeClient();
    const events = capture(client);
    client.handleReceiptUpdate(KEY, {
      readTimestamp: 200,
      playedTimestamp: 300,
    });
    expect(events[0].type).toBe("played");
    expect(events[0].timestamp).toBe(300);
  });

  it("falls back to key.participant for the recipient in groups", () => {
    const client = makeClient();
    const events = capture(client);
    client.handleReceiptUpdate(
      { id: "MID", remoteJid: "123@g.us", participant: "62822@s.whatsapp.net", fromMe: true },
      { receiptTimestamp: 1 }
    );
    expect(events[0].recipientId).toBe("62822@s.whatsapp.net");
    expect(events[0].chatId).toBe("123@g.us");
  });

  it("does nothing for a null receipt", () => {
    const client = makeClient();
    const events = capture(client);
    client.handleReceiptUpdate(KEY, null);
    expect(events).toHaveLength(0);
  });
});
