/**
 * Unit Tests for MiawClient native LID resolution (Baileys rc13)
 *
 * Covers the signalRepository.lidMapping integration that complements the
 * local LRU cache:
 * - resolveLidToJidAsync / getPhoneFromJidAsync fall back to the native store
 *   and back-fill the cache
 * - synchronous resolveLidToJid stays cache-only (non-breaking)
 *
 * A fake socket is injected so no real WhatsApp connection is needed.
 */

import { jest, describe, beforeEach, it, expect } from "@jest/globals";

// Mock Baileys to prevent real connection attempts
jest.unstable_mockModule("@whiskeysockets/baileys", () => ({
  default: jest.fn(),
  makeWASocket: jest.fn(),
  DisconnectReason: { loggedOut: 401 },
  fetchLatestBaileysVersion: jest
    .fn<() => Promise<any>>()
    .mockResolvedValue({ version: [2, 2413, 1] }),
  makeCacheableSignalKeyStore: jest.fn(),
  Browsers: { macOS: jest.fn(() => ["macOS", "Desktop", "1.0"]) },
  useMultiFileAuthState: jest.fn(),
  downloadMediaMessage: jest.fn(),
  // Realistic stand-in: strip the device suffix (`user:device@server` ->
  // `user@server`), matching Baileys' real jidNormalizedUser closely enough to
  // exercise the native-store normalization path.
  jidNormalizedUser: jest.fn((jid: string) => {
    if (!jid) return jid;
    const at = jid.indexOf("@");
    if (at < 0) return jid;
    const user = jid.slice(0, at).split(":")[0];
    return `${user}@${jid.slice(at + 1)}`;
  }),
}));

// Dynamic import after mocking
const { MiawClient } = await import("../../src/client/MiawClient.js");

const LID = "111111111111111@lid";
const PN = "6281234567890@s.whatsapp.net";

/**
 * Build a MiawClient with an injected fake socket exposing a native LID store,
 * and stub disk persistence so tests stay pure.
 */
function makeClientWithStore(lidMapping: Record<string, unknown>): any {
  const client: any = new MiawClient({ instanceId: "test-lid-native" });
  jest.spyOn(client, "saveLidMappingsToFile").mockImplementation(() => {});
  client.socket = { signalRepository: { lidMapping } };
  return client;
}

describe("MiawClient native LID resolution (rc13)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("resolveLidToJidAsync", () => {
    it("falls back to the native store on a cache miss and back-fills the cache", async () => {
      const getPNForLID = jest
        .fn<(lid: string) => Promise<string | null>>()
        .mockResolvedValue(PN);
      const client = makeClientWithStore({ getPNForLID });

      // Cache miss -> native store hit
      const first = await client.resolveLidToJidAsync(LID);
      expect(first).toBe(PN);
      expect(getPNForLID).toHaveBeenCalledTimes(1);
      expect(getPNForLID).toHaveBeenCalledWith(LID);

      // Mapping is now cached -> sync resolves, store not consulted again
      expect(client.resolveLidToJid(LID)).toBe(PN);
      const second = await client.resolveLidToJidAsync(LID);
      expect(second).toBe(PN);
      expect(getPNForLID).toHaveBeenCalledTimes(1);
    });

    it("returns the original LID when the native store cannot resolve it", async () => {
      const getPNForLID = jest
        .fn<(lid: string) => Promise<string | null>>()
        .mockResolvedValue(null);
      const client = makeClientWithStore({ getPNForLID });

      expect(await client.resolveLidToJidAsync(LID)).toBe(LID);
    });

    it("passes through non-LID JIDs without touching the store", async () => {
      const getPNForLID = jest.fn();
      const client = makeClientWithStore({ getPNForLID });

      expect(await client.resolveLidToJidAsync(PN)).toBe(PN);
      expect(getPNForLID).not.toHaveBeenCalled();
    });

    it("never throws when the native store errors", async () => {
      const getPNForLID = jest
        .fn<() => Promise<string | null>>()
        .mockRejectedValue(new Error("boom"));
      const client = makeClientWithStore({ getPNForLID });

      expect(await client.resolveLidToJidAsync(LID)).toBe(LID);
    });

    it("normalizes device-suffixed JIDs returned by the native store", async () => {
      // Baileys' getPNForLID returns device-specific JIDs (e.g. '...:0@...').
      const getPNForLID = jest
        .fn<(lid: string) => Promise<string | null>>()
        .mockResolvedValue("6281234567890:0@s.whatsapp.net");
      const client = makeClientWithStore({ getPNForLID });

      // The ':0' device suffix is stripped before returning and caching.
      expect(await client.resolveLidToJidAsync(LID)).toBe(PN);
      expect(client.resolveLidToJid(LID)).toBe(PN);
    });
  });

  describe("getPhoneFromJidAsync", () => {
    it("extracts the phone number after native resolution", async () => {
      const getPNForLID = jest
        .fn<(lid: string) => Promise<string | null>>()
        .mockResolvedValue(PN);
      const client = makeClientWithStore({ getPNForLID });

      expect(await client.getPhoneFromJidAsync(LID)).toBe("6281234567890");
    });
  });

  describe("without a connected socket", () => {
    it("resolveLidToJidAsync returns the original LID (no native store available)", async () => {
      const client: any = new MiawClient({ instanceId: "test-lid-nosocket" });
      jest.spyOn(client, "saveLidMappingsToFile").mockImplementation(() => {});

      expect(await client.resolveLidToJidAsync(LID)).toBe(LID);
    });
  });

  describe("lidPnMappings ingestion (history sync)", () => {
    it("adds each { lid, pn } pair from history sync to the cache", () => {
      const client = makeClientWithStore({});

      client.ingestLidPnMappings([
        { lid: LID, pn: PN },
        { lid: "222222222222222@lid", pn: "6280000000000@s.whatsapp.net" },
      ]);

      expect(client.resolveLidToJid(LID)).toBe(PN);
      expect(client.resolveLidToJid("222222222222222@lid")).toBe("6280000000000@s.whatsapp.net");
      expect(client.getLidCacheSize()).toBe(2);
    });

    it("is a no-op for undefined or empty input", () => {
      const client = makeClientWithStore({});

      client.ingestLidPnMappings(undefined);
      client.ingestLidPnMappings([]);

      expect(client.getLidCacheSize()).toBe(0);
    });

    it("skips null/undefined entries within the array", () => {
      const client = makeClientWithStore({});

      client.ingestLidPnMappings([{ lid: LID, pn: PN }, null, undefined]);

      expect(client.getLidCacheSize()).toBe(1);
      expect(client.resolveLidToJid(LID)).toBe(PN);
    });
  });

  describe("resolveLidsToPhones (bulk)", () => {
    it("serves cache hits locally and batches only the misses into one native query", async () => {
      const getPNsForLIDs = jest
        .fn<(lids: string[]) => Promise<{ lid: string; pn: string }[] | null>>()
        // Device-suffixed PN, as the real native store returns.
        .mockResolvedValue([{ lid: "333333333333333@lid", pn: "6283333333333:0@s.whatsapp.net" }]);
      const client = makeClientWithStore({ getPNsForLIDs });

      // Pre-seed one mapping so it is a cache hit.
      client.registerLidMapping(LID, PN);

      const out = await client.resolveLidsToPhones([LID, "333333333333333@lid"]);

      expect(out[LID]).toBe("6281234567890");
      expect(out["333333333333333@lid"]).toBe("6283333333333");
      // The cache stores the normalized (device-stripped) JID.
      expect(client.resolveLidToJid("333333333333333@lid")).toBe("6283333333333@s.whatsapp.net");
      // Only the miss was sent to the native store.
      expect(getPNsForLIDs).toHaveBeenCalledTimes(1);
      expect(getPNsForLIDs).toHaveBeenCalledWith(["333333333333333@lid"]);
    });

    it("marks unresolved LIDs as null", async () => {
      const getPNsForLIDs = jest
        .fn<() => Promise<{ lid: string; pn: string }[] | null>>()
        .mockResolvedValue(null);
      const client = makeClientWithStore({ getPNsForLIDs });

      const out = await client.resolveLidsToPhones(["999999999999999@lid"]);

      expect(out["999999999999999@lid"]).toBeNull();
    });
  });

  describe("getLidForPhone (reverse)", () => {
    it("reverse-resolves a phone to its LID and seeds the cache", async () => {
      const getLIDForPN = jest
        .fn<(pn: string) => Promise<string | null>>()
        .mockResolvedValue(LID);
      const client = makeClientWithStore({ getLIDForPN });

      const lid = await client.getLidForPhone("6281234567890");

      expect(lid).toBe(LID);
      expect(getLIDForPN).toHaveBeenCalledWith(PN);
      // The reverse mapping (lid -> pn) is now in the local cache.
      expect(client.resolveLidToJid(LID)).toBe(PN);
    });

    it("returns null without a connected socket", async () => {
      const client: any = new MiawClient({ instanceId: "test-lid-rev-nosocket" });
      jest.spyOn(client, "saveLidMappingsToFile").mockImplementation(() => {});

      expect(await client.getLidForPhone("6281234567890")).toBeNull();
    });
  });
});
