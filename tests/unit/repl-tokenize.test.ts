/**
 * Unit tests for tokenizeCommand(): quote-aware REPL command splitting.
 *
 * Locks in the fix for captions/args with spaces being broken apart
 * (e.g. `send image <phone> <path> "Ini ok"` used to yield `"Ini` and `ok"`
 * as separate tokens because the old split(/\s+/) had no quote awareness).
 *
 * repl.ts transitively imports MiawClient -> baileys (ESM), which jest can't
 * load without transforming, so baileys is mocked here purely to satisfy the
 * import chain (same pattern as reconnect-backoff.test.ts).
 */

import { describe, it, expect, jest } from "@jest/globals";

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

const { tokenizeCommand } = await import("../../src/cli/repl.js");

describe("tokenizeCommand", () => {
  it("splits plain whitespace-separated args", () => {
    expect(tokenizeCommand("send text 6281234567890 Hello")).toEqual([
      "send",
      "text",
      "6281234567890",
      "Hello",
    ]);
  });

  it("keeps a double-quoted multi-word caption as one token", () => {
    expect(
      tokenizeCommand('send image 6285649186459 /home/xan/Pictures/tmux.png "Ini ok"')
    ).toEqual([
      "send",
      "image",
      "6285649186459",
      "/home/xan/Pictures/tmux.png",
      "Ini ok",
    ]);
  });

  it("keeps a single-quoted multi-word caption as one token", () => {
    expect(tokenizeCommand("send image 123 ./a.png 'Ini ok'")).toEqual([
      "send",
      "image",
      "123",
      "./a.png",
      "Ini ok",
    ]);
  });

  it("supports quoted flag values (e.g. --caption)", () => {
    expect(tokenizeCommand('send video 123 ./v.mp4 --caption "Check this"')).toEqual([
      "send",
      "video",
      "123",
      "./v.mp4",
      "--caption",
      "Check this",
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(tokenizeCommand("")).toEqual([]);
  });
});
