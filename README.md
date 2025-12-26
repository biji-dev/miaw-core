# Miaw Core

**Multiple Instance of App WhatsApp** - A simplified WhatsApp API wrapper for Baileys

Miaw Core abstracts away the complexity of Baileys, providing a clean, simple API for building WhatsApp bots and automation tools. It handles all the painful parts: session management, QR codes, reconnection logic, and message parsing.

## Documentation

- **[Usage Guide](./docs/USAGE.md)** - Complete guide for all current features
- **[Testing Guide](./docs/TESTING.md)** - Testing strategy and integration tests
- **[Migration Guide](./docs/MIGRATION.md)** - Upgrading between versions
- **[Roadmap](./docs/ROADMAP.md)** - Feature roadmap and development plan
- **[Changelog](./CHANGELOG.md)** - Version history and changes
- **[Examples](./examples/)** - Code examples and sample bots

## Features

- **Simple API** - Clean, intuitive interface for sending and receiving messages
- **Auto-Reconnection** - Handles connection drops and reconnects automatically
- **Session Management** - File-based session storage with automatic persistence
- **Multiple Instances** - Run multiple WhatsApp connections in a single process
- **TypeScript Support** - Full type definitions for excellent IDE experience
- **Event-Driven** - Easy-to-use event system for messages and connection states
- **Normalized Messages** - Simplified message format, no more complex Baileys structures
- **Business Features** - Label operations, product catalog, newsletter/channels (WhatsApp Business)
- **Contact Management** - Add, edit, and remove contacts
- **Group Management** - Full admin capabilities for groups
- **Profile Management** - Customize bot profile picture, name, and status

## Installation

```bash
npm install miaw-core
```

## Quick Start

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

For more examples and detailed usage, see the [Usage Guide](./docs/USAGE.md).

## Testing

### Manual Interactive Testing

Run the interactive test script to manually verify all features:

```bash
npm run test:manual
```

This will launch an interactive guide that walks you through testing all 80+ features:

- **Core Client** - Connection, lifecycle, state management
- **Basic GET Operations** - Fetch contacts, groups, profile, labels, chats, messages
- **Messaging** - Send text, images, documents, videos, audio; download media
- **Message Operations** - React, forward, edit, delete messages
- **Contact Information** - Check numbers, get contact info, business profiles
- **Group Management** - Create groups, manage participants, admin actions
- **Profile Management** - Update profile picture, name, status
- **Business Features** - Labels, catalog operations (WhatsApp Business)
- **Newsletter/Channels** - Create, manage newsletters and channels
- **UX Features** - Typing indicators, read receipts, presence

The script will:
1. Guide you step-by-step through each test
2. Prompt for required inputs (phone numbers, group JIDs, etc.)
3. Track results (pass/fail/skip)
4. Generate a summary report with versions and timestamps

See [MANUAL_TEST_CHECKLIST.md](./tests/MANUAL_TEST_CHECKLIST.md) for the complete checklist.

### Unit & Integration Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Current Capabilities (v1.0.0)

### Core Features
- ✅ Send and receive text messages
- ✅ Send/receive media (images, videos, audio, documents)
- ✅ QR code authentication
- ✅ Session persistence
- ✅ Auto-reconnection
- ✅ Multiple instances
- ✅ Event-driven architecture
- ✅ TypeScript support
- ✅ Error handling

### Advanced Messaging
- ✅ Reply/quote messages
- ✅ Edit own messages
- ✅ Delete messages
- ✅ Message reactions
- ✅ Forward messages

### Group Management
- ✅ Create groups
- ✅ Add/remove participants
- ✅ Promote/demote admins
- ✅ Group invite links
- ✅ Update group settings

### Profile Management
- ✅ Update profile picture
- ✅ Remove profile picture
- ✅ Update profile name
- ✅ Update profile status

### Business & Social (v1.0.0)
- ✅ Label operations (WhatsApp Business)
- ✅ Product catalog management (WhatsApp Business)
- ✅ Newsletter/channel operations
- ✅ Contact management

See [ROADMAP.md](./docs/ROADMAP.md) for planned features.

## What Miaw Core Abstracts

Miaw Core handles these Baileys complexities for you:

- ✅ QR code generation and handling
- ✅ Auth state management (save/load)
- ✅ Socket connection setup
- ✅ Reconnection logic
- ✅ Message event parsing
- ✅ Connection state tracking
- ✅ Credentials persistence
- ✅ Multi-file auth state
- ✅ Baileys version management
- ✅ Signal key store setup

## Project Structure

```text
miaw-core/
├── src/
│   ├── client/          # Main MiawClient class
│   ├── handlers/        # Auth and message handlers
│   ├── types/           # TypeScript definitions
│   ├── utils/           # Storage utilities
│   └── index.ts         # Public API exports
├── docs/                # Documentation
├── examples/            # Usage examples
├── tests/               # Unit and integration tests
└── README.md           # This file
```

## Contributing

Contributions are welcome! To contribute:

1. Check [ROADMAP.md](./docs/ROADMAP.md) for planned features
2. Open an issue to discuss your idea
3. Fork the repository
4. Create a feature branch
5. Submit a pull request

Please include:

- Tests for new features
- Updated documentation
- Examples if applicable

## License

MIT

## Credits

Built on top of [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)

---

**Version:** 1.0.0 | **Status:** Stable | **Updated:** 2025-12-24
