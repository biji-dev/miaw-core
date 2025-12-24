/**
 * Advanced Messaging Example (v0.6.0)
 *
 * Demonstrates advanced messaging features:
 * - Sending reactions to messages
 * - Removing reactions
 * - Forwarding messages
 * - Editing your own messages
 * - Deleting messages (for everyone)
 * - Deleting messages locally (for yourself only)
 */

import { MiawClient } from "miaw-core";
import qrcode from "qrcode-terminal";

const client = new MiawClient({
  instanceId: "advanced-bot",
  sessionPath: "./sessions",
});

// Store sent messages for editing/deleting demo
const sentMessages = new Map<string, { chatId: string; text: string }>();

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ Advanced Messaging Bot ready!");
});

client.on("message", async (message) => {
  if (message.fromMe) {
    // Track our sent messages
    sentMessages.set(message.id, {
      chatId: message.from,
      text: message.text || "",
    });
    return;
  }

  const text = message.text?.toLowerCase() || "";

  // React to a message
  if (text.startsWith("!react ")) {
    const emoji = text.substring(7).trim();
    await client.sendReaction(message.id, message.from, emoji);
  }

  // Remove reaction
  if (text === "!unreact") {
    await client.removeReaction(message.id, message.from);
  }

  // Common reactions shortcuts
  if (text === "❤️" || text === "👍" || text === "😂" || text === "😮" || text === "😢" || text === "🙏") {
    await client.sendReaction(message.id, message.from, text);
  }

  // Forward message to another chat
  // Usage: !forward <jid> or !forward <phone>
  if (text.startsWith("!forward ")) {
    const target = text.substring(9).trim();
    const result = await client.forwardMessage(target, message);

    if (result.success) {
      await client.sendText(message.from, `✅ Forwarded to ${target}`);
    } else {
      await client.sendText(message.from, `❌ Failed to forward: ${result.error}`);
    }
  }

  // Edit a message (sends a new message, then edits it)
  if (text === "!editdemo") {
    const result = await client.sendText(message.from, "Wait, I need to think...");

    if (result.success && result.messageId) {
      // Wait a bit, then edit
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await client.editMessage(result.messageId!, message.from, "Actually, here's my answer! ✨");
    }
  }

  // Send a message with option to delete
  if (text === "!selfdestruct") {
    const result = await client.sendText(message.from, "This message will self-destruct in 5 seconds...");

    if (result.success && result.messageId) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await client.deleteMessage(result.messageId!, message.from);
      await client.sendText(message.from, "💥 Message deleted for everyone!");
    }
  }

  // Delete for me only (doesn't delete for recipient)
  if (text === "!deleteforme") {
    const result = await client.sendText(message.from, "This will be deleted from my view only...");

    if (result.success && result.messageId) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await client.deleteMessageForMe(result.messageId!, message.from);
      await client.sendText(message.from, "🗑️ Deleted from my view only (you can still see it)");
    }
  }

  // Quick reply with reaction
  if (text === "!ack") {
    // Send thumbs up reaction
    await client.sendReaction(message.id, message.from, "👍");
  }

  // React poll
  if (text === "!poll") {
    await client.sendText(message.from, "React with your choice:\n❤️ = Yes\n💔 = No");
  }

  // Help menu
  if (text === "!help") {
    const helpText = `
*Advanced Messaging Commands:*
!react <emoji> - React to your message
!unreact - Remove reaction
❤️👍😂😮😢🙏 - Quick reactions (just send emoji)
!forward <jid> - Forward message to another chat
!editdemo - Send and edit a message demo
!selfdestruct - Send message that auto-deletes
!deleteforme - Delete message from my view only
!ack - Quick acknowledgement with 👍
!poll - Create a reaction poll
    `;
    await client.sendText(message.from, helpText);
  }
});

// Handle incoming reactions
client.on("message_reaction", (reaction) => {
  if (!reaction.isRemoval) {
    console.log(`😀 Reaction: ${reaction.emoji} from ${reaction.reactorId}`);
  } else {
    console.log(`🚫 Reaction removed from ${reaction.reactorId}`);
  }
});

client.connect().catch(console.error);
