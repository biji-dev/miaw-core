/**
 * Simple Echo Bot Example
 *
 * This example demonstrates:
 * - How to initialize MiawClient
 * - Handle QR code for authentication
 * - Receive and respond to messages
 * - Auto-reconnection on disconnect
 */

import { MiawClient } from "../src";
import qrcode from "qrcode-terminal";

// Create a new client instance
const client = new MiawClient({
  instanceId: "my-bot-1",
  sessionPath: "./sessions",
  debug: true, // Enable logging for development (includes raw Baileys messages)
});

// Handle QR code - scan this with WhatsApp
client.on("qr", (qr) => {
  console.log("\n=================================");
  console.log("QR Code received! Scan with WhatsApp:");
  console.log("=================================\n");

  // Display QR code in terminal
  qrcode.generate(qr, { small: true });

  console.log("\n=================================\n");

  // In a real app, you might also want to:
  // - Send it to a web dashboard
  // - Save it as an image file
});

// When client is ready and connected
client.on("ready", () => {
  console.log("✓ Bot is ready and connected!");
  console.log(`Instance ID: ${client.getInstanceId()}`);
  console.log("\nNote: LID to phone number mapping is built from incoming messages.");
  console.log("You'll see resolved phone numbers for outgoing messages after");
  console.log("receiving at least one message from that contact.\n");
});

// Handle all messages (incoming and outgoing)
client.on("message", async (message) => {
  // Determine JID type for display
  let jidType = "Unknown";
  if (message.from.includes("@s.whatsapp.net")) jidType = "Standard (Phone)";
  else if (message.from.includes("@lid")) jidType = "Link ID (Privacy)";
  else if (message.from.includes("@g.us")) jidType = "Group";

  // Resolve LID to phone number if possible
  const resolvedJid = client.resolveLidToJid(message.from);
  const resolvedPhone = client.getPhoneFromJid(message.from);

  const direction = message.fromMe ? "OUTGOING" : "INCOMING";
  console.log(`\n--- ${direction} Message ---`);
  console.log(`From (JID): ${message.from}`);
  console.log(`JID Type: ${jidType}`);

  // Show resolved phone number for LID messages
  if (message.from.includes("@lid") && resolvedJid !== message.from) {
    console.log(`Resolved JID: ${resolvedJid}`);
    console.log(`Resolved Phone: ${resolvedPhone || "N/A"}`);
  } else {
    console.log(`Phone Number: ${message.senderPhone || resolvedPhone || "N/A"}`);
  }

  console.log(`Sender Name: ${message.senderName || "N/A"}`);
  console.log(`Text: ${message.text}`);
  console.log(`Type: ${message.type}`);
  console.log(`Is Group: ${message.isGroup}`);
  console.log(`From Me: ${message.fromMe}`);
  console.log(`Timestamp: ${new Date(message.timestamp * 1000).toISOString()}`);

  // Only echo for incoming messages
  if (!message.fromMe && message.text) {
    const response = `Echo: ${message.text}`;
    const result1 = await client.sendText(message.from, response);
    const result2 =
      message.senderPhone &&
      (await client.sendText(message.senderPhone, response));

    if (result1.success || (result2 && result2.success)) {
      console.log(`Sent reply: ${response}`);
    } else {
      console.error(
        `Failed to send: ${result1.error || (result2 && result2?.error)}`
      );
    }
  }
});

// Handle connection state changes
client.on("connection", (state) => {
  console.log(`Connection state: ${state}`);
});

// Handle reconnection attempts
client.on("reconnecting", (attempt) => {
  console.log(`Reconnecting... Attempt #${attempt}`);
});

// Handle disconnection
client.on("disconnected", (reason) => {
  console.log(`Disconnected: ${reason || "unknown reason"}`);
});

// Handle errors
client.on("error", (error) => {
  console.error("Error occurred:", error.message);
});

// Start the client
(async () => {
  try {
    console.log("Starting WhatsApp bot...");
    await client.connect();
  } catch (error) {
    console.error("Failed to start bot:", error);
    process.exit(1);
  }
})();

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nShutting down...");
  await client.disconnect();
  process.exit(0);
});
