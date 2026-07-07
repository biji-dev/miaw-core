/**
 * Community Commands (v1.9.0)
 *
 * Manage WhatsApp communities: lifecycle, linking groups, participants, invites.
 */

import { MiawClient } from "../../index.js";
import { ensureConnected } from "../utils/session.js";
import { formatTable, formatKeyValue, formatMessage, formatJson } from "../utils/formatter.js";

async function requireConn(client: MiawClient): Promise<boolean> {
  const r = await ensureConnected(client);
  if (!r.success) {
    console.log(`❌ Not connected: ${r.reason}`);
    return false;
  }
  return true;
}

function printParticipantResults(
  results: { jid: string; status: string; success: boolean }[]
): void {
  for (const r of results) {
    console.log(`  ${r.success ? "✅" : "❌"} ${r.jid} (${r.status})`);
  }
}

export async function cmdCommunityList(
  client: MiawClient,
  args: { json?: boolean }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;

  const communities = await client.getAllCommunities();
  if (args.json) {
    console.log(formatJson(communities));
    return true;
  }
  console.log(`\n🏘️  Communities (${communities.length}):\n`);
  console.log(
    formatTable(
      communities.map((c) => ({ jid: c.jid, name: c.name, members: c.participantCount })),
      [
        { key: "jid", label: "JID", width: 42 },
        { key: "name", label: "Name", width: 25 },
        { key: "members", label: "Members", width: 10 },
      ]
    )
  );
  return true;
}

export async function cmdCommunityInfo(
  client: MiawClient,
  args: { jid: string; json?: boolean }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;

  const info = await client.getCommunityInfo(args.jid);
  if (!info) {
    console.log(`❌ Failed to get community info for ${args.jid}`);
    return false;
  }
  if (args.json) {
    console.log(JSON.stringify(info, null, 2));
    return true;
  }
  console.log(formatKeyValue(info, `🏘️  Community: ${info.name}`));
  return true;
}

export async function cmdCommunityCreate(
  client: MiawClient,
  args: { name: string; description?: string }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;

  console.log(`🏘️  Creating community "${args.name}"...`);
  const res = await client.createCommunity(args.name, args.description);
  if (res.success) {
    console.log(formatMessage(true, "Community created", `JID: ${res.communityJid}`));
    return true;
  }
  console.log(formatMessage(false, "Failed to create community", res.error));
  return false;
}

export async function cmdCommunityLeave(
  client: MiawClient,
  args: { jid: string }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;
  const res = await client.leaveCommunity(args.jid);
  console.log(
    res.success ? formatMessage(true, "Left community") : formatMessage(false, "Failed to leave", res.error)
  );
  return res.success;
}

export async function cmdCommunityNameSet(
  client: MiawClient,
  args: { jid: string; name: string }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;
  const res = await client.updateCommunityName(args.jid, args.name);
  console.log(
    res.success ? formatMessage(true, "Community name updated") : formatMessage(false, "Failed", res.error)
  );
  return res.success;
}

export async function cmdCommunityDescriptionSet(
  client: MiawClient,
  args: { jid: string; description: string }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;
  const res = await client.updateCommunityDescription(args.jid, args.description);
  console.log(
    res.success ? formatMessage(true, "Community description updated") : formatMessage(false, "Failed", res.error)
  );
  return res.success;
}

export async function cmdCommunityLinked(
  client: MiawClient,
  args: { jid: string; json?: boolean }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;

  const groups = await client.getLinkedGroups(args.jid);
  if (args.json) {
    console.log(formatJson(groups));
    return true;
  }
  console.log(`\n🔗 Linked groups (${groups.length}):\n`);
  console.log(
    formatTable(
      groups.map((g) => ({ id: g.id, subject: g.subject, size: g.size ?? "-" })),
      [
        { key: "id", label: "Group JID", width: 42 },
        { key: "subject", label: "Name", width: 25 },
        { key: "size", label: "Members", width: 10 },
      ]
    )
  );
  return true;
}

export async function cmdCommunityLink(
  client: MiawClient,
  args: { groupJid: string; communityJid: string }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;
  const res = await client.linkGroupToCommunity(args.groupJid, args.communityJid);
  console.log(
    res.success ? formatMessage(true, "Group linked") : formatMessage(false, "Failed to link", res.error)
  );
  return res.success;
}

export async function cmdCommunityUnlink(
  client: MiawClient,
  args: { groupJid: string; communityJid: string }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;
  const res = await client.unlinkGroupFromCommunity(args.groupJid, args.communityJid);
  console.log(
    res.success ? formatMessage(true, "Group unlinked") : formatMessage(false, "Failed to unlink", res.error)
  );
  return res.success;
}

export async function cmdCommunityGroupCreate(
  client: MiawClient,
  args: { communityJid: string; name: string; phones: string[] }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;
  const res = await client.createCommunityGroup(args.communityJid, args.name, args.phones);
  if (res.success) {
    console.log(formatMessage(true, "Group created in community", `JID: ${res.groupJid}`));
    return true;
  }
  console.log(formatMessage(false, "Failed to create group", res.error));
  return false;
}

export async function cmdCommunityMembers(
  client: MiawClient,
  args: { jid: string; json?: boolean }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;

  const participants = await client.getCommunityParticipants(args.jid);
  if (!participants) {
    console.log(`❌ Failed to get participants for ${args.jid}`);
    return false;
  }
  if (args.json) {
    console.log(formatJson(participants));
    return true;
  }
  console.log(`\n👤 Members (${participants.length}):\n`);
  console.log(
    formatTable(
      participants.map((p) => ({ jid: p.jid, role: p.role })),
      [
        { key: "jid", label: "JID", width: 42 },
        { key: "role", label: "Role", width: 12 },
      ]
    )
  );
  return true;
}

export async function cmdCommunityMembersAdd(
  client: MiawClient,
  args: { jid: string; phones: string[] }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;
  printParticipantResults(await client.addCommunityMembers(args.jid, args.phones));
  return true;
}

export async function cmdCommunityMembersRemove(
  client: MiawClient,
  args: { jid: string; phones: string[] }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;
  printParticipantResults(await client.removeCommunityMembers(args.jid, args.phones));
  return true;
}

export async function cmdCommunityMembersPromote(
  client: MiawClient,
  args: { jid: string; phones: string[] }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;
  printParticipantResults(await client.promoteCommunityMembers(args.jid, args.phones));
  return true;
}

export async function cmdCommunityMembersDemote(
  client: MiawClient,
  args: { jid: string; phones: string[] }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;
  printParticipantResults(await client.demoteCommunityMembers(args.jid, args.phones));
  return true;
}

export async function cmdCommunityInviteLink(
  client: MiawClient,
  args: { jid: string }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;
  const link = await client.getCommunityInviteLink(args.jid);
  console.log(link ? formatMessage(true, "Invite link", link) : formatMessage(false, "Failed to get invite link"));
  return !!link;
}

export async function cmdCommunityInviteRevoke(
  client: MiawClient,
  args: { jid: string }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;
  const link = await client.revokeCommunityInvite(args.jid);
  console.log(link ? formatMessage(true, "New invite link", link) : formatMessage(false, "Failed to revoke invite"));
  return !!link;
}

export async function cmdCommunityInviteAccept(
  client: MiawClient,
  args: { code: string }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;
  const jid = await client.acceptCommunityInvite(args.code);
  console.log(jid ? formatMessage(true, "Joined community", `JID: ${jid}`) : formatMessage(false, "Failed to accept invite"));
  return !!jid;
}

export async function cmdCommunityInviteInfo(
  client: MiawClient,
  args: { code: string }
): Promise<boolean> {
  if (!(await requireConn(client))) return false;
  const info = await client.getCommunityInviteInfo(args.code);
  if (!info) {
    console.log(formatMessage(false, "Failed to get invite info"));
    return false;
  }
  console.log(formatKeyValue(info, `🏘️  Community: ${info.name}`));
  return true;
}
