/**
 * Unit tests for v1.9.0 communities: lifecycle, linking, participants, invites.
 * Fake socket with community* mocks; no real connection.
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

const CJID = "120363000000000000@g.us";
const meta = {
  id: CJID,
  subject: "My Community",
  desc: "hello",
  owner: "6281@s.whatsapp.net",
  creation: 1700000000,
  participants: [
    { id: "6281@s.whatsapp.net", admin: "superadmin" },
    { id: "6282@s.whatsapp.net", admin: null },
  ],
  announce: true,
  restrict: false,
};

const socketMocks = {
  communityCreate: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  communityMetadata: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  communityFetchAllParticipating: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  communityUpdateSubject: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  communityUpdateDescription: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  communityLeave: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  communityCreateGroup: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  communityLinkGroup: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  communityUnlinkGroup: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  communityFetchLinkedGroups: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  communityParticipantsUpdate: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  communityInviteCode: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  communityRevokeInvite: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  communityAcceptInvite: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
  communityGetInviteInfo: jest.fn<(...a: unknown[]) => Promise<unknown>>(),
};

function makeConnectedClient(): any {
  const client: any = new MiawClient({ instanceId: "test-community" });
  client.connectionState = "connected";
  client.socket = socketMocks;
  return client;
}

describe("v1.9.0 communities", () => {
  beforeEach(() => {
    Object.values(socketMocks).forEach((m) => m.mockReset().mockResolvedValue(undefined));
  });

  describe("lifecycle", () => {
    it("createCommunity maps the metadata into a CreateCommunityResult", async () => {
      socketMocks.communityCreate.mockResolvedValue(meta);
      const client = makeConnectedClient();

      const res = await client.createCommunity("My Community", "hello");

      expect(socketMocks.communityCreate).toHaveBeenCalledWith("My Community", "hello");
      expect(res.success).toBe(true);
      expect(res.communityJid).toBe(CJID);
      expect(res.communityInfo).toMatchObject({
        jid: CJID,
        name: "My Community",
        description: "hello",
        owner: "6281@s.whatsapp.net",
        participantCount: 2,
        announce: true,
      });
      expect(res.communityInfo.participants[0].role).toBe("superadmin");
      expect(res.communityInfo.participants[1].role).toBe("member");
    });

    it("getCommunityInfo maps communityMetadata", async () => {
      socketMocks.communityMetadata.mockResolvedValue(meta);
      const client = makeConnectedClient();

      const info = await client.getCommunityInfo(CJID);
      expect(socketMocks.communityMetadata).toHaveBeenCalledWith(CJID);
      expect(info.name).toBe("My Community");
      expect(info.participantCount).toBe(2);
    });

    it("getAllCommunities returns mapped values", async () => {
      socketMocks.communityFetchAllParticipating.mockResolvedValue({ [CJID]: meta });
      const client = makeConnectedClient();

      const all = await client.getAllCommunities();
      expect(all).toHaveLength(1);
      expect(all[0].jid).toBe(CJID);
    });

    it("updateCommunityName / updateCommunityDescription / leaveCommunity forward correctly", async () => {
      const client = makeConnectedClient();
      await client.updateCommunityName(CJID, "New");
      await client.updateCommunityDescription(CJID, "New desc");
      await client.leaveCommunity(CJID);
      expect(socketMocks.communityUpdateSubject).toHaveBeenCalledWith(CJID, "New");
      expect(socketMocks.communityUpdateDescription).toHaveBeenCalledWith(CJID, "New desc");
      expect(socketMocks.communityLeave).toHaveBeenCalledWith(CJID);
    });
  });

  describe("linking", () => {
    it("createCommunityGroup passes name, formatted participants, and parent jid", async () => {
      socketMocks.communityCreateGroup.mockResolvedValue({
        ...meta,
        id: "123@g.us",
        subject: "Class A",
      });
      const client = makeConnectedClient();

      const res = await client.createCommunityGroup(CJID, "Class A", ["6281"]);

      expect(socketMocks.communityCreateGroup).toHaveBeenCalledWith(
        "Class A",
        ["6281@s.whatsapp.net"],
        CJID
      );
      expect(res.success).toBe(true);
      expect(res.groupJid).toBe("123@g.us");
    });

    it("link/unlink forward (groupJid, communityJid)", async () => {
      const client = makeConnectedClient();
      await client.linkGroupToCommunity("123@g.us", CJID);
      await client.unlinkGroupFromCommunity("123@g.us", CJID);
      expect(socketMocks.communityLinkGroup).toHaveBeenCalledWith("123@g.us", CJID);
      expect(socketMocks.communityUnlinkGroup).toHaveBeenCalledWith("123@g.us", CJID);
    });

    it("getLinkedGroups maps the linkedGroups array", async () => {
      socketMocks.communityFetchLinkedGroups.mockResolvedValue({
        communityJid: CJID,
        isCommunity: true,
        linkedGroups: [
          { id: "123@g.us", subject: "Class A", creation: 1, owner: "6281@s.whatsapp.net", size: 3 },
        ],
      });
      const client = makeConnectedClient();

      const groups = await client.getLinkedGroups(CJID);
      expect(groups).toEqual([
        { id: "123@g.us", subject: "Class A", creation: 1, owner: "6281@s.whatsapp.net", size: 3 },
      ]);
    });
  });

  describe("participants", () => {
    it("addCommunityMembers / promoteCommunityMembers call communityParticipantsUpdate with the action", async () => {
      socketMocks.communityParticipantsUpdate.mockResolvedValue([
        { jid: "6283@s.whatsapp.net", status: "200", content: {} },
      ]);
      const client = makeConnectedClient();

      const added = await client.addCommunityMembers(CJID, ["6283"]);
      expect(socketMocks.communityParticipantsUpdate).toHaveBeenCalledWith(
        CJID,
        ["6283@s.whatsapp.net"],
        "add"
      );
      expect(added[0]).toEqual({ jid: "6283@s.whatsapp.net", status: "200", success: true });

      await client.promoteCommunityMembers(CJID, ["6283"]);
      expect(socketMocks.communityParticipantsUpdate).toHaveBeenLastCalledWith(
        CJID,
        ["6283@s.whatsapp.net"],
        "promote"
      );
    });
  });

  describe("invites", () => {
    it("getCommunityInviteLink returns a full URL", async () => {
      socketMocks.communityInviteCode.mockResolvedValue("ABC123");
      const client = makeConnectedClient();
      expect(await client.getCommunityInviteLink(CJID)).toBe("https://chat.whatsapp.com/ABC123");
    });

    it("acceptCommunityInvite strips a full URL to the code", async () => {
      socketMocks.communityAcceptInvite.mockResolvedValue(CJID);
      const client = makeConnectedClient();
      await client.acceptCommunityInvite("https://chat.whatsapp.com/ABC123");
      expect(socketMocks.communityAcceptInvite).toHaveBeenCalledWith("ABC123");
    });

    it("getCommunityInviteInfo maps the metadata", async () => {
      socketMocks.communityGetInviteInfo.mockResolvedValue({ ...meta, size: 42 });
      const client = makeConnectedClient();
      const info = await client.getCommunityInviteInfo("ABC123");
      expect(info).toMatchObject({ jid: CJID, name: "My Community", participantCount: 42 });
    });
  });

  describe("connection guard", () => {
    it("createCommunity returns an error result when not connected", async () => {
      const client: any = new MiawClient({ instanceId: "test-community-disc" });
      const res = await client.createCommunity("X");
      expect(res.success).toBe(false);
      expect(res.error).toBeTruthy();
    });
  });
});
