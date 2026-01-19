/**
 * Contact Commands
 *
 * Commands for managing contacts (list, info, business profile, picture, add, remove)
 */

import { MiawClient } from "../../index.js";
import { ensureConnected } from "../utils/session.js";
import { formatTable, formatKeyValue, formatJson, formatMessage } from "../utils/formatter.js";

/**
 * List all contacts
 */
export async function cmdContactList(
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
 * Get contact info
 */
export async function cmdContactInfo(
  client: MiawClient,
  args: { phone: string },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  if (!args.phone) {
    console.log("❌ Usage: contact info <phone>");
    return false;
  }

  console.log(`🔍 Getting contact info for ${args.phone}...`);

  const contactInfo = await client.getContactInfo(args.phone);
  if (!contactInfo) {
    console.log(`❌ Failed to get contact info for ${args.phone}`);
    return false;
  }

  if (jsonOutput) {
    console.log(formatJson(contactInfo));
    return true;
  }

  console.log(formatKeyValue(contactInfo, "📇 Contact Info"));
  return true;
}

/**
 * Get contact's business profile
 */
export async function cmdContactBusiness(
  client: MiawClient,
  args: { phone: string },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  if (!args.phone) {
    console.log("❌ Usage: contact business <phone>");
    return false;
  }

  console.log(`🔍 Getting business profile for ${args.phone}...`);

  const businessProfile = await client.getBusinessProfile(args.phone);
  if (!businessProfile) {
    console.log(`❌ No business profile found for ${args.phone} (may not be a business account)`);
    return false;
  }

  if (jsonOutput) {
    console.log(formatJson(businessProfile));
    return true;
  }

  console.log(formatKeyValue(businessProfile, "🏢 Business Profile"));
  return true;
}

/**
 * Get contact's profile picture URL
 */
export async function cmdContactPicture(
  client: MiawClient,
  args: { phone: string; high?: boolean }
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  if (!args.phone) {
    console.log("❌ Usage: contact picture <phone> [--high]");
    return false;
  }

  const highRes = args.high || false;
  console.log(`🔍 Getting profile picture for ${args.phone}${highRes ? " (high resolution)" : ""}...`);

  const pictureUrl = await client.getProfilePicture(args.phone, highRes);
  if (!pictureUrl) {
    console.log(`❌ No profile picture found for ${args.phone} (may be hidden by privacy settings)`);
    return false;
  }

  console.log(formatMessage(true, "Profile Picture URL", pictureUrl));
  return true;
}

/**
 * Add or edit a contact
 */
export async function cmdContactAdd(
  client: MiawClient,
  args: { phone: string; name: string; first?: string; last?: string }
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  if (!args.phone || !args.name) {
    console.log("❌ Usage: contact add <phone> <name> [--first <firstName>] [--last <lastName>]");
    return false;
  }

  console.log(`📝 Adding/updating contact ${args.phone} as "${args.name}"...`);

  const addResult = await client.addOrEditContact({
    phone: args.phone,
    name: args.name,
    firstName: args.first,
    lastName: args.last,
  });

  if (addResult.success) {
    console.log(formatMessage(true, "Contact saved", `${args.name} (${args.phone})`));
    return true;
  }

  console.log(formatMessage(false, "Failed to save contact", addResult.error));
  return false;
}

/**
 * Remove a contact
 */
export async function cmdContactRemove(
  client: MiawClient,
  args: { phone: string }
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  if (!args.phone) {
    console.log("❌ Usage: contact remove <phone>");
    return false;
  }

  console.log(`🗑️  Removing contact ${args.phone}...`);

  const removeResult = await client.removeContact(args.phone);

  if (removeResult.success) {
    console.log(formatMessage(true, "Contact removed", args.phone));
    return true;
  }

  console.log(formatMessage(false, "Failed to remove contact", removeResult.error));
  return false;
}
