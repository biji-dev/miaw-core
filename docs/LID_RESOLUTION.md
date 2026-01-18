# LID (Linked ID) Resolution Guide

This guide explains how WhatsApp's privacy-masked LID JIDs work and how miaw-core handles their resolution to actual phone numbers.

## What are LID JIDs?

WhatsApp introduced **Linked IDs (LIDs)** as a privacy feature. Instead of exposing phone numbers directly in group chats and contacts, WhatsApp may use privacy-masked identifiers:

| JID Type | Format | Example |
|----------|--------|---------|
| Phone JID | `{phone}@s.whatsapp.net` | `6281234567890@s.whatsapp.net` |
| LID JID | `{lid}@lid` | `42877077966917@lid` |
| Group JID | `{groupId}@g.us` | `120363123456789012@g.us` |

**Important**: The numeric portion of a LID JID (e.g., `42877077966917`) is NOT a phone number - it's an opaque identifier that needs to be resolved.

## How LID Resolution Works in miaw-core

MiawClient maintains an **LRU cache** that maps LID JIDs to their corresponding phone JIDs:

```
┌─────────────────────────┐     ┌──────────────────────────────┐
│ 42877077966917@lid      │ ──► │ 6281234567890@s.whatsapp.net │
└─────────────────────────┘     └──────────────────────────────┘
```

### Resolution Methods

```typescript
// Resolve LID JID to phone JID
const phoneJid = client.resolveLidToJid("42877077966917@lid");
// Returns: "6281234567890@s.whatsapp.net" or original if not found

// Get phone number from any JID (handles LID resolution internally)
const phone = client.getPhoneFromJid("42877077966917@lid");
// Returns: "6281234567890" or undefined if not resolved

// Manually register a LID mapping (if you know the mapping)
client.registerLidMapping("42877077966917@lid", "6281234567890@s.whatsapp.net");
```

## Sources of LID Mappings

The LID cache is populated from multiple sources:

### 1. Baileys Events

| Event | Description |
|-------|-------------|
| `lid-mapping.update` | Direct LID mapping updates from WhatsApp |
| `contacts.upsert` | New contacts with LID information |
| `contacts.update` | Contact updates with LID changes |
| `chats.upsert` | New chats with LID information |
| `chats.update` | Chat updates with LID changes |
| `messages.upsert` | Message sender LID mappings |

### 2. Persisted Storage

LID mappings are automatically persisted to:
```
{sessionPath}/{instanceId}/lid-mappings.json
```

This ensures mappings survive restarts. The file is loaded on connect and saved when mappings change.

### 3. Contact Sync (History Sync)

When WhatsApp syncs contacts and chats during initial connection, LID mappings are extracted from the sync data.

## Limitations

### 1. Baileys Doesn't Extract All Mappings

The WhatsApp protocol includes `phoneNumberToLidMappings` in the HistorySync protobuf, but **Baileys does not currently extract this field**. This means:

- Some LID mappings may never be received
- Contacts you've never interacted with may not have mappings
- Group participants who haven't been seen in other contexts may remain unresolved

**Location in Baileys source**:
- Protobuf: `WAProto/index.d.ts` defines `IPhoneNumberToLIDMapping`
- Handler: `src/Utils/history.ts` - `extractSyncedMessage()` doesn't extract mappings

### 2. Privacy Restrictions

WhatsApp intentionally limits LID resolution for privacy:

- LID mappings are only provided for contacts you have legitimate access to
- Group participants may remain as LIDs if you don't have them as contacts
- Business accounts may have different LID visibility rules

### 3. Timing Issues

LID mappings may arrive at different times:

- Initial sync may not include all mappings
- Mappings may arrive later via `lid-mapping.update` events
- A contact's mapping might only appear after they message you

## Troubleshooting

### Phone Shows as "-" for LID Contact

If `get profile <lid>` or `group participants` shows phone as "-":

1. **Check if mapping exists**:
   ```bash
   # In CLI debug mode
   debug on
   get profile 42877077966917@lid
   ```

2. **Wait for sync**: Initial connection may not have all mappings. Try:
   - Waiting for history sync to complete
   - Sending a message to the contact (triggers mapping)
   - Disconnecting and reconnecting

3. **Manual registration**: If you know the phone number:
   ```typescript
   client.registerLidMapping("42877077966917@lid", "6281234567890@s.whatsapp.net");
   ```

4. **Check persisted mappings**:
   ```bash
   cat ./sessions/{instanceId}/lid-mappings.json | jq .
   ```

### Some Group Participants Show LID Numbers as Phone

This was a bug fixed in v1.1.1. The CLI was incorrectly stripping the `@lid` suffix and displaying the LID number as if it were a phone number.

**Fixed behavior**: Now shows `-` if LID cannot be resolved, instead of misleading numbers.

## Best Practices

### 1. Always Use Resolution Methods

```typescript
// ✅ Correct - uses LID resolution
const phone = client.getPhoneFromJid(participant.jid);

// ❌ Wrong - just strips suffix, doesn't resolve LID
const phone = jid.replace("@s.whatsapp.net", "").replace("@lid", "");
```

### 2. Handle Unresolved LIDs Gracefully

```typescript
const phone = client.getPhoneFromJid(jid);
if (phone) {
  console.log(`Phone: ${phone}`);
} else {
  console.log(`Phone: Unknown (LID: ${jid})`);
}
```

### 3. Try Multiple Contact Lookups

```typescript
const resolvedJid = client.resolveLidToJid(jid);
const contact = client.contactsStore.get(resolvedJid)
  || client.contactsStore.get(jid);
```

### 4. Consider Caching Strategy

For high-volume applications, consider:
- Pre-warming the cache by fetching all contacts on connect
- Implementing a secondary lookup (e.g., database) for critical mappings
- Logging unresolved LIDs for later manual resolution

## Technical Details

### LRU Cache Configuration

```typescript
// In MiawClient constructor
private lidToJidCache = new LruCache<string, string>(1000);
```

- **Max size**: 1000 entries
- **Eviction**: Least Recently Used
- **Thread-safe**: Yes (for single-threaded Node.js)

### Persistence Format

```json
{
  "42877077966917@lid": "6281234567890@s.whatsapp.net",
  "35717099028523@lid": "6289876543210@s.whatsapp.net"
}
```

### Event Handler Example

```typescript
client.on("message", (message) => {
  // LID resolution happens automatically in MessageHandler
  console.log(message.from);        // Original JID (may be LID)
  console.log(message.senderPhone); // Resolved phone (if available)
});
```

## Future Improvements

Potential enhancements to LID resolution:

1. **Baileys PR**: Submit a pull request to Baileys to extract `phoneNumberToLidMappings` from HistorySync
2. **Fallback lookup**: Implement a contact lookup API that resolves LIDs server-side
3. **User notification**: Alert users when important contacts have unresolved LIDs
4. **Bulk resolution**: API to resolve multiple LIDs in a single call

## Related Files

- [src/client/MiawClient.ts](../src/client/MiawClient.ts) - LID cache and resolution methods
- [src/handlers/MessageHandler.ts](../src/handlers/MessageHandler.ts) - JID formatting utilities
- [src/cli/commands/group.ts](../src/cli/commands/group.ts) - CLI group participant resolution

## Version History

| Version | Change |
|---------|--------|
| v1.0.0 | Initial LID cache implementation |
| v1.1.0 | Added LID persistence to file |
| v1.1.1 | Fixed CLI group participants LID display |
| v1.1.2 | Fixed `getContactProfile()` LID resolution |
