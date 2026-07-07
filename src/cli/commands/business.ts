/**
 * Business Commands (v1.8.0) — WhatsApp Business only.
 *
 * Update the business profile and cover photo. (Order details and quick replies
 * are library-only.)
 */

import * as fs from "fs";
import { MiawClient, BusinessProfileUpdate } from "../../index.js";
import { ensureConnected } from "../utils/session.js";
import { formatMessage } from "../utils/formatter.js";

export async function cmdBusinessProfile(
  client: MiawClient,
  args: {
    address?: string;
    email?: string;
    description?: string;
    websites?: string;
  }
): Promise<boolean> {
  const conn = await ensureConnected(client);
  if (!conn.success) {
    console.log(`❌ Not connected: ${conn.reason}`);
    return false;
  }

  const updates: BusinessProfileUpdate = {};
  if (args.address) updates.address = args.address;
  if (args.email) updates.email = args.email;
  if (args.description) updates.description = args.description;
  if (args.websites) {
    updates.websites = args.websites
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (Object.keys(updates).length === 0) {
    console.log("❌ Nothing to update. Pass --address, --email, --description, and/or --websites");
    return false;
  }

  console.log("🏢 Updating business profile...");
  const res = await client.updateBusinessProfile(updates);

  if (res.success) {
    console.log(formatMessage(true, "Business profile updated"));
    return true;
  }
  console.log(formatMessage(false, "Failed to update business profile", res.error));
  return false;
}

export async function cmdBusinessCoverSet(
  client: MiawClient,
  args: { path: string }
): Promise<boolean> {
  const conn = await ensureConnected(client);
  if (!conn.success) {
    console.log(`❌ Not connected: ${conn.reason}`);
    return false;
  }

  if (!args.path.startsWith("http") && !fs.existsSync(args.path)) {
    console.log(`❌ File not found: ${args.path}`);
    return false;
  }

  console.log("🏢 Setting cover photo...");
  const res = await client.updateCoverPhoto(args.path);

  if (res.success) {
    console.log(formatMessage(true, "Cover photo set", `Cover ID: ${res.coverPhotoId}`));
    return true;
  }
  console.log(formatMessage(false, "Failed to set cover photo", res.error));
  return false;
}

export async function cmdBusinessCoverRemove(
  client: MiawClient,
  args: { id: string }
): Promise<boolean> {
  const conn = await ensureConnected(client);
  if (!conn.success) {
    console.log(`❌ Not connected: ${conn.reason}`);
    return false;
  }

  console.log("🏢 Removing cover photo...");
  const res = await client.removeCoverPhoto(args.id);

  if (res.success) {
    console.log(formatMessage(true, "Cover photo removed"));
    return true;
  }
  console.log(formatMessage(false, "Failed to remove cover photo", res.error));
  return false;
}
