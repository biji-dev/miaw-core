# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-02

**Baileys v7 Migration** - ESM-only release with improved session stability

### BREAKING CHANGES

- **ESM-only** - Package now uses `"type": "module"`. CommonJS `require()` is no longer supported.
- **Node.js >= 18.0.0** required

### Fixed

- **Session reconnection issue** - Fixed bug where app couldn't reconnect after QR scan and restart without re-pairing
- Includes fixes from Baileys v7: #1735, #1822, #1663, #1697

### Changed

- **Baileys** upgraded from v6.7.21 to v7.0.0-rc.9
- TypeScript target updated to ES2022
- All imports now use `.js` extensions for ESM compatibility
- Node.js built-in imports use `node:` prefix

### Migration

For users upgrading from v1.0.x:

```typescript
// No code changes needed if already using ESM imports
import { MiawClient } from "miaw-core";

// If using CommonJS, migrate to ESM:
// Before (CommonJS - no longer supported):
// const { MiawClient } = require('miaw-core');

// After (ESM):
import { MiawClient } from "miaw-core";
```

Ensure your `package.json` has `"type": "module"` or use `.mjs` file extension.

---

## [1.0.0] - 2025-12-24

**First Stable Release!** 🎉

This is the first stable release of Miaw Core. After 9 pre-releases, the API is now stable and ready for production use.

### Stability Guarantee

- **No breaking changes** in v1.x.x releases
- New features will be additive only
- Deprecations will be marked at least 1 minor version before removal
- Migration guides provided for any breaking changes in v2.x

### What's New Since v0.9.1

#### LID Cache Management

- `getLidCacheSize()` - Get current LID to JID cache size
- `clearLidCache()` - Clear the LID cache
- `getLidMappings()` - Returns `Record<string, string>` instead of `Map`

#### Resource Cleanup

- `dispose()` - Properly clean up resources before shutdown
- Recommended to call on process exit for clean session save

#### Performance Improvements

- LID mappings now use LRU cache with max size of 1000 entries
- Automatic eviction of least recently used mappings
- Improved memory management for long-running bots

### API Surface

81 public methods across 10 categories:

- Core Client (7 methods)
- Messaging (6 methods)
- Media (5 methods)
- Contact Info (5 methods)
- Group Management (11 methods)
- Profile Management (4 methods)
- Label Operations (5 methods, Business only)
- Catalog Operations (5 methods, Business only)
- Newsletter Operations (17 methods)
- Contact Management (2 methods)
- LID Mapping (6 methods)
- UX Features (6 methods)

### Documentation

- API Stability Review (`docs/API_STABILITY_REVIEW.md`)
- Comprehensive examples (11 basic + 2 real-world examples)
- Migration guide with version compatibility matrix
- Complete type definitions with TypeScript strict mode

### Testing

- 68 unit tests (100% passing)
- 144 integration tests (require WhatsApp authentication)
- Full test coverage for all API methods

### Known Changes from v0.9.x

- `getLidMappings()` now returns `Record<string, string>` instead of `Map`
  - Use `Object.entries()` or Object methods instead of Map methods

## [0.9.1] - 2025-12-24

### Added

#### Examples

- `01-basic-bot.ts` - Core client, QR authentication, echo bot (v0.1.0)
- `02-media-bot.ts` - Media sending and downloading (v0.2.0)
- `03-message-context.ts` - Reply, edit, delete, reactions (v0.3.0)
- `04-validation-social.ts` - Number validation, contact/group info (v0.4.0)
- `05-ux-polish.ts` - Read receipts, typing, presence (v0.5.0)
- `06-advanced-messaging.ts` - Reactions, forward, edit, delete (v0.6.0)
- `07-group-management.ts` - Full group admin features (v0.7.0)
- `08-profile-management.ts` - Profile picture, name, status (v0.8.0)
- `09-business-social.ts` - Labels, catalog, newsletter, contacts (v0.9.0)
- `examples/README.md` - Examples overview and usage guide

### Changed

- Updated README.md with v0.9.0 capabilities and changelog link

## [0.9.0] - 2025-12-24

### Added

#### Label Operations (WhatsApp Business only)

- `addLabel()` - Create or edit labels
- `addChatLabel()` - Add a label to a chat
- `removeChatLabel()` - Remove a label from a chat
- `addMessageLabel()` - Add a label to a message
- `removeMessageLabel()` - Remove a label from a message
- `LabelColor` enum - 20 predefined colors
- `PredefinedLabelId` enum - 5 WhatsApp predefined labels
- `Label`, `LabelOperationResult` types

#### Catalog/Product Operations (WhatsApp Business only)

- `getCatalog()` - Fetch product catalog with pagination support
- `getCollections()` - Fetch catalog collections
- `createProduct()` - Add new products to catalog
- `updateProduct()` - Modify existing products
- `deleteProducts()` - Remove products from catalog
- `Product`, `ProductCollection`, `ProductCatalog`, `ProductOperationResult`, `ProductOptions` types

#### Newsletter/Channel Operations

- `createNewsletter()` - Create WhatsApp channels/newsletters
- `getNewsletterMetadata()` - Get newsletter information
- `followNewsletter()` - Follow/subscribe to newsletters
- `unfollowNewsletter()` - Unsubscribe from newsletters
- `muteNewsletter()` - Mute newsletter notifications
- `unmuteNewsletter()` - Unmute newsletter notifications
- `updateNewsletterName()` - Update newsletter name
- `updateNewsletterDescription()` - Update newsletter description
- `updateNewsletterPicture()` - Update newsletter cover image
- `removeNewsletterPicture()` - Remove newsletter cover image
- `reactToNewsletterMessage()` - React to newsletter posts
- `fetchNewsletterMessages()` - Get newsletter message history
- `subscribeNewsletterUpdates()` - Subscribe to live newsletter updates
- `getNewsletterSubscribers()` - Get subscriber count
- `getNewsletterAdminCount()` - Get admin count
- `changeNewsletterOwner()` - Transfer newsletter ownership
- `demoteNewsletterAdmin()` - Demote a newsletter admin
- `deleteNewsletter()` - Delete a newsletter
- `NewsletterMetadata`, `NewsletterMessage`, `NewsletterMessagesResult`, `NewsletterOperationResult`, `NewsletterSubscriptionInfo` types

#### Contact Management

- `addOrEditContact()` - Add or update contacts
- `removeContact()` - Remove contacts
- `ContactData`, `ContactOperationResult` types

#### Tests

- Integration tests for all v0.9.0 features (`12-business-features.test.ts`, `13-newsletter-features.test.ts`)

## [0.8.0] - 2025-12-21

### Added

- **Profile Picture Management**

  - `updateProfilePicture()` - Update your own profile picture (file path, URL, or Buffer)
  - `removeProfilePicture()` - Remove your profile picture

- **Profile Information**

  - `updateProfileName()` - Update your display name (push name)
  - `updateProfileStatus()` - Update your "About" text

- **New Types**

  - `ProfileOperationResult` - Result type for profile operations (success/error)

- **Integration Tests**
  - Profile management tests for all v0.8.0 features

## [0.7.0] - 2025-12-21

### Added

- **Group Creation**

  - `createGroup()` - Create new WhatsApp groups with initial participants
  - Returns `CreateGroupResult` with group JID and metadata

- **Participant Management**

  - `addParticipants()` - Add members to a group (requires admin)
  - `removeParticipants()` - Remove members from a group (requires admin)
  - `leaveGroup()` - Leave a group
  - Returns `ParticipantOperationResult[]` with status for each participant

- **Admin Management**

  - `promoteToAdmin()` - Promote members to group admin
  - `demoteFromAdmin()` - Demote admins to regular members

- **Group Settings**

  - `updateGroupName()` - Change group name/subject
  - `updateGroupDescription()` - Set or clear group description
  - `updateGroupPicture()` - Change group profile picture

- **Group Invites**

  - `getGroupInviteLink()` - Get group invite link (https://chat.whatsapp.com/...)
  - `revokeGroupInvite()` - Revoke current link and get new one
  - `acceptGroupInvite()` - Join group via invite code or URL
  - `getGroupInviteInfo()` - Preview group info before joining

- **New Types**

  - `ParticipantOperationResult` - Result of add/remove/promote/demote operations
  - `CreateGroupResult` - Result of group creation with metadata
  - `GroupOperationResult` - Generic success/error result for group operations
  - `GroupInviteInfo` - Group preview info from invite code

- **Integration Tests**
  - Group management tests for all v0.7.0 features

## [0.6.0] - 2025-12-14

### Added

- **Send Reactions**

  - `sendReaction()` - Send emoji reactions to messages (e.g., '❤️', '👍')
  - `removeReaction()` - Remove your reaction from a message

- **Forward Messages**

  - `forwardMessage()` - Forward any message to another chat

- **Edit Messages**

  - `editMessage()` - Edit your own messages (within WhatsApp's 15-minute window)

- **Delete Messages**
  - `deleteMessage()` - Delete messages for everyone (your own messages)
  - `deleteMessageForMe()` - Delete messages locally (only for yourself)

## [0.5.0] - 2025-12-14

### Added

- **Read Receipts**

  - `markAsRead()` - Mark messages as read (send read receipt)
  - Returns boolean indicating success

- **Typing & Recording Indicators**

  - `sendTyping()` - Send "typing..." indicator to a chat
  - `sendRecording()` - Send "recording audio..." indicator
  - `stopTyping()` - Stop typing/recording indicator (send paused state)
  - Works with both individual contacts and groups

- **Presence Management**

  - `setPresence()` - Set bot's online/offline status ('available' or 'unavailable')
  - `subscribePresence()` - Subscribe to contact's presence updates
  - `presence` event - Emitted when subscribed contact's presence changes

- **New Types**

  - `PresenceStatus` - Union type for 'available' | 'unavailable'
  - `PresenceUpdate` - Presence notification data (jid, status, lastSeen)

- **Integration Tests**
  - UX polish tests for all v0.5.0 features

## [0.4.0] - 2025-12-14

### Added

- **Contact Validation**

  - `checkNumber()` - Verify if phone number is on WhatsApp
  - `checkNumbers()` - Batch check multiple phone numbers
  - Returns `CheckNumberResult` with exists flag and JID

- **Contact Information**

  - `getContactInfo()` - Fetch contact info including status
  - `getBusinessProfile()` - Get business account profile details
  - `getProfilePicture()` - Get profile picture URL (supports low/high res)

- **Group Information**

  - `getGroupInfo()` - Fetch group metadata (name, description, settings)
  - `getGroupParticipants()` - List all group members with roles

- **New Types**

  - `CheckNumberResult` - Result of number validation
  - `ContactInfo` - Contact information structure
  - `BusinessProfile` - Business profile data
  - `GroupInfo` - Group metadata
  - `GroupParticipant` - Group member with role

- **Integration Tests**
  - Contact validation tests
  - Group info tests

## [0.3.0] - 2025-12-14

### Added

- **Reply to Messages (Quoted)**

  - All send methods now support `quoted` option
  - Pass `MiawMessage` to reply to specific messages
  - Works with `sendText()`, `sendImage()`, `sendDocument()`, `sendVideo()`, `sendAudio()`

- **Edit Notifications**

  - `message_edit` event when messages are edited
  - `MessageEdit` type with messageId, chatId, newText, editTimestamp

- **Delete Notifications**

  - `message_delete` event when messages are deleted/revoked
  - `MessageDelete` type with messageId, chatId, fromMe, participant

- **Reactions**

  - `message_reaction` event when messages receive reactions
  - `MessageReaction` type with messageId, chatId, reactorId, emoji, isRemoval

- **New Types**

  - `MessageEdit` - Edit notification data
  - `MessageDelete` - Delete notification data
  - `MessageReaction` - Reaction notification data

- **Integration Tests**
  - Message context tests for all v0.3.0 features

### Changed

- `SendTextOptions.quoted` now accepts `MiawMessage` instead of string
- `SendImageOptions.quoted`, `SendDocumentOptions.quoted`, `SendVideoOptions.quoted`, `SendAudioOptions.quoted` now accept `MiawMessage`

## [0.2.0] - 2025-12-14

### Added

- **Media Sending Methods**

  - `sendImage()` - Send images with caption and view-once support
  - `sendDocument()` - Send documents with auto-mimetype detection
  - `sendVideo()` - Send videos with caption, GIF playback, and PTV (video notes)
  - `sendAudio()` - Send audio with PTT (voice notes) support

- **Media Download**

  - `downloadMedia()` - Download media from received messages as Buffer

- **Media Metadata**

  - `MediaInfo` type with full metadata extraction
  - Support for mimetype, fileSize, dimensions, duration
  - PTT detection for voice notes
  - GIF playback detection for videos
  - View-once message detection

- **New Types**

  - `MediaSource` - Flexible input type (path/URL/Buffer)
  - `SendImageOptions`, `SendDocumentOptions`, `SendVideoOptions`, `SendAudioOptions`
  - `MediaInfo` - Media metadata interface

- **Integration Tests**
  - Media sending tests for all media types
  - Media download tests

### Changed

- Enhanced `MessageHandler.normalize()` with media metadata extraction
- `MiawMessage` now includes optional `media` field for metadata

### Removed

- Removed unused `SessionStorage` utility (`src/utils/storage.ts`)

## [0.1.0] - 2025-11-19

### Added

- **Core Client**

  - `MiawClient` class with event-driven architecture
  - Connection management with auto-reconnection
  - Session persistence using Baileys multi-file auth state
  - Multiple instance support with isolated sessions

- **Messaging**

  - `sendText()` - Send text messages to individuals and groups
  - Message normalization with `MiawMessage` format
  - Support for @s.whatsapp.net, @lid, @g.us JID formats

- **LID Support**

  - Handle WhatsApp's @lid privacy format
  - LID to phone number mapping
  - `resolveLidToJid()`, `getPhoneFromJid()`, `registerLidMapping()`

- **Events**

  - `qr` - QR code for authentication
  - `ready` - Client connected and ready
  - `message` - Incoming message received
  - `disconnected` - Client disconnected
  - `reconnecting` - Reconnection attempt
  - `error` - Error occurred
  - `session_saved` - Session persisted

- **Developer Experience**
  - Full TypeScript support with strict mode
  - Comprehensive type definitions
  - Debug logging option

### Dependencies

- @whiskeysockets/baileys ^6.7.21
- @hapi/boom ^10.0.1
- pino ^8.19.0

[0.6.0]: https://github.com/biji-dev/miaw-core/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/biji-dev/miaw-core/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/biji-dev/miaw-core/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/biji-dev/miaw-core/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/biji-dev/miaw-core/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/biji-dev/miaw-core/releases/tag/v0.1.0
