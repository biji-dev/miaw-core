# Miaw Core - Roadmap

This roadmap focuses on **essential bot features** (< 1.0.0) that 90% of WhatsApp automation use cases need. Advanced and rarely-used features are documented in Future Considerations.

## Version Status

**Current Version:** 0.5.0
**Baileys Version:** 6.7.21+
**Status:** UX Polish Release
**Last Updated:** 2025-12-14

---

## Design Philosophy

Miaw Core is designed to be:

- **Simple** - Easy to use API for common use cases
- **Focused** - Core features that most bots need
- **Maintainable** - Clean codebase, not bloated
- **Production-ready** - Reliable and performant

We prioritize features based on:

1. **Usage frequency** - What 90% of bots actually need
2. **Essential vs. nice-to-have** - Core functionality first
3. **Maintainability** - Keep the library focused and clean

---

## Implemented Features (v0.1.0) ✅

### Core Messaging

- **Text Message Send** - Send text messages to individuals and groups
- **Text Message Receive** - Receive and parse incoming text messages
- **Normalized Message Format** - Simplified, clean message structure
- **Phone Number Formatting** - Automatic JID formatting

### Connection Management

- **Auto-Reconnection** - Automatic reconnection with configurable retry
- **Connection State Tracking** - Monitor connection state changes
- **Graceful Disconnect** - Clean shutdown and logout
- **Connection Events** - QR, ready, disconnected, reconnecting

### Authentication & Sessions

- **QR Code Authentication** - First-time authentication via QR code
- **Session Persistence** - File-based session storage and auto-reload
- **Multi-File Auth State** - Uses Baileys' multi-file auth state

### Multiple Instances

- **Instance Management** - Run multiple WhatsApp connections in one process
- **Isolated Sessions** - Each instance has separate auth and state

### Developer Experience

- **TypeScript Support** - Full type definitions and type safety
- **Event-Driven API** - Clean event emitter pattern
- **Error Handling** - Structured error reporting
- **Debug Logging** - Optional verbose logging

---

## Planned Features - Core (< 1.0.0)

### v0.2.0 - Media Essentials ✅

**Focus:** Send and receive rich media

#### Send Media

- [x] **Send Images** - Send images with optional captions, view-once support
- [x] **Send Videos** - Send video files with captions, GIF playback, video notes (PTV)
- [x] **Send Audio** - Send audio messages, voice notes (PTT) support
- [x] **Send Documents** - Send PDF, DOC, and other document types with auto-mimetype detection

#### Receive Media

- [x] **Receive All Media Types** - Parse incoming media messages with full metadata
- [x] **Download Media** - Built-in `downloadMedia()` utility for received media
- [x] **Media Metadata** - Extract file info (size, mimetype, filename, dimensions, duration)

---

### v0.3.0 - Message Context ✅

**Focus:** Conversational context and message updates

- [x] **Reply to Messages** - Quote/reply to specific messages (contextual conversation)
- [x] **Receive Edit Notifications** - Detect when messages are edited by others
- [x] **Receive Delete Notifications** - Detect when messages are deleted by others
- [x] **Receive Reactions** - Parse and handle incoming message reactions

---

### v0.4.0 - Validation & Basic Social ✅

**Focus:** Contact validation and basic group support

#### Contact Operations

- [x] **Check Phone Number on WhatsApp** - Verify if number is registered (validation before sending)
- [x] **Get Contact Info** - Fetch contact name and basic info
- [x] **Get Profile Picture URL** - Retrieve contact profile picture
- [x] **Fetch Contact Status** - Get contact's about/status text
- [x] **Get Business Profile** - Fetch business profile information

#### Basic Group Support

- [x] **Send to Groups** - Send messages to group chats (already in v0.1.0)
- [x] **Get Group Info** - Fetch group metadata (name, participants, description)
- [x] **Get Group Participants** - List all group members

---

### v0.5.0 - UX Polish ✅

**Focus:** Better user experience and bot interaction

- [x] **Read Receipts** - Mark messages as read
- [x] **Typing Indicator** - Send "typing..." status while preparing response
- [x] **Recording Indicator** - Send "recording audio..." status
- [x] **Presence Updates** - Set online/offline/available status
- [x] **Presence Subscribe** - Monitor contact's online/offline status

---

### v0.6.0 - Advanced Messaging

**Focus:** Advanced message operations

- [ ] **Send Reactions** - React to messages with emojis
- [ ] **Forward Messages** - Forward messages to other chats
- [ ] **Edit Own Messages** - Edit messages you've sent
- [ ] **Delete Own Messages** - Delete messages you've sent
- [ ] **Star Messages** - Star/unstar important messages

---

### v0.7.0 - Group Management

**Focus:** Full group administration

#### Group Operations

- [ ] **Create Group** - Create new WhatsApp groups
- [ ] **Add Participants** - Add members to groups
- [ ] **Remove Participants** - Remove members from groups
- [ ] **Leave Group** - Exit from groups

#### Group Administration

- [ ] **Promote to Admin** - Grant admin permissions
- [ ] **Demote from Admin** - Remove admin permissions
- [ ] **Update Group Name** - Change group subject/title
- [ ] **Update Group Description** - Modify group description
- [ ] **Update Group Picture** - Change group icon

#### Group Invites

- [ ] **Generate Invite Link** - Create group invite link
- [ ] **Revoke Invite Link** - Invalidate invite link
- [ ] **Accept Group Invite** - Join group via invite code
- [ ] **Get Invite Info** - Preview group info before joining

---

### v0.8.0 - Profile Management

**Focus:** Bot profile customization

- [ ] **Update Profile Picture** - Set/change bot's profile picture
- [ ] **Remove Profile Picture** - Delete bot's profile picture
- [ ] **Update Profile Name** - Change bot's display name
- [ ] **Update Profile Status** - Set bot's about/status text

---

### v0.9.0 - Business Features

**Focus:** Business account capabilities

- [ ] **Get Business Profile** - Fetch business profile information
- [ ] **Send Product Messages** - Share product catalog items
- [ ] **Chat Labels** - Add/remove labels to conversations
- [ ] **Message Labels** - Add/remove labels to specific messages

---

### v1.0.0 - Production Ready

**Focus:** First stable release

- [ ] **Complete Test Coverage** - Unit and integration tests for all features
- [ ] **Performance Optimization** - Optimized message handling and reconnection
- [ ] **Documentation Complete** - Full examples for all features in USAGE.md
- [ ] **Example Bots** - Multiple real-world example implementations
- [ ] **Migration Guide** - Guide for upgrading from v0.x
- [ ] **Stability Guarantee** - No breaking changes in v1.x
- [ ] **Bug Fixes** - All known issues resolved

**First Stable Release** - Production-ready for critical applications

---

## Planned Features - Advanced (> 1.0.0)

### v1.1.0 - Performance & Reliability

**Focus:** Production scalability and performance

#### Custom Storage

- [ ] **Pluggable Storage Interface** - Abstract storage layer for sessions
- [ ] **Redis Adapter** - Store sessions in Redis
- [ ] **MongoDB Adapter** - MongoDB session storage
- [ ] **PostgreSQL Adapter** - PostgreSQL session storage

#### Performance Optimization

- [ ] **Message Queuing** - Queue messages for reliable delivery
- [ ] **Rate Limiting** - Built-in rate limit handling and automatic retry
- [ ] **Media Caching** - Cache uploaded media to avoid re-uploads
- [ ] **Connection Pooling** - Optimize multiple instance management
- [ ] **Bulk Operations** - Send to multiple recipients efficiently

---

### v1.2.0 - Interactive Message Types

**Focus:** Rich interactive messaging

- [ ] **Send Polls** - Create and send polls
- [ ] **Button Messages** - Interactive button messages
- [ ] **List Messages** - Menu/list selection messages
- [ ] **Link Previews** - Rich link previews with custom thumbnails

---

## Future Considerations

Features available in Baileys but **rarely needed** for most bots. May be added based on community demand:

### Messaging

- **Stickers** - Send/receive sticker messages
- **Location Sharing** - Share location coordinates
- **Contact Cards (vCard)** - Share contact information
- **Voice Notes (PTT)** - Send push-to-talk audio (currently only regular audio supported)
- **Pin Messages** - Pin messages in chats with expiry options

### Chat Management

- **Archive/Unarchive Chat** - Move chats to/from archive
- **Mute/Unmute Chat** - Disable/enable chat notifications
- **Mark Chat Unread** - Mark conversations as unread
- **Disappearing Messages** - Configure message auto-delete timer

### Privacy Controls

- **Last Seen Privacy** - Configure who can see last seen
- **Online Privacy** - Control who sees online status
- **Profile Picture Privacy** - Set profile picture visibility
- **Status Privacy** - Configure who can view status updates
- **Read Receipts Privacy** - Enable/disable read receipts globally
- **Groups Add Privacy** - Control who can add bot to groups
- **Call Privacy** - Configure call permissions

### Advanced Group Features

- **Group Settings** - Announcement mode, locked settings
- **Join Approval Mode** - Require admin approval for new members
- **Ephemeral Messages in Groups** - Disappearing messages for groups
- **Group Request Participants** - Get pending join requests

### Contact Management

- **Block/Unblock Contacts** - Programmatically block contacts
- **Fetch Blocklist** - Get list of blocked contacts
- **Add/Edit/Remove Contacts** - Manage contact list programmatically

### Newsletter & Communities (Baileys 6.7+)

- **Newsletter Operations** - Create, subscribe, manage newsletters
- **Newsletter Reactions** - React to newsletter messages
- **Newsletter Administration** - Manage admins, subscribers
- **Communities Support** - WhatsApp Communities feature

### Developer Tools

- **Webhook Support** - HTTP webhooks for events
- **CLI Tools** - Command-line interface for testing
- **Mock Client** - Mock MiawClient for unit testing
- **Event Replay** - Record and replay events for debugging
- **Metrics & Monitoring** - Built-in metrics collection
- **Health Check Endpoint** - Status monitoring

### Business (Advanced)

- **Business Catalogs** - Manage product catalogs
- **Business Hours** - Configure business operating hours
- **Business Profile Management** - Full business profile customization

---

## Why These Are "Future Considerations"

These features are:

- **Low usage frequency** - Needed by < 10% of bots
- **Complexity vs. value** - Add significant code for niche use cases
- **Maintainability** - Keeping library focused and simple
- **Available in Baileys** - Can be added later without breaking changes
- **Community-driven** - Will add if there's strong demand

If you need any of these features, please:

1. Open a GitHub issue explaining your use case
2. Show community interest (👍 reactions)
3. We'll prioritize based on demand

---

## Version Planning Summary

| Version | Focus                                                      | Status      |
| ------- | ---------------------------------------------------------- | ----------- |
| v0.1.0  | Foundation (text, sessions, reconnection)                  | ✅ Released |
| v0.2.0  | Media essentials (send/receive/download)                   | ✅ Released |
| v0.3.0  | Message context (reply, edits, reactions)                  | ✅ Released |
| v0.4.0  | Validation & basic social (check number, groups, contacts) | ✅ Released |
| v0.5.0  | UX polish (read receipts, typing, presence)                | ✅ Released |
| v0.6.0  | Advanced messaging (react, forward, edit, delete)          | 📋 Planned  |
| v0.7.0  | Group management (full admin capabilities)                 | 📋 Planned  |
| v0.8.0  | Profile management (customize bot profile)                 | 📋 Planned  |
| v0.9.0  | Business features (products, labels)                       | 📋 Planned  |
| v1.0.0  | **Production ready** (first stable release)                | 🎯 Goal     |
| v1.1.0  | Performance & reliability (storage, queuing)               | 💡 Future   |
| v1.2.0  | Interactive messages (polls, buttons, lists)               | 💡 Future   |

---

## Baileys Compatibility

This roadmap is aligned with **@whiskeysockets/baileys v6.7.21+**:

- ✅ All planned features are supported by Baileys
- ✅ Features verified against current Baileys API
- ✅ Focus on stable, well-tested Baileys capabilities
- ⚠️ Some features may require specific WhatsApp account types (e.g., Business)

---

## How to Request Features

### For Core Features (< 1.0.0)

If you think a feature should be in the core library:

1. **Check this roadmap** - See if it's already planned
2. **Open a GitHub issue** - Explain why it's essential for most bots
3. **Show usage data** - Demonstrate it's commonly needed
4. **Provide use cases** - Real-world examples

### For Future Considerations

If you need a feature from Future Considerations:

1. **Open a GitHub issue** - Describe your use case
2. **Get community support** - Other users 👍 the issue
3. **Consider contributing** - PRs welcome!

---

## Contributing

Want to help implement a feature?

1. **Pick a feature** from the roadmap
2. **Open an issue** to discuss implementation approach
3. **Fork the repository** and create a feature branch
4. **Follow existing architecture** - Keep it simple and consistent
5. **Add tests** - Unit tests required for all features
6. **Update USAGE.md** - Document with clear examples
7. **Submit pull request** - Reference the issue

---

## Completed Milestones

### 2025-12-14 - v0.5.0 UX Polish

- ✅ `markAsRead()` - Mark messages as read (send read receipts)
- ✅ `sendTyping()` - Send "typing..." indicator to contacts
- ✅ `sendRecording()` - Send "recording audio..." indicator
- ✅ `stopTyping()` - Stop typing/recording indicator
- ✅ `setPresence()` - Set online/offline presence status
- ✅ `subscribePresence()` - Subscribe to contact presence updates
- ✅ `presence` event for receiving presence updates
- ✅ New types: PresenceStatus, PresenceUpdate
- ✅ Integration tests for all UX features

### 2025-12-14 - v0.4.0 Validation & Basic Social

- ✅ `checkNumber()` - Verify if phone number is on WhatsApp
- ✅ `checkNumbers()` - Batch check multiple phone numbers
- ✅ `getContactInfo()` - Fetch contact info including status
- ✅ `getBusinessProfile()` - Get business account profile
- ✅ `getProfilePicture()` - Get profile picture URL (low/high res)
- ✅ `getGroupInfo()` - Fetch group metadata
- ✅ `getGroupParticipants()` - List all group members
- ✅ New types: CheckNumberResult, ContactInfo, BusinessProfile, GroupInfo, GroupParticipant
- ✅ Integration tests for all contact/group features

### 2025-12-14 - v0.3.0 Message Context

- ✅ Reply to messages (quoted) for all send methods
- ✅ `message_edit` event for edit notifications
- ✅ `message_delete` event for delete notifications
- ✅ `message_reaction` event for reactions
- ✅ `MessageEdit`, `MessageDelete`, `MessageReaction` types
- ✅ Integration tests for all message context features
- ✅ Updated TESTS.md with message context test cases

### 2025-12-14 - v0.2.0 Media Essentials

- ✅ `sendImage()` with caption and view-once support
- ✅ `sendDocument()` with auto-mimetype detection
- ✅ `sendVideo()` with caption, GIF playback, and PTV (video notes)
- ✅ `sendAudio()` with PTT (voice notes) support
- ✅ `downloadMedia()` utility for received media
- ✅ `MediaInfo` type with full metadata extraction
- ✅ View-once message detection
- ✅ Integration tests for all media types
- ✅ Updated TESTS.md with media test cases

### 2025-11-19 - v0.1.0 Initial Release

- ✅ Project architecture and setup
- ✅ TypeScript with strict mode
- ✅ Core MiawClient implementation
- ✅ Message normalization
- ✅ File-based session management
- ✅ Auto-reconnection logic
- ✅ Multiple instance support
- ✅ Complete documentation
- ✅ Working example bot

---

## Notes

- **Breaking Changes:** May occur in v0.x releases. Stable API guaranteed from v1.0.0+
- **Baileys Dependency:** All features depend on Baileys library capabilities
- **WhatsApp Changes:** WhatsApp may change their protocol, requiring updates
- **Community-Driven:** Roadmap evolves based on real-world usage and feedback
- **Simplicity First:** We prioritize keeping the library focused and maintainable

---

## Known Limitations

- **Unofficial API:** Uses WhatsApp Web reverse-engineered protocol
- **Account Risks:** Excessive automation may result in WhatsApp bans
- **Rate Limits:** WhatsApp enforces rate limits on messages
- **Media Size Limits:** File size limits enforced by WhatsApp
- **Connection Stability:** Depends on WhatsApp Web service stability

---

**Last Updated:** 2025-12-14
**Status:** Active Development
**Next Release:** v0.6.0 (Advanced Messaging)
**Path to Stable:** v0.1.0 → v0.2.0 ✅ → v0.3.0 ✅ → v0.4.0 ✅ → v0.5.0 ✅ → v0.6.0 → ... → v1.0.0 (Production Ready)
