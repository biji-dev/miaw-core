/**
 * Profile Commands
 *
 * Commands for managing own profile (picture, name, status)
 */

import * as fs from "fs";
import * as path from "path";
import { MiawClient } from "../../index.js";
import { ensureConnected } from "../utils/session.js";
import { formatMessage } from "../utils/formatter.js";

/**
 * Set profile picture
 */
export async function cmdProfilePictureSet(
  client: MiawClient,
  args: { path: string }
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  if (!args.path) {
    console.log("❌ Usage: profile picture set <path>");
    return false;
  }

  // Resolve path (support relative paths)
  const imagePath = path.resolve(args.path);

  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    console.log(`❌ File not found: ${imagePath}`);
    return false;
  }

  console.log(`🖼️  Updating profile picture from ${imagePath}...`);

  const updateResult = await client.updateProfilePicture(imagePath);

  if (updateResult.success) {
    console.log(formatMessage(true, "Profile picture updated successfully"));
    return true;
  }

  console.log(formatMessage(false, "Failed to update profile picture", updateResult.error));
  return false;
}

/**
 * Remove profile picture
 */
export async function cmdProfilePictureRemove(
  client: MiawClient
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  console.log("🗑️  Removing profile picture...");

  const removeResult = await client.removeProfilePicture();

  if (removeResult.success) {
    console.log(formatMessage(true, "Profile picture removed successfully"));
    return true;
  }

  console.log(formatMessage(false, "Failed to remove profile picture", removeResult.error));
  return false;
}

/**
 * Set profile name (display name / push name)
 */
export async function cmdProfileNameSet(
  client: MiawClient,
  args: { name: string }
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  if (!args.name || args.name.trim() === "") {
    console.log("❌ Usage: profile name set <name>");
    console.log("   Name cannot be empty");
    return false;
  }

  console.log(`📝 Updating profile name to "${args.name}"...`);

  const updateResult = await client.updateProfileName(args.name);

  if (updateResult.success) {
    console.log(formatMessage(true, "Profile name updated", args.name));
    return true;
  }

  console.log(formatMessage(false, "Failed to update profile name", updateResult.error));
  return false;
}

/**
 * Set profile status (about text)
 */
export async function cmdProfileStatusSet(
  client: MiawClient,
  args: { status: string }
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  // Status can be empty (to clear it)
  const statusText = args.status || "";

  console.log(`📝 Updating profile status to "${statusText || "(empty)"}"...`);

  const updateResult = await client.updateProfileStatus(statusText);

  if (updateResult.success) {
    console.log(formatMessage(true, "Profile status updated", statusText || "(cleared)"));
    return true;
  }

  console.log(formatMessage(false, "Failed to update profile status", updateResult.error));
  return false;
}
