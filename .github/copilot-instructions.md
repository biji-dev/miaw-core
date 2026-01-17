# Miaw Core - AI Coding Instructions

## Project Overview

Miaw Core is a TypeScript wrapper for [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) that simplifies WhatsApp bot development. It abstracts Baileys complexity into a clean event-driven API.

**Critical:** ESM-only package (Node.js >= 18.0.0). All relative imports **must** include `.js` extensions.

## Architecture

```
src/
├── index.ts              # Public exports - add new types/classes here
├── client/MiawClient.ts  # Main client (~4100 lines) - all WhatsApp operations
├── handlers/
│   ├── AuthHandler.ts    # Session persistence via useMultiFileAuthState
│   └── MessageHandler.ts # Message normalization & JID formatting
└── types/index.ts        # All TypeScript interfaces (~900 lines)
```

**Key Design:**

- `MiawClient` extends `EventEmitter` - emits: `qr`, `ready`, `message`, `message_edit`, `message_delete`, `message_reaction`, `presence`
- `MiawMessage` is the normalized format - always use instead of raw Baileys structures
- JID formats: `@s.whatsapp.net` (phone), `@lid` (privacy-enhanced), `@g.us` (groups)

## Code Patterns

### Adding Send Methods

Follow the established pattern (see `sendText()` at line ~723 in MiawClient.ts):

```typescript
async sendNewType(to: string, data: any, options?: Options): Promise<SendMessageResult> {
  try {
    // 1. Connection guards (required)
    if (!this.socket) throw new Error("Not connected. Call connect() first.");
    if (this.connectionState !== "connected")
      throw new Error(`Cannot send. State: ${this.connectionState}`);

    // 2. Format recipient
    const jid = MessageHandler.formatPhoneToJid(to);

    // 3. Handle quoting/replies
    const sendOptions = options?.quoted?.raw ? { quoted: options.quoted.raw } : undefined;

    // 4. Build Baileys payload and send
    const result = await this.socket.sendMessage(jid, { /* AnyMessageContent */ }, sendOptions);

    // 5. Return standardized result
    return { success: true, messageId: result?.key?.id || undefined };
  } catch (error) {
    this.logger.error("Failed to send:", error);
    return { success: false, error: (error as Error).message };
  }
}
```

### Adding Types

1. Define interface in `src/types/index.ts`
2. Export with `export type` from `src/index.ts` (required for ESM compatibility)
3. Import in `MiawClient.ts` using grouped imports by version

### Adding Message Type Handlers

In `MessageHandler.normalize()`, add extraction in the `if/else` chain:

```typescript
} else if (actualMessage?.newMessageType) {
  type = 'newtype';
  media = this.extractNewTypeMetadata(actualMessage.newMessageType);
}
```

Then add private static extractor method following existing patterns (e.g., `extractImageMetadata`).

## Development Commands

```bash
npm run build        # TypeScript → dist/
npm run dev          # Watch mode
npm test             # Jest (requires NODE_OPTIONS='--experimental-vm-modules')
npm run test:manual  # Interactive CLI with live WhatsApp - 92 tests
```

## Testing

- **Unit** (`tests/unit/`): MessageHandler transformations, JID formatting
- **Integration** (`tests/integration/`): Requires live session - configure `.env.test`
- **Manual** (`npm run test:manual`): Interactive verification of all 92 methods

First-time setup: Run tests, scan QR code, session saves to `test-sessions/`.

## ESM Import Rules

```typescript
// ✅ Correct - .js extension required
import { MessageHandler } from "./handlers/MessageHandler.js";
import { MiawMessage } from "../types/index.js";

// ✅ Correct - node: prefix for built-ins
import { join } from "node:path";
import { EventEmitter } from "node:events";

// ❌ Wrong - will fail at runtime
import { MessageHandler } from "./handlers/MessageHandler";
```

## WhatsApp-Specific Conventions

- **JID handling**: Always use `MessageHandler.formatPhoneToJid()` - handles numbers, JIDs, @lid formats
- **Media sources**: Accept `string` (file path/URL) or `Buffer` - typed as `MediaSource`
- **Quoting**: Pass `quoted: MiawMessage` in options, extract raw via `options.quoted.raw`
- **LID cache**: Privacy-enhanced contacts use LRU cache (1000 entries) in MiawClient

## File Conventions

- Sessions: `{sessionPath}/{instanceId}/` (e.g., `sessions/my-bot/creds.json`)
- Examples: Numbered `01-basic` through `09-business-social`
- Test assets: `tests/test-assets/`
