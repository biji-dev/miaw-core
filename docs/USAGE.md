# Miaw Core - Usage Guide

This document covers all current capabilities of Miaw Core. It will be updated as new features are added.

## Requirements

- **Node.js** >= 18.0.0
- **ESM** - This package is ESM-only (uses `"type": "module"`)

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Authentication](#authentication)
- [Sending Messages](#sending-messages)
- [Advanced Messaging](#advanced-messaging)
- [Group Management](#group-management)
- [Profile Management](#profile-management)
- [Business & Social Features](#business--social-features-v090)
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

## Advanced Messaging

### Send Reactions

React to messages with emojis:

```typescript
client.on("message", async (msg) => {
  // React to the message with a heart
  const result = await client.sendReaction(msg, "❤️");

  if (result.success) {
    console.log("Reaction sent!");
  }
});

// Other common reactions
await client.sendReaction(msg, "👍"); // Thumbs up
await client.sendReaction(msg, "😂"); // Laughing
await client.sendReaction(msg, "😮"); // Surprised
await client.sendReaction(msg, "😢"); // Sad
await client.sendReaction(msg, "🙏"); // Pray/Thanks
```

### Remove Reactions

Remove your reaction from a message:

```typescript
// Remove reaction (sends empty string)
await client.removeReaction(msg);

// Or equivalently:
await client.sendReaction(msg, "");
```

### Forward Messages

Forward a message to another chat:

```typescript
client.on("message", async (msg) => {
  // Forward this message to another contact
  const result = await client.forwardMessage(msg, "0987654321");

  if (result.success) {
    console.log("Message forwarded!");
  }
});

// Forward to a group
await client.forwardMessage(msg, "123456789@g.us");
```

### Edit Messages

Edit your own sent messages (within WhatsApp's 15-minute window):

```typescript
// Send a message and keep the reference
const result = await client.sendText("1234567890", "Hello, Wordl!");

// Later, fix the typo by editing
// Note: You need to store/retrieve the sent message object
client.on("message", async (msg) => {
  if (msg.fromMe && msg.text === "Hello, Wordl!") {
    await client.editMessage(msg, "Hello, World!");
  }
});
```

**Important:** You can only edit your own messages (`fromMe: true`).

### Delete Messages

Delete messages for everyone:

```typescript
client.on("message", async (msg) => {
  // Delete this message for everyone
  const result = await client.deleteMessage(msg);

  if (result.success) {
    console.log("Message deleted for everyone!");
  }
});
```

Delete messages only for yourself:

```typescript
// Delete message locally (others still see it)
const success = await client.deleteMessageForMe(msg);

// Optionally, also delete associated media files
await client.deleteMessageForMe(msg, true); // deleteMedia = true (default)
await client.deleteMessageForMe(msg, false); // keep media files
```

### Auto-React Bot Example

Bot that automatically reacts to messages:

```typescript
client.on("message", async (msg) => {
  if (msg.fromMe) return;

  // React based on keywords
  const text = msg.text?.toLowerCase() || "";

  if (text.includes("thank")) {
    await client.sendReaction(msg, "🙏");
  } else if (text.includes("love")) {
    await client.sendReaction(msg, "❤️");
  } else if (text.includes("funny") || text.includes("lol")) {
    await client.sendReaction(msg, "😂");
  }
});
```

## Group Management

Full group administration capabilities for creating and managing WhatsApp groups.

### Create Group

Create a new WhatsApp group:

```typescript
const result = await client.createGroup("My New Group", [
  "1234567890", // Phone number
  "0987654321",
]);

if (result.success) {
  console.log("Group created:", result.groupJid);
  console.log("Group name:", result.groupInfo?.name);
  console.log("Participants:", result.groupInfo?.participantCount);
}
```

### Add Participants

Add members to an existing group (requires admin):

```typescript
const results = await client.addParticipants("123456789@g.us", [
  "1234567890",
  "0987654321",
]);

for (const result of results) {
  if (result.success) {
    console.log(`Added: ${result.jid}`);
  } else {
    console.log(`Failed to add ${result.jid}: ${result.status}`);
  }
}
```

### Remove Participants

Remove members from a group (requires admin):

```typescript
const results = await client.removeParticipants("123456789@g.us", [
  "1234567890",
]);

results.forEach((r) =>
  console.log(`${r.jid}: ${r.success ? "Removed" : r.status}`)
);
```

### Leave Group

Leave a group:

```typescript
const result = await client.leaveGroup("123456789@g.us");
if (result.success) {
  console.log("Left the group");
}
```

### Promote/Demote Admins

Manage group admin roles:

```typescript
// Promote member to admin
const promoteResults = await client.promoteToAdmin("123456789@g.us", [
  "1234567890",
]);

// Demote admin to member
const demoteResults = await client.demoteFromAdmin("123456789@g.us", [
  "1234567890",
]);
```

### Update Group Name

Change the group name/subject:

```typescript
const result = await client.updateGroupName("123456789@g.us", "New Group Name");
if (result.success) {
  console.log("Group name updated");
}
```

### Update Group Description

Set or clear group description:

```typescript
// Set description
await client.updateGroupDescription(
  "123456789@g.us",
  "Welcome to our group! Please read the rules."
);

// Clear description (pass undefined)
await client.updateGroupDescription("123456789@g.us");
```

### Update Group Picture

Change the group profile picture:

```typescript
// From file path
await client.updateGroupPicture("123456789@g.us", "./group-icon.jpg");

// From URL
await client.updateGroupPicture(
  "123456789@g.us",
  "https://example.com/image.jpg"
);

// From Buffer
const imageBuffer = fs.readFileSync("./image.png");
await client.updateGroupPicture("123456789@g.us", imageBuffer);
```

### Group Invite Links

Manage group invite links:

```typescript
// Get invite link
const link = await client.getGroupInviteLink("123456789@g.us");
console.log("Invite link:", link);
// Output: https://chat.whatsapp.com/AbCdEfGhIjK

// Revoke current link and get new one
const newLink = await client.revokeGroupInvite("123456789@g.us");
console.log("New invite link:", newLink);
```

### Join Group via Invite

Accept a group invitation:

```typescript
// Accept with full URL
const groupJid = await client.acceptGroupInvite(
  "https://chat.whatsapp.com/AbCdEfGhIjK"
);

// Or just the code
const groupJid2 = await client.acceptGroupInvite("AbCdEfGhIjK");

if (groupJid) {
  console.log("Joined group:", groupJid);
}
```

### Preview Group from Invite

Get group info before joining:

```typescript
const info = await client.getGroupInviteInfo("AbCdEfGhIjK");

if (info) {
  console.log("Group name:", info.name);
  console.log("Description:", info.description);
  console.log("Members:", info.participantCount);
  console.log("Created:", new Date(info.createdAt! * 1000));
}
```

### Group Admin Bot Example

Bot that manages group membership:

```typescript
client.on("message", async (msg) => {
  if (!msg.isGroup || msg.fromMe) return;

  const command = msg.text?.toLowerCase();
  const groupJid = msg.from;

  if (command === "!invite") {
    const link = await client.getGroupInviteLink(groupJid);
    await client.sendText(groupJid, `Join link: ${link}`);
  }

  if (command === "!groupinfo") {
    const info = await client.getGroupInfo(groupJid);
    if (info) {
      await client.sendText(
        groupJid,
        `Group: ${info.name}\nMembers: ${info.participantCount}\nDescription: ${
          info.description || "None"
        }`
      );
    }
  }
});
```

## Profile Management

Customize your bot's WhatsApp profile.

### Update Profile Picture

Change your profile picture:

```typescript
// From file path
const result = await client.updateProfilePicture("./my-avatar.jpg");

// From URL
const result2 = await client.updateProfilePicture(
  "https://example.com/avatar.jpg"
);

// From Buffer
const imageBuffer = fs.readFileSync("./avatar.png");
const result3 = await client.updateProfilePicture(imageBuffer);

if (result.success) {
  console.log("Profile picture updated!");
}
```

### Remove Profile Picture

Remove your profile picture:

```typescript
const result = await client.removeProfilePicture();

if (result.success) {
  console.log("Profile picture removed");
}
```

### Update Profile Name

Change your display name (push name):

```typescript
const result = await client.updateProfileName("My Bot Name");

if (result.success) {
  console.log("Profile name updated!");
}
```

### Update Profile Status

Change your "About" text:

```typescript
const result = await client.updateProfileStatus("Powered by Miaw Core 🤖");

if (result.success) {
  console.log("Profile status updated!");
}

// Clear status
await client.updateProfileStatus("");
```

### Profile Bot Example

Bot that updates its profile based on commands:

```typescript
client.on("message", async (msg) => {
  if (msg.fromMe) return; // Ignore own messages

  const text = msg.text?.toLowerCase();

  if (text === "!setstatus online") {
    await client.updateProfileStatus("🟢 Online and ready to help!");
    await client.sendText(msg.from, "Status updated to online!");
  }

  if (text === "!setstatus busy") {
    await client.updateProfileStatus("🔴 Busy - response may be delayed");
    await client.sendText(msg.from, "Status updated to busy!");
  }
});
```

## Business & Social Features (v0.9.0)

This section covers WhatsApp Business features (labels, catalog/products) and social features (newsletters/channels, contacts).

> **Note:** Label and Catalog/Product features require a **WhatsApp Business account**.

### Label Operations (WhatsApp Business Only)

Labels help organize chats and messages. WhatsApp Business provides 20 label colors and 5 predefined labels.

#### Create/Edit a Label

```typescript
import { LabelColor } from "miaw-core";

const result = await client.addLabel({
  id: "vip-customers",
  name: "VIP Customers",
  color: LabelColor.Color5,
});

if (result.success) {
  console.log("Label created:", result.labelId);
}
```

#### Add Label to Chat

```typescript
const result = await client.addChatLabel("6281234567890", "label-id");

if (result.success) {
  console.log("Label added to chat");
}
```

#### Remove Label from Chat

```typescript
const result = await client.removeChatLabel("6281234567890", "label-id");

if (result.success) {
  console.log("Label removed from chat");
}
```

#### Add/Remove Label from Message

```typescript
// Add label to message
await client.addMessageLabel("6281234567890", "message-id", "label-id");

// Remove label from message
await client.removeMessageLabel("6281234567890", "message-id", "label-id");
```

### Catalog/Product Operations (WhatsApp Business Only)

Manage your product catalog and inventory.

#### Get Product Catalog

```typescript
const catalog = await client.getCatalog();

if (catalog.success) {
  console.log("Products:", catalog.products);
  console.log("Next page cursor:", catalog.nextCursor);
}

// Get from another business
const otherCatalog = await client.getCatalog("6289876543210");

// With pagination
const paginated = await client.getCatalog(undefined, 20, catalog.nextCursor);
```

#### Get Product Collections

```typescript
const collections = await client.getCollections();

collections.forEach((col) => {
  console.log("Collection:", col.name);
  console.log("Products:", col.products);
});
```

#### Create a Product

```typescript
const result = await client.createProduct({
  name: "Premium Widget",
  description: "High-quality widget for all your needs",
  price: 1999, // In cents (e.g., $19.99)
  imageUrls: ["https://example.com/product.jpg"],
  isHidden: false,
  retailerId: "SKU-001",
  url: "https://example.com/product",
});

if (result.success) {
  console.log("Product created:", result.productId);
}
```

#### Update a Product

```typescript
const result = await client.updateProduct("product-id", {
  name: "Premium Widget v2",
  price: 2499, // $24.99
  description: "Updated with new features",
});

if (result.success) {
  console.log("Product updated:", result.productId);
}
```

#### Delete Products

```typescript
const result = await client.deleteProducts(["product-id-1", "product-id-2"]);

if (result.success) {
  console.log("Deleted count:", result.deletedCount);
}
```

### Newsletter/Channel Features

WhatsApp Channels (newsletters) for broadcasting updates.

> **Limitations:** WhatsApp does not provide APIs to list subscribed/owned newsletters or get channel member lists. Channels are one-way broadcasts - you can only get subscriber count.

#### Create a Newsletter

```typescript
const result = await client.createNewsletter(
  "My Tech Updates",
  "Latest technology news and updates"
);

if (result.success) {
  console.log("Newsletter created:", result.newsletterId);
  // Newsletter ID format: "1234567890@newsletter"
}
```

#### Send Message to Newsletter

You must be an admin/owner of the newsletter to send messages.

```typescript
// Send text message
const textResult = await client.sendNewsletterMessage(
  "1234567890@newsletter",
  "Hello subscribers! Here's today's update..."
);

if (textResult.success) {
  console.log("Message sent:", textResult.messageId);
}

// Send image to newsletter
const imageResult = await client.sendNewsletterImage(
  "1234567890@newsletter",
  "./announcement.jpg",
  "Check out our latest announcement!"
);

// Send video to newsletter
const videoResult = await client.sendNewsletterVideo(
  "1234567890@newsletter",
  "./update-video.mp4",
  "Watch our weekly update video"
);
```

#### Get Newsletter Metadata

```typescript
const meta = await client.getNewsletterMetadata("1234567890@newsletter");

if (meta) {
  console.log("Name:", meta.name);
  console.log("Description:", meta.description);
  console.log("Subscribers:", meta.subscribers);
  console.log("Picture:", meta.pictureUrl);
}
```

#### Follow/Unfollow Newsletter

```typescript
// Follow
const followed = await client.followNewsletter("1234567890@newsletter");

// Unfollow
const unfollowed = await client.unfollowNewsletter("1234567890@newsletter");
```

#### Mute/Unmute Newsletter

```typescript
await client.muteNewsletter("1234567890@newsletter");
await client.unmuteNewsletter("1234567890@newsletter");
```

#### Update Newsletter

```typescript
// Update name
await client.updateNewsletterName("1234567890@newsletter", "New Name");

// Update description
await client.updateNewsletterDescription(
  "1234567890@newsletter",
  "New description"
);

// Update picture
await client.updateNewsletterPicture("1234567890@newsletter", "./cover.jpg");

// Remove picture
await client.removeNewsletterPicture("1234567890@newsletter");
```

#### Fetch Newsletter Messages

```typescript
const messages = await client.fetchNewsletterMessages(
  "1234567890@newsletter",
  50, // count
  Date.now(), // since timestamp
  0 // after cursor (for pagination)
);

if (messages.success) {
  messages.messages?.forEach((msg) => {
    console.log("Message:", msg.content);
    console.log("Timestamp:", msg.timestamp);
  });
}
```

#### React to Newsletter Message

```typescript
// Add reaction
await client.reactToNewsletterMessage("1234567890@newsletter", "msg-id", "👍");

// Remove reaction
await client.reactToNewsletterMessage("1234567890@newsletter", "msg-id", "");
```

#### Newsletter Subscriber Info

```typescript
// Get subscriber count
const info = await client.getNewsletterSubscribers("1234567890@newsletter");
console.log("Subscribers:", info?.subscribers);

// Get admin count
const adminCount = await client.getNewsletterAdminCount(
  "1234567890@newsletter"
);
console.log("Admins:", adminCount);

// Subscribe to live updates
await client.subscribeNewsletterUpdates("1234567890@newsletter");
```

#### Newsletter Admin Operations

```typescript
// Change owner
await client.changeNewsletterOwner(
  "1234567890@newsletter",
  "new-owner@s.whatsapp.net"
);

// Demote admin
await client.demoteNewsletterAdmin(
  "1234567890@newsletter",
  "admin@s.whatsapp.net"
);

// Delete newsletter
await client.deleteNewsletter("1234567890@newsletter");
```

### Contact Management

Manage your WhatsApp contacts.

#### Add or Edit Contact

```typescript
const result = await client.addOrEditContact({
  phone: "6281234567890",
  name: "John Doe",
  firstName: "John",
  lastName: "Doe",
});

if (result.success) {
  console.log("Contact saved!");
}
```

#### Remove Contact

```typescript
const result = await client.removeContact("6281234567890");

if (result.success) {
  console.log("Contact removed!");
}
```

### Business Bot Example

Bot that manages labels and products:

```typescript
client.on("message", async (msg) => {
  if (msg.fromMe) return;

  const text = msg.text?.toLowerCase();

  // Label management
  if (text === "!label vip") {
    const result = await client.addChatLabel(msg.from, "vip-label-id");
    if (result.success) {
      await client.sendText(msg.from, "You've been marked as VIP! ⭐");
    }
  }

  // Catalog query
  if (text === "!products") {
    const catalog = await client.getCatalog();
    if (catalog.success && catalog.products) {
      let response = "Our products:\n\n";
      catalog.products.forEach((p) => {
        response += `${p.name}: $${(p.priceAmount1000! / 100).toFixed(2)}\n`;
      });
      await client.sendText(msg.from, response);
    }
  }

  // Create product (admin only)
  if (text.startsWith("!addproduct")) {
    const args = text.split(" ");
    // Format: !addproduct <name> <price>
    const name = args.slice(1, -1).join(" ");
    const price = parseInt(args[args.length - 1]) * 100; // Convert to cents

    const result = await client.createProduct({
      name,
      price,
    });

    if (result.success) {
      await client.sendText(msg.from, `Product created: ${result.productId}`);
    }
  }
});
```

### Newsletter Bot Example

Bot that manages a newsletter:

```typescript
let newsletterId: string | null = null;

// Create newsletter on startup
client.on("ready", async () => {
  const result = await client.createNewsletter(
    "My Daily Updates",
    "Daily news and updates"
  );
  if (result.success) {
    newsletterId = result.newsletterId || null;
    console.log("Newsletter created:", newsletterId);
  }
});

// Post to newsletter from command
client.on("message", async (msg) => {
  if (msg.fromMe || !newsletterId) return;

  const text = msg.text?.toLowerCase();

  if (text.startsWith("!broadcast ")) {
    const broadcastText = msg.text?.slice(11); // Remove "!broadcast "
    await client.sendText(`${newsletterId}`, broadcastText);
    await client.sendText(msg.from, "Broadcast sent to newsletter!");
  }

  if (text === "!stats") {
    const info = await client.getNewsletterSubscribers(newsletterId);
    await client.sendText(msg.from, `Subscribers: ${info?.subscribers}`);
  }
});
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
