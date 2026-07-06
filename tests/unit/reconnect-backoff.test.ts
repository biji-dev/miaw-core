/**
 * Unit tests for scheduleReconnect(): exponential backoff + pre-login attempt cap.
 *
 * These lock in the v1.6.x hardening that stops an unbounded 3s registration
 * retry storm when WhatsApp rejects a fresh login (e.g. statusCode 428) before
 * issuing a QR. No real WhatsApp connection is used.
 */

import { jest, describe, beforeEach, afterEach, it, expect } from "@jest/globals";

jest.unstable_mockModule("@whiskeysockets/baileys", () => ({
  default: jest.fn(),
  makeWASocket: jest.fn(),
  DisconnectReason: { loggedOut: 401, connectionClosed: 428, connectionReplaced: 440 },
  fetchLatestBaileysVersion: jest
    .fn<() => Promise<unknown>>()
    .mockResolvedValue({ version: [2, 3000, 1] }),
  fetchLatestWaWebVersion: jest
    .fn<() => Promise<unknown>>()
    .mockResolvedValue({ version: [2, 3000, 1], isLatest: true }),
  DEFAULT_CONNECTION_CONFIG: { version: [2, 3000, 1] },
  makeCacheableSignalKeyStore: jest.fn(),
  Browsers: { macOS: jest.fn(() => ["macOS", "Desktop", "1.0"]) },
  useMultiFileAuthState: jest.fn(),
  downloadMediaMessage: jest.fn(),
  jidNormalizedUser: jest.fn((jid: string) => jid),
  getAggregateVotesInPollMessage: jest.fn(),
}));

const { MiawClient } = await import("../../src/client/MiawClient.js");
const { TIMEOUTS, THRESHOLDS } = await import("../../src/constants/timeouts.js");

function makeClient(): any {
  const client: any = new MiawClient({
    instanceId: "test-reconnect",
    sessionPath: "./sessions-test",
  });
  // Never actually reconnect (no network); we only inspect scheduling.
  client.connect = jest.fn();
  return client;
}

describe("scheduleReconnect backoff + pre-login cap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("applies exponential backoff capped at RECONNECT_MAX_DELAY (registered session)", () => {
    const client = makeClient();
    client.authState = { creds: { registered: true } }; // established -> no low cap
    const setTimeoutSpy = jest.spyOn(global, "setTimeout");

    // reconnectDelay(3s) * 2^(n-1), capped at RECONNECT_MAX_DELAY(60s)
    const expected = [3000, 6000, 12000, 24000, 48000, 60000, 60000];
    expect(expected[expected.length - 1]).toBe(TIMEOUTS.RECONNECT_MAX_DELAY);

    for (let i = 0; i < expected.length; i++) {
      setTimeoutSpy.mockClear();
      client.scheduleReconnect();
      expect(client.reconnectAttempts).toBe(i + 1);
      const delays = setTimeoutSpy.mock.calls.map((c: unknown[]) => Number(c[1]));
      expect(delays).toContain(expected[i]);
      // Cancel the pending timer so the stubbed connect() never fires.
      if (client.reconnectTimer) clearTimeout(client.reconnectTimer);
    }
  });

  it("caps a never-registered (pre-login) session and emits error", () => {
    const client = makeClient();
    client.authState = { creds: { registered: false } }; // fresh QR/pairing login
    const errorSpy = jest.fn();
    client.on("error", errorSpy);

    // First PRELOGIN_MAX_RECONNECT_ATTEMPTS calls schedule successfully.
    for (let i = 0; i < THRESHOLDS.PRELOGIN_MAX_RECONNECT_ATTEMPTS; i++) {
      client.scheduleReconnect();
      if (client.reconnectTimer) clearTimeout(client.reconnectTimer);
    }
    expect(client.reconnectAttempts).toBe(
      THRESHOLDS.PRELOGIN_MAX_RECONNECT_ATTEMPTS
    );
    expect(errorSpy).not.toHaveBeenCalled();

    // The next call hits the cap: emit error, no further attempt, no reschedule.
    client.scheduleReconnect();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(client.reconnectAttempts).toBe(
      THRESHOLDS.PRELOGIN_MAX_RECONNECT_ATTEMPTS
    );
  });

  it("does not apply the pre-login cap to a registered session", () => {
    const client = makeClient();
    client.authState = { creds: { registered: true } };
    const errorSpy = jest.fn();
    client.on("error", errorSpy);

    // Well beyond the pre-login cap; a registered session keeps retrying.
    for (let i = 0; i < THRESHOLDS.PRELOGIN_MAX_RECONNECT_ATTEMPTS + 3; i++) {
      client.scheduleReconnect();
      if (client.reconnectTimer) clearTimeout(client.reconnectTimer);
    }
    expect(errorSpy).not.toHaveBeenCalled();
    expect(client.reconnectAttempts).toBe(
      THRESHOLDS.PRELOGIN_MAX_RECONNECT_ATTEMPTS + 3
    );
  });

  it("treats a paired session (creds.me set) as established even when registered is false", () => {
    // rc13 can leave creds.registered false on a working, paired session; the
    // presence of creds.me means it has logged in, so the pre-login cap must not apply.
    const client = makeClient();
    client.authState = {
      creds: { registered: false, me: { id: "628123@s.whatsapp.net" } },
    };
    const errorSpy = jest.fn();
    client.on("error", errorSpy);

    for (let i = 0; i < THRESHOLDS.PRELOGIN_MAX_RECONNECT_ATTEMPTS + 3; i++) {
      client.scheduleReconnect();
      if (client.reconnectTimer) clearTimeout(client.reconnectTimer);
    }
    expect(errorSpy).not.toHaveBeenCalled();
    expect(client.reconnectAttempts).toBe(
      THRESHOLDS.PRELOGIN_MAX_RECONNECT_ATTEMPTS + 3
    );
  });
});

describe("handleDisconnect reconnect decision", () => {
  const disconnect = (client: any, statusCode: number) =>
    client.handleDisconnect({ error: { output: { statusCode } } });

  it("does NOT auto-reconnect when replaced by another connection (440)", () => {
    const client = makeClient();
    client.authState = { creds: { me: { id: "628@s.whatsapp.net" } } };
    // false = don't reconnect (avoids the mutual-replacement 440 loop)
    expect(disconnect(client, 440)).toBe(false);
  });

  it("auto-reconnects on a transient close (428)", () => {
    const client = makeClient();
    client.authState = { creds: { me: { id: "628@s.whatsapp.net" } } };
    expect(disconnect(client, 428)).toBe(true);
  });
});
