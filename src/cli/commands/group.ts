/**
 * Group Commands
 *
 * Commands for group management (info, participants, invite-link, create)
 */

import { MiawClient } from "../../index.js";
import { ensureConnected } from "../utils/session.js";
import { formatTable, formatKeyValue, formatMessage } from "../utils/formatter.js";

/**
 * Get group info
 */
export async function cmdGroupInfo(
  client: MiawClient,
  args: { jid: string },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  console.log(`👥 Getting group info for ${args.jid}...`);

  const info = await client.getGroupInfo(args.jid);
  if (!info) {
    console.log(`❌ Failed to get group info for ${args.jid}`);
    return false;
  }

  if (jsonOutput) {
    console.log(JSON.stringify(info, null, 2));
    return true;
  }

  console.log(formatKeyValue(info, `👥 Group: ${info.name}`));
  return true;
}

/**
 * Get group participants
 */
export async function cmdGroupParticipants(
  client: MiawClient,
  args: { jid: string },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  console.log(`👥 Getting participants for ${args.jid}...`);

  const participants = await client.getGroupParticipants(args.jid);
  if (!participants) {
    console.log(`❌ Failed to get participants for ${args.jid}`);
    return false;
  }

  if (jsonOutput) {
    console.log(JSON.stringify(participants, null, 2));
    return true;
  }

  console.log(`\n👥 Participants (${participants.length}):\n`);

  const tableData = participants.map((p) => ({
    jid: p.jid,
    role: p.role,
  }));

  console.log(
    formatTable(tableData, [
      { key: "jid", label: "JID", width: 50 },
      { key: "role", label: "Role", width: 15 },
    ])
  );

  const admins = participants.filter((p) => p.role !== "member");
  console.log(`\nAdmins: ${admins.length}`);
  console.log(`Members: ${participants.length - admins.length}`);

  return true;
}

/**
 * Get group invite link
 */
export async function cmdGroupInviteLink(
  client: MiawClient,
  args: { jid: string }
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  console.log(`🔗 Getting invite link for ${args.jid}...`);

  const link = await client.getGroupInviteLink(args.jid);
  if (!link) {
    console.log(`❌ Failed to get invite link for ${args.jid}`);
    return false;
  }

  console.log(`\n🔗 Invite Link:\n${link}\n`);
  return true;
}

/**
 * Create new group
 */
export async function cmdGroupCreate(
  client: MiawClient,
  args: { name: string; phones: string[] }
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  if (args.phones.length < 2) {
    console.log(`❌ At least 2 participants required to create a group`);
    return false;
  }

  console.log(`👥 Creating group "${args.name}" with ${args.phones.length} participants...`);

  const createResult = await client.createGroup(args.name, args.phones);

  if (createResult.success) {
    console.log(
      formatMessage(
        true,
        "Group created successfully",
        `Group JID: ${createResult.groupJid}`
      )
    );
    return true;
  }

  console.log(formatMessage(false, "Failed to create group", createResult.error));
  return false;
}
