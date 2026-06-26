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
  jidNormalizedUser: jest.fn((jid: string) => jid),
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
  });
});
