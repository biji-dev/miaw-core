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
- [Media Messages](#media-messages)
- [Advanced Messaging](#advanced-messaging)
- [Contact & Validation](#contact--validation)
- [Group Management](#group-management)
- [Profile Management](#profile-management)
- [UX & Presence](#ux--presence)
- [Business Features](#business-features)
- [Newsletter/Channel Features](#newsletterchannel-features)
- [Data Retrieval](#data-retrieval)
- [Receiving Messages](#receiving-messages)
- [Connection Management](#connection-management)
- [Multiple Instances](#multiple-instances)
- [Proxy Support](#proxy-support)
- [Session Management](#session-management)
- [Event Reference](#event-reference)
- [Error Handling](#error-handling)
- [TypeScript Usage](#typescript-usage)
- [LID Privacy Support](#lid-privacy-support)
- [Debugging](#debugging)

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

  // Proxy configuration (v1.3.0+)
  proxy: "socks5://proxy.example.com:1080", // Proxy URL string
  // or: proxy: { url: "http://proxy:8080", username: "user", password: "pass" }

  // Advanced timeout configurations
  stuckStateTimeout: 30000, // Default: 30000 (ms)
  qrGracePeriod: 30000, // Default: 30000 (ms)
  qrScanTimeout: 60000, // Default: 60000 (ms)
  connectionTimeout: 120000, // Default: 120000 (ms)
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
| `stuckStateTimeout`    | `number`  | `30000`        | Timeout for detecting stuck connection state        |
| `qrGracePeriod`        | `number`  | `30000`        | QR code grace period                                |
| `qrScanTimeout`        | `number`  | `60000`        | QR code scan timeout                                |
| `connectionTimeout`    | `number`  | `120000`       | Connection establishment timeout                    |
| `proxy`                | `string \| ProxyConfig` | _none_ | Proxy URL or config object (see [Proxy Support](#proxy-support)) |
| `agent`                | `Agent`   | _none_         | Custom WebSocket agent (advanced, overrides proxy)  |
| `fetchAgent`           | `unknown` | _none_         | Custom fetch dispatcher (advanced, overrides proxy) |

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

### Pairing Code Authentication (v1.6.0)

Connect by entering an 8-character code in WhatsApp (Linked Devices → Link with
phone number) instead of scanning a QR — ideal for headless/server deploys. QR
emission is suppressed in this mode.

```typescript
const client = new MiawClient({
  instanceId: "bot1",
  usePairingCode: true,
  phoneNumber: "6281234567890", // international format, no '+'
});

client.on("pairing_code", (code) => {
  console.log("Enter this code in WhatsApp:", code); // e.g. "ABCD1234"
});

await client.connect();
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

### Logout vs Disconnect

Miaw Core provides two ways to end a session:

```typescript
// Disconnect: Preserves session, can reconnect without QR
await client.disconnect();

// Logout: Clears session, next connect() requires new QR code
await client.logout();
```

**`disconnect()`**:

- Closes the connection but preserves session files
- You can call `connect()` again without scanning a new QR code
- Use when temporarily stopping the bot

**`logout()`**:

- Sends logout request to WhatsApp servers
- Clears local session files
- Next `connect()` will require scanning a new QR code
- Use when you want to sign out completely

### Clear Session Manually

```typescript
// Clear session data without logging out from WhatsApp servers
const cleared = client.clearSession();
console.log("Session cleared:", cleared);
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

**Phone number format**: Use international format without `+` or leading zeros:

- ✅ Correct: `6281234567890`
- ❌ Wrong: `+6281234567890`, `081234567890`

### Reply to Messages

```typescript
client.on("message", async (msg) => {
  // Reply to the received message
  await client.sendText(msg.from, "This is a reply!", { quoted: msg });
});
```

### Mentions (groups)

```typescript
// @mention members in a group (also reference them as @<number> in the text)
await client.sendText(groupJid, "Hi @6281234567890!", {
  mentions: ["6281234567890"],
});
```

### Rich Message Types (v1.6.0)

```typescript
// Location
await client.sendLocation("6281234567890", -6.2, 106.8, {
  name: "Jakarta",
  address: "Indonesia",
});

// Contact card(s) — pass one object or an array
await client.sendContact("6281234567890", {
  fullName: "John Doe",
  phone: "6285555555555",
  organization: "Acme Inc",
});

// Sticker (WebP — file path, URL, or Buffer)
await client.sendSticker("6281234567890", "./sticker.webp");

// Poll (>= 2 options; selectableCount defaults to 1)
await client.sendPoll("6281234567890", "Lunch?", ["Pizza", "Sushi"], {
  selectableCount: 1,
});

// Read poll votes (aggregated tally)
client.on("poll_vote", (vote) => {
  console.log(vote.pollMessageId, vote.results);
  // results: [{ option: "Pizza", voters: ["...@s.whatsapp.net"] }, ...]
});
```

## Media Messages

### Send Image

```typescript
// From file path
await client.sendImage("1234567890", "./image.jpg", {
  caption: "Check this out!",
});

// From URL
await client.sendImage("1234567890", "https://example.com/image.jpg", {
  caption: "Image from URL",
});

// From Buffer
const imageBuffer = fs.readFileSync("./image.png");
await client.sendImage("1234567890", imageBuffer, {
  caption: "Image from buffer",
});

// View-once image
await client.sendImage("1234567890", "./secret.jpg", {
  caption: "View once only!",
  viewOnce: true,
});
```

### Send Document

```typescript
// From file path (filename auto-detected)
await client.sendDocument("1234567890", "./report.pdf", {
  caption: "Here's the report",
});

// With custom filename
await client.sendDocument("1234567890", documentBuffer, {
  fileName: "custom-name.pdf",
  mimetype: "application/pdf",
  caption: "Custom document",
});
```

### Send Video

```typescript
// Regular video
await client.sendVideo("1234567890", "./video.mp4", {
  caption: "Watch this!",
});

// View-once video
await client.sendVideo("1234567890", "./secret-video.mp4", {
  viewOnce: true,
});

// GIF playback (loops, no audio)
await client.sendVideo("1234567890", "./animation.mp4", {
  gifPlayback: true,
});

// Video note (circular, like Telegram)
await client.sendVideo("1234567890", "./note.mp4", {
  ptv: true,
});
```

### Send Audio

```typescript
// Regular audio file
await client.sendAudio("1234567890", "./song.mp3");

// Voice note (push-to-talk)
await client.sendAudio("1234567890", "./voice.ogg", {
  ptt: true, // Shows as voice message
});

// With custom mimetype
await client.sendAudio("1234567890", audioBuffer, {
  mimetype: "audio/ogg; codecs=opus",
  ptt: true,
});
```

### Download Media

Download media from received messages:

```typescript
client.on("message", async (msg) => {
  // Check if it's a media message
  if (["image", "video", "audio", "document", "sticker"].includes(msg.type)) {
    const buffer = await client.downloadMedia(msg);

    if (buffer) {
      // Save to file
      fs.writeFileSync(`./downloads/${msg.id}.${getExtension(msg.type)}`, buffer);
      console.log("Media downloaded!");
    }
  }
});
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

## Chat Management (v1.7.0)

Manage chats via `chatModify`. Chat-level methods take a JID or phone number and
return `{ success, error? }`.

```typescript
// Archive / pin / mute (durationMs defaults to 8 hours)
await client.archiveChat("6281234567890");
await client.unarchiveChat("6281234567890");
await client.pinChat("6281234567890");
await client.unpinChat("6281234567890");
await client.muteChat("6281234567890", 8 * 60 * 60 * 1000);
await client.unmuteChat("6281234567890");

// Mark a whole chat read/unread (distinct from per-message markAsRead)
await client.markChatRead("6281234567890");
await client.markChatUnread("6281234567890");

// Clear messages (keep chat) or delete the chat entirely
await client.clearChat("6281234567890");
await client.deleteChat("6281234567890");

// Star / unstar a message (takes a received MiawMessage)
client.on("message", async (msg) => {
  await client.starMessage(msg);
  await client.unstarMessage(msg);
});
```

> **Note:** `archiveChat`, `clearChat`, `deleteChat`, and `markChatRead` need the
> chat's last message, taken from the in-memory message store — they are most
> reliable after messages for that chat have been received or synced.

## Contact & Validation

### Check WhatsApp Registration

```typescript
// Check single number
const result = await client.checkNumber("6281234567890");
if (result.exists) {
  console.log("Registered on WhatsApp:", result.jid);
} else {
  console.log("Not on WhatsApp");
}

// Check multiple numbers
const results = await client.checkNumbers([
  "6281234567890",
  "6289876543210",
]);
results.forEach((r, i) => {
  console.log(`Number ${i}: ${r.exists ? r.jid : "Not registered"}`);
});
```

### Get Contact Information

```typescript
// Basic contact info
const info = await client.getContactInfo("6281234567890");
if (info) {
  console.log("JID:", info.jid);
  console.log("Phone:", info.phone);
  console.log("Status:", info.status);
  console.log("Is Business:", info.isBusiness);
}

// Full contact profile
const profile = await client.getContactProfile("6281234567890");
if (profile) {
  console.log("Name:", profile.name);
  console.log("Status:", profile.status);
  console.log("Picture URL:", profile.pictureUrl);
  if (profile.isBusiness) {
    console.log("Business:", profile.business?.description);
  }
}

// Business profile only
const business = await client.getBusinessProfile("6281234567890");
if (business) {
  console.log("Description:", business.description);
  console.log("Category:", business.category);
  console.log("Website:", business.website);
}
```

### Get Profile Picture

```typescript
// Preview quality
const previewUrl = await client.getProfilePicture("6281234567890");

// High resolution
const fullUrl = await client.getProfilePicture("6281234567890", true);
```

### Manage Contacts

```typescript
// Add or edit a contact
const result = await client.addOrEditContact({
  phone: "6281234567890",
  name: "John Doe",
  firstName: "John",
  lastName: "Doe",
});

if (result.success) {
  console.log("Contact saved!");
}

// Remove a contact
await client.removeContact("6281234567890");
```

## Status / Stories (v1.8.0)

Post to `status@broadcast`. `recipients` is the audience — omit it to send to all
of your contacts, or pass a subset (phone numbers or JIDs).

```typescript
// Text status (optional background color + font)
await client.postTextStatus("Hello world!", undefined, {
  backgroundColor: "#0a7cff",
  font: 3,
});

// Image / video status with a caption, to a specific audience
await client.postImageStatus("./promo.jpg", ["6281234567890"], { caption: "New!" });
await client.postVideoStatus("./clip.mp4", ["6281234567890"]);
```

## Group Management

### Get Group Information

```typescript
// Get group metadata
const info = await client.getGroupInfo("123456789@g.us");
if (info) {
  console.log("Name:", info.name);
  console.log("Description:", info.description);
  console.log("Owner:", info.owner);
  console.log("Participants:", info.participantCount);
  console.log("Admins only messages:", info.announce);
  console.log("Admins only edit info:", info.restrict);
}

// Get participants
const participants = await client.getGroupParticipants("123456789@g.us");
participants?.forEach((p) => {
  console.log(`${p.jid}: ${p.role}`);
});
```

### Create Group

```typescript
const result = await client.createGroup("My New Group", [
  "6281234567890",
  "6289876543210",
]);

if (result.success) {
  console.log("Group created:", result.groupJid);
  console.log("Group name:", result.groupInfo?.name);
  console.log("Participants:", result.groupInfo?.participantCount);
}
```

### Manage Participants

```typescript
// Add participants
const addResults = await client.addParticipants("123456789@g.us", [
  "6281234567890",
]);
addResults.forEach((r) => {
  console.log(`${r.jid}: ${r.success ? "Added" : r.status}`);
});

// Remove participants
const removeResults = await client.removeParticipants("123456789@g.us", [
  "6281234567890",
]);

// Promote to admin
await client.promoteToAdmin("123456789@g.us", ["6281234567890"]);

// Demote from admin
await client.demoteFromAdmin("123456789@g.us", ["6281234567890"]);

// Leave group
await client.leaveGroup("123456789@g.us");
```

### Update Group Settings

```typescript
// Update name
await client.updateGroupName("123456789@g.us", "New Group Name");

// Update description
await client.updateGroupDescription(
  "123456789@g.us",
  "Welcome to our group!"
);

// Clear description
await client.updateGroupDescription("123456789@g.us");

// Update picture
await client.updateGroupPicture("123456789@g.us", "./group-icon.jpg");
```

### Group Invite Links

```typescript
// Get invite link
const link = await client.getGroupInviteLink("123456789@g.us");
console.log("Invite link:", link);
// Output: https://chat.whatsapp.com/AbCdEfGhIjK

// Revoke and get new link
const newLink = await client.revokeGroupInvite("123456789@g.us");

// Accept invite
const groupJid = await client.acceptGroupInvite("https://chat.whatsapp.com/AbCdEfGhIjK");
// Or just the code
const groupJid2 = await client.acceptGroupInvite("AbCdEfGhIjK");

// Preview group before joining
const preview = await client.getGroupInviteInfo("AbCdEfGhIjK");
if (preview) {
  console.log("Name:", preview.name);
  console.log("Members:", preview.participantCount);
}
```

## Communities (v1.9.0)

A community is a hub that links multiple groups. The API mirrors group management.

```typescript
// Create / inspect
const res = await client.createCommunity("My Community", "Optional description");
const info = await client.getCommunityInfo(res.communityJid!);
const all = await client.getAllCommunities();

// Update / leave
await client.updateCommunityName(communityJid, "New name");
await client.updateCommunityDescription(communityJid, "New description");
await client.leaveCommunity(communityJid);

// Linking groups (the defining feature)
const sub = await client.createCommunityGroup(communityJid, "Class A", ["6281234567890"]);
await client.linkGroupToCommunity("123@g.us", communityJid);
await client.unlinkGroupFromCommunity("123@g.us", communityJid);
const linked = await client.getLinkedGroups(communityJid); // LinkedGroup[]

// Participants
await client.addCommunityMembers(communityJid, ["6281234567890"]);
await client.removeCommunityMembers(communityJid, ["6281234567890"]);
await client.promoteCommunityMembers(communityJid, ["6281234567890"]);
await client.demoteCommunityMembers(communityJid, ["6281234567890"]);

// Invites
const link = await client.getCommunityInviteLink(communityJid);
const newLink = await client.revokeCommunityInvite(communityJid);
await client.acceptCommunityInvite("https://chat.whatsapp.com/AbCdEf");
const invitePreview = await client.getCommunityInviteInfo("AbCdEf");
```

## Profile Management

### Update Profile Picture

```typescript
// From file path
await client.updateProfilePicture("./my-avatar.jpg");

// From URL
await client.updateProfilePicture("https://example.com/avatar.jpg");

// From Buffer
const imageBuffer = fs.readFileSync("./avatar.png");
await client.updateProfilePicture(imageBuffer);

// Remove profile picture
await client.removeProfilePicture();
```

### Update Profile Name

```typescript
await client.updateProfileName("My Bot Name");
```

### Update Profile Status

```typescript
// Set status/about text
await client.updateProfileStatus("Powered by Miaw Core");

// Clear status
await client.updateProfileStatus("");
```

### Get Own Profile

```typescript
const profile = await client.getOwnProfile();
if (profile) {
  console.log("JID:", profile.jid);
  console.log("Phone:", profile.phone);
  console.log("Name:", profile.name);
  console.log("Status:", profile.status);
  console.log("Picture:", profile.pictureUrl);
  console.log("Is Business:", profile.isBusiness);
}
```

## UX & Presence

### Read Receipts

```typescript
client.on("message", async (msg) => {
  // Mark message as read (send blue check marks)
  await client.markAsRead(msg);
});
```

### Typing Indicators

```typescript
// Show "typing..." indicator
await client.sendTyping("6281234567890");

// Show "recording audio..." indicator
await client.sendRecording("6281234567890");

// Stop typing/recording indicator
await client.stopTyping("6281234567890");
```

### Presence Status

```typescript
// Set online status
await client.setPresence("available");

// Set offline status
await client.setPresence("unavailable");
```

### Subscribe to Presence Updates

```typescript
// Subscribe to contact's presence changes
await client.subscribePresence("6281234567890");

// Listen for presence updates
client.on("presence", (update) => {
  console.log(`${update.jid}: ${update.status}`);
  // status: 'available' | 'unavailable' | 'composing' | 'recording' | 'paused'
  if (update.lastSeen) {
    console.log("Last seen:", new Date(update.lastSeen * 1000));
  }
});
```

## Business Features

> **Note:** Label and Catalog/Product features require a **WhatsApp Business account**.

### Labels (WhatsApp Business Only)

```typescript
import { LabelColor } from "miaw-core";

// Create a label
const result = await client.addLabel({
  name: "VIP Customers",
  color: LabelColor.Color5,
});
if (result.success) {
  console.log("Label created:", result.labelId);
}

// Add label to a chat
await client.addChatLabel("6281234567890", "label-id");

// Remove label from chat
await client.removeChatLabel("6281234567890", "label-id");

// Add label to a message
await client.addMessageLabel("6281234567890", "message-id", "label-id");

// Remove label from message
await client.removeMessageLabel("6281234567890", "message-id", "label-id");

// Fetch all labels
const labels = await client.fetchAllLabels();
if (labels.success) {
  labels.labels?.forEach((label) => {
    console.log(`${label.id}: ${label.name} (color: ${label.color})`);
  });
}

// Get chats with a specific label
const chats = client.getChatsByLabel("label-id");
chats.forEach((chat) => {
  console.log("Chat:", chat.jid);
});
```

### Catalog/Products (WhatsApp Business Only)

```typescript
// Get your catalog
const catalog = await client.getCatalog();
if (catalog.success) {
  console.log("Products:", catalog.products);
  console.log("Next page cursor:", catalog.nextCursor);
}

// Get another business's catalog
const otherCatalog = await client.getCatalog("6289876543210");

// With pagination
const paginated = await client.getCatalog(undefined, 20, catalog.nextCursor);

// Get collections
const collections = await client.getCollections();
collections.forEach((col) => {
  console.log("Collection:", col.name);
  console.log("Products:", col.products);
});

// Create a product
const createResult = await client.createProduct({
  name: "Premium Widget",
  description: "High-quality widget for all your needs",
  price: 1999,
  currency: "USD",
  imageUrls: ["https://example.com/product.jpg"],
  retailerId: "SKU-001",
  url: "https://example.com/product",
});
if (createResult.success) {
  console.log("Product created:", createResult.productId);
}

// Update a product
await client.updateProduct("product-id", {
  name: "Premium Widget v2",
  description: "Updated with new features",
  price: 2499,
  currency: "USD",
});

// Delete products
await client.deleteProducts(["product-id-1", "product-id-2"]);
```

### Business Profile & Extras (v1.8.0)

```typescript
// Update your business profile (category is read-only)
await client.updateBusinessProfile({
  address: "123 Main St",
  email: "hello@shop.com",
  description: "We sell widgets",
  websites: ["https://shop.com"],
});

// Cover photo
const res = await client.updateCoverPhoto("./cover.jpg");
if (res.success) await client.removeCoverPhoto(res.coverPhotoId!);

// Quick replies
await client.addQuickReply({ shortcut: "/hi", message: "Hello! 👋", keywords: ["hi"] });
await client.removeQuickReply("1700000000");

// Order details — the token comes from a received order message
const order = await client.getOrderDetails("orderId", "tokenBase64");
```

## Newsletter/Channel Features

WhatsApp Channels (newsletters) for broadcasting updates.

### Create Newsletter

```typescript
const result = await client.createNewsletter(
  "My Tech Updates",
  "Latest technology news and updates"
);

if (result.success) {
  console.log("Newsletter created:", result.newsletterId);
}
```

### Send to Newsletter

> **Note:** You must be an admin/owner of the newsletter to send messages.

```typescript
// Text message
await client.sendNewsletterMessage(
  "1234567890@newsletter",
  "Hello subscribers!"
);

// Image
await client.sendNewsletterImage(
  "1234567890@newsletter",
  "./announcement.jpg",
  "Check out our latest announcement!"
);

// Video
await client.sendNewsletterVideo(
  "1234567890@newsletter",
  "./update-video.mp4",
  "Watch our weekly update video"
);
```

### Newsletter Metadata

```typescript
const meta = await client.getNewsletterMetadata("1234567890@newsletter");
if (meta) {
  console.log("Name:", meta.name);
  console.log("Description:", meta.description);
  console.log("Subscribers:", meta.subscribers);
  console.log("Picture:", meta.pictureUrl);
}
```

### Follow/Unfollow Newsletter

```typescript
await client.followNewsletter("1234567890@newsletter");
await client.unfollowNewsletter("1234567890@newsletter");
```

### Mute/Unmute Newsletter

```typescript
await client.muteNewsletter("1234567890@newsletter");
await client.unmuteNewsletter("1234567890@newsletter");
```

### Update Newsletter

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

### Fetch Newsletter Messages

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

### React to Newsletter Message

```typescript
// Add reaction
await client.reactToNewsletterMessage("1234567890@newsletter", "msg-id", "👍");

// Remove reaction
await client.reactToNewsletterMessage("1234567890@newsletter", "msg-id", "");
```

### Newsletter Administration

```typescript
// Get subscriber count
const info = await client.getNewsletterSubscribers("1234567890@newsletter");
console.log("Subscribers:", info?.subscribers);

// Get admin count
const adminCount = await client.getNewsletterAdminCount("1234567890@newsletter");
console.log("Admins:", adminCount);

// Subscribe to live updates
await client.subscribeNewsletterUpdates("1234567890@newsletter");

// Transfer ownership
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

## Data Retrieval

### Fetch All Contacts

```typescript
const result = await client.fetchAllContacts();
if (result.success) {
  console.log(`Found ${result.contacts?.length} contacts`);
  result.contacts?.forEach((contact) => {
    console.log(`${contact.name || "Unknown"}: ${contact.phone}`);
  });
}
```

### Fetch All Groups

```typescript
const result = await client.fetchAllGroups();
if (result.success) {
  console.log(`Found ${result.groups?.length} groups`);
  result.groups?.forEach((group) => {
    console.log(`${group.name}: ${group.participantCount} members`);
  });
}
```

### Fetch All Chats

```typescript
const result = await client.fetchAllChats();
if (result.success) {
  console.log(`Found ${result.chats?.length} chats`);
  result.chats?.forEach((chat) => {
    console.log(`${chat.name || chat.jid}: ${chat.unreadCount || 0} unread`);
  });
}
```

### Get Chat Messages

```typescript
// Get messages for a specific chat
const result = await client.getChatMessages("6281234567890");
if (result.success) {
  console.log(`Found ${result.messages?.length} messages`);
  result.messages?.forEach((msg) => {
    console.log(`[${msg.timestamp}] ${msg.text}`);
  });
}

// Load older messages (pagination)
const moreResult = await client.loadMoreMessages(
  "6281234567890",
  50, // count (max 50)
  30000 // timeout in ms
);
if (moreResult.success) {
  console.log(`Loaded ${moreResult.messagesLoaded} more messages`);
  console.log("Has more:", moreResult.hasMore);
}

// Get message counts for all chats
const counts = client.getMessageCounts();
counts.forEach((count, jid) => {
  console.log(`${jid}: ${count} messages`);
});
```

### Fetch All Labels

```typescript
// Fetch labels (with optional force sync)
const result = await client.fetchAllLabels(
  false, // forceSync
  2000 // syncTimeout
);
if (result.success) {
  result.labels?.forEach((label) => {
    console.log(`${label.name} (${label.id})`);
  });
}

// Debug label sync issues
const info = client.getLabelsStoreInfo();
console.log("Labels in store:", info.size);
console.log("Label events received:", info.eventCount);
console.log("Last sync:", info.lastSyncTime);
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
  console.log("Sender Name:", message.senderName);
  console.log("Sender Phone:", message.senderPhone);
});
```

### Message Structure

```typescript
interface MiawMessage {
  id: string; // Unique message ID
  from: string; // Sender WhatsApp JID
  senderPhone?: string; // Sender's phone number
  senderName?: string; // Sender's display name
  text?: string; // Message text content
  timestamp: number; // Unix timestamp (seconds)
  isGroup: boolean; // Whether from group chat
  participant?: string; // Group participant ID (if isGroup)
  fromMe: boolean; // Whether sent by bot
  type: "text" | "image" | "video" | "audio" | "document" | "sticker" | "unknown";
  media?: MediaInfo; // Media metadata
  raw?: any; // Original Baileys message
}

interface MediaInfo {
  mimetype?: string;
  fileSize?: number;
  fileName?: string;
  width?: number;
  height?: number;
  duration?: number;
  ptt?: boolean;
  gifPlayback?: boolean;
  viewOnce?: boolean;
}
```

### Message Events

```typescript
// New message
client.on("message", (msg) => {
  console.log("New message:", msg.text);
});

// Message edited
client.on("message_edit", (edit) => {
  console.log(`Message ${edit.messageId} edited to: ${edit.newText}`);
  console.log("Edit timestamp:", edit.editTimestamp);
});

// Message deleted
client.on("message_delete", (deletion) => {
  console.log(`Message ${deletion.messageId} deleted`);
  console.log("Deleted by sender:", deletion.fromMe);
});

// Reaction received
client.on("message_reaction", (reaction) => {
  console.log(`${reaction.reactorId} reacted with ${reaction.emoji}`);
  console.log("Is removal:", reaction.isRemoval);
});

// Receipt for a message you sent (delivery / read / played)
client.on("message_receipt", (receipt) => {
  console.log(`Message ${receipt.messageId} ${receipt.type} by ${receipt.recipientId}`);
  // receipt.type: 'delivery' | 'read' | 'played'
});
```

### Filter Messages

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

## Connection Management

### Connect

```typescript
await client.connect();
```

### Disconnect (Preserve Session)

```typescript
await client.disconnect();
// Session preserved, can reconnect without QR
```

### Logout (Clear Session)

```typescript
await client.logout();
// Session cleared, next connect() requires new QR
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

// Get instance ID
console.log("Instance:", client.getInstanceId());
```

### Connection Events

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

### Dispose Client

```typescript
// Clean up all resources
await client.dispose();
```

## Multiple Instances

Run multiple WhatsApp connections in the same process:

```typescript
const bot1 = new MiawClient({
  instanceId: "customer-support",
});

const bot2 = new MiawClient({
  instanceId: "sales-bot",
});

// Each has separate QR code and session
bot1.on("qr", (qr) => console.log("Bot 1 QR:", qr));
bot2.on("qr", (qr) => console.log("Bot 2 QR:", qr));

// Start all instances
await Promise.all([bot1.connect(), bot2.connect()]);

// Each operates independently
bot1.on("message", (msg) => console.log("Bot 1:", msg.text));
bot2.on("message", (msg) => console.log("Bot 2:", msg.text));
```

## Proxy Support

_Added in v1.3.0_

Each MiawClient instance can connect through a proxy for IP rotation, geographic distribution, or privacy. Supports HTTP, HTTPS, SOCKS4, and SOCKS5 proxies.

### Basic Proxy Usage

```typescript
import { MiawClient } from "miaw-core";

// Using a proxy URL string
const client = new MiawClient({
  instanceId: "bot-1",
  proxy: "socks5://proxy.example.com:1080",
});

// Using a ProxyConfig object (with separate auth)
const client2 = new MiawClient({
  instanceId: "bot-2",
  proxy: {
    url: "http://proxy.example.com:8080",
    username: "user",
    password: "pass",
  },
});

await client.connect(); // Connects through the proxy
```

### Proxy Info

```typescript
// Get current proxy info (credentials masked)
const info = client.getProxyInfo();
// { url: "socks5://proxy.example.com:1080/", protocol: "socks5" }
```

### Multiple Instances with Different Proxies

```typescript
const instances = [
  { id: "us-bot", proxy: "socks5://us-proxy.example.com:1080" },
  { id: "eu-bot", proxy: "socks5://eu-proxy.example.com:1080" },
  { id: "asia-bot", proxy: "http://asia-proxy.example.com:8080" },
];

for (const { id, proxy } of instances) {
  const client = new MiawClient({
    instanceId: id,
    sessionPath: "./sessions",
    proxy,
  });
  await client.connect();
}
```

### Custom Agent (Advanced)

For advanced use cases, you can pass your own agents directly instead of a proxy URL:

```typescript
import { HttpsProxyAgent } from "https-proxy-agent";

const client = new MiawClient({
  instanceId: "advanced-bot",
  agent: new HttpsProxyAgent("http://proxy:8080"),    // WebSocket agent
  fetchAgent: myCustomDispatcher,                      // undici Dispatcher for media
});
```

### Proxy Validation

```typescript
import { validateProxyConfig } from "miaw-core";

validateProxyConfig("socks5://proxy:1080");  // true
validateProxyConfig("http://proxy:8080");    // true
validateProxyConfig("ftp://invalid:21");     // false
```

### Supported Protocols

| Protocol | WebSocket | Media Upload/Download |
|----------|-----------|----------------------|
| `http://`  | Yes | Yes |
| `https://` | Yes | Yes |
| `socks4://` | Yes | No (direct connection) |
| `socks5://` | Yes | No (direct connection) |

> **Note**: SOCKS proxies fully tunnel the WebSocket connection to WhatsApp. However, media uploads/downloads (which use Node.js `fetch()`) fall back to a direct connection when using SOCKS, because Node.js `fetch()` requires an undici-compatible dispatcher which doesn't support SOCKS natively. HTTP/HTTPS proxies work for both.

## Session Management

### Session Storage Location

```plaintext
sessions/
  ├── bot-1/
  │   ├── creds.json
  │   ├── contacts.json
  │   ├── chats.json
  │   ├── messages.json
  │   ├── labels.json
  │   ├── lid-mappings.json
  │   └── app-state-sync-*.json
  └── bot-2/
      └── ...
```

### Custom Session Path

```typescript
const client = new MiawClient({
  instanceId: "my-bot",
  sessionPath: "/var/lib/whatsapp/sessions",
});
// Session: /var/lib/whatsapp/sessions/my-bot/
```

## Event Reference

### Available Events

| Event             | Parameters                 | Description                          |
| ----------------- | -------------------------- | ------------------------------------ |
| `qr`              | `(qrCode: string)`         | QR code needs to be scanned          |
| `ready`           | `()`                       | Client connected and ready           |
| `message`         | `(message: MiawMessage)`   | New message received                 |
| `message_edit`    | `(edit: MessageEdit)`      | Message was edited                   |
| `message_delete`  | `(deletion: MessageDelete)`| Message was deleted                  |
| `message_reaction`| `(reaction: MessageReaction)` | Message received reaction         |
| `message_receipt` | `(receipt: MessageReceiptUpdate)` | Sent message delivered/read/played |
| `presence`        | `(update: PresenceUpdate)` | Contact's presence changed           |
| `connection`      | `(state: ConnectionState)` | Connection state changed             |
| `disconnected`    | `(reason?: string)`        | Client disconnected                  |
| `reconnecting`    | `(attempt: number)`        | Attempting to reconnect              |
| `error`           | `(error: Error)`           | Error occurred                       |
| `session_saved`   | `()`                       | Session credentials saved            |

## Error Handling

### Result Objects

Most methods return result objects:

```typescript
const result = await client.sendText("1234567890", "Hello");

if (result.success) {
  console.log("Sent:", result.messageId);
} else {
  console.error("Failed:", result.error);
}
```

### Global Error Handler

```typescript
client.on("error", (error) => {
  console.error("Client error:", error.message);
});
```

### Try-Catch Pattern

```typescript
try {
  await client.connect();
} catch (error) {
  console.error("Failed to connect:", error);
}
```

## TypeScript Usage

Miaw Core is written in TypeScript with full type definitions:

```typescript
import {
  MiawClient,
  MiawMessage,
  MiawClientOptions,
  ConnectionState,
  SendMessageResult,
  SendTextOptions,
  SendImageOptions,
  SendVideoOptions,
  SendAudioOptions,
  SendDocumentOptions,
  MediaSource,
  ContactInfo,
  ContactProfile,
  BusinessProfile,
  GroupInfo,
  GroupParticipant,
  Label,
  LabelColor,
  Product,
  ProductOptions,
  NewsletterMetadata,
  MessageEdit,
  MessageDelete,
  MessageReaction,
  PresenceUpdate,
} from "miaw-core";
```

## LID Privacy Support

WhatsApp introduced Link IDs (LIDs) for enhanced privacy. Miaw Core automatically handles LID to phone number resolution:

```typescript
// Messages may come from @lid JIDs
client.on("message", (msg) => {
  // msg.from could be "123456@lid" or "6281234567890@s.whatsapp.net"
  // msg.senderPhone will be resolved if possible
  console.log("Sender phone:", msg.senderPhone);
});

// Manual LID resolution (synchronous, cache-only)
const phoneJid = client.resolveLidToJid("123456@lid");
const phone = client.getPhoneFromJid("123456@lid");

// Async resolution — falls back to Baileys' native LID store on a cache miss
// (server-backed, back-fills the cache). Requires an active connection.
const jid = await client.resolveLidToJidAsync("123456@lid");
const phone2 = await client.getPhoneFromJidAsync("123456@lid");

// Bulk: resolve many LIDs in one native query (cache hits served locally)
const map = await client.resolveLidsToPhones(["123456@lid", "789012@lid"]);
// => { "123456@lid": "6281234567890", "789012@lid": null }

// Reverse: phone number -> LID
const lid = await client.getLidForPhone("6281234567890"); // "123456@lid" | null

// Register LID mapping (useful for persistence)
client.registerLidMapping("123456@lid", "6281234567890@s.whatsapp.net");

// Get all mappings
const mappings = client.getLidMappings();

// Clear LID cache
client.clearLidCache();
```

## Debugging

### Enable Debug Mode

```typescript
// At creation
const client = new MiawClient({
  instanceId: "my-bot",
  debug: true,
});

// At runtime
client.enableDebug();
client.disableDebug();

// Toggle
client.setDebug(true);
client.setDebug(false);

// Check status
if (client.isDebugEnabled()) {
  console.log("Debug mode is on");
}
```

Debug mode enables verbose logging including:

- Raw Baileys message structures
- History sync notifications
- LID mapping updates
- Store updates (contacts, chats, messages)
- Label sync events

---

## Complete Example

For full-featured bot examples demonstrating all capabilities, see:

- **[examples/simple-bot.ts](../examples/simple-bot.ts)** - Basic bot example

The examples include:

- QR code authentication handling
- Message receiving and command processing
- Connection state monitoring
- Auto-reconnection handling
- Error handling
- Graceful shutdown

---

For feature roadmap and planned capabilities, see [ROADMAP.md](./ROADMAP.md).
