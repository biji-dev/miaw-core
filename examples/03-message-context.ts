/**
 * Message Context Example (v0.3.0)
 *
 * Demonstrates advanced message context features:
 * - Replying to messages (quoting)
 * - Handling message edits
 * - Handling message deletions
 * - Handling reactions
 */

import { MiawClient } from "miaw-core";
import qrcode from "qrcode-terminal";

const client = new MiawClient({
  instanceId: "context-bot",
  sessionPath: "./sessions",
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ Context Bot ready!");
});

// Store messages for reply reference
const messageHistory = new Map<string, any>();

client.on("message", async (message) => {
  if (message.fromMe) return;

  // Store message for potential reply
  messageHistory.set(message.id, message);

  const text = message.text?.toLowerCase() || "";

  // Reply to the message (with quote)
  if (text === "!reply") {
    await client.sendText(message.from, "I'm replying to your message!", {
      quoted: message,
    });
  }

  // Quote with image
  if (text === "!reply-image") {
    await client.sendImage(
      message.from,
      { url: "https://picsum.photos/400/300" },
      {
        caption: "Here's an image in reply!",
        quoted: message,
      }
    );
  }

  // Help menu
  if (text === "!help") {
    const helpText = `
*Message Context Commands:*
!reply - Reply with a quoted text
!reply-image - Reply with a quoted image
!react - React to your message
!edit <text> - Edit your last message
!delete - Delete your last message
    `;
    await client.sendText(message.from, helpText);
  }
});

// Handle message edits
client.on("message_edit", async (edit) => {
  console.log(`✏️ Message edited: ${edit.messageId}`);
  console.log(`   New text: ${edit.newText}`);

  // Acknowledge the edit
  await client.sendText(edit.chatId, "I saw you edited that message!");
});

// Handle message deletions
client.on("message_delete", async (deletion) => {
  console.log(`🗑️ Message deleted: ${deletion.messageId}`);
  console.log(`   From: ${deletion.fromMe ? "me" : "them"}`);

  // Acknowledge the deletion
  if (!deletion.fromMe) {
    await client.sendText(deletion.chatId, "Why did you delete that? 🤔");
  }
});

// Handle reactions
client.on("message_reaction", async (reaction) => {
  console.log(
    `😀 Reaction: ${reaction.emoji} to message ${reaction.messageId}`
  );

  if (reaction.isRemoval) {
    console.log("   (Reaction removed)");
  } else {
    // React back!
    await client.sendReaction(reaction.messageId, reaction.chatId, "❤️");
  }
});

// Manual reaction command
client.on("message", async (message) => {
  if (message.fromMe) return;

  const text = message.text?.toLowerCase() || "";

  // React to user's message
  if (text === "!react") {
    await client.sendReaction(message.id, message.from, "👍");
  }

  // Edit message (demo - would need to track your own messages)
  if (text.startsWith("!edit ")) {
    // Note: Can only edit your own messages within 15 minutes
    const _newText = text.substring(6);
    // await client.editMessage(messageId, _newText);
  }

  // Delete message (demo)
  if (text === "!delete") {
    // Note: Can only delete your own messages
    // await client.deleteMessage(messageId, chatId);
  }
});

client.connect().catch(console.error);
