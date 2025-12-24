# Miaw Core

**Multiple Instance of App WhatsApp** - A simplified WhatsApp API wrapper for Baileys

Miaw Core abstracts away the complexity of Baileys, providing a clean, simple API for building WhatsApp bots and automation tools. It handles all the painful parts: session management, QR codes, reconnection logic, and message parsing.

## Documentation

- **[Usage Guide](./USAGE.md)** - Complete guide for all current features
- **[Migration Guide](./MIGRATION.md)** - Upgrading between versions
- **[Roadmap](./ROADMAP.md)** - Feature roadmap and development plan
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

For more examples and detailed usage, see the [Usage Guide](./USAGE.md).

## Current Capabilities (v0.9.0)

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

### Business & Social (v0.9.0)
- ✅ Label operations (WhatsApp Business)
- ✅ Product catalog management (WhatsApp Business)
- ✅ Newsletter/channel operations
- ✅ Contact management

See [ROADMAP.md](./ROADMAP.md) for planned features.

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
├── examples/            # Usage examples
├── USAGE.md            # Complete usage guide
├── ROADMAP.md          # Feature roadmap
└── README.md           # This file
```

## Contributing

Contributions are welcome! To contribute:

1. Check [ROADMAP.md](./ROADMAP.md) for planned features
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

**Version:** 0.1.0 | **Status:** Active Development | **Updated:** 2025-11-19
