# Baileys Migration Plan: v6.7.21 → v7.0.0-rc.9

## Current Issue

After scanning QR code and app exits, the session cannot reconnect on restart and requires re-pairing. This is a known issue in v6.7.21 related to session/authentication state handling.

## Recommended Solution

Upgrade to **Baileys v7.0.0-rc.9** (latest release candidate, November 2025). This version includes:

- Session recreation and improved message retry ([#1735](https://github.com/WhiskeySockets/Baileys/pull/1735))
- Fix for "No session found to decrypt message" errors ([#1822](https://github.com/WhiskeySockets/Baileys/issues/1822))
- Sync pre-keys on socket start ([#1663](https://github.com/WhiskeySockets/Baileys/pull/1663))
- Mutex-based transaction safety to Signal key store ([#1697](https://github.com/WhiskeySockets/Baileys/pull/1697))

---

## Breaking Changes in v7.0.0

### 1. ESM-Only (No More CommonJS)

**Impact:** High - Miaw Core uses CommonJS currently.

**Changes Required:**

```json
// package.json
{
  "type": "module"
}
```

```typescript
// Change all require() to import
// Before: const { useMultiFileAuthState } = require('@whiskeysockets/baileys')
// After:
import { useMultiFileAuthState } from "@whiskeysockets/baileys";
```

### 2. LID (Local Identifier) Support

**Impact:** Medium - New auth state keys required.

WhatsApp now uses LIDs for user privacy. The auth state must support new keys:

- `lid-mapping` - Maps LID ↔ Phone Number
- `device-list` - Tracks user devices
- `tctoken` - Token for coexistence

**Changes Required in AuthHandler:**

```typescript
// The useMultiFileAuthState should handle this automatically,
// but verify SignalDataTypeMap includes new keys
```

### 3. API Changes

| Old (v6.x)           | New (v7.x)                                            |
| -------------------- | ----------------------------------------------------- |
| `isJidUser(jid)`     | `isPnUser(jid)`                                       |
| `Contact.jid/lid`    | `Contact.id` + `Contact.phoneNumber` or `Contact.lid` |
| `proto.fromObject()` | `proto.create()`                                      |

### 4. New Events

- `lid-mapping.update` - Emitted when LID/PN mapping is discovered

---

## Migration Steps

### Step 1: Backup Current Sessions

```bash
cp -r ./sessions ./sessions-backup-v6
```

### Step 2: Update package.json

```json
{
  "type": "module",
  "dependencies": {
    "@whiskeysockets/baileys": "^7.0.0-rc.9"
  }
}
```

### Step 3: Update TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true
  }
}
```

### Step 4: Update Imports in MiawClient.ts

```typescript
// Before (CommonJS-style)
import makeWASocket, {
  DisconnectReason,
  WASocket,
  // ...
} from "@whiskeysockets/baileys";

// After (ESM) - same syntax, but ensure package.json has "type": "module"
import makeWASocket, {
  DisconnectReason,
  WASocket,
  isPnUser, // replaces isJidUser
  // ...
} from "@whiskeysockets/baileys";
```

### Step 5: Update MessageHandler.ts

```typescript
// Add LID support in formatPhoneToJid
static formatPhoneToJid(phoneNumber: string): string {
  // Existing @lid handling is correct - keep as is
  if (phoneNumber.includes('@lid')) {
    return phoneNumber;
  }
  // ... rest unchanged
}
```

### Step 6: Update MiawClient for LID Mapping Store Access

```typescript
// Access the internal LID mapping store (optional, for advanced use)
getLidMapping() {
  return this.socket?.signalRepository?.lidMapping;
}
```

### Step 7: Handle New Auth State Keys

Verify `useMultiFileAuthState` in AuthHandler handles new keys automatically. If using custom auth storage, add:

```typescript
type SignalDataTypeMap = {
  // ... existing keys
  "lid-mapping": LIDMapping[];
  "device-list": { [user: string]: string[] };
  tctoken: Buffer;
};
```

### Step 8: Update Protobuf Usage (if any)

```typescript
// Before
const msg = proto.Message.fromObject({ ... });

// After
const msg = proto.Message.create({ ... });
```

### Step 9: Clear Old Sessions (Recommended)

Due to auth state changes, recommend users clear old sessions on first run with v7:

```bash
rm -rf ./sessions/*
```

---

## Testing Checklist

- [ ] Fresh QR code scan and authentication
- [ ] App restart with existing session (critical fix)
- [ ] Multiple restart cycles
- [ ] Send/receive text messages
- [ ] Send/receive media
- [ ] Group operations
- [ ] LID contact handling

---

## Rollback Plan

If issues occur:

```bash
# Restore v6 sessions
rm -rf ./sessions
cp -r ./sessions-backup-v6 ./sessions

# Downgrade
npm install @whiskeysockets/baileys@6.7.21
```

---

## Timeline Estimate

| Task                 | Effort         |
| -------------------- | -------------- |
| ESM conversion       | 2-4 hours      |
| API updates          | 1-2 hours      |
| Testing              | 4-8 hours      |
| Documentation update | 1-2 hours      |
| **Total**            | **8-16 hours** |

---

## References

- [Migration Guide](https://baileys.wiki/docs/migration/to-v7.0.0)
- [GitHub Releases](https://github.com/WhiskeySockets/Baileys/releases)
- [v7.0.0-rc.9 Release Notes](https://github.com/WhiskeySockets/Baileys/releases/tag/v7.0.0-rc.9)
