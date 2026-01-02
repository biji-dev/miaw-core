# Miaw Core

**Multiple Instance of Awesome WhatsApp** - A simplified WhatsApp API wrapper for Baileys

Miaw Core abstracts away the complexity of Baileys, providing a clean, simple API for building WhatsApp bots and automation tools. It handles all the painful parts: session management, QR codes, reconnection logic, and message parsing.

> **Now powered by Baileys v7.0.0** - Full support for the latest WhatsApp Web features including newsletters/channels

## Why Miaw Core vs Baileys Directly?

| Aspect | Baileys (Direct) | Miaw Core |
|--------|------------------|-----------|
| **Learning Curve** | Steep - 150+ methods to learn | Gentle - 92 focused methods |
| **Setup Code** | 50-100 lines boilerplate | 10 lines to start |
| **Session Management** | Manual auth state handling | Automatic file-based persistence |
| **Reconnection** | DIY implementation | Built-in with configurable retries |
| **Message Format** | Complex nested structures | Normalized `MiawMessage` objects |
| **TypeScript** | Types available but complex | Clean, simplified types |
| **Multi-Instance** | Manual socket management | Instance ID-based separation |

**Choose Baileys directly** if you need low-level control, custom implementations, or access to every WhatsApp feature.

**Choose Miaw Core** if you want to build bots quickly with clean code, automatic session handling, and don't need every obscure feature.

For a detailed comparison, see [Baileys vs Miaw Core Comparison](./docs/BAILEYS_VS_MIAW_COMPARISON.md).

## Documentation

- **[Usage Guide](./docs/USAGE.md)** - Complete guide for all current features
- **[Baileys Comparison](./docs/BAILEYS_VS_MIAW_COMPARISON.md)** - Feature comparison with raw Baileys
- **[Migration Guide](./docs/MIGRATION.md)** - Upgrading between versions
- **[Test Coverage](./docs/TEST_COVERAGE_ANALYSIS.md)** - API coverage analysis
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

## Requirements

- **Node.js** >= 18.0.0
- **ESM** - This package is ESM-only (uses `"type": "module"`)

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

Test all 92 API methods interactively:

```bash
# Show available test groups
npm run test:manual

# Run specific test groups
npm run test:manual all         # All tests
npm run test:manual messaging   # Messaging tests only
npm run test:manual newsletter  # Newsletter tests only
npm run test:manual business    # Business features only
```

**Available test groups:**

| Group | Description | Methods |
|-------|-------------|---------|
| `core` | Connection, lifecycle | 6 |
| `get` | Fetch contacts, groups, chats | 6 |
| `messaging` | Send/receive, reactions, edit | 12 |
| `contacts` | Check numbers, contact info | 7 |
| `group` | Create, manage participants | 13 |
| `profile` | Update picture, name, status | 4 |
| `business` | Labels, catalog (Business only) | 10 |
| `newsletter` | Channels, subscriptions | 6 |
| `ux` | Typing, presence, read receipts | 5 |

**Features:**
- Auto-connects using existing session (skips QR if already authenticated)
- Tracks test results with pass/fail/skip status
- Generates summary report with timestamps
- Pre-loads test configuration from `.env.test`

See [Test Coverage Analysis](./docs/TEST_COVERAGE_ANALYSIS.md) for detailed coverage report.

### Unit & Integration Tests

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Current Capabilities (v1.1.0)

Built on **Baileys v7.0.0-rc.9** - the latest WhatsApp Web protocol implementation.

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

### Business & Social

- ✅ Label operations (WhatsApp Business)
- ✅ Product catalog management (WhatsApp Business)
- ✅ Newsletter/channel operations (create, send, manage)
- ✅ Contact management (add, edit, remove)

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

Built on top of [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) v7.0.0-rc.9

---

**Version:** 1.1.0 | **Baileys:** 7.0.0-rc.9 | **Status:** Stable | **Updated:** 2026-01-03
