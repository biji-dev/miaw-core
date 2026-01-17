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
 * Get profile (own or contact)
 * @param client - MiawClient instance
 * @param args - Optional arguments including jid for contact profile
 * @param jsonOutput - Whether to output as JSON
 */
export async function cmdGetProfile(
  client: MiawClient,
  args: { jid?: string },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  // If JID provided, get contact profile; otherwise get own profile
  if (args.jid) {
    // Get contact profile
    const profile = await client.getContactProfile(args.jid);
    if (!profile) {
      console.log(`❌ Failed to get profile for ${args.jid}`);
      return false;
    }

    if (jsonOutput) {
      console.log(formatJson(profile));
      return true;
    }

    // Display contact profile
    const displayData = {
      jid: profile.jid,
      phone: profile.phone,
      name: profile.name,
      status: profile.status,
      pictureUrl: profile.pictureUrl,
      isBusiness: profile.isBusiness,
    };

    console.log(
      formatKeyValue(displayData, "👤 Contact Profile")
    );

    // Display business profile if available
    if (profile.business) {
      console.log(
        formatKeyValue(profile.business, "🏢 Business Profile")
      );
    }

    return true;
  }

  // Get own profile
  const profile = await client.getOwnProfile();
  if (!profile) {
    console.log("❌ Failed to get profile");
    return false;
  }

  // Fetch business profile if this is a business account
  let businessProfile = null;
  if (profile.isBusiness) {
    businessProfile = await client.getBusinessProfile(profile.jid);
  }

  if (jsonOutput) {
    console.log(formatJson({ ...profile, business: businessProfile }));
    return true;
  }

  console.log(
    formatKeyValue(profile, "👤 Your Profile")
  );

  // Display business profile if available
  if (businessProfile) {
    console.log(
      formatKeyValue(businessProfile, "🏢 Business Profile")
    );
  }

  return true;
}

/**
 * Get all contacts
 */
export async function cmdGetContacts(
  client: MiawClient,
  args: { limit?: number; filter?: string },
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
  const totalCount = contacts.length;

  // Apply filter (case-insensitive substring match)
  if (args.filter) {
    const filterLower = args.filter.toLowerCase();
    contacts = contacts.filter((c) =>
      c.jid?.toLowerCase().includes(filterLower) ||
      c.phone?.toLowerCase().includes(filterLower) ||
      c.name?.toLowerCase().includes(filterLower)
    );
  }

  // Apply limit
  if (args.limit && args.limit < contacts.length) {
    contacts = contacts.slice(0, args.limit);
  }

  if (jsonOutput) {
    console.log(formatJson(contacts));
    return true;
  }

  const filterInfo = args.filter ? ` matching "${args.filter}"` : "";
  console.log(`\n📇 Contacts (${contacts.length}${filterInfo}):\n`);

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

  if (args.limit && contacts.length >= args.limit) {
    console.log(`\nShowing ${args.limit} of ${totalCount} contacts`);
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
  args: { limit?: number; filter?: string },
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
  const totalCount = chats.length;

  // Apply filter (case-insensitive substring match)
  if (args.filter) {
    const filterLower = args.filter.toLowerCase();
    chats = chats.filter((c) =>
      c.jid?.toLowerCase().includes(filterLower) ||
      c.phone?.toLowerCase().includes(filterLower) ||
      c.name?.toLowerCase().includes(filterLower)
    );
  }

  // Apply limit
  if (args.limit && args.limit < chats.length) {
    chats = chats.slice(0, args.limit);
  }

  if (jsonOutput) {
    console.log(formatJson(chats));
    return true;
  }

  // Get message counts for all chats
  const messageCounts = client.getMessageCounts();

  const filterInfo = args.filter ? ` matching "${args.filter}"` : "";
  console.log(`\n💬 Chats (${chats.length}${filterInfo}):\n`);

  const tableData = chats.map((c) => ({
    jid: c.jid,
    phone: c.phone || "-",
    name: c.name || "-",
    type: c.isGroup ? "Group" : "Individual",
    messages: messageCounts.get(c.jid) || 0,
    unread: c.unreadCount || 0,
  }));

  console.log(
    formatTable(tableData, [
      { key: "jid", label: "JID", width: 35 },
      { key: "phone", label: "Phone", width: 15 },
      { key: "name", label: "Name", width: 20 },
      { key: "type", label: "Type", width: 10 },
      { key: "messages", label: "Msgs", width: 6 },
      { key: "unread", label: "Unread", width: 7 },
    ])
  );

  if (args.limit && chats.length >= args.limit) {
    console.log(`\nShowing ${args.limit} of ${totalCount} chats`);
  }

  return true;
}

/**
 * Get chat messages
 */
export async function cmdGetMessages(
  client: MiawClient,
  args: { jid: string; limit?: number; filter?: string },
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
  const totalCount = messages.length;

  // Apply filter (case-insensitive substring match on sender or text)
  if (args.filter) {
    const filterLower = args.filter.toLowerCase();
    messages = messages.filter((m) =>
      m.text?.toLowerCase().includes(filterLower) ||
      m.senderName?.toLowerCase().includes(filterLower) ||
      m.senderPhone?.toLowerCase().includes(filterLower) ||
      m.from?.toLowerCase().includes(filterLower) ||
      m.type?.toLowerCase().includes(filterLower)
    );
  }

  // Apply limit
  if (args.limit && args.limit < messages.length) {
    messages = messages.slice(0, args.limit);
  }

  if (jsonOutput) {
    console.log(formatJson(messages));
    return true;
  }

  const filterInfo = args.filter ? ` matching "${args.filter}"` : "";
  console.log(`\n💬 Messages from ${args.jid} (${messages.length}${filterInfo}):\n`);

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

  if (args.limit && messages.length >= args.limit) {
    console.log(`\nShowing ${args.limit} of ${totalCount} messages`);
  }

  return true;
}

/**
 * Load more (older) messages for a chat
 */
export async function cmdLoadMoreMessages(
  client: MiawClient,
  args: { jid: string; count?: number },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  const count = args.count || 50;
  console.log(`\n⏳ Loading ${count} older messages for ${args.jid}...`);

  const loadResult = await client.loadMoreMessages(args.jid, count);

  if (!loadResult.success) {
    console.log(`❌ Failed to load messages: ${loadResult.error}`);
    return false;
  }

  if (jsonOutput) {
    console.log(formatJson(loadResult));
    return true;
  }

  console.log(`✅ Loaded ${loadResult.messagesLoaded} messages`);
  console.log(`   Has more: ${loadResult.hasMore ? "Yes" : "No"}`);

  // Show updated message count
  const fetchResult = await client.getChatMessages(args.jid);
  if (fetchResult.success) {
    console.log(`   Total messages in store: ${fetchResult.messages?.length || 0}`);
  }

  return true;
}

/**
 * Get all labels/lists
 * - WhatsApp Business: Called "Labels" for organizing contacts/chats
 * - WhatsApp Personal: Called "Lists" for chat organization (added Oct 2024)
 * Both use the same underlying protocol mechanism
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

  // Force sync to ensure we get fresh labels from WhatsApp
  // This matches the behavior of interactive tests which work reliably
  const fetchResult = await client.fetchAllLabels(true, 3000);

  if (!fetchResult.success) {
    console.log("❌ Failed to fetch labels/lists");
    return false;
  }

  const labels = fetchResult.labels || [];

  if (jsonOutput) {
    console.log(formatJson(labels));
    return true;
  }

  if (labels.length === 0) {
    console.log("🏷️  No labels/lists found");
    return true;
  }

  console.log(`\n🏷️  Labels/Lists (${labels.length}):\n`);

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

