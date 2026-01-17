/**
 * Send Commands
 *
 * Commands for sending messages (text, image, document, etc.)
 */

import * as fs from "fs";
import { MiawClient } from "../../index.js";
import { ensureConnected } from "../utils/session.js";
import { formatMessage } from "../utils/formatter.js";

/**
 * Send text message
 */
export async function cmdSendText(
  client: MiawClient,
  args: { phone: string; message: string }
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  console.log(`📤 Sending text to ${args.phone}...`);

  const sendResult = await client.sendText(args.phone, args.message);

  if (sendResult.success) {
    console.log(
      formatMessage(
        true,
        "Message sent successfully",
        `Message ID: ${sendResult.messageId}`
      )
    );
    return true;
  }

  console.log(formatMessage(false, "Failed to send message", sendResult.error));
  return false;
}

/**
 * Send image
 */
export async function cmdSendImage(
  client: MiawClient,
  args: { phone: string; path: string; caption?: string }
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  // Check if file exists
  if (!fs.existsSync(args.path)) {
    console.log(`❌ File not found: ${args.path}`);
    return false;
  }

  console.log(`📤 Sending image to ${args.phone}...`);

  const sendResult = await client.sendImage(args.phone, args.path, {
    caption: args.caption,
  });

  if (sendResult.success) {
    console.log(
      formatMessage(
        true,
        "Image sent successfully",
        `Message ID: ${sendResult.messageId}`
      )
    );
    return true;
  }

  console.log(formatMessage(false, "Failed to send image", sendResult.error));
  return false;
}

/**
 * Send document
 */
export async function cmdSendDocument(
  client: MiawClient,
  args: { phone: string; path: string; caption?: string }
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  // Check if file exists
  if (!fs.existsSync(args.path)) {
    console.log(`❌ File not found: ${args.path}`);
    return false;
  }

  console.log(`📤 Sending document to ${args.phone}...`);

  const options: any = {};
  if (args.caption) {
    options.caption = args.caption;
  }

  const sendResult = await client.sendDocument(
    args.phone,
    args.path,
    options
  );

  if (sendResult.success) {
    console.log(
      formatMessage(
        true,
        "Document sent successfully",
        `Message ID: ${sendResult.messageId}`
      )
    );
    return true;
  }

  console.log(
    formatMessage(false, "Failed to send document", sendResult.error)
  );
  return false;
}
