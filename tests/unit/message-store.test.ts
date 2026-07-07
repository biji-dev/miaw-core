/**
 * Unit tests for message capture & storage.
 *
 * Regression coverage for the fix that makes outbound messages appear in
 * `get messages`:
 *  - Baileys emits `messages.upsert` with type 'notify' (live) OR 'append'
 *    (our own sends + offline/reconnect backlog). Both must be processed —
 *    the type is a live-vs-backlog signal, NOT a direction signal.
 *  - Outbound messages (fromMe) — our own sends AND messages sent from the
 *    user's phone — are STORED (so getChatMessages / CLI `get messages`
 *    include them) but NOT emitted on "message" (so bots don't reply to their
 *    own sends).
 *  - Messages are deduped by id across re-delivery routes (send echo,
 *    reconnect backlog, history sync).
 *  - "message" fires only for newly-stored INBOUND messages.
 *
 * A fake socket is injected; no real WhatsApp connection.
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

const CHAT_A = "6281111111111@s.whatsapp.net"; // an inbound counterpart
const CHAT_B = "6282222222222@s.whatsapp.net"; // an outbound recipient

type UpsertType = "notify" | "append";

/** Build a synthetic Baileys text message. */
function textMsg(
  id: string,
  remoteJid: string,
  fromMe: boolean,
  text: string,
  ts = 1000
): any {
  return {
    key: { id, remoteJid, fromMe },
    message: { conversation: text },
    pushName: fromMe ? undefined : "Sender",
    messageTimestamp: ts,
  };
}

/**
 * Create a client with a fake socket whose `ev.on` captures handlers, so the
 * real `messages.upsert` handler can be invoked directly. Disk writes are
 * stubbed and the store starts empty.
 */
function makeClient(): {
  client: any;
  emitUpsert: (type: UpsertType, ...messages: any[]) => Promise<void>;
  emitted: any[];
} {
  const client: any = new MiawClient({ instanceId: "test-msg-store" });
  jest.spyOn(client, "saveMessagesToFile").mockImplementation(() => {});
  jest.spyOn(client, "saveLidMappingsToFile").mockImplementation(() => {});
  client.messagesStore.clear();

  const handlers: Record<string, (arg: any) => any> = {};
  client.socket = {
    ev: {
      on: (event: string, handler: (arg: any) => any) => {
        handlers[event] = handler;
      },
    },
  };
  client.registerSocketEvents(async () => {});

  const emitted: any[] = [];
  client.on("message", (m: any) => emitted.push(m));

  return {
    client,
    emitted,
    emitUpsert: (type, ...messages) =>
      handlers["messages.upsert"]({ type, messages }),
  };
}

describe("storeMessage (dedup)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const base = { from: CHAT_A, fromMe: false, type: "text", isGroup: false };

  it("stores a new message and returns true", () => {
    const { client } = makeClient();
    const ok = client.storeMessage({ ...base, id: "A", text: "hi", timestamp: 1 });
    expect(ok).toBe(true);
    expect(client.messagesStore.get(CHAT_A)).toHaveLength(1);
  });

  it("returns false and does not duplicate when the same id is stored again", () => {
    const { client } = makeClient();
    expect(client.storeMessage({ ...base, id: "A", text: "hi", timestamp: 1 })).toBe(true);
    expect(client.storeMessage({ ...base, id: "A", text: "changed", timestamp: 2 })).toBe(false);
    const stored = client.messagesStore.get(CHAT_A);
    expect(stored).toHaveLength(1);
    expect(stored[0].text).toBe("hi"); // original kept, not overwritten
  });

  it("stores messages with distinct ids under the same chat", () => {
    const { client } = makeClient();
    client.storeMessage({ ...base, id: "A", timestamp: 1 });
    client.storeMessage({ ...base, id: "B", timestamp: 2 });
    expect(client.messagesStore.get(CHAT_A)).toHaveLength(2);
  });

  it("always appends messages that have no id (cannot dedup)", () => {
    const { client } = makeClient();
    client.storeMessage({ ...base, id: "", timestamp: 1 });
    client.storeMessage({ ...base, id: "", timestamp: 2 });
    expect(client.messagesStore.get(CHAT_A)).toHaveLength(2);
  });
});

describe("messages.upsert capture", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("stores our own outbound send (type 'append', fromMe) so getChatMessages includes it", async () => {
    const { client, emitUpsert } = makeClient();
    await emitUpsert("append", textMsg("OUT1", CHAT_B, true, "hello from miaw"));

    const res = await client.getChatMessages("6282222222222"); // query by phone
    expect(res.success).toBe(true);
    expect(res.messages).toHaveLength(1);
    expect(res.messages[0]).toMatchObject({
      id: "OUT1",
      fromMe: true,
      text: "hello from miaw",
    });
  });

  it("does NOT emit 'message' for outbound (fromMe) messages", async () => {
    const { emitUpsert, emitted } = makeClient();
    await emitUpsert("append", textMsg("OUT1", CHAT_B, true, "hello from miaw"));
    expect(emitted).toHaveLength(0);
  });

  it("stores a message sent from the user's phone (append, fromMe) without emitting", async () => {
    const { client, emitUpsert, emitted } = makeClient();
    await emitUpsert("append", textMsg("PHONE1", CHAT_B, true, "sent from my phone"));

    const res = await client.getChatMessages(CHAT_B);
    expect(res.messages).toHaveLength(1);
    expect(res.messages[0].fromMe).toBe(true);
    expect(emitted).toHaveLength(0);
  });

  it("stores and emits an inbound live message (type 'notify')", async () => {
    const { client, emitUpsert, emitted } = makeClient();
    await emitUpsert("notify", textMsg("IN1", CHAT_A, false, "hi from them"));

    const res = await client.getChatMessages(CHAT_A);
    expect(res.messages).toHaveLength(1);
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({ id: "IN1", fromMe: false });
  });

  it("stores and emits an inbound message from the offline backlog (type 'append')", async () => {
    const { client, emitUpsert, emitted } = makeClient();
    await emitUpsert("append", textMsg("IN2", CHAT_A, false, "missed while offline"));

    const res = await client.getChatMessages(CHAT_A);
    expect(res.messages).toHaveLength(1);
    expect(emitted).toHaveLength(1);
    expect(emitted[0].id).toBe("IN2");
  });

  it("dedups re-delivered messages and emits 'message' only once", async () => {
    const { client, emitUpsert, emitted } = makeClient();
    await emitUpsert("notify", textMsg("IN1", CHAT_A, false, "hi"));
    // Same message re-delivered via the reconnect/offline backlog (append).
    await emitUpsert("append", textMsg("IN1", CHAT_A, false, "hi"));

    const res = await client.getChatMessages(CHAT_A);
    expect(res.messages).toHaveLength(1);
    expect(emitted).toHaveLength(1);
  });
});
