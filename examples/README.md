# Miaw Core Examples

This directory contains comprehensive examples demonstrating all features of Miaw Core by version.

## Example Files

### 01-basic-bot.ts (v0.1.0)
The simplest example - a basic echo bot that demonstrates:
- Creating a client with session persistence
- QR code authentication
- Sending and receiving text messages
- Basic event handling (ready, disconnected, reconnecting, error)

**Run:** `ts-node examples/01-basic-bot.ts`

---

### 02-media-bot.ts (v0.2.0)
Demonstrates media handling:
- Sending images with captions (URL, local file)
- Sending videos with GIF support
- Sending audio and voice notes (PTT)
- Sending documents
- Downloading media from received messages

**Run:** `ts-node examples/02-media-bot.ts`

---

### 03-message-context.ts (v0.3.0)
Advanced message context features:
- Replying to messages (quoting)
- Handling message edits
- Handling message deletions
- Handling reactions (send and receive)

**Run:** `ts-node examples/03-message-context.ts`

---

### 04-validation-social.ts (v0.4.0)
Contact validation and information:
- Checking if phone numbers are on WhatsApp
- Batch checking multiple numbers
- Getting contact information and status
- Getting business profile details
- Getting profile pictures
- Getting group information and participants

**Run:** `ts-node examples/04-validation-social.ts`

---

### 05-ux-polish.ts (v0.5.0)
User experience enhancements:
- Read receipts (marking messages as read)
- Typing indicators
- Recording indicators
- Presence management (online/offline status)
- Subscribing to presence updates

**Run:** `ts-node examples/05-ux-polish.ts`

---

### 06-advanced-messaging.ts (v0.6.0)
Advanced messaging features:
- Sending reactions to messages
- Removing reactions
- Forwarding messages to other chats
- Editing your own messages (within 15-minute window)
- Deleting messages (for everyone)
- Deleting messages locally (for yourself only)

**Run:** `ts-node examples/06-advanced-messaging.ts`

---

### 07-group-management.ts (v0.7.0)
Complete group administration:
- Creating new groups
- Adding and removing participants (requires admin)
- Promoting and demoting admins (requires admin)
- Updating group name and description (requires admin)
- Managing group profile picture (requires admin)
- Creating and revoking invite links (requires admin)
- Accepting group invites
- Getting group invite info (preview before joining)
- Leaving groups

**Run:** `ts-node examples/07-group-management.ts`

---

### 08-profile-management.ts (v0.8.0)
Profile management features:
- Updating profile picture (from file, URL, or Buffer)
- Removing profile picture
- Updating display name (push name)
- Updating profile status (About text)

**Run:** `ts-node examples/08-profile-management.ts`

---

### 09-business-social.ts (v0.9.0)
Business and social features:

**Labels (WhatsApp Business only):**
- Creating custom labels with colors
- Adding labels to chats
- Adding labels to messages
- Removing labels

**Catalog (WhatsApp Business only):**
- Fetching product catalog with pagination
- Fetching catalog collections
- Creating products
- Updating products
- Deleting products

**Newsletters/Channels:**
- Creating newsletters/channels
- Following/unfollowing newsletters
- Muting/unmuting newsletters
- Updating newsletter metadata
- Fetching newsletter messages
- Reacting to newsletter posts
- Managing newsletter subscribers and admins

**Contact Management:**
- Adding or editing contacts
- Removing contacts

**Run:** `ts-node examples/09-business-social.ts`

---

## Running Examples

1. Install dependencies:
```bash
npm install
npm install -g ts-node typescript
```

2. Run any example:
```bash
ts-node examples/01-basic-bot.ts
```

3. Scan the QR code with your WhatsApp mobile app

4. Start chatting!

## Common Commands

All examples support `!help` to see available commands.

## Tips

- Each bot uses its own session ID, so they won't conflict
- Sessions are saved in `./sessions/` directory
- Delete session directory to re-authenticate
- Many commands work in both private chats and groups
- Some features (labels, catalog) require WhatsApp Business account
- Group admin commands require you to be a group admin

## Need More Help?

See the main documentation:
- [USAGE.md](../USAGE.md) - Complete usage guide
- [ROADMAP.md](../ROADMAP.md) - Feature roadmap
- [CHANGELOG.md](../CHANGELOG.md) - Version history
