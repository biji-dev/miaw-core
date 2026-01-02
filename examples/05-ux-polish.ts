/**
 * UX Polish Example (v0.5.0)
 *
 * Demonstrates user experience enhancement features:
 * - Read receipts (marking messages as read)
 * - Typing indicators
 * - Recording indicators
 * - Presence management (online/offline status)
 * - Subscribing to presence updates
 */

import { MiawClient } from "miaw-core";
import qrcode from "qrcode-terminal";

const client = new MiawClient({
  instanceId: "ux-bot",
  sessionPath: "./sessions",
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ UX Bot ready!");
});

// Track presence subscriptions
const presenceSubscriptions = new Set<string>();

client.on("message", async (message) => {
  if (message.fromMe) return;

  const text = message.text?.toLowerCase() || "";

  // Mark as read
  if (text === "!read") {
    await client.markAsRead(message.from, message.id);
    await client.sendText(message.from, "✅ Marked your messages as read!");
  }

  // Typing indicator demo
  if (text === "!typing") {
    // Send typing indicator
    await client.sendTyping(message.from);

    // Simulate work...
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Stop typing and send message
    await client.stopTyping(message.from);
    await client.sendText(message.from, "Done typing! 😊");
  }

  // Recording indicator demo
  if (text === "!recording") {
    await client.sendRecording(message.from);

    // Simulate recording...
    await new Promise((resolve) => setTimeout(resolve, 3000));

    await client.stopTyping(message.from);
    await client.sendText(message.from, "Done recording! 🎙️");
  }

  // Set presence to online
  if (text === "!online") {
    await client.setPresence("available");
    await client.sendText(message.from, "I'm now online! 🟢");
  }

  // Set presence to offline
  if (text === "!offline") {
    await client.setPresence("unavailable");
    await client.sendText(message.from, "I'm going offline... 🔴");
  }

  // Subscribe to presence updates
  if (text === "!subscribe") {
    await client.subscribePresence(message.from);
    presenceSubscriptions.add(message.from);
    await client.sendText(message.from, "I'll now track your online status!");
  }

  // Unsubscribe from presence
  if (text === "!unsubscribe") {
    // Note: Baileys doesn't have explicit unsubscribe, so we just stop tracking
    presenceSubscriptions.delete(message.from);
    await client.sendText(message.from, "Stopped tracking your presence.");
  }

  // Help menu
  if (text === "!help") {
    const helpText = `
*UX Polish Commands:*
!read - Mark your messages as read
!typing - Show typing indicator for 3 seconds
!recording - Show recording indicator for 3 seconds
!online - Set presence to online
!offline - Set presence to offline
!subscribe - Subscribe to your presence updates
!unsubscribe - Unsubscribe from presence updates
    `;
    await client.sendText(message.from, helpText);
  }
});

// Handle presence updates
client.on("presence", async (presence) => {
  // Only log if we're subscribed to this user
  if (presenceSubscriptions.has(presence.jid)) {
    const status = presence.status === "available" ? "🟢 Online" : "🔴 Offline";
    console.log(`${status}: ${presence.jid}`);

    if (presence.lastSeen) {
      console.log(`   Last seen: ${new Date(presence.lastSeen * 1000).toLocaleString()}`);
    }
  }
});

// Smart auto-read for everyone
client.on("message", async (message) => {
  if (message.fromMe) return;

  // Auto-subscribe to presence
  if (!presenceSubscriptions.has(message.from)) {
    await client.subscribePresence(message.from);
    presenceSubscriptions.add(message.from);
  }

  // Auto-mark as read (optional, can be disabled)
  // await client.markAsRead(message.from);
});

// Simulate processing with typing indicator
async function _processWithTyping(jid: string, fn: () => Promise<any>) {
  await client.sendTyping(jid);
  try {
    await fn();
  } finally {
    await client.stopTyping(jid);
  }
}

// Example usage:
// await processWithTyping(message.from, async () => {
//   // Do some work...
//   await new Promise(resolve => setTimeout(resolve, 2000));
//   await client.sendText(message.from, "Done!");
// });

client.connect().catch(console.error);
