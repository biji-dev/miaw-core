# Migration Guide

This guide helps you migrate between versions of Miaw Core.

## Table of Contents

- [v1.1.x to v1.2.0](#v11x-to-v120)
- [v1.0.x to v1.1.0](#v10x-to-v110)
- [v0.9.x to v1.0.0](#v09x-to-v100)
- [v0.8.x to v0.9.0](#v08x-to-v090)
- [v0.7.x to v0.8.0](#v07x-to-v080)
- [Breaking Changes Summary](#breaking-changes-summary)

---

## v1.1.x to v1.2.0

**Status:** Code Quality Release (TBD)
**Breaking Changes:** None ✅

v1.2.0 is a non-breaking release focused on code quality, type safety, and developer experience improvements. All existing code continues to work without modifications.

### New Features

#### 1. Configurable Timeouts

Customize timeout values for your specific deployment environment:

```typescript
import { MiawClient } from "miaw-core";

const client = new MiawClient({
  instanceId: "my-bot",
  sessionPath: "./sessions",
  // All optional with sensible defaults
  stuckStateTimeout: 30000,      // Default: 30s - stuck connection state timeout
  qrGracePeriod: 30000,           // Default: 30s - grace period for QR scan connection
  qrScanTimeout: 60000,           // Default: 60s - timeout for QR code scanning
  connectionTimeout: 120000,      // Default: 120s - overall connection timeout
});
```

#### 2. Validation Utilities

Prevent errors before sending requests:

```typescript
import {
  validatePhoneNumber,
  validateJID,
  validateMessageText,
  validateGroupName,
  validatePhoneNumbers,
} from "miaw-core";

const phoneCheck = validatePhoneNumber("6281234567890");
if (!phoneCheck.valid) {
  console.error(phoneCheck.error); // Descriptive error message
}
```

**Auto-validation:** `sendText()` and `createGroup()` now automatically validate inputs.

#### 3. Custom Logger Support

Implement your own logger or use the built-in filtered logger:

```typescript
import { MiawClient, createFilteredLogger } from "miaw-core";
import type { MiawLogger } from "miaw-core";

// Option 1: Built-in filtered logger
const logger = createFilteredLogger(true); // debug mode

// Option 2: Custom logger
const customLogger: MiawLogger = {
  info: (...msg) => myLogger.info(...msg),
  error: (...msg) => myLogger.error(...msg),
  warn: (...msg) => myLogger.warn(...msg),
  debug: (...msg) => myLogger.debug(...msg),
  fatal: (...msg) => myLogger.fatal(...msg),
  trace: (...msg) => myLogger.trace(...msg),
  child: (bindings) => customLogger,
  level: "info",
};

const client = new MiawClient({
  instanceId: "my-bot",
  sessionPath: "./sessions",
  logger: customLogger,
});
```

**Important:** miaw-core no longer overrides global `console.log/error/warn`.

#### 4. Type Safety Improvements

- Replaced `any` types with proper TypeScript interfaces
- New Baileys type exports for advanced users:

```typescript
import type {
  BaileysMessage,
  BaileysMessageUpsert,
  BaileysConnectionUpdate,
  Long,
} from "miaw-core";
```

- Type guard utilities:

```typescript
import { isError, getErrorMessage } from "miaw-core";

try {
  // ... code
} catch (error: unknown) {
  console.error(getErrorMessage(error)); // Safe error handling
}
```

#### 5. Exported Constants

Access internal constants for consistency:

```typescript
import { TIMEOUTS, THRESHOLDS, CACHE_CONFIG, getLabelColorName } from "miaw-core";

console.log(TIMEOUTS.CONNECTION_TIMEOUT); // 120000
console.log(getLabelColorName(0));         // "Color 1 (Dark Blue)"
```

### Internal Improvements

- Removed global state pollution (console override, signal handlers)
- Better error handling throughout
- Improved code organization and maintainability
- Fixed circular dependencies in CLI
- Enhanced encapsulation (LRU cache, prompt utility)

### Migration Steps

```bash
npm install miaw-core@^1.2.0
```

**No code changes required.** Optionally leverage new features:

1. **Add validation** to prevent errors:

   ```typescript
   const check = validatePhoneNumber(phone);
   if (!check.valid) return { error: check.error };
   ```

2. **Customize timeouts** for slow networks:

   ```typescript
   const client = new MiawClient({
     // ... other options
     connectionTimeout: 180000, // 3 minutes
   });
   ```

3. **Implement custom logger** for your logging infrastructure

### For Library Consumers

**Before v1.2.0:**

- Global console was overridden
- Signal handlers registered automatically
- Limited type safety

**After v1.2.0:**

- ✅ Global console untouched
- ✅ Signal handlers only in CLI mode
- ✅ Full type safety
- ✅ Optional validation utilities
- ✅ Configurable timeouts

**Action Required:** None - improvements work automatically!

---

## v1.0.x to v1.1.0

**Status:** Stable Release (2026-01-02)

v1.1.0 upgrades to Baileys v7.0.0-rc.9 and migrates to ESM-only. This fixes the session reconnection issue where the app couldn't reconnect after QR scan and restart.

### Breaking Changes

#### ESM-Only Package

Miaw Core is now ESM-only. CommonJS `require()` is no longer supported.

```typescript
// ❌ Before (CommonJS - no longer works)
const { MiawClient } = require("miaw-core");

// ✅ After (ESM)
import { MiawClient } from "miaw-core";
```

#### Node.js Version

Node.js >= 18.0.0 is now required.

### Migration Steps

1. **Update your package.json:**

   ```json
   {
     "type": "module"
   }
   ```

   Or rename your files from `.js` to `.mjs`.

2. **Update imports to ESM syntax:**

   ```typescript
   // Change require() to import
   import { MiawClient } from "miaw-core";
   ```

3. **Update dependencies:**

   ```bash
   npm install miaw-core@latest
   ```

4. **Check Node.js version:**

   ```bash
   node -v  # Must be >= 18.0.0
   ```

5. **Delete old sessions (recommended):**
   ```bash
   rm -rf ./sessions
   ```
   Re-pair with QR code to get fresh session with Baileys v7.

### What's Fixed

- Session persistence after QR scan - apps can now restart and reconnect without re-pairing
- Improved Signal key store transaction safety
- Better pre-key synchronization

---

## v0.9.x to v1.0.0

**Status:** Stable Release (2025-12-24)

v1.0.0 is the first stable release. While we aim for no breaking changes, here are the important changes to note:

### New Features

#### Resource Cleanup

New `dispose()` method for proper cleanup:

```typescript
// Before (v0.9.x)
// No explicit cleanup needed

// After (v1.0.0)
await client.dispose(); // Clean up resources
```

#### LID Cache Management

New methods for managing LID to JID mapping cache:

```typescript
// Get cache size
const size = client.getLidCacheSize();

// Clear cache
client.clearLidCache();

// Get all mappings
const mappings = client.getLidMappings(); // Returns Record<string, string>
```

### Performance Improvements

- LID mappings now use LRU cache with max size of 1000 entries
- Automatic eviction of least recently used mappings
- Improved memory management for long-running bots

### Migration Steps

1. **Update dependencies:**

   ```bash
   npm install miaw-core@latest
   ```

2. **Add cleanup on shutdown (recommended):**

   ```typescript
   process.on("SIGINT", async () => {
     await client.dispose();
     process.exit(0);
   });
   ```

3. **Test your bot thoroughly** - v1.0.0 has stability guarantees

---

## v0.8.x to v0.9.0

### Label Operations (WhatsApp Business)

New methods for managing labels:

```typescript
// Create or edit a label
await client.addLabel({
  name: "VIP Customers",
  color: LabelColor.Color1,
});

// Add label to chat
await client.addChatLabel(chatJid, labelId);

// Add label to message
await client.addMessageLabel(messageId, chatJid, labelId);

// Remove labels
await client.removeChatLabel(chatJid, labelId);
await client.removeMessageLabel(messageId, chatJid, labelId);
```

### Catalog/Product Operations (WhatsApp Business)

```typescript
// Get product catalog
const catalog = await client.getCatalog(businessJid);

// Create product
await client.createProduct({
  name: "Product Name",
  price: 1999, // in cents
  description: "Description",
});

// Update product
await client.updateProduct(productId, { name: "New Name" });

// Delete products
await client.deleteProducts([productId1, productId2]);
```

### Newsletter/Channel Operations

```typescript
// Create newsletter
const result = await client.createNewsletter("My Channel");

// Follow/unfollow
await client.followNewsletter(newsletterId);
await client.unfollowNewsletter(newsletterId);

// Update newsletter
await client.updateNewsletterName(newsletterId, "New Name");
await client.updateNewsletterDescription(newsletterId, "New Description");
await client.updateNewsletterPicture(newsletterId, { url: "..." });

// Get messages
const messages = await client.fetchNewsletterMessages(newsletterId);

// React to posts
await client.reactToNewsletterMessage(newsletterId, messageId, "👍");

// Newsletter management
await client.getNewsletterSubscribers(newsletterId);
await client.changeNewsletterOwner(newsletterId, newOwnerId);
await client.deleteNewsletter(newsletterId);
```

### Contact Management

```typescript
// Add or edit contact
await client.addOrEditContact({
  phone: "6281234567890",
  name: "John Doe",
});

// Remove contact
await client.removeContact("6281234567890");
```

---

## v0.7.x to v0.8.0

### Profile Management

New profile management methods:

```typescript
// Update profile picture (file path, URL, or Buffer)
await client.updateProfilePicture({ path: "./profile.jpg" });
await client.updateProfilePicture({ url: "https://..." });
await client.updateProfilePicture({ buffer: imageBuffer });

// Remove profile picture
await client.removeProfilePicture();

// Update profile name
await client.updateProfileName("My Bot Name");

// Update profile status (About)
await client.updateProfileStatus("Available for chats");
```

---

## Breaking Changes Summary

| Version | Change                                           | Migration Required |
| ------- | ------------------------------------------------ | ------------------ |
| v1.0.0  | New `dispose()` method                           | Recommended        |
| v1.0.0  | `getLidMappings()` returns object instead of Map | Yes, if using      |
| v0.9.0  | Label operations added                           | No (new features)  |
| v0.9.0  | Catalog operations added                         | No (new features)  |
| v0.9.0  | Newsletter operations added                      | No (new features)  |
| v0.9.0  | Contact operations added                         | No (new features)  |
| v0.8.0  | Profile management added                         | No (new features)  |
| v0.7.0  | Group management added                           | No (new features)  |

---

## Upgrading Best Practices

1. **Read the changelog** - Always check `CHANGELOG.md` for detailed changes
2. **Test in development** - Test your bot thoroughly before deploying to production
3. **Backup sessions** - Keep a backup of your `sessions/` directory
4. **Update gradually** - Don't skip versions when possible
5. **Check examples** - Look at `examples/` for updated usage patterns

---

## Getting Help

If you encounter issues during migration:

1. Check the [USAGE.md](./USAGE.md) for detailed documentation
2. Review [examples/](./examples/) for sample implementations
3. Open an issue on GitHub with:
   - Your current version
   - Target version
   - Error messages
   - Code snippets

---

## Version Compatibility

| Miaw Core | Node.js  | Baileys | Status               |
| --------- | -------- | ------- | -------------------- |
| 1.0.0     | >=18.0.0 | 6.7.21+ | Stable (Coming Soon) |
| 0.9.x     | >=18.0.0 | 6.7.21+ | Stable               |
| 0.8.x     | >=18.0.0 | 6.7.21+ | Stable               |
| 0.7.x     | >=18.0.0 | 6.7.21+ | Stable               |
| < 0.7     | >=18.0.0 | 6.7.21+ | Upgraded recommended |

---

**Last Updated:** 2025-12-24
