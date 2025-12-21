# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
