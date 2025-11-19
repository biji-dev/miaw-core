# Miaw Core

**Multiple Instance of App WhatsApp** - A simplified WhatsApp API wrapper for Baileys

Miaw Core abstracts away the complexity of Baileys, providing a clean, simple API for building WhatsApp bots and automation tools. It handles all the painful parts: session management, QR codes, reconnection logic, and message parsing.

## Features

- **Simple API** - Clean, intuitive interface for sending and receiving messages
- **Auto-Reconnection** - Handles connection drops and reconnects automatically
- **Session Management** - File-based session storage with automatic persistence
- **Multiple Instances** - Run multiple WhatsApp connections in a single process
- **TypeScript Support** - Full type definitions for excellent IDE experience
- **Event-Driven** - Easy-to-use event system for messages and connection states
- **Normalized Messages** - Simplified message format, no more complex Baileys structures

## Installation

```bash
npm install miaw-core
```

## Quick Start

```typescript
import { MiawClient } from 'miaw-core';

// Create client
const client = new MiawClient({
  instanceId: 'my-bot',
  sessionPath: './sessions'
});

// Handle QR code
client.on('qr', (qr) => {
  console.log('Scan this QR code:', qr);
});

// When ready
client.on('ready', () => {
  console.log('Bot is ready!');
});

// Receive messages
client.on('message', async (message) => {
  console.log('Received:', message.text);

  // Reply
  await client.sendText(message.from, 'Hello!');
});

// Start
await client.connect();
```

## API Reference

### MiawClient

#### Constructor

```typescript
new MiawClient(options: MiawClientOptions)
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `instanceId` | `string` | *required* | Unique identifier for this instance |
| `sessionPath` | `string` | `'./sessions'` | Directory to store session data |
| `debug` | `boolean` | `false` | Enable verbose logging |
| `autoReconnect` | `boolean` | `true` | Auto-reconnect on disconnect |
| `maxReconnectAttempts` | `number` | `Infinity` | Max reconnection attempts |
| `reconnectDelay` | `number` | `3000` | Delay between reconnects (ms) |

#### Methods

##### `connect()`

Connect to WhatsApp. Returns a Promise.

```typescript
await client.connect();
```

##### `sendText(to, text, options?)`

Send a text message.

```typescript
const result = await client.sendText('1234567890@s.whatsapp.net', 'Hello!');

if (result.success) {
  console.log('Message sent:', result.messageId);
} else {
  console.error('Failed:', result.error);
}
```

**Parameters:**
- `to` (string): Recipient WhatsApp ID or phone number
- `text` (string): Message text
- `options` (optional): Additional options

**Returns:** `SendMessageResult`

##### `disconnect()`

Disconnect from WhatsApp.

```typescript
await client.disconnect();
```

##### `isConnected()`

Check if currently connected.

```typescript
if (client.isConnected()) {
  // Send messages
}
```

##### `getConnectionState()`

Get current connection state.

```typescript
const state = client.getConnectionState();
// Returns: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'qr_required'
```

##### `getInstanceId()`

Get the instance ID.

```typescript
const id = client.getInstanceId();
```

#### Events

##### `qr`

Emitted when QR code needs to be scanned.

```typescript
client.on('qr', (qrCode: string) => {
  console.log('Scan this:', qrCode);
});
```

##### `ready`

Emitted when client is connected and ready.

```typescript
client.on('ready', () => {
  console.log('Ready to send/receive messages');
});
```

##### `message`

Emitted when a new message is received.

```typescript
client.on('message', (message: MiawMessage) => {
  console.log('From:', message.from);
  console.log('Text:', message.text);
  console.log('Timestamp:', message.timestamp);
  console.log('Is Group:', message.isGroup);
});
```

**MiawMessage structure:**

```typescript
interface MiawMessage {
  id: string;                    // Message ID
  from: string;                  // Sender WhatsApp ID
  text?: string;                 // Message text
  timestamp: number;             // Unix timestamp (seconds)
  isGroup: boolean;              // Is from group chat
  participant?: string;          // Group participant (if group)
  fromMe: boolean;               // Sent by you
  type: 'text' | 'image' | ...;  // Message type
  raw?: any;                     // Original Baileys message
}
```

##### `connection`

Emitted when connection state changes.

```typescript
client.on('connection', (state: ConnectionState) => {
  console.log('State:', state);
});
```

##### `disconnected`

Emitted when disconnected.

```typescript
client.on('disconnected', (reason?: string) => {
  console.log('Disconnected:', reason);
});
```

##### `reconnecting`

Emitted when attempting to reconnect.

```typescript
client.on('reconnecting', (attempt: number) => {
  console.log('Reconnect attempt:', attempt);
});
```

##### `error`

Emitted on errors.

```typescript
client.on('error', (error: Error) => {
  console.error('Error:', error.message);
});
```

##### `session_saved`

Emitted when session is saved.

```typescript
client.on('session_saved', () => {
  console.log('Session saved');
});
```

## Examples

### Echo Bot

```typescript
import { MiawClient } from 'miaw-core';

const client = new MiawClient({ instanceId: 'echo-bot' });

client.on('qr', (qr) => console.log('QR:', qr));
client.on('ready', () => console.log('Ready!'));

client.on('message', async (msg) => {
  if (!msg.fromMe && msg.text) {
    await client.sendText(msg.from, `Echo: ${msg.text}`);
  }
});

await client.connect();
```

### Multiple Instances

```typescript
import { MiawClient } from 'miaw-core';

// Create multiple instances
const bot1 = new MiawClient({ instanceId: 'bot-1' });
const bot2 = new MiawClient({ instanceId: 'bot-2' });

// Each has separate sessions and can run independently
await Promise.all([
  bot1.connect(),
  bot2.connect()
]);
```

### Command Handler

```typescript
client.on('message', async (msg) => {
  if (msg.fromMe || !msg.text) return;

  const text = msg.text.toLowerCase();

  if (text === '/help') {
    await client.sendText(msg.from, 'Available commands:\n/help - Show this\n/ping - Test bot');
  } else if (text === '/ping') {
    await client.sendText(msg.from, 'Pong!');
  }
});
```

## Phone Number Formatting

You can send messages using phone numbers or WhatsApp JIDs:

```typescript
// Both work the same:
await client.sendText('1234567890', 'Hello');
await client.sendText('1234567890@s.whatsapp.net', 'Hello');
```

## Session Management

Sessions are stored in the `sessionPath` directory:

```
sessions/
  ├── bot-1/           # Instance 1 session
  │   ├── creds.json
  │   └── app-state-sync-*.json
  └── bot-2/           # Instance 2 session
      ├── creds.json
      └── app-state-sync-*.json
```

Once authenticated, the session persists across restarts. Delete the session folder to logout.

## Error Handling

```typescript
client.on('error', (error) => {
  console.error('Error:', error.message);
  // Handle error
});

// Or catch in async operations
const result = await client.sendText('...', 'Hello');
if (!result.success) {
  console.error('Send failed:', result.error);
}
```

## TypeScript Support

Miaw Core is written in TypeScript and includes full type definitions:

```typescript
import { MiawClient, MiawMessage, ConnectionState } from 'miaw-core';

// Full autocomplete and type checking
const client: MiawClient = new MiawClient({ instanceId: 'bot' });

client.on('message', (msg: MiawMessage) => {
  // TypeScript knows the structure of msg
  console.log(msg.text);
});
```

## FAQ

### How do I display QR code in terminal?

Install `qrcode-terminal`:

```bash
npm install qrcode-terminal
```

```typescript
import qrcode from 'qrcode-terminal';

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
});
```

### How do I send to groups?

Same as sending to individuals - use the group JID:

```typescript
await client.sendText('123456789@g.us', 'Hello group!');
```

### Where is the session data stored?

In the `sessionPath` directory (default: `./sessions/<instanceId>/`).

### Can I use custom storage for sessions?

Currently only file-based storage is supported. Custom storage adapters may be added in future versions.

### Does it support media (images, videos)?

Not in v0.1.0. Text messages only. Media support is planned for v0.2.0.

## Roadmap

- [x] Text message send/receive
- [x] Session management
- [x] Auto-reconnection
- [x] Multiple instances
- [x] TypeScript support
- [ ] Media support (images, videos, documents, audio)
- [ ] Group operations (create, add/remove participants)
- [ ] Message reactions
- [ ] Read receipts
- [ ] Typing indicators
- [ ] Custom storage adapters
- [ ] Message queuing
- [ ] Rate limiting

## What Miaw Core Abstracts

Miaw Core handles these Baileys complexities for you:

- QR code generation and handling
- Auth state management (save/load)
- Socket connection setup
- Reconnection logic
- Message event parsing
- Connection state tracking
- Credentials persistence
- Multi-file auth state
- Baileys version management
- Signal key store setup

## Contributing

Contributions welcome! Please open an issue or PR.

## License

MIT

## Credits

Built on top of [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys)
