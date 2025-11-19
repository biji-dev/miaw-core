# Miaw Core - Usage Guide

This document covers all current capabilities of Miaw Core. It will be updated as new features are added.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [Sending Messages](#sending-messages)
- [Receiving Messages](#receiving-messages)
- [Connection Management](#connection-management)
- [Multiple Instances](#multiple-instances)
- [Session Management](#session-management)
- [Event Reference](#event-reference)
- [Error Handling](#error-handling)
- [TypeScript Usage](#typescript-usage)

## Installation

```bash
npm install miaw-core
```

## Quick Start

Here's a minimal example to get started:

```typescript
import { MiawClient } from "miaw-core";

// Create client
const client = new MiawClient({
  instanceId: "my-bot",
  sessionPath: "./sessions",
});

// Handle QR code
client.on("qr", (qr) => {
  console.log("Scan this QR code:", qr);
  // Display QR code for WhatsApp scanning
});

// When ready
client.on("ready", () => {
  console.log("Bot is ready!");
});

// Receive messages
client.on("message", async (message) => {
  console.log("Received:", message.text);

  // Reply
  await client.sendText(message.from, "Hello!");
});

// Start
await client.connect();
```

## Configuration

### MiawClientOptions

When creating a client, you can configure these options:

```typescript
const client = new MiawClient({
  // Required
  instanceId: "unique-bot-id",

  // Optional
  sessionPath: "./sessions", // Default: './sessions'
  debug: true, // Default: false
  autoReconnect: true, // Default: true
  maxReconnectAttempts: 10, // Default: Infinity
  reconnectDelay: 5000, // Default: 3000 (ms)
});
```

**Configuration Options:**

| Option                 | Type      | Default        | Description                                         |
| ---------------------- | --------- | -------------- | --------------------------------------------------- |
| `instanceId`           | `string`  | _required_     | Unique identifier for this WhatsApp instance        |
| `sessionPath`          | `string`  | `'./sessions'` | Directory path where session data will be stored    |
| `debug`                | `boolean` | `false`        | Enable verbose logging                              |
| `autoReconnect`        | `boolean` | `true`         | Auto-reconnect on connection loss                   |
| `maxReconnectAttempts` | `number`  | `Infinity`     | Maximum reconnection attempts                       |
| `reconnectDelay`       | `number`  | `3000`         | Delay between reconnection attempts in milliseconds |

## Authentication

### QR Code Authentication

On first connection, WhatsApp requires QR code scanning:

```typescript
client.on("qr", (qr) => {
  console.log("QR Code:", qr);

  // For terminal display, install qrcode-terminal:
  // npm install qrcode-terminal
  // import qrcode from 'qrcode-terminal';
  // qrcode.generate(qr, { small: true });
});
```

### Session Persistence

After first authentication, the session is automatically saved and reused:

```typescript
// First run: QR code required
await client.connect(); // Will emit 'qr' event

// Subsequent runs: No QR code needed
await client.connect(); // Uses saved session
```

Sessions are stored in: `{sessionPath}/{instanceId}/`

### Logout

To logout and clear session:

```typescript
await client.disconnect();
// Then manually delete: ./sessions/{instanceId}/
```

## Sending Messages

### Send Text Message

Basic text message sending:

```typescript
const result = await client.sendText(
  "1234567890@s.whatsapp.net",
  "Hello, World!"
);

if (result.success) {
  console.log("Message sent! ID:", result.messageId);
} else {
  console.error("Failed to send:", result.error);
}
```

### Phone Number Formatting

You can use phone numbers or WhatsApp JIDs:

```typescript
// Both formats work:
await client.sendText("1234567890", "Hello");
await client.sendText("1234567890@s.whatsapp.net", "Hello");

// Group messages:
await client.sendText("123456789@g.us", "Hello group!");
```

### Send to Groups

Same API for individual and group chats:

```typescript
// Send to group (use group JID)
await client.sendText("123456789@g.us", "Hello everyone!");
```

## Receiving Messages

### Message Event

Listen for incoming messages:

```typescript
client.on("message", (message) => {
  console.log("From:", message.from);
  console.log("Text:", message.text);
  console.log("Type:", message.type);
  console.log("Is Group:", message.isGroup);
  console.log("Timestamp:", message.timestamp);
  console.log("From Me:", message.fromMe);
});
```

### Message Structure

The `MiawMessage` object contains:

```typescript
interface MiawMessage {
  id: string; // Unique message ID
  from: string; // Sender WhatsApp ID (JID)
  text?: string; // Message text content
  timestamp: number; // Unix timestamp (seconds)
  isGroup: boolean; // Whether from group chat
  participant?: string; // Group participant ID (if isGroup)
  fromMe: boolean; // Whether sent by bot
  type: string; // Message type: 'text' | 'image' | 'video' | etc.
  raw?: any; // Original Baileys message
}
```

### Filter Messages

Common filtering patterns:

```typescript
client.on("message", async (msg) => {
  // Ignore own messages
  if (msg.fromMe) return;

  // Only text messages
  if (msg.type !== "text" || !msg.text) return;

  // Only from specific user
  if (msg.from !== "1234567890@s.whatsapp.net") return;

  // Only from groups
  if (!msg.isGroup) return;

  // Process message
  console.log("Valid message:", msg.text);
});
```

### Echo Bot Example

Simple bot that echoes messages:

```typescript
client.on("message", async (msg) => {
  if (msg.fromMe || !msg.text) return;

  await client.sendText(msg.from, `Echo: ${msg.text}`);
});
```

### Command Handler Example

Bot with command handling:

```typescript
client.on("message", async (msg) => {
  if (msg.fromMe || !msg.text) return;

  const text = msg.text.toLowerCase();

  if (text === "/help") {
    await client.sendText(
      msg.from,
      "Available commands:\n" +
        "/help - Show this message\n" +
        "/ping - Test bot response\n" +
        "/time - Get current time"
    );
  } else if (text === "/ping") {
    await client.sendText(msg.from, "Pong! 🏓");
  } else if (text === "/time") {
    const time = new Date().toLocaleString();
    await client.sendText(msg.from, `Current time: ${time}`);
  }
});
```

## Connection Management

### Connect

Start the WhatsApp connection:

```typescript
await client.connect();
```

### Disconnect

Stop the connection and logout:

```typescript
await client.disconnect();
```

### Check Connection State

```typescript
// Get current state
const state = client.getConnectionState();
// Returns: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'qr_required'

// Check if connected
if (client.isConnected()) {
  console.log("Ready to send messages");
}
```

### Connection Events

Monitor connection status:

```typescript
client.on("connection", (state) => {
  console.log("Connection state:", state);
});

client.on("ready", () => {
  console.log("Connected and ready!");
});

client.on("disconnected", (reason) => {
  console.log("Disconnected:", reason);
});

client.on("reconnecting", (attempt) => {
  console.log(`Reconnecting... Attempt ${attempt}`);
});
```

### Auto-Reconnection

Miaw Core automatically handles reconnection:

```typescript
const client = new MiawClient({
  instanceId: "bot",
  autoReconnect: true, // Enable auto-reconnect
  maxReconnectAttempts: 10, // Try 10 times
  reconnectDelay: 5000, // Wait 5s between attempts
});

// Connection drops are handled automatically
client.on("reconnecting", (attempt) => {
  console.log(`Reconnection attempt ${attempt}`);
});
```

## Multiple Instances

Run multiple WhatsApp connections in the same process:

```typescript
import { MiawClient } from "miaw-core";

// Create multiple instances
const bot1 = new MiawClient({
  instanceId: "customer-support",
});

const bot2 = new MiawClient({
  instanceId: "sales-bot",
});

const bot3 = new MiawClient({
  instanceId: "notifications",
});

// Each has separate QR code and session
bot1.on("qr", (qr) => console.log("Bot 1 QR:", qr));
bot2.on("qr", (qr) => console.log("Bot 2 QR:", qr));
bot3.on("qr", (qr) => console.log("Bot 3 QR:", qr));

// Start all instances
await Promise.all([bot1.connect(), bot2.connect(), bot3.connect()]);

// Each operates independently
bot1.on("message", (msg) => {
  console.log("Bot 1 received:", msg.text);
});

bot2.on("message", (msg) => {
  console.log("Bot 2 received:", msg.text);
});
```

## Session Management

### Session Storage Location

Sessions are stored in the filesystem:

```
sessions/
  ├── bot-1/
  │   ├── creds.json
  │   └── app-state-sync-*.json
  ├── bot-2/
  │   ├── creds.json
  │   └── app-state-sync-*.json
  └── bot-3/
      ├── creds.json
      └── app-state-sync-*.json
```

### Custom Session Path

```typescript
const client = new MiawClient({
  instanceId: "my-bot",
  sessionPath: "/var/lib/whatsapp/sessions",
});
// Session will be stored in: /var/lib/whatsapp/sessions/my-bot/
```

### Session Persistence

Sessions persist across restarts:

```typescript
// First run
const client = new MiawClient({ instanceId: "bot" });
await client.connect(); // QR code required
// Session saved automatically

// Next run (restart app)
const client = new MiawClient({ instanceId: "bot" });
await client.connect(); // No QR code! Uses saved session
```

### Clear Session (Logout)

To logout and start fresh:

```bash
# Manual deletion
rm -rf ./sessions/my-bot/

# Or programmatically
import { rmSync } from 'fs';
rmSync('./sessions/my-bot', { recursive: true, force: true });
```

## Event Reference

### Available Events

| Event           | Parameters                 | Description                 |
| --------------- | -------------------------- | --------------------------- |
| `qr`            | `(qrCode: string)`         | QR code needs to be scanned |
| `ready`         | `()`                       | Client connected and ready  |
| `message`       | `(message: MiawMessage)`   | New message received        |
| `connection`    | `(state: ConnectionState)` | Connection state changed    |
| `disconnected`  | `(reason?: string)`        | Client disconnected         |
| `reconnecting`  | `(attempt: number)`        | Attempting to reconnect     |
| `error`         | `(error: Error)`           | Error occurred              |
| `session_saved` | `()`                       | Session credentials saved   |

### Event Examples

```typescript
// QR Code
client.on("qr", (qr) => {
  console.log("Scan this:", qr);
});

// Ready
client.on("ready", () => {
  console.log("Connected!");
});

// Message
client.on("message", (msg) => {
  console.log("New message:", msg.text);
});

// Connection State
client.on("connection", (state) => {
  console.log("State:", state);
});

// Disconnected
client.on("disconnected", (reason) => {
  console.log("Lost connection:", reason);
});

// Reconnecting
client.on("reconnecting", (attempt) => {
  console.log(`Reconnect attempt #${attempt}`);
});

// Error
client.on("error", (error) => {
  console.error("Error:", error.message);
});

// Session Saved
client.on("session_saved", () => {
  console.log("Session persisted");
});
```

## Error Handling

### Send Message Errors

```typescript
const result = await client.sendText("1234567890", "Hello");

if (!result.success) {
  console.error("Failed to send:", result.error);

  // Handle specific errors
  if (result.error?.includes("not connected")) {
    console.log("Wait for connection...");
  }
}
```

### Global Error Handler

```typescript
client.on("error", (error) => {
  console.error("Client error:", error.message);

  // Log to monitoring service
  // Send alert
  // etc.
});
```

### Connection Errors

```typescript
client.on("disconnected", (reason) => {
  if (reason === "loggedOut") {
    console.log("Need to re-authenticate");
    // Delete session and restart
  }
});
```

### Try-Catch Pattern

```typescript
try {
  await client.connect();
} catch (error) {
  console.error("Failed to connect:", error);
  // Handle startup errors
}
```

## TypeScript Usage

Miaw Core is written in TypeScript with full type definitions:

### Import Types

```typescript
import {
  MiawClient,
  MiawMessage,
  MiawClientOptions,
  ConnectionState,
  SendMessageResult,
} from "miaw-core";
```

### Type-Safe Configuration

```typescript
const options: MiawClientOptions = {
  instanceId: "bot",
  sessionPath: "./sessions",
  debug: true,
  autoReconnect: true,
  maxReconnectAttempts: 10,
  reconnectDelay: 5000,
};

const client = new MiawClient(options);
```

### Type-Safe Event Handlers

```typescript
client.on("message", (msg: MiawMessage) => {
  // TypeScript knows the structure
  console.log(msg.text); // string | undefined
  console.log(msg.timestamp); // number
  console.log(msg.isGroup); // boolean
});

client.on("connection", (state: ConnectionState) => {
  // 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'qr_required'
  if (state === "connected") {
    console.log("Ready!");
  }
});
```

### Type-Safe Result Handling

```typescript
const result: SendMessageResult = await client.sendText("...", "Hello");

if (result.success) {
  // TypeScript knows messageId exists here
  console.log(result.messageId);
} else {
  // TypeScript knows error exists here
  console.error(result.error);
}
```

## Complete Example

For a full-featured bot demonstrating all current capabilities, see:

**[examples/simple-bot.ts](./examples/simple-bot.ts)**

The example includes:

- QR code authentication handling
- Message receiving and command processing
- Connection state monitoring
- Auto-reconnection handling
- Error handling
- Graceful shutdown

---

For feature roadmap and planned capabilities, see [ROADMAP.md](./ROADMAP.md).
