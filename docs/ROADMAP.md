# Miaw Core - Roadmap

This roadmap focuses on **essential bot features** (< 1.0.0) that 90% of WhatsApp automation use cases need. Advanced and rarely-used features are documented in Future Considerations.

## Version Status

**Current Version:** 1.4.1
**Baileys Version:** 7.0.0-rc13
**Node.js Required:** >= 18.0.0
**Module System:** ESM-only
**Status:** Stable Release
**Last Updated:** 2026-06-26

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

### v0.6.0 - Advanced Messaging ✅

**Focus:** Advanced message operations

- [x] **Send Reactions** - React to messages with emojis
- [x] **Remove Reactions** - Remove your reaction from messages
- [x] **Forward Messages** - Forward messages to other chats
- [x] **Edit Own Messages** - Edit messages you've sent (within 15-minute window)
- [x] **Delete Own Messages** - Delete messages for everyone
- [x] **Delete Messages For Me** - Delete messages locally only

---

### v0.7.0 - Group Management ✅

**Focus:** Full group administration

#### Group Operations

- [x] **Create Group** - Create new WhatsApp groups
- [x] **Add Participants** - Add members to groups
- [x] **Remove Participants** - Remove members from groups
- [x] **Leave Group** - Exit from groups

#### Group Administration

- [x] **Promote to Admin** - Grant admin permissions
- [x] **Demote from Admin** - Remove admin permissions
- [x] **Update Group Name** - Change group subject/title
- [x] **Update Group Description** - Modify group description
- [x] **Update Group Picture** - Change group icon

#### Group Invites

- [x] **Generate Invite Link** - Create group invite link
- [x] **Revoke Invite Link** - Invalidate invite link
- [x] **Accept Group Invite** - Join group via invite code
- [x] **Get Invite Info** - Preview group info before joining

---

### v0.8.0 - Profile Management ✅

**Focus:** Bot profile customization

- [x] **Update Profile Picture** - Set/change bot's profile picture
- [x] **Remove Profile Picture** - Delete bot's profile picture
- [x] **Update Profile Name** - Change bot's display name
- [x] **Update Profile Status** - Set bot's about/status text

---

### v0.9.0 - Business & Social Features ✅

**Focus:** Business capabilities, channels, and contact management

#### Label Operations (requires WhatsApp Business)

- [x] **Add Chat Label** - Add a label to a conversation
- [x] **Remove Chat Label** - Remove a label from a conversation
- [x] **Add Message Label** - Add a label to a specific message
- [x] **Remove Message Label** - Remove a label from a message

#### Catalog/Product Operations (requires WhatsApp Business)

- [x] **Get Catalog** - Fetch product catalog from a business account
- [x] **Get Collections** - Fetch catalog collections
- [x] **Create Product** - Add a new product to catalog
- [x] **Update Product** - Modify an existing product
- [x] **Delete Products** - Remove products from catalog

#### Newsletter/Channel Operations

- [x] **Create Newsletter** - Create a WhatsApp channel
- [x] **Follow/Unfollow Newsletter** - Subscribe to channels
- [x] **Mute/Unmute Newsletter** - Control channel notifications
- [x] **Update Newsletter** - Update channel name, description, picture
- [x] **Fetch Newsletter Messages** - Get channel message history
- [x] **React to Newsletter Message** - React to channel posts
- [x] **Delete Newsletter** - Delete a channel you own
- [x] **Subscribe to Updates** - Subscribe to live newsletter updates
- [x] **Get Subscriber Count** - Get newsletter subscriber/admin counts
- [x] **Change Owner** - Transfer newsletter ownership
- [x] **Demote Admin** - Demote a newsletter admin

#### Contact Management

- [x] **Add/Edit Contact** - Add or update a contact
- [x] **Remove Contact** - Delete a contact

> Note: `getBusinessProfile()` was already implemented in v0.4.0

---

### v1.0.0 - Production Ready ✅

**Focus:** First stable release (2025-12-24)

- [x] **Complete Test Coverage** - Unit and integration tests for all features
- [x] **Documentation Complete** - Full examples for all features in USAGE.md
- [x] **Example Bots** - 11 basic + 2 real-world example implementations
- [x] **Migration Guide** - Guide for upgrading from v0.x
- [x] **Stability Guarantee** - No breaking changes in v1.x
- [x] **API Stability Review** - `docs/API_STABILITY_REVIEW.md`

**First Stable Release** - Production-ready for critical applications.

---

## Released Since v1.0.0

These shipped after the first stable release (see [CHANGELOG.md](../CHANGELOG.md) for full detail):

### v1.1.0 - Baileys v7 Migration ✅ (2026-01-02)

- [x] **ESM-only** - `"type": "module"`, Node.js >= 18 (breaking change)
- [x] **Baileys v6.7.21 → v7.0.0-rc.9**
- [x] **Session reconnection fix** - reconnect after QR scan + restart without re-pairing

### v1.2.0 - Code Quality ✅

- [x] **Configurable timeouts** - per-operation timeout options
- [x] **Validation utilities** - exported phone/JID validators and type guards
- [x] **Custom logger support** - inject your own Pino-compatible logger

### v1.3.0 - Proxy Support ✅

- [x] **HTTP/SOCKS proxy** - route the WhatsApp connection via `proxyUrl`
- [x] **`getProxyInfo()`** - inspect the active proxy

### v1.4.0 / v1.4.1 - CLI Expansion + Baileys rc13 ✅ (2026-06-26)

- [x] **CLI major expansion** - video/audio/media-download, labels, catalog, contacts, profile commands (63 commands total)
- [x] **Baileys v7.0.0-rc.9 → rc13** - security fixes (GHSA-qvv5-jq5g-4cgg), libsignal on npm
- [x] **LID resolution hardening for rc10–rc13** - reads `Contact.phoneNumber` / `Chat.pnJid` and the rc13 MessageKey alt fields (`remoteJidAlt` / `participantAlt` / `addressingMode`); see [LID_RESOLUTION.md](./LID_RESOLUTION.md)

---

## Not-Yet-Implemented Baileys Features (Prioritized)

Every item below is a thin wrapper over a method that **exists in Baileys 7.0.0-rc13** but is not yet exposed by miaw-core. Verified against the installed `@whiskeysockets/baileys` type definitions. Ordered as the backlog for the next implementation round.

### 1. Chat Management (priority) — via `socket.chatModify(mod, jid)`

- [ ] `archiveChat()` / `unarchiveChat()`
- [ ] `pinChat()` / `unpinChat()`
- [ ] `muteChat(duration)` / `unmuteChat()`
- [ ] `markChatRead()` (whole-chat read)
- [ ] `clearChat()` / `deleteChat()`
- [ ] `starMessage()` / `unstarMessage()` (`socket.star`)

> `archive` / `clear` / `delete` need last-message key context — wire through the existing `messagesStore`.

### 2. Rich Messages (priority) — via `socket.sendMessage(jid, content)`

- [ ] `sendLocation(to, lat, lng, opts)` → `{ location }`
- [ ] `sendContact(to, contacts)` → `{ contacts }` (vCard)
- [ ] `sendPoll(to, name, options, selectableCount)` → `{ poll }`, plus poll-vote decoding (`getAggregateVotesInPollMessage` / `decryptPollVote`)
- [ ] `sendSticker(to, sticker)` → `{ sticker }`
- [ ] `sendGroupInvite(to, ...)` → `{ groupInvite }`
- [ ] `pinMessage()` / `unpinMessage()` → `{ pin: key, type, time }`
- [ ] `mentions` option on `sendText()` and media captions

### 3. Privacy & Blocklist

- [ ] `blockContact()` / `unblockContact()` (`updateBlockStatus`)
- [ ] `getBlocklist()` (`fetchBlocklist`)
- [ ] `getPrivacySettings()` (`fetchPrivacySettings`) + setters: `updateLastSeenPrivacy`, `updateOnlinePrivacy`, `updateProfilePicturePrivacy`, `updateStatusPrivacy`, `updateReadReceiptsPrivacy`, `updateGroupsAddPrivacy`, `updateMessagesPrivacy`, `updateCallPrivacy`, `updateDefaultDisappearingMode`

### 4. Group Admin & Disappearing Messages

- [ ] `setGroupAnnounceOnly()` / `setGroupRestrictInfo()` (`groupSettingUpdate`)
- [ ] `setGroupMemberAddMode()` (`groupMemberAddMode`)
- [ ] `setGroupJoinApproval()` (`groupJoinApprovalMode`)
- [ ] `getGroupJoinRequests()` / `approveGroupJoinRequest()` / `rejectGroupJoinRequest()` (`groupRequestParticipants*`)
- [ ] `setGroupEphemeral()` (`groupToggleEphemeral`) + 1:1 `setDisappearingMessages()` (`disappearingMessagesInChat`)

### 5. Calls

- [ ] `rejectCall()` (`rejectCall`)
- [ ] `call` event surfaced from the Baileys `call` event
- [ ] `createCallLink()` (`createCallLink`)

### 6. Business Extras

- [ ] `updateBusinessProfile()` (`updateBussinesProfile`)
- [ ] `updateCoverPhoto()` / `removeCoverPhoto()`
- [ ] `getOrderDetails()` (`getOrderDetails`)
- [ ] quick replies (`addOrEditQuickReply` / `removeQuickReply`)

### 7. Status / Stories

- [ ] `postTextStatus()` / `postImageStatus()` / `postVideoStatus()` via `sendMessage('status@broadcast', ...)`

### 8. Communities (largest surface, lowest priority)

- [ ] Full `community*` wrapper layer (~22 methods: create, metadata, link/unlink groups, participants, invites)

### 9. Auth & Events

- [ ] `requestPairingCode()` - phone-number pairing as a QR alternative
- [ ] Surface `message-receipt.update` as a miaw receipt event

---

## Still Backlogged (no Baileys blocker, lower demand)

### Custom Storage

- [ ] **Pluggable Storage Interface** - Abstract storage layer for sessions
- [ ] **Redis / MongoDB / PostgreSQL Adapters** - external session storage

### Performance

- [ ] **Message Queuing**, **Rate Limiting**, **Media Caching**, **Connection Pooling**, **Bulk Operations**

### Interactive Messages (deprecated by WhatsApp)

- [ ] **Button / List / Template Messages** - deprecated by WhatsApp; low value

---

## Future Considerations

> **Baileys-backed gaps** — messaging, chat management, privacy, group admin, calls, business extras, status, and communities — are now tracked concretely in **[Not-Yet-Implemented Baileys Features (Prioritized)](#not-yet-implemented-baileys-features-prioritized)** above. The items below are broader infrastructure ideas with no specific Baileys dependency, added on community demand.

### Developer Tools

- **Webhook Support** - HTTP webhooks for events (already provided by the sibling **miaw-api** package)
- **Mock Client** - Mock MiawClient for unit testing
- **Event Replay** - Record and replay events for debugging
- **Metrics & Monitoring** - Built-in metrics collection
- **Health Check Endpoint** - Status monitoring

> Already shipped (no longer "future"): **CLI Tools** (v1.4.x, 63 commands), **Add/Edit/Remove Contacts** (v0.9.0), **Catalog/Labels** (v0.9.0), **Voice Notes / PTT** (v0.2.0).

### Business (Advanced)

- **Business Hours** - Configure business operating hours

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
| v0.6.0  | Advanced messaging (react, forward, edit, delete)          | ✅ Released |
| v0.7.0  | Group management (full admin capabilities)                 | ✅ Released |
| v0.8.0  | Profile management (customize bot profile)                 | ✅ Released |
| v0.9.0  | Business & social (labels, catalog, channels, contacts)    | ✅ Released |
| v1.0.0  | **Production ready** (first stable release)                | ✅ Released |
| v1.1.0  | Baileys v7 migration (ESM-only, reconnection fix)          | ✅ Released |
| v1.2.0  | Code quality (timeouts, validation, custom logger)         | ✅ Released |
| v1.3.0  | Proxy support (HTTP/SOCKS)                                 | ✅ Released |
| v1.4.x  | CLI expansion + Baileys rc13 upgrade                       | ✅ Released |
| next    | Chat management + rich messages (see prioritized backlog)  | 📋 Planned  |

---

## Baileys Compatibility

This roadmap is aligned with **@whiskeysockets/baileys v7.0.0-rc13**:

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

### 2025-12-21 - v0.8.0 Profile Management

- ✅ `updateProfilePicture()` - Update your own profile picture
- ✅ `removeProfilePicture()` - Remove your profile picture
- ✅ `updateProfileName()` - Update your display name (push name)
- ✅ `updateProfileStatus()` - Update your "About" text
- ✅ New type: ProfileOperationResult
- ✅ Integration tests for all profile management features

### 2025-12-21 - v0.7.0 Group Management

- ✅ `createGroup()` - Create new WhatsApp groups
- ✅ `addParticipants()` - Add members to groups
- ✅ `removeParticipants()` - Remove members from groups
- ✅ `leaveGroup()` - Exit from groups
- ✅ `promoteToAdmin()` - Grant admin permissions
- ✅ `demoteFromAdmin()` - Remove admin permissions
- ✅ `updateGroupName()` - Change group subject/title
- ✅ `updateGroupDescription()` - Modify group description
- ✅ `updateGroupPicture()` - Change group icon
- ✅ `getGroupInviteLink()` - Get group invite link
- ✅ `revokeGroupInvite()` - Revoke and generate new invite link
- ✅ `acceptGroupInvite()` - Join group via invite code
- ✅ `getGroupInviteInfo()` - Preview group info before joining
- ✅ New types: ParticipantOperationResult, CreateGroupResult, GroupOperationResult, GroupInviteInfo
- ✅ Integration tests for all group management features

### 2025-12-14 - v0.6.0 Advanced Messaging

- ✅ `sendReaction()` - Send emoji reactions to messages
- ✅ `removeReaction()` - Remove reactions from messages
- ✅ `forwardMessage()` - Forward messages to other chats
- ✅ `editMessage()` - Edit your own sent messages (within 15-minute window)
- ✅ `deleteMessage()` - Delete messages for everyone
- ✅ `deleteMessageForMe()` - Delete messages locally only

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

**Last Updated:** 2026-06-26
**Status:** Stable (v1.4.1, Baileys 7.0.0-rc13)
**Next Release:** Chat management + rich messages — see [Not-Yet-Implemented Baileys Features (Prioritized)](#not-yet-implemented-baileys-features-prioritized)
**Path So Far:** v0.1.0 → … → v0.9.0 ✅ → v1.0.0 ✅ (Stable) → v1.1.0 ✅ (Baileys v7/ESM) → v1.2.0 ✅ → v1.3.0 ✅ (Proxy) → v1.4.x ✅ (CLI + rc13)
