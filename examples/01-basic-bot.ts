/**
 * Basic Bot Example (v0.1.0)
 *
 * This is the simplest example of using Miaw Core.
 * It demonstrates:
 * - Creating a client with session persistence
 * - QR code authentication
 * - Sending and receiving text messages
 * - Basic event handling
 */

import { MiawClient } from "miaw-core";
import qrcode from "qrcode-terminal";

// Create client with session persistence
const client = new MiawClient({
  instanceId: "basic-bot",
  sessionPath: "./sessions",
  debug: true, // Enable debug logging
});

// Handle QR code - scan with WhatsApp to authenticate
client.on("qr", (qr) => {
  console.log("\n=== SCAN THIS QR CODE WITH WHATSAPP ===");
  qrcode.generate(qr, { small: true });
  console.log("=========================================\n");
});

// When client is ready and connected
client.on("ready", () => {
  console.log("✅ Bot is ready! You can now send and receive messages.");
});

// Handle incoming messages
client.on("message", async (message) => {
  console.log(`📩 Received: ${message.text}`);

  // Simple echo bot
  if (message.text && !message.fromMe) {
    await client.sendText(message.from, `You said: ${message.text}`);
  }
});

// Handle connection state changes
client.on("disconnected", (reason) => {
  console.log(`❌ Disconnected: ${reason}`);
});

client.on("reconnecting", (attempt) => {
  console.log(`🔄 Reconnecting... Attempt ${attempt}`);
});

// Handle errors
client.on("error", (error) => {
  console.error("❌ Error:", error);
});

// Start the bot
async function start() {
  try {
    await client.connect();
    console.log("🚀 Bot started. Waiting for QR code...");
  } catch (error) {
    console.error("Failed to start bot:", error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  process.exit(0);
});
