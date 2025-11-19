/**
 * Simple Echo Bot Example
 *
 * This example demonstrates:
 * - How to initialize MiawClient
 * - Handle QR code for authentication
 * - Receive and respond to messages
 * - Auto-reconnection on disconnect
 */

import { MiawClient } from '../src';
import qrcode from 'qrcode-terminal';

// Create a new client instance
const client = new MiawClient({
  instanceId: 'my-bot-1',
  sessionPath: './sessions',
  debug: true, // Enable logging for development
});

// Handle QR code - scan this with WhatsApp
client.on('qr', (qr) => {
  console.log('\n=================================');
  console.log('QR Code received! Scan with WhatsApp:');
  console.log('=================================\n');

  // Display QR code in terminal
  qrcode.generate(qr, { small: true });

  console.log('\n=================================\n');

  // In a real app, you might also want to:
  // - Send it to a web dashboard
  // - Save it as an image file
});

// When client is ready and connected
client.on('ready', () => {
  console.log('✓ Bot is ready and connected!');
  console.log(`Instance ID: ${client.getInstanceId()}`);
});

// Handle incoming messages
client.on('message', async (message) => {
  // Ignore messages from yourself
  if (message.fromMe) return;

  console.log('\n--- New Message ---');
  console.log(`From: ${message.from}`);
  console.log(`Text: ${message.text}`);
  console.log(`Type: ${message.type}`);
  console.log(`Is Group: ${message.isGroup}`);
  console.log(`Timestamp: ${new Date(message.timestamp * 1000).toISOString()}`);

  // Simple echo bot - reply with the same message
  if (message.text) {
    const response = `Echo: ${message.text}`;
    const result = await client.sendText(message.from, response);

    if (result.success) {
      console.log(`✓ Sent reply: ${response}`);
    } else {
      console.error(`✗ Failed to send: ${result.error}`);
    }
  }
});

// Handle connection state changes
client.on('connection', (state) => {
  console.log(`Connection state: ${state}`);
});

// Handle reconnection attempts
client.on('reconnecting', (attempt) => {
  console.log(`Reconnecting... Attempt #${attempt}`);
});

// Handle disconnection
client.on('disconnected', (reason) => {
  console.log(`Disconnected: ${reason || 'unknown reason'}`);
});

// Handle errors
client.on('error', (error) => {
  console.error('Error occurred:', error.message);
});

// Start the client
(async () => {
  try {
    console.log('Starting WhatsApp bot...');
    await client.connect();
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
})();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await client.disconnect();
  process.exit(0);
});
