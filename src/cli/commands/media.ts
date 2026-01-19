/**
 * Media Commands
 *
 * Commands for media operations (download, etc.)
 */

import * as fs from "fs";
import * as path from "path";
import { MiawClient } from "../../index.js";
import { ensureConnected } from "../utils/session.js";
import { formatMessage } from "../utils/formatter.js";

/**
 * Download media from a message
 */
export async function cmdMediaDownload(
  client: MiawClient,
  args: {
    jid: string;
    messageId: string;
    outputPath: string;
  }
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  console.log(`📥 Fetching message ${args.messageId} from ${args.jid}...`);

  // Get messages for the chat
  const fetchResult = await client.getChatMessages(args.jid);
  if (!fetchResult.success || !fetchResult.messages) {
    console.log(`❌ Failed to fetch messages from ${args.jid}`);
    return false;
  }

  // Find the specific message
  const message = fetchResult.messages.find((m) => m.id === args.messageId);
  if (!message) {
    console.log(`❌ Message not found: ${args.messageId}`);
    console.log(`   Tip: Use 'get messages ${args.jid}' to see available messages`);
    return false;
  }

  // Check if message is a media type
  const mediaTypes = ["image", "video", "audio", "document", "sticker"];
  if (!mediaTypes.includes(message.type)) {
    console.log(`❌ Message is not a media message (type: ${message.type})`);
    return false;
  }

  // Check if message has raw data needed for download
  if (!message.raw) {
    console.log(`❌ Message does not contain raw data needed for download`);
    console.log(`   Note: Only recently received messages can be downloaded`);
    return false;
  }

  console.log(`📥 Downloading ${message.type}...`);

  // Download the media
  const buffer = await client.downloadMedia(message);
  if (!buffer) {
    console.log(`❌ Failed to download media`);
    return false;
  }

  // Ensure output directory exists
  const outputDir = path.dirname(args.outputPath);
  if (outputDir && outputDir !== "." && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write to file
  try {
    fs.writeFileSync(args.outputPath, buffer);
    const fileSizeKB = (buffer.length / 1024).toFixed(2);
    console.log(
      formatMessage(
        true,
        "Media downloaded successfully",
        `Saved to: ${args.outputPath}\nSize: ${fileSizeKB} KB\nType: ${message.type}`
      )
    );
    return true;
  } catch (error) {
    console.log(
      formatMessage(false, "Failed to save file", (error as Error).message)
    );
    return false;
  }
}
