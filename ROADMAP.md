# Miaw Core - Roadmap

This document tracks implemented features and planned future development. Features are organized by priority based on common use cases.

## Version Status

**Current Version:** 0.1.0
**Status:** Initial Release
**Last Updated:** 2025-11-19

---

## Implemented Features (v0.1.0)

### ✅ Core Messaging
- **Text Message Send** - Send text messages to individuals and groups
- **Text Message Receive** - Receive and parse incoming text messages
- **Normalized Message Format** - Simplified message structure (no raw Baileys complexity)

### ✅ Connection Management
- **Auto-Reconnection** - Automatic reconnection on connection loss with configurable retry
- **Connection State Tracking** - Monitor connection state changes
- **Graceful Disconnect** - Clean shutdown and logout

### ✅ Authentication & Sessions
- **QR Code Authentication** - First-time authentication via QR code
- **Session Persistence** - File-based session storage and auto-reload
- **Multi-File Auth State** - Uses Baileys' multi-file auth state

### ✅ Multiple Instances
- **Instance Management** - Run multiple WhatsApp connections in single process
- **Isolated Sessions** - Each instance has separate authentication and state

### ✅ Developer Experience
- **TypeScript Support** - Full TypeScript definitions and type safety
- **Event-Driven API** - Clean event emitter pattern
- **Error Handling** - Structured error reporting
- **Debug Logging** - Optional verbose logging with Pino

### ✅ Configuration
- **Flexible Options** - Configurable reconnection, session path, logging
- **Sensible Defaults** - Works out of the box with minimal config

---

## Planned Features (Priority Order)

### 🔥 High Priority - Most Used Features

#### Media Support (v0.2.0)
- [ ] **Send Images** - Send images with optional captions
- [ ] **Send Videos** - Send video files with captions
- [ ] **Send Documents** - Send PDF, DOC, and other document types
- [ ] **Send Audio** - Send audio messages and voice notes
- [ ] **Receive Media** - Download and process received media
- [ ] **Media Download Helper** - Built-in utilities for downloading media files

#### Message Operations (v0.2.0)
- [ ] **Reply to Message** - Quote/reply to specific messages
- [ ] **Delete Message** - Delete sent messages
- [ ] **Edit Message** - Edit sent text messages (if WhatsApp supports)
- [ ] **Forward Message** - Forward messages to other chats

#### Status & Presence (v0.3.0)
- [ ] **Read Receipts** - Mark messages as read
- [ ] **Typing Indicator** - Send "typing..." status
- [ ] **Online Presence** - Set online/offline status
- [ ] **Last Seen** - Configure last seen visibility

### 🔶 Medium Priority - Commonly Requested

#### Group Operations (v0.3.0)
- [ ] **Create Group** - Create new WhatsApp groups
- [ ] **Add Participants** - Add members to groups
- [ ] **Remove Participants** - Remove members from groups
- [ ] **Update Group Info** - Change group name, description, icon
- [ ] **Get Group Info** - Fetch group metadata and participants
- [ ] **Leave Group** - Exit from groups
- [ ] **Group Invite Links** - Generate and revoke invite links
- [ ] **Promote/Demote Admins** - Manage group admin permissions

#### Contact Management (v0.3.0)
- [ ] **Get Contact Info** - Fetch contact details and profile
- [ ] **Check Number Registration** - Verify if number is on WhatsApp
- [ ] **Get Profile Picture** - Fetch profile pictures
- [ ] **Block/Unblock** - Block and unblock contacts

#### Message Reactions (v0.4.0)
- [ ] **Send Reaction** - React to messages with emojis
- [ ] **Remove Reaction** - Remove your reactions

#### Advanced Messaging (v0.4.0)
- [ ] **Send Stickers** - Send sticker messages
- [ ] **Send Location** - Share location data
- [ ] **Send Contacts** - Share contact cards
- [ ] **Send Polls** - Create and send polls (if supported)
- [ ] **Send Links with Preview** - Rich link previews

### 🔷 Lower Priority - Advanced Features

#### Storage & Database (v0.5.0)
- [ ] **Custom Storage Adapters** - Pluggable storage interface
- [ ] **Redis Adapter** - Store sessions in Redis
- [ ] **Database Adapters** - MongoDB, PostgreSQL, MySQL adapters
- [ ] **Message History Storage** - Optional message persistence

#### Performance & Scaling (v0.5.0)
- [ ] **Message Queuing** - Queue messages for reliable delivery
- [ ] **Rate Limiting** - Built-in rate limit handling
- [ ] **Bulk Operations** - Send to multiple recipients efficiently
- [ ] **Connection Pooling** - Optimize multiple instance management

#### Security & Privacy (v0.6.0)
- [ ] **End-to-End Encryption Verification** - Verify E2E encryption status
- [ ] **Message Encryption Helpers** - Additional encryption utilities
- [ ] **Session Encryption** - Encrypt session files at rest
- [ ] **Webhook Security** - HMAC signature verification

#### Business Features (v0.6.0)
- [ ] **Business Profile** - Set and manage business profiles
- [ ] **Catalogs** - Manage product catalogs
- [ ] **Business Hours** - Configure business hours
- [ ] **Labels** - Message and chat labels

#### Developer Tools (v0.7.0)
- [ ] **Webhook Support** - HTTP webhook for events
- [ ] **CLI Tool** - Command-line interface for testing
- [ ] **Testing Utilities** - Mock client for unit tests
- [ ] **Event Replay** - Record and replay events for debugging
- [ ] **Metrics & Monitoring** - Built-in metrics collection

#### Advanced Group Features (v0.7.0)
- [ ] **Announcement Groups** - Admin-only posting
- [ ] **Group Events** - Join/leave/update notifications
- [ ] **Disappearing Messages** - Configure message expiry in groups
- [ ] **Group Mentions** - @mention functionality

#### Broadcast & Lists (v0.8.0)
- [ ] **Broadcast Lists** - Send to multiple contacts (non-group)
- [ ] **Broadcast Analytics** - Delivery and read statistics

---

## Feature Prioritization Methodology

Features are prioritized based on:

1. **Usage Frequency** - How often users need this feature
2. **User Requests** - Community feedback and requests
3. **Implementation Complexity** - Effort required vs. value delivered
4. **Baileys Support** - Whether underlying Baileys library supports it
5. **WhatsApp Stability** - How stable the WhatsApp feature is

## Version Planning

### v0.1.0 (Current) - Foundation
- Core text messaging
- Session management
- Auto-reconnection
- Multiple instances

### v0.2.0 - Media & Message Operations
- Image/video/document/audio support
- Reply, delete, edit messages
- Media download utilities

### v0.3.0 - Groups & Contacts
- Full group management
- Contact operations
- Read receipts and presence

### v0.4.0 - Enhanced Messaging
- Reactions
- Stickers, location, polls
- Advanced message types

### v0.5.0 - Storage & Performance
- Custom storage adapters
- Message queuing
- Rate limiting

### v0.6.0 - Security & Business
- Enhanced security features
- Business account support
- Catalogs and labels

### v0.7.0 - Developer Experience
- Webhooks
- CLI tools
- Testing utilities

### v0.8.0 - Broadcasting
- Broadcast lists
- Analytics

---

## How to Request Features

1. **Check this roadmap** - See if it's already planned
2. **Open an issue** - Describe your use case
3. **Provide examples** - Show how you'd use the feature
4. **Explain priority** - Why is this important for your project?

## Contributing

Want to help implement a feature?

1. Comment on the related issue (or create one)
2. Fork the repository
3. Implement the feature following our architecture
4. Add tests and documentation
5. Submit a pull request

---

## Completed Milestones

### 2025-11-19 - v0.1.0 Initial Release
- ✅ Project setup and architecture
- ✅ TypeScript configuration
- ✅ Core MiawClient implementation
- ✅ Message normalization
- ✅ Session management
- ✅ Auto-reconnection logic
- ✅ Multiple instance support
- ✅ Complete documentation

---

## Notes

- **Breaking Changes:** We aim to minimize breaking changes, but may introduce them in minor versions (0.x.0) before v1.0.0
- **Baileys Dependency:** Some features depend on Baileys library updates
- **WhatsApp Changes:** WhatsApp may change their API, requiring updates
- **Community Feedback:** Roadmap adjusted based on user needs

---

**Last Updated:** 2025-11-19
**Status:** Active Development
