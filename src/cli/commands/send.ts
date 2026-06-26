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

/**
 * Send video
 */
export async function cmdSendVideo(
  client: MiawClient,
  args: {
    phone: string;
    path: string;
    caption?: string;
    gif?: boolean;
    ptv?: boolean;
  }
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

  const mediaType = args.ptv ? "video note" : args.gif ? "GIF" : "video";
  console.log(`📤 Sending ${mediaType} to ${args.phone}...`);

  const options: { caption?: string; gifPlayback?: boolean; ptv?: boolean } =
    {};
  if (args.caption) options.caption = args.caption;
  if (args.gif) options.gifPlayback = true;
  if (args.ptv) options.ptv = true;

  const sendResult = await client.sendVideo(args.phone, args.path, options);

  if (sendResult.success) {
    console.log(
      formatMessage(
        true,
        `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} sent successfully`,
        `Message ID: ${sendResult.messageId}`
      )
    );
    return true;
  }

  console.log(
    formatMessage(false, `Failed to send ${mediaType}`, sendResult.error)
  );
  return false;
}

/**
 * Send audio
 */
export async function cmdSendAudio(
  client: MiawClient,
  args: { phone: string; path: string; ptt?: boolean }
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

  const mediaType = args.ptt ? "voice note" : "audio";
  console.log(`📤 Sending ${mediaType} to ${args.phone}...`);

  const options: { ptt?: boolean } = {};
  if (args.ptt) options.ptt = true;

  const sendResult = await client.sendAudio(args.phone, args.path, options);

  if (sendResult.success) {
    console.log(
      formatMessage(
        true,
        `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} sent successfully`,
        `Message ID: ${sendResult.messageId}`
      )
    );
    return true;
  }

  console.log(
    formatMessage(false, `Failed to send ${mediaType}`, sendResult.error)
  );
  return false;
}

/**
 * Send location
 */
export async function cmdSendLocation(
  client: MiawClient,
  args: { phone: string; latitude: number; longitude: number; name?: string; address?: string }
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  console.log(`📤 Sending location to ${args.phone}...`);

  const sendResult = await client.sendLocation(
    args.phone,
    args.latitude,
    args.longitude,
    { name: args.name, address: args.address }
  );

  if (sendResult.success) {
    console.log(
      formatMessage(true, "Location sent successfully", `Message ID: ${sendResult.messageId}`)
    );
    return true;
  }

  console.log(formatMessage(false, "Failed to send location", sendResult.error));
  return false;
}

/**
 * Send a contact card (vCard)
 */
export async function cmdSendContact(
  client: MiawClient,
  args: { phone: string; fullName: string; contactPhone: string; org?: string }
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  console.log(`📤 Sending contact to ${args.phone}...`);

  const sendResult = await client.sendContact(args.phone, {
    fullName: args.fullName,
    phone: args.contactPhone,
    organization: args.org,
  });

  if (sendResult.success) {
    console.log(
      formatMessage(true, "Contact sent successfully", `Message ID: ${sendResult.messageId}`)
    );
    return true;
  }

  console.log(formatMessage(false, "Failed to send contact", sendResult.error));
  return false;
}

/**
 * Send a poll
 */
export async function cmdSendPoll(
  client: MiawClient,
  args: { phone: string; name: string; options: string[]; selectableCount?: number }
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  console.log(`📤 Sending poll to ${args.phone}...`);

  const sendResult = await client.sendPoll(args.phone, args.name, args.options, {
    selectableCount: args.selectableCount,
  });

  if (sendResult.success) {
    console.log(
      formatMessage(true, "Poll sent successfully", `Message ID: ${sendResult.messageId}`)
    );
    return true;
  }

  console.log(formatMessage(false, "Failed to send poll", sendResult.error));
  return false;
}

/**
 * Send a sticker (WebP)
 */
export async function cmdSendSticker(
  client: MiawClient,
  args: { phone: string; path: string }
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  // Allow URLs; only existence-check local file paths.
  if (!args.path.startsWith("http") && !fs.existsSync(args.path)) {
    console.log(`❌ File not found: ${args.path}`);
    return false;
  }

  console.log(`📤 Sending sticker to ${args.phone}...`);

  const sendResult = await client.sendSticker(args.phone, args.path);

  if (sendResult.success) {
    console.log(
      formatMessage(true, "Sticker sent successfully", `Message ID: ${sendResult.messageId}`)
    );
    return true;
  }

  console.log(formatMessage(false, "Failed to send sticker", sendResult.error));
  return false;
}
