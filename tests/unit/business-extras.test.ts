/**
 * Unit tests for v1.8.0 business extras: updateBusinessProfile,
 * updateCoverPhoto / removeCoverPhoto, getOrderDetails, and quick replies.
 * Fake socket; no real connection.
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

const socketMocks = {
  updateBussinesProfile: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  updateCoverPhoto: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  removeCoverPhoto: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  getOrderDetails: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  addOrEditQuickReply: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  removeQuickReply: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
};

function makeConnectedClient(): any {
  const client: any = new MiawClient({ instanceId: "test-business" });
  client.connectionState = "connected";
  client.socket = socketMocks;
  return client;
}

describe("v1.8.0 business extras", () => {
  beforeEach(() => {
    Object.values(socketMocks).forEach((m) => m.mockReset().mockResolvedValue(undefined));
  });

  it("updateBusinessProfile forwards the updates and returns success", async () => {
    const client = makeConnectedClient();
    const updates = { address: "123 St", websites: ["https://x.com"], email: "a@b.c" };

    const res = await client.updateBusinessProfile(updates);

    expect(res).toEqual({ success: true });
    expect(socketMocks.updateBussinesProfile).toHaveBeenCalledWith(updates);
  });

  it("updateCoverPhoto sends a Buffer and returns the cover id as a string", async () => {
    socketMocks.updateCoverPhoto.mockResolvedValue(42);
    const client = makeConnectedClient();
    const buf = Buffer.from("img");

    const res = await client.updateCoverPhoto(buf);

    expect(socketMocks.updateCoverPhoto).toHaveBeenCalledWith(buf);
    expect(res).toEqual({ success: true, coverPhotoId: "42" });
  });

  it("updateCoverPhoto wraps a URL as { url }", async () => {
    socketMocks.updateCoverPhoto.mockResolvedValue(7);
    const client = makeConnectedClient();

    await client.updateCoverPhoto("https://x/cover.jpg");

    expect(socketMocks.updateCoverPhoto).toHaveBeenCalledWith({ url: "https://x/cover.jpg" });
  });

  it("removeCoverPhoto forwards the id", async () => {
    const client = makeConnectedClient();
    const res = await client.removeCoverPhoto("42");
    expect(socketMocks.removeCoverPhoto).toHaveBeenCalledWith("42");
    expect(res.success).toBe(true);
  });

  it("getOrderDetails maps the Baileys result to OrderInfo", async () => {
    socketMocks.getOrderDetails.mockResolvedValue({
      price: { total: 5000, currency: "IDR" },
      products: [
        { id: "p1", name: "Widget", imageUrl: "u", quantity: 2, currency: "IDR", price: 2500 },
      ],
    });
    const client = makeConnectedClient();

    const info = await client.getOrderDetails("order1", "tok");

    expect(socketMocks.getOrderDetails).toHaveBeenCalledWith("order1", "tok");
    expect(info).toEqual({
      currency: "IDR",
      total: 5000,
      products: [
        { id: "p1", name: "Widget", imageUrl: "u", quantity: 2, currency: "IDR", price: 2500 },
      ],
    });
  });

  it("addQuickReply forwards shortcut/message/keywords", async () => {
    const client = makeConnectedClient();
    await client.addQuickReply({ shortcut: "/hi", message: "Hello!", keywords: ["hi"] });

    expect(socketMocks.addOrEditQuickReply).toHaveBeenCalledWith(
      expect.objectContaining({ shortcut: "/hi", message: "Hello!", keywords: ["hi"] })
    );
  });

  it("removeQuickReply forwards the timestamp", async () => {
    const client = makeConnectedClient();
    await client.removeQuickReply("1700000000");
    expect(socketMocks.removeQuickReply).toHaveBeenCalledWith("1700000000");
  });

  it("returns an error result when not connected", async () => {
    const client: any = new MiawClient({ instanceId: "test-business-disc" });
    const res = await client.updateBusinessProfile({ email: "a@b.c" });
    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
  });
});
