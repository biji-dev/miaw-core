# Miaw Core - AI Coding Instructions

## Project Overview

Miaw Core is a TypeScript wrapper for [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) that simplifies WhatsApp bot development. It abstracts Baileys complexity (session management, QR codes, reconnection, message parsing) into a clean event-driven API.

**Important:** This is an ESM-only package (Node.js >= 18.0.0). All imports must use `.js` extensions for relative paths.

## Architecture

```
src/
├── index.ts              # Public exports - add new types/classes here
├── client/MiawClient.ts  # Main client class (~3500 lines) - all WhatsApp operations
├── handlers/
│   ├── AuthHandler.ts    # Session persistence via Baileys' useMultiFileAuthState
│   └── MessageHandler.ts # Message normalization & JID formatting utilities
└── types/index.ts        # All TypeScript interfaces (~900 lines)
```

**Key Design Decisions:**
- `MiawClient` extends `EventEmitter` - all state changes emit events (`qr`, `ready`, `message`, `message_edit`, `message_delete`, `message_reaction`, `presence`)
- `MiawMessage` is the normalized message format - always return this instead of raw Baileys structures
- JID formats: `@s.whatsapp.net` (phone), `@lid` (privacy-enhanced), `@g.us` (groups) - use `MessageHandler.formatPhoneToJid()` for conversion
- LID-to-JID mapping uses an LRU cache (1000 entries) in `MiawClient` for privacy-enhanced contacts

## Code Patterns

### Adding New Send Methods
Follow the pattern in `MiawClient.sendText()`:
1. Check `this.socket` and `this.connectionState === 'connected'`
2. Format recipient with `MessageHandler.formatPhoneToJid(to)`
3. Build content payload matching Baileys' `AnyMessageContent`
4. Return `SendMessageResult` with `{ success, messageId?, error? }`

### Adding New Types
1. Define interface in `src/types/index.ts`
2. Export from `src/index.ts`
3. Import in `MiawClient.ts` if needed

### Message Normalization
When handling new message types, add extraction logic in `MessageHandler.normalize()`:
```typescript
} else if (actualMessage?.newMessageType) {
  type = 'newtype';
  media = this.extractNewTypeMetadata(actualMessage.newMessageType);
}
```

## Development Commands

```bash
npm run build        # TypeScript compilation to dist/
npm run dev          # Watch mode compilation
npm test             # Jest unit tests
npm run test:watch   # Jest watch mode
npm run test:manual  # Interactive testing with live WhatsApp connection
```

## Testing Approach

- **Unit tests** (`tests/unit/`): Test `MessageHandler` transformations, JID formatting, message parsing
- **Integration tests** (`tests/integration/`): Require live WhatsApp session - configure via `.env.test`:
  ```
  TEST_CONTACT_PHONE_A=628123456789
  TEST_GROUP_JID=123456789@g.us
  ```
- **Manual testing** (`npm run test:manual`): Interactive CLI for 80+ feature verification

## WhatsApp-Specific Conventions

- **JID handling**: Always use `MessageHandler.formatPhoneToJid()` - accepts raw numbers, existing JIDs, or @lid formats
- **Media sources**: Accept `string` (file path/URL) or `Buffer` - see `MediaSource` type
- **Quoting/replying**: Pass `quoted: MiawMessage` in options - extract raw via `options.quoted.raw`
- **Connection guards**: All send methods must check socket existence and connection state before operations

## File Conventions

- Sessions stored in `{sessionPath}/{instanceId}/` directory
- Test assets in `tests/test-assets/`
- Examples in `examples/` - numbered by complexity (01-basic to 09-business-social)

## Dependencies

- `@whiskeysockets/baileys` v7.0.0-rc.9 - Core WhatsApp Web API (ESM-only)
- `pino` - Logging (silent by default, verbose with `debug: true`)
- `@hapi/boom` - Error handling for Baileys disconnection reasons

## ESM Import Rules

All relative imports must include `.js` extensions:
```typescript
// ✅ Correct
import { MessageHandler } from './handlers/MessageHandler.js';
import { MiawMessage } from '../types/index.js';

// ❌ Wrong (will fail at runtime)
import { MessageHandler } from './handlers/MessageHandler';
```

Node.js built-ins should use `node:` prefix:
```typescript
import { join } from 'node:path';
import { existsSync } from 'node:fs';
```
