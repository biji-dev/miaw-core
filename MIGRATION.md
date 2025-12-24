# Migration Guide

This guide helps you migrate between versions of Miaw Core.

## Table of Contents

- [v0.9.x to v1.0.0](#v09x-to-v100)
- [v0.8.x to v0.9.0](#v08x-to-v090)
- [v0.7.x to v0.8.0](#v07x-to-v080)
- [Breaking Changes Summary](#breaking-changes-summary)

---

## v0.9.x to v1.0.0

**Status:** Upcoming Release

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
   process.on('SIGINT', async () => {
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

| Version | Change | Migration Required |
|---------|--------|-------------------|
| v1.0.0 | New `dispose()` method | Recommended |
| v1.0.0 | `getLidMappings()` returns object instead of Map | Yes, if using |
| v0.9.0 | Label operations added | No (new features) |
| v0.9.0 | Catalog operations added | No (new features) |
| v0.9.0 | Newsletter operations added | No (new features) |
| v0.9.0 | Contact operations added | No (new features) |
| v0.8.0 | Profile management added | No (new features) |
| v0.7.0 | Group management added | No (new features) |

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

| Miaw Core | Node.js | Baileys | Status |
|-----------|---------|---------|--------|
| 1.0.0 | >=18.0.0 | 6.7.21+ | Stable (Coming Soon) |
| 0.9.x | >=18.0.0 | 6.7.21+ | Stable |
| 0.8.x | >=18.0.0 | 6.7.21+ | Stable |
| 0.7.x | >=18.0.0 | 6.7.21+ | Stable |
| < 0.7 | >=18.0.0 | 6.7.21+ | Upgraded recommended |

---

**Last Updated:** 2025-12-24
