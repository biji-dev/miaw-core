/**
 * Status / Stories Commands (v1.8.0)
 *
 * Post text/image/video to status@broadcast. Omit --recipients to send to all
 * contacts; pass a comma-separated list to target a subset.
 */

import * as fs from "fs";
import { MiawClient } from "../../index.js";
import { ensureConnected } from "../utils/session.js";
import { formatMessage } from "../utils/formatter.js";

function parseRecipients(csv?: string): string[] | undefined {
  if (!csv) return undefined;
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function cmdStatusText(
  client: MiawClient,
  args: { text: string; recipients?: string; bg?: string; font?: number }
): Promise<boolean> {
  const conn = await ensureConnected(client);
  if (!conn.success) {
    console.log(`❌ Not connected: ${conn.reason}`);
    return false;
  }

  console.log("📢 Posting text status...");
  const res = await client.postTextStatus(
    args.text,
    parseRecipients(args.recipients),
    { backgroundColor: args.bg, font: args.font }
  );

  if (res.success) {
    console.log(formatMessage(true, "Status posted", `Message ID: ${res.messageId}`));
    return true;
  }
  console.log(formatMessage(false, "Failed to post status", res.error));
  return false;
}

async function postMediaStatus(
  client: MiawClient,
  kind: "image" | "video",
  args: { path: string; recipients?: string; caption?: string }
): Promise<boolean> {
  const conn = await ensureConnected(client);
  if (!conn.success) {
    console.log(`❌ Not connected: ${conn.reason}`);
    return false;
  }

  // Allow URLs; only existence-check local file paths.
  if (!args.path.startsWith("http") && !fs.existsSync(args.path)) {
    console.log(`❌ File not found: ${args.path}`);
    return false;
  }

  console.log(`📢 Posting ${kind} status...`);
  const recipients = parseRecipients(args.recipients);
  const res =
    kind === "image"
      ? await client.postImageStatus(args.path, recipients, { caption: args.caption })
      : await client.postVideoStatus(args.path, recipients, { caption: args.caption });

  if (res.success) {
    console.log(formatMessage(true, "Status posted", `Message ID: ${res.messageId}`));
    return true;
  }
  console.log(formatMessage(false, "Failed to post status", res.error));
  return false;
}

export const cmdStatusImage = (
  client: MiawClient,
  args: { path: string; recipients?: string; caption?: string }
) => postMediaStatus(client, "image", args);

export const cmdStatusVideo = (
  client: MiawClient,
  args: { path: string; recipients?: string; caption?: string }
) => postMediaStatus(client, "video", args);
