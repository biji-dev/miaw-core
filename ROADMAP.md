# Miaw Core - Roadmap

This document tracks implemented features and planned future development. Features are organized by priority based on common use cases and aligned with Baileys v6.7.21+ capabilities.

## Version Status

**Current Version:** 0.1.0
**Baileys Version:** 6.7.21+
**Status:** Initial Release
**Last Updated:** 2025-11-19

---

## Implemented Features (v0.1.0)

### ✅ Core Messaging
- **Text Message Send** - Send text messages to individuals and groups
- **Text Message Receive** - Receive and parse incoming text messages
- **Normalized Message Format** - Simplified message structure (abstracts Baileys complexity)
- **Phone Number Formatting** - Automatic JID formatting for phone numbers

### ✅ Connection Management
- **Auto-Reconnection** - Automatic reconnection on connection loss with configurable retry
- **Connection State Tracking** - Monitor connection state changes
- **Graceful Disconnect** - Clean shutdown and logout
- **Connection Events** - QR code, ready, disconnected, reconnecting events

### ✅ Authentication & Sessions
- **QR Code Authentication** - First-time authentication via QR code scanning
- **Session Persistence** - File-based session storage and auto-reload
- **Multi-File Auth State** - Uses Baileys' multi-file auth state system

### ✅ Multiple Instances
- **Instance Management** - Run multiple WhatsApp connections in single process
- **Isolated Sessions** - Each instance has separate authentication and state
- **Instance Identification** - Unique instance IDs for management

### ✅ Developer Experience
- **TypeScript Support** - Full TypeScript definitions and type safety
- **Event-Driven API** - Clean event emitter pattern
- **Error Handling** - Structured error reporting and recovery
- **Debug Logging** - Optional verbose logging with Pino

### ✅ Configuration
- **Flexible Options** - Configurable reconnection, session path, logging
- **Sensible Defaults** - Works out of the box with minimal configuration

---

## Planned Features (Priority Order)

### 🔥 High Priority - Most Used Features (v0.2.0)

#### Media Messaging
- [ ] **Send Images** - Send images with optional captions and mentions
- [ ] **Send Videos** - Send video files with captions (including GIF playback mode)
- [ ] **Send Audio** - Send audio messages
- [ ] **Send Voice Notes** - Send voice notes (PTT - Push-to-Talk)
- [ ] **Send Documents** - Send PDF, DOC, and other document types with metadata
- [ ] **Receive Media** - Download and process received media files
- [ ] **Media Download Helper** - Built-in utilities for downloading media
- [ ] **Media Upload Helper** - Optimized media upload to WhatsApp servers

#### Message Operations
- [ ] **Reply to Message** - Quote/reply to specific messages (contextual)
- [ ] **Delete Message** - Delete sent messages (own or as admin)
- [ ] **Edit Message** - Edit sent text messages
- [ ] **Forward Message** - Forward messages to other chats
- [ ] **Star Message** - Star/unstar important messages
- [ ] **Pin Message** - Pin messages in chats (with expiry options)

---

### 🔶 Medium Priority - Commonly Requested (v0.3.0)

#### Contact Management
- [ ] **Get Contact Info** - Fetch contact details and profile information
- [ ] **Check Number on WhatsApp** - Verify if number is registered on WhatsApp
- [ ] **Get Profile Picture** - Fetch contact profile pictures (preview and full)
- [ ] **Update Profile Picture** - Set/update own profile picture
- [ ] **Remove Profile Picture** - Delete own profile picture
- [ ] **Update Profile Name** - Change display name
- [ ] **Update Profile Status** - Update status/about text
- [ ] **Add/Edit Contact** - Add or modify contacts
- [ ] **Remove Contact** - Delete contacts
- [ ] **Block/Unblock** - Block and unblock contacts
- [ ] **Fetch Blocklist** - Get list of blocked contacts

---

### 🔶 Medium Priority - Social Features (v0.4.0)

#### Group Operations
- [ ] **Create Group** - Create new WhatsApp groups
- [ ] **Get Group Metadata** - Fetch group information and participants
- [ ] **Add Participants** - Add members to groups
- [ ] **Remove Participants** - Remove members from groups
- [ ] **Promote/Demote Admins** - Manage group admin permissions
- [ ] **Update Group Subject** - Change group name
- [ ] **Update Group Description** - Update group description
- [ ] **Update Group Picture** - Change group icon/picture
- [ ] **Leave Group** - Exit from groups
- [ ] **Group Invite Links** - Generate and revoke invite links
- [ ] **Accept Group Invite** - Join group via invite code
- [ ] **Get Group Invite Info** - Preview group before joining
- [ ] **Group Settings** - Configure announcement mode, locked, member add mode
- [ ] **Group Join Approval Mode** - Require admin approval for new members
- [ ] **Ephemeral Messages in Groups** - Configure disappearing messages
- [ ] **Fetch All Groups** - Get all participating groups

#### Presence & Status
- [ ] **Send Typing Indicator** - Send "typing..." status
- [ ] **Send Recording Indicator** - Send "recording audio..." status
- [ ] **Set Online/Offline** - Control online presence
- [ ] **Subscribe to Presence** - Monitor contact's presence updates

#### Reactions & Interactive
- [ ] **Send Reaction** - React to messages with emojis
- [ ] **Remove Reaction** - Remove your reactions

---

### 🔷 Enhanced Messaging (v0.5.0)

#### Advanced Message Types
- [ ] **Send Stickers** - Send sticker messages (static and animated)
- [ ] **Send Location** - Share location data with coordinates
- [ ] **Send Contacts (vCard)** - Share contact cards
- [ ] **Send Polls** - Create and send polls
- [ ] **Send Link with Preview** - Rich link previews with custom thumbnails
- [ ] **Send Button Messages** - Interactive button messages
- [ ] **Send List Messages** - Menu/list selection messages
- [ ] **Send Template Messages** - Use message templates

#### Read Receipts & Delivery
- [ ] **Mark as Read** - Send read receipts for messages
- [ ] **Send Read Receipts** - Batch read receipt sending
- [ ] **Delivery Receipts** - Track message delivery status

---

### 🔷 Privacy & Settings (v0.6.0)

#### Privacy Controls
- [ ] **Last Seen Privacy** - Configure who can see last seen
- [ ] **Online Privacy** - Control who sees online status
- [ ] **Profile Picture Privacy** - Set profile picture visibility
- [ ] **Status Privacy** - Configure who can view status updates
- [ ] **Read Receipts Privacy** - Enable/disable read receipts
- [ ] **Groups Add Privacy** - Control who can add you to groups
- [ ] **Call Privacy** - Configure call permissions
- [ ] **Messages Privacy** - Control message permissions
- [ ] **Disable Link Previews** - Privacy setting for link previews
- [ ] **Fetch Privacy Settings** - Get current privacy configuration

#### Disappearing Messages
- [ ] **Default Disappearing Mode** - Set default expiry for new chats
- [ ] **Set Disappearing in Chat** - Enable/disable for specific chats
- [ ] **Fetch Disappearing Duration** - Get disappearing message settings

---

### 🔷 Business Features (v0.7.0)

#### Business Accounts
- [ ] **Get Business Profile** - Fetch business profile information
- [ ] **Set Business Profile** - Configure business profile details
- [ ] **Product Messages** - Send product catalog items
- [ ] **Business Hours** - Configure business operating hours
- [ ] **Labels** - Create and manage chat/message labels
- [ ] **Add Chat Label** - Label conversations
- [ ] **Remove Chat Label** - Unlabel conversations
- [ ] **Add Message Label** - Label specific messages
- [ ] **Remove Message Label** - Remove message labels

---

### 🔷 Newsletter Features (v0.8.0) - NEW!

> **Note:** Newsletters are a new feature in Baileys 6.7+

#### Newsletter Operations
- [ ] **Create Newsletter** - Create new newsletter channels
- [ ] **Update Newsletter** - Modify newsletter settings
- [ ] **Newsletter Metadata** - Fetch newsletter information by JID or invite
- [ ] **Follow Newsletter** - Subscribe to newsletters
- [ ] **Unfollow Newsletter** - Unsubscribe from newsletters
- [ ] **Mute/Unmute Newsletter** - Control notifications
- [ ] **Update Newsletter Name** - Change newsletter title
- [ ] **Update Newsletter Description** - Modify description
- [ ] **Update Newsletter Picture** - Set newsletter icon
- [ ] **Remove Newsletter Picture** - Delete newsletter icon
- [ ] **React to Newsletter Message** - React with emojis
- [ ] **Fetch Newsletter Messages** - Retrieve newsletter content
- [ ] **Newsletter Subscribers Count** - Get subscriber statistics
- [ ] **Newsletter Admin Count** - Get admin count
- [ ] **Newsletter Change Owner** - Transfer ownership
- [ ] **Newsletter Demote Admin** - Remove admin privileges
- [ ] **Delete Newsletter** - Remove newsletter channel

---

### 🔷 Advanced Features (v0.9.0)

#### Communities (WhatsApp Communities)
- [ ] **Community Support** - Support for WhatsApp Communities feature
- [ ] **Community Operations** - Manage community groups and announcements

#### Chat Management
- [ ] **Chat Modify** - Archive, mute, pin, mark unread
- [ ] **Archive Chat** - Move chat to archive
- [ ] **Unarchive Chat** - Restore from archive
- [ ] **Mute Chat** - Disable notifications for chat
- [ ] **Pin Chat** - Pin chat to top
- [ ] **Mark Unread** - Mark chat as unread

---

### 🔵 Storage & Performance (v1.0.0)

#### Custom Storage
- [ ] **Pluggable Storage Interface** - Abstract storage layer
- [ ] **Redis Adapter** - Store sessions in Redis
- [ ] **MongoDB Adapter** - MongoDB session storage
- [ ] **PostgreSQL Adapter** - PostgreSQL session storage
- [ ] **MySQL Adapter** - MySQL session storage
- [ ] **Message History Storage** - Optional message persistence

#### Performance Optimization
- [ ] **Message Queuing** - Queue messages for reliable delivery
- [ ] **Rate Limiting** - Built-in rate limit handling and retry
- [ ] **Bulk Operations** - Send to multiple recipients efficiently
- [ ] **Connection Pooling** - Optimize multiple instance management
- [ ] **Media Caching** - Cache uploaded media to avoid re-uploads
- [ ] **Device List Caching** - Cache user device lists

---

### 🔵 Developer Tools (v1.1.0)

#### Testing & Debugging
- [ ] **Mock Client** - Mock MiawClient for unit testing
- [ ] **Event Replay** - Record and replay events for debugging
- [ ] **CLI Tool** - Command-line interface for testing
- [ ] **Testing Utilities** - Helper functions for testing bots

#### Integration
- [ ] **Webhook Support** - HTTP webhooks for events
- [ ] **Webhook Security** - HMAC signature verification
- [ ] **Metrics & Monitoring** - Built-in metrics collection
- [ ] **Health Check Endpoint** - Status monitoring endpoint

---

## Feature Prioritization Methodology

Features are prioritized based on:

1. **Usage Frequency** - How often developers/users need this feature
2. **Community Requests** - Feedback from GitHub issues and discussions
3. **Implementation Complexity** - Effort required vs. value delivered
4. **Baileys Support** - Whether underlying Baileys library supports it (verified against v6.7.21+)
5. **WhatsApp Stability** - How stable and reliable the WhatsApp feature is
6. **Common Use Cases** - Alignment with typical bot and automation scenarios

---

## Version Planning

### v0.1.0 (Current) - Foundation ✅
- Core text messaging
- Session management
- Auto-reconnection
- Multiple instances
- TypeScript support

### v0.2.0 - Media & Message Operations
**Focus:** Rich media support and message manipulation
- Images, videos, audio, voice notes, documents
- Reply, delete, edit, forward, star, pin messages
- Media download/upload utilities

### v0.3.0 - Contact Management
**Focus:** Contact operations and profile management
- Contact info, profile pictures, status
- Block/unblock, add/remove contacts
- Check WhatsApp registration

### v0.4.0 - Social Features
**Focus:** Groups and interactive messaging
- Full group management
- Presence and typing indicators
- Reactions

### v0.5.0 - Enhanced Messaging
**Focus:** Advanced message types
- Stickers, location, polls, contacts
- Link previews, buttons, lists
- Read receipts

### v0.6.0 - Privacy & Settings
**Focus:** Privacy controls and configuration
- All privacy settings (last seen, online, profile pic, etc.)
- Disappearing messages
- Privacy management

### v0.7.0 - Business Features
**Focus:** Business account capabilities
- Business profiles and catalogs
- Product messages
- Labels and organization

### v0.8.0 - Newsletters
**Focus:** Newsletter/channel support
- Create and manage newsletters
- Subscribe/follow features
- Newsletter interactions

### v0.9.0 - Advanced Features
**Focus:** Communities and chat management
- WhatsApp Communities support
- Advanced chat operations
- Archive, mute, pin

### v1.0.0 - Storage & Performance
**Focus:** Production-ready features
- Custom storage adapters
- Performance optimization
- Rate limiting and queuing
- **First stable release**

### v1.1.0 - Developer Tools
**Focus:** Testing and integration
- Testing utilities
- Webhooks
- Monitoring and metrics

---

## Baileys Compatibility

This roadmap is aligned with **@whiskeysockets/baileys v6.7.21+** capabilities:

- ✅ All planned features are supported by Baileys
- ✅ Newsletter support (new in Baileys 6.7+)
- ✅ Communities support available
- ✅ Full media type support (including PTV - video notes)
- ✅ All privacy settings accessible
- ✅ Business features available
- ✅ Label management supported

**Note:** Some features may require specific WhatsApp account types (e.g., Business features require WhatsApp Business account).

---

## How to Request Features

1. **Check this roadmap** - See if the feature is already planned
2. **Check Baileys support** - Verify Baileys supports the feature
3. **Open a GitHub issue** - Describe your use case clearly
4. **Provide examples** - Show how you would use the feature
5. **Explain priority** - Why is this important for your project?

## Contributing

Want to help implement a feature?

1. **Pick a feature** - Choose from this roadmap
2. **Open an issue** - Discuss your implementation approach
3. **Fork the repository** - Create your feature branch
4. **Follow the architecture** - Maintain consistency with existing code
5. **Add tests** - Include unit tests for new features
6. **Update documentation** - Update USAGE.md with examples
7. **Submit a pull request** - Reference the related issue

---

## Completed Milestones

### 2025-11-19 - v0.1.0 Initial Release
- ✅ Project architecture and setup
- ✅ TypeScript configuration with strict mode
- ✅ Core MiawClient implementation
- ✅ Message normalization and parsing
- ✅ File-based session management
- ✅ Auto-reconnection logic
- ✅ Multiple instance support
- ✅ Comprehensive documentation (README, USAGE, ROADMAP)
- ✅ Working example bot
- ✅ Full TypeScript types

---

## Notes

- **Breaking Changes:** May introduce breaking changes in minor versions (0.x.0) before v1.0.0
- **Baileys Dependency:** Features depend on Baileys library capabilities
- **WhatsApp Changes:** WhatsApp may change their API, requiring updates
- **Community Driven:** Roadmap adjusted based on user feedback
- **Version Alignment:** Each major feature set has its own version number
- **Pairing Code:** Baileys supports pairing code authentication (QR-less) - may be added in future

---

## Known Limitations

- **No Official WhatsApp API:** Uses WhatsApp Web reverse-engineered protocol
- **Account Bans:** Excessive automation may result in WhatsApp account bans
- **Rate Limits:** WhatsApp enforces rate limits on message sending
- **Media Limits:** File size limits enforced by WhatsApp
- **Connection Stability:** Connection quality depends on WhatsApp Web stability

---

**Last Updated:** 2025-11-19
**Status:** Active Development
**Next Release:** v0.2.0 (Media & Message Operations)
