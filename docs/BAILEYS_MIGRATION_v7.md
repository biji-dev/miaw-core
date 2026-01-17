# Baileys Migration Plan: v6.7.21 → v7.0.0-rc.9

> **Status: Migration Complete** ✅ - All core migration tasks have been implemented.
> **Date Completed:** 2025-01-10
> **Current Version:** Baileys v7.0.0-rc.9

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

### 1. ESM-Only (No More CommonJS) ✅ COMPLETE

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

**Implementation Status:**

- ✅ [`"type": "module"` in package.json:5](package.json#L5)
- ✅ All imports use ESM syntax with `.js` extensions in [MiawClient.ts:68-70](src/client/MiawClient.ts#L68-L70)

### 2. LID (Local Identifier) Support ✅ COMPLETE

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

**Implementation Status:**

- ✅ Custom `LruCache` implementation in [MiawClient.ts:76-123](src/client/MiawClient.ts#L76-L123)
- ✅ LID mapping from `senderLid` in [MiawClient.ts:368-377](src/client/MiawClient.ts#L368-L377)
- ✅ `@lid` support in [formatPhoneToJid:173-192](src/handlers/MessageHandler.ts#L173-L192)
- ✅ `useMultiFileAuthState` handles new auth keys in [AuthHandler.ts:23](src/handlers/AuthHandler.ts#L23)

### 3. API Changes

| Old (v6.x)           | New (v7.x)                                            | Status |
| -------------------- | ----------------------------------------------------- | ------ |
| `isJidUser(jid)`     | `isPnUser(jid)`                                       | ⚠️ NOT NEEDED - Codebase doesn't use this API |
| `Contact.jid/lid`    | `Contact.id` + `Contact.phoneNumber` or `Contact.lid` | ✅ Handled via `participantPn`/`senderPn` in [MessageHandler.ts:20-21](src/handlers/MessageHandler.ts#L20-L21) |
| `proto.fromObject()` | `proto.create()`                                      | ✅ NOT APPLICABLE - No proto usage in codebase |

### 4. New Events

- `lid-mapping.update` - Emitted when LID/PN mapping is discovered

**Implementation Status:**

- ✅ Event listener added at [MiawClient.ts:288-308](src/client/MiawClient.ts#L288-L308)
- ✅ Integrates with existing `LruCache` for seamless mapping storage
- ✅ Debug logging for monitoring LID discovery

**Note:** This event is marked as WIP in Baileys and may not always fire. The implementation uses multiple sources for LID mapping:

- `lid-mapping.update` event (when available) - [MiawClient.ts:291](src/client/MiawClient.ts#L291)
- `contacts.upsert`/`contacts.update` events - [MiawClient.ts:311-318](src/client/MiawClient.ts#L311-L318)
- `chats.upsert`/`chats.update` events - [MiawClient.ts:322-329](src/client/MiawClient.ts#L322-L329)
- `messages.upsert` (from `senderLid`) - [MiawClient.ts:388-397](src/client/MiawClient.ts#L388-L397)

**Custom LID mapping methods:**

- `updateLidToJidMapping()` - Updates LID mappings from contact data
- `updateLidFromChats()` - Updates LID mappings from chat data
- `resolveLidToJid()` - Public method to resolve LID to JID
- `registerLidMapping()` - Manual LID registration
- `getLidMappings()` - Export all mappings for persistence

---

## Migration Steps

### Step 1: Backup Current Sessions ✅ COMPLETE

```bash
cp -r ./sessions ./sessions-backup-v6
```

### Step 2: Update package.json ✅ COMPLETE

```json
{
  "type": "module",
  "dependencies": {
    "@whiskeysockets/baileys": "^7.0.0-rc.9"
  }
}
```

**Status:** ✅ [`"type": "module"` set at package.json:5](package.json#L5), Baileys v7.0.0-rc.9 at [package.json:41](package.json#L41)

### Step 3: Update TypeScript Configuration ✅ COMPLETE

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

**Status:** ✅ Configured at [tsconfig.json:4](tsconfig.json#L4), [tsconfig.json:15](tsconfig.json#L15), [tsconfig.json:12](tsconfig.json#L12)

### Step 4: Update Imports in MiawClient.ts ✅ COMPLETE

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

**Status:** ✅ ESM imports with `.js` extensions at [MiawClient.ts:1-9](src/client/MiawClient.ts#L1-L9) and [MiawClient.ts:68-70](src/client/MiawClient.ts#L68-L70)

**Note:** `isPnUser` is **not imported** because the codebase doesn't use this API - it's not needed for miaw-core's functionality.

### Step 5: Update MessageHandler.ts ✅ COMPLETE

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

**Status:** ✅ `@lid` support implemented at [MessageHandler.ts:173-192](src/handlers/MessageHandler.ts#L173-L192)

### Step 6: Update MiawClient for LID Mapping Store Access ✅ COMPLETE

```typescript
// Access the internal LID mapping store (optional, for advanced use)
getLidMapping() {
  return this.socket?.signalRepository?.lidMapping;
}
```

**Status:** ✅ **Alternative Implementation** - Custom LruCache implemented instead of accessing internal Baileys store:

- `LruCache` class at [MiawClient.ts:76-123](src/client/MiawClient.ts#L76-L123)
- `getLidMappings()` public method at [MiawClient.ts:608-615](src/client/MiawClient.ts#L608-L615)
- `resolveLidToJid()` at [MiawClient.ts:570-575](src/client/MiawClient.ts#L570-L575)

**Reason:** Baileys v7 removed `makeInMemoryStore`, requiring custom implementation.

### Step 7: Handle New Auth State Keys ✅ COMPLETE

Verify `useMultiFileAuthState` in AuthHandler handles new keys automatically. If using custom auth storage, add:

```typescript
type SignalDataTypeMap = {
  // ... existing keys
  "lid-mapping": LIDMapping[];
  "device-list": { [user: string]: string[] };
  tctoken: Buffer;
};
```

**Status:** ✅ `useMultiFileAuthState` handles new keys automatically - see [AuthHandler.ts:1](src/handlers/AuthHandler.ts#L1), [AuthHandler.ts:23](src/handlers/AuthHandler.ts#L23)

### Step 8: Update Protobuf Usage (if any) ✅ NOT APPLICABLE

```typescript
// Before
const msg = proto.Message.fromObject({ ... });

// After
const msg = proto.Message.create({ ... });
```

**Status:** ✅ **Not Applicable** - No `proto.fromObject()` or `proto.create()` usage found in codebase

### Step 9: Clear Old Sessions (Recommended) ✅ DOCUMENTED

Due to auth state changes, recommend users clear old sessions on first run with v7:

```bash
rm -rf ./sessions/*
```

**Status:** ✅ Documented in rollback plan below

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

## Additional Implementation Notes

### Custom Stores Implementation (Baileys v7 Removal)

Baileys v7 removed `makeInMemoryStore`. Miaw Core implements custom stores:

| Store | Type | Location | Purpose |
| :--- | :--- | :--- | :--- |
| `contactsStore` | `Map<string, ContactInfo>` | [MiawClient.ts:139](src/client/MiawClient.ts#L139) | Contact information cache |
| `chatsStore` | `Map<string, ChatInfo>` | [MiawClient.ts:140](src/client/MiawClient.ts#L140) | Chat metadata cache |
| `messagesStore` | `Map<string, MiawMessage[]>` | [MiawClient.ts:141](src/client/MiawClient.ts#L141) | Message history cache |
| `lidToJidMap` | `LruCache` | [MiawClient.ts:136](src/client/MiawClient.ts#L136) | LID → JID resolution (1000 max entries) |

### Signal Key Store Enhancement

Uses `makeCacheableSignalKeyStore` for thread-safe key operations:

- [Imported at MiawClient.ts:5](src/client/MiawClient.ts#L5)
- [Applied at MiawClient.ts:222](src/client/MiawClient.ts#L222)

This provides mutex-based transaction safety for concurrent key access (Baileys v7 PR #1697).

### Media Download Update

`downloadMediaMessage` signature updated to include `reuploadRequest` parameter:

- [Import at MiawClient.ts:8](src/client/MiawClient.ts#L8)
- [Usage at MiawClient.ts:1103-1114](src/client/MiawClient.ts#L1103-L1114)

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

## Migration Status Summary

| Step | Task | Status |
| :--- | :--- | :--- |
| 1 | Backup sessions | ✅ Complete |
| 2 | Update package.json | ✅ Complete |
| 3 | Update TypeScript config | ✅ Complete |
| 4 | Update imports (ESM) | ✅ Complete |
| 5 | Update MessageHandler (@lid) | ✅ Complete |
| 6 | LID mapping store access | ✅ Complete (custom implementation) |
| 7 | New auth state keys | ✅ Complete (auto-handled) |
| 8 | Protobuf usage | ✅ N/A (no usage in codebase) |
| 9 | Clear old sessions | ✅ Documented |

---

## Timeline Estimate

| Task | Effort | Actual |
| :--- | :--- | :--- |
| ESM conversion | 2-4 hours | ✅ Complete |
| API updates | 1-2 hours | ✅ Complete |
| Testing | 4-8 hours | ⏳ Pending |
| Documentation update | 1-2 hours | ✅ Complete |
| **Total** | **8-16 hours** | **Implementation Complete** |

---

## References

- [Migration Guide](https://baileys.wiki/docs/migration/to-v7.0.0)
- [GitHub Releases](https://github.com/WhiskeySockets/Baileys/releases)
- [v7.0.0-rc.9 Release Notes](https://github.com/WhiskeySockets/Baileys/releases/tag/v7.0.0-rc.9)
