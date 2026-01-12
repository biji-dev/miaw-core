/**
 * Get Commands
 *
 * Commands for fetching data (profile, contacts, groups, chats, messages, labels)
 */

import { MiawClient } from "../../index.js";
import { ensureConnected } from "../utils/session.js";
import { formatTable, formatKeyValue, formatJson } from "../utils/formatter.js";
import { getLabelColorName } from "../../constants/colors.js";

/**
 * Get own profile
 */
export async function cmdGetProfile(
  client: MiawClient,
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  const profile = await client.getOwnProfile();
  if (!profile) {
    console.log("❌ Failed to get profile");
    return false;
  }

  if (jsonOutput) {
    console.log(formatJson(profile));
    return true;
  }

  console.log(
    formatKeyValue(profile, "👤 Your Profile")
  );
  return true;
}

/**
 * Get all contacts
 */
export async function cmdGetContacts(
  client: MiawClient,
  args: { limit?: number },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  const fetchResult = await client.fetchAllContacts();
  if (!fetchResult.success) {
    console.log("❌ Failed to fetch contacts");
    return false;
  }

  let contacts = fetchResult.contacts || [];

  // Apply limit
  if (args.limit && args.limit < contacts.length) {
    contacts = contacts.slice(0, args.limit);
  }

  if (jsonOutput) {
    console.log(formatJson(contacts));
    return true;
  }

  console.log(`\n📇 Contacts (${contacts.length}):\n`);

  const tableData = contacts.map((c) => ({
    jid: c.jid,
    phone: c.phone || "-",
    name: c.name || "-",
  }));

  console.log(
    formatTable(tableData, [
      { key: "jid", label: "JID", width: 40 },
      { key: "phone", label: "Phone", width: 15 },
      { key: "name", label: "Name", width: 25 },
    ])
  );

  if (args.limit && fetchResult.contacts && fetchResult.contacts.length > args.limit) {
    console.log(`\nShowing ${args.limit} of ${fetchResult.contacts.length} contacts`);
  }

  return true;
}

/**
 * Get all groups
 */
export async function cmdGetGroups(
  client: MiawClient,
  args: { limit?: number },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  const fetchResult = await client.fetchAllGroups();
  if (!fetchResult.success) {
    console.log("❌ Failed to fetch groups");
    return false;
  }

  let groups = fetchResult.groups || [];

  // Apply limit
  if (args.limit && args.limit < groups.length) {
    groups = groups.slice(0, args.limit);
  }

  if (jsonOutput) {
    console.log(formatJson(groups));
    return true;
  }

  console.log(`\n👥 Groups (${groups.length}):\n`);

  const tableData = groups.map((g) => ({
    jid: g.jid,
    name: g.name,
    participants: g.participantCount,
    description: g.description || "-",
  }));

  console.log(
    formatTable(tableData, [
      { key: "jid", label: "JID", width: 40 },
      { key: "name", label: "Name", width: 25 },
      { key: "participants", label: "Members", width: 10 },
      { key: "description", label: "Description", width: 30, truncate: 25 },
    ])
  );

  if (args.limit && fetchResult.groups && fetchResult.groups.length > args.limit) {
    console.log(`\nShowing ${args.limit} of ${fetchResult.groups.length} groups`);
  }

  return true;
}

/**
 * Get all chats
 */
export async function cmdGetChats(
  client: MiawClient,
  args: { limit?: number },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  const fetchResult = await client.fetchAllChats();
  if (!fetchResult.success) {
    console.log("❌ Failed to fetch chats");
    return false;
  }

  let chats = fetchResult.chats || [];

  // Apply limit
  if (args.limit && args.limit < chats.length) {
    chats = chats.slice(0, args.limit);
  }

  if (jsonOutput) {
    console.log(formatJson(chats));
    return true;
  }

  console.log(`\n💬 Chats (${chats.length}):\n`);

  const tableData = chats.map((c) => ({
    jid: c.jid,
    name: c.name || "-",
    type: c.isGroup ? "Group" : "Individual",
    unread: c.unreadCount || 0,
    archived: c.isArchived ? "Yes" : "No",
  }));

  console.log(
    formatTable(tableData, [
      { key: "jid", label: "JID", width: 40 },
      { key: "name", label: "Name", width: 25 },
      { key: "type", label: "Type", width: 12 },
      { key: "unread", label: "Unread", width: 8 },
      { key: "archived", label: "Archived", width: 10 },
    ])
  );

  if (args.limit && fetchResult.chats && fetchResult.chats.length > args.limit) {
    console.log(`\nShowing ${args.limit} of ${fetchResult.chats.length} chats`);
  }

  return true;
}

/**
 * Get chat messages
 */
export async function cmdGetMessages(
  client: MiawClient,
  args: { jid: string; limit?: number },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  const fetchResult = await client.getChatMessages(args.jid);
  if (!fetchResult.success) {
    console.log(`❌ Failed to fetch messages from ${args.jid}`);
    return false;
  }

  let messages = fetchResult.messages || [];

  // Apply limit
  if (args.limit && args.limit < messages.length) {
    messages = messages.slice(0, args.limit);
  }

  if (jsonOutput) {
    console.log(formatJson(messages));
    return true;
  }

  console.log(`\n💬 Messages from ${args.jid} (${messages.length}):\n`);

  const tableData = messages.map((m) => ({
    id: m.id.substring(0, 12) + "...",
    from: m.fromMe ? "Me" : m.senderName || m.senderPhone || m.from,
    type: m.type,
    text: m.text || "-",
    time: new Date(m.timestamp).toLocaleTimeString(),
  }));

  console.log(
    formatTable(tableData, [
      { key: "id", label: "ID", width: 15 },
      { key: "from", label: "From", width: 20 },
      { key: "type", label: "Type", width: 10 },
      { key: "text", label: "Text", width: 35, truncate: 30 },
      { key: "time", label: "Time", width: 10 },
    ])
  );

  if (args.limit && fetchResult.messages && fetchResult.messages.length > args.limit) {
    console.log(`\nShowing ${args.limit} of ${fetchResult.messages.length} messages`);
  }

  return true;
}

/**
 * Get all labels (Business only)
 */
export async function cmdGetLabels(
  client: MiawClient,
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  const fetchResult = await client.fetchAllLabels(true);
  if (!fetchResult.success) {
    console.log("❌ Failed to fetch labels (Business account required)");
    return false;
  }

  const labels = fetchResult.labels || [];

  if (jsonOutput) {
    console.log(formatJson(labels));
    return true;
  }

  if (labels.length === 0) {
    console.log("🏷️  No labels found (Business feature)");
    return true;
  }

  console.log(`\n🏷️  Labels (${labels.length}):\n`);

  const tableData = labels.map((l) => ({
    id: l.id,
    name: l.name,
    color: l.color,
    colorName: getLabelColorName(l.color),
  }));

  console.log(
    formatTable(tableData, [
      { key: "id", label: "ID", width: 40 },
      { key: "name", label: "Name", width: 25 },
      { key: "color", label: "Color", width: 8 },
      { key: "colorName", label: "Color Name", width: 15 },
    ])
  );

  return true;
}

