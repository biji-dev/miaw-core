/**
 * Unit tests for v1.6.0 pairing-code authentication.
 *
 * Exercises the maybeRequestPairingCode() guard + emission with a fake socket;
 * no real WhatsApp connection is used.
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
  Browsers: { macOS: jest.fn(() => ["macOS", "Desktop", "1.0"]) },
  useMultiFileAuthState: jest.fn(),
  downloadMediaMessage: jest.fn(),
  jidNormalizedUser: jest.fn((jid: string) => jid),
  getAggregateVotesInPollMessage: jest.fn(),
}));

const { MiawClient } = await import("../../src/client/MiawClient.js");

const PHONE = "6281234567890";

function makeClient(options: Record<string, unknown>, requestPairingCode: any): any {
  const client: any = new MiawClient({ instanceId: "test-pair", ...options });
  client.socket = { requestPairingCode };
  return client;
}

describe("v1.6.0 pairing-code auth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests a code and emits pairing_code on a fresh session", async () => {
    const requestPairingCode = jest
      .fn<(phone: string) => Promise<string>>()
      .mockResolvedValue("ABCD1234");
    const client = makeClient(
      { usePairingCode: true, phoneNumber: PHONE },
      requestPairingCode
    );

    const code = await new Promise<string>((resolve) => {
      client.on("pairing_code", resolve);
      client.maybeRequestPairingCode(false);
    });

    expect(code).toBe("ABCD1234");
    expect(requestPairingCode).toHaveBeenCalledWith(PHONE);
  });

  it("does nothing when the session is already registered", () => {
    const requestPairingCode = jest.fn();
    const client = makeClient(
      { usePairingCode: true, phoneNumber: PHONE },
      requestPairingCode
    );

    client.maybeRequestPairingCode(true);

    expect(requestPairingCode).not.toHaveBeenCalled();
  });

  it("does nothing when usePairingCode is not set", () => {
    const requestPairingCode = jest.fn();
    const client = makeClient({ phoneNumber: PHONE }, requestPairingCode);

    client.maybeRequestPairingCode(false);

    expect(requestPairingCode).not.toHaveBeenCalled();
  });

  it("does nothing when phoneNumber is missing", () => {
    const requestPairingCode = jest.fn();
    const client = makeClient({ usePairingCode: true }, requestPairingCode);

    client.maybeRequestPairingCode(false);

    expect(requestPairingCode).not.toHaveBeenCalled();
  });
});
