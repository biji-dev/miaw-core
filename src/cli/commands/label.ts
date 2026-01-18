/**
 * Label Commands (WhatsApp Business only)
 *
 * Commands for managing labels on chats
 */

import { MiawClient } from "../../index.js";
import { LabelColor } from "../../types/index.js";
import { ensureConnected } from "../utils/session.js";

/**
 * Color name to LabelColor mapping
 */
const colorMap: Record<string, LabelColor> = {
  salmon: LabelColor.Color1,
  gold: LabelColor.Color2,
  yellow: LabelColor.Color3,
  mint: LabelColor.Color4,
  teal: LabelColor.Color5,
  cyan: LabelColor.Color6,
  sky: LabelColor.Color7,
  blue: LabelColor.Color8,
  purple: LabelColor.Color9,
  pink: LabelColor.Color10,
  rose: LabelColor.Color11,
  orange: LabelColor.Color12,
  lime: LabelColor.Color13,
  green: LabelColor.Color14,
  emerald: LabelColor.Color15,
  indigo: LabelColor.Color16,
  violet: LabelColor.Color17,
  magenta: LabelColor.Color18,
  red: LabelColor.Color19,
  gray: LabelColor.Color20,
};

/**
 * Parse color argument - accepts number (0-19) or color name
 */
function parseColor(colorArg: string): LabelColor | null {
  // Try as number first
  const num = parseInt(colorArg, 10);
  if (!isNaN(num) && num >= 0 && num <= 19) {
    return num as LabelColor;
  }

  // Try as color name
  const colorName = colorArg.toLowerCase();
  if (colorName in colorMap) {
    return colorMap[colorName];
  }

  return null;
}

/**
 * Get list of available color names
 */
function getColorNames(): string {
  return Object.keys(colorMap).join(", ");
}

/**
 * Create a new label
 *
 * Usage: label add <name> <color>
 * Color: 0-19 or color name (salmon, gold, yellow, mint, teal, cyan, sky, blue, purple, pink, etc.)
 */
export async function cmdLabelAdd(
  client: MiawClient,
  args: { name: string; color: string },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  if (!args.name) {
    console.log("❌ Usage: label add <name> <color>");
    console.log("   Color: 0-19 or name (" + getColorNames() + ")");
    return false;
  }

  if (!args.color) {
    console.log("❌ Missing color. Usage: label add <name> <color>");
    console.log("   Color: 0-19 or name (" + getColorNames() + ")");
    return false;
  }

  const color = parseColor(args.color);
  if (color === null) {
    console.log(`❌ Invalid color: ${args.color}`);
    console.log("   Valid colors: 0-19 or name (" + getColorNames() + ")");
    return false;
  }

  const addResult = await client.addLabel({
    name: args.name,
    color: color,
  });

  if (jsonOutput) {
    console.log(JSON.stringify(addResult, null, 2));
    return addResult.success;
  }

  if (addResult.success) {
    console.log(`✅ Label created successfully`);
    console.log(`   Name: ${args.name}`);
    console.log(`   Color: ${color} (${args.color})`);
    console.log(`   ID: ${addResult.labelId}`);
  } else {
    console.log(`❌ Failed to create label: ${addResult.error}`);
  }

  return addResult.success;
}

/**
 * Add label to a chat
 *
 * Usage: label chat add <jid> <labelId>
 */
export async function cmdLabelChatAdd(
  client: MiawClient,
  args: { jid: string; labelId: string },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  if (!args.jid || !args.labelId) {
    console.log("❌ Usage: label chat add <jid> <labelId>");
    console.log("   jid: Phone number or full JID");
    console.log("   labelId: Label ID (use 'get labels' to see available labels)");
    return false;
  }

  const addResult = await client.addChatLabel(args.jid, args.labelId);

  if (jsonOutput) {
    console.log(JSON.stringify(addResult, null, 2));
    return addResult.success;
  }

  if (addResult.success) {
    console.log(`✅ Label added to chat`);
    console.log(`   Chat: ${args.jid}`);
    console.log(`   Label ID: ${args.labelId}`);
  } else {
    console.log(`❌ Failed to add label: ${addResult.error}`);
  }

  return addResult.success;
}

/**
 * Remove label from a chat
 *
 * Usage: label chat remove <jid> <labelId>
 */
export async function cmdLabelChatRemove(
  client: MiawClient,
  args: { jid: string; labelId: string },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  if (!args.jid || !args.labelId) {
    console.log("❌ Usage: label chat remove <jid> <labelId>");
    console.log("   jid: Phone number or full JID");
    console.log("   labelId: Label ID (use 'get labels' to see available labels)");
    return false;
  }

  const removeResult = await client.removeChatLabel(args.jid, args.labelId);

  if (jsonOutput) {
    console.log(JSON.stringify(removeResult, null, 2));
    return removeResult.success;
  }

  if (removeResult.success) {
    console.log(`✅ Label removed from chat`);
    console.log(`   Chat: ${args.jid}`);
    console.log(`   Label ID: ${args.labelId}`);
  } else {
    console.log(`❌ Failed to remove label: ${removeResult.error}`);
  }

  return removeResult.success;
}
