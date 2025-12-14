# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.2.0]: https://github.com/biji-dev/miaw-core/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/biji-dev/miaw-core/releases/tag/v0.1.0
