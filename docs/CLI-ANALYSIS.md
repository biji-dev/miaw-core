# miaw-cli - Feature Analysis & Comparison

**Document Version:** 4.0.0
**Analysis Date:** 2026-01-18
**miaw-core Version:** v1.1.1
**Purpose:** Analyze current CLI features and provide recommendations for enhancement

---

## Executive Summary

The current miaw-cli implements **42 commands** covering basic WhatsApp operations. miaw-core exposes **102+ public methods** across 10 feature categories. This analysis identifies **64 missing CLI commands** (approximately **60% coverage gap**) and provides a phased roadmap for CLI enhancement.

### Key Metrics

| Metric | Current | Potential | Gap |
|--------|---------|-----------|-----|
| **Total Methods** | 102+ | 102+ | - |
| **CLI Commands** | 42 | ~102 | **64 (60%)** |
| **Feature Categories** | 6/10 | 10 | **4 (40%)** |

---

## Complete Feature Comparison Table

**Legend:** ✅ = Available | ❌ = Not Available | ⚠️ = Partial

| # | Feature | miaw-core Method | Interactive Test | CLI Command | Category | Priority |
|---|---------|------------------|------------------|-------------|----------|----------|
|
| **Core Connection & Instance Management** |
|---|---------|------------------|------------------|-------------|----------|----------|
| 1 | List all instances | N/A | N/A | ✅ `instance ls` | Instance | - |
| 2 | Show instance status | `getConnectionState()` | ✅ Test | ✅ `instance status [id]` | Instance | - |
| 3 | Create new instance | `constructor()` | ✅ Test | ✅ `instance create <id>` | Instance | - |
| 4 | Delete instance | `clearSession()` | N/A | ✅ `instance delete <id>` | Instance | - |
| 5 | Connect instance | `connect()` | ✅ Test | ✅ `instance connect <id>` | Instance | - |
| 6 | Disconnect instance | `disconnect()` | ✅ Test | ✅ `instance disconnect <id>` | Instance | - |
| 7 | Logout instance | `logout()` | ✅ Test | ✅ `instance logout <id>` | Instance | - |
| 8 | Get instance ID | `getInstanceId()` | ✅ Test | ❌ | Instance | P3 |
| 9 | Check if connected | `isConnected()` | ✅ Test | ❌ | Instance | P3 |
| 10 | Dispose/cleanup | `dispose()` | ✅ Test | ❌ | Instance | P3 |
|
| **Basic GET Operations** |
|---|---------|------------------|------------------|-------------|----------|----------|
| 11 | Get own profile | `getOwnProfile()` | ✅ Test | ✅ `get profile` | GET | - |
| 12 | Fetch all contacts | `fetchAllContacts()` | ✅ Test | ✅ `get contacts [--limit N]` | GET | - |
| 13 | Fetch all groups | `fetchAllGroups()` | ✅ Test | ✅ `get groups [--limit N]` | GET | - |
| 14 | Fetch all chats | `fetchAllChats()` | ✅ Test | ✅ `get chats [--limit N]` | GET | - |
| 15 | Get chat messages | `getChatMessages()` | ✅ Test | ✅ `get messages <jid> [--limit N]` | GET | - |
| 16 | Fetch all labels | `fetchAllLabels()` | ✅ Test | ✅ `get labels` | GET | - |
|
| **Basic Messaging** |
|---|---------|------------------|------------------|-------------|----------|----------|
| 17 | Send text message | `sendText()` | ✅ Test | ✅ `send text <phone> <message>` | Send | - |
| 18 | Send image | `sendImage()` | ✅ Test | ✅ `send image <phone> <path>` | Send | - |
| 19 | Send document | `sendDocument()` | ✅ Test | ✅ `send document <phone> <path>` | Send | - |
| 20 | Send video | `sendVideo()` | ✅ Test | ❌ | Send | **P0** |
| 21 | Send audio | `sendAudio()` | ✅ Test | ❌ | Send | **P0** |
| 22 | Download media | `downloadMedia()` | ✅ Test | ❌ | Send | P1 |
|
| **Advanced Messaging Operations** |
|---|---------|------------------|------------------|-------------|----------|----------|
| 23 | Send reaction | `sendReaction()` | ✅ Test | ❌ | Message | **P1** |
| 24 | Remove reaction | `removeReaction()` | ✅ Test | ❌ | Message | **P1** |
| 25 | Forward message | `forwardMessage()` | ✅ Test | ❌ | Message | **P1** |
| 26 | Edit message | `editMessage()` | ✅ Test | ❌ | Message | **P1** |
| 27 | Delete message (everyone) | `deleteMessage()` | ✅ Test | ❌ | Message | **P1** |
| 28 | Delete message (me only) | `deleteMessageForMe()` | ✅ Test | ❌ | Message | **P1** |
|
| **Contact & Validation** |
|---|---------|------------------|------------------|-------------|----------|----------|
| 29 | Check phone number | `checkNumber()` | ✅ Test | ✅ `check <phone>` | Misc | - |
| 30 | Batch check numbers | `checkNumbers()` | ✅ Test | ✅ `check <phone1> <phone2>` | Misc | - |
| 31 | Get contact info | `getContactInfo()` | ✅ Test | ❌ | Contact | **P0** |
| 32 | Get business profile | `getBusinessProfile()` | ✅ Test | ❌ | Contact | **P0** |
| 33 | Get profile picture | `getProfilePicture()` | ✅ Test | ❌ | Contact | **P0** |
| 34 | Add/edit contact | `addOrEditContact()` | ✅ Test | ❌ | Contact | **P0** |
| 35 | Remove contact | `removeContact()` | ✅ Test | ❌ | Contact | **P0** |
|
| **Group Management** |
|---|---------|------------------|------------------|-------------|----------|----------|
| 36 | List all groups | `fetchAllGroups()` | ✅ Test | ✅ `group list [options]` | Group | - |
| 37 | Get group info | `getGroupInfo()` | ✅ Test | ✅ `group info <jid>` | Group | - |
| 38 | Get group participants | `getGroupParticipants()` | ✅ Test | ✅ `group participants <jid> [options]` | Group | - |
| 39 | Create group | `createGroup()` | ✅ Test | ✅ `group create <name> <phones..>` | Group | - |
| 40 | Get invite link | `getGroupInviteLink()` | ✅ Test | ✅ `group invite-link <jid>` | Group | - |
| 41 | Add participants | `addParticipants()` | ✅ Test | ✅ `group participants add <jid> <phones>` | Group | - |
| 42 | Remove participants | `removeParticipants()` | ✅ Test | ✅ `group participants remove <jid> <phones>` | Group | - |
| 43 | Leave group | `leaveGroup()` | ✅ Test | ✅ `group leave <jid>` | Group | - |
| 44 | Promote to admin | `promoteToAdmin()` | ✅ Test | ✅ `group participants promote <jid> <phones>` | Group | - |
| 45 | Demote from admin | `demoteFromAdmin()` | ✅ Test | ✅ `group participants demote <jid> <phones>` | Group | - |
| 46 | Update group name | `updateGroupName()` | ✅ Test | ✅ `group name set <jid> <name>` | Group | - |
| 47 | Update group description | `updateGroupDescription()` | ✅ Test | ✅ `group description set <jid> [desc]` | Group | - |
| 48 | Update group picture | `updateGroupPicture()` | ✅ Test | ✅ `group picture set <jid> <path>` | Group | - |
| 49 | Revoke invite link | `revokeGroupInvite()` | ✅ Test | ✅ `group invite revoke <jid>` | Group | - |
| 50 | Accept group invite | `acceptGroupInvite()` | ✅ Test | ✅ `group invite accept <code>` | Group | - |
| 51 | Get invite info | `getGroupInviteInfo()` | ✅ Test | ✅ `group invite info <code>` | Group | - |
|
| **Profile Management** |
|---|---------|------------------|------------------|-------------|----------|----------|
| 51 | Update profile picture | `updateProfilePicture()` | ✅ Test | ❌ | Profile | **P0** |
| 52 | Remove profile picture | `removeProfilePicture()` | ✅ Test | ❌ | Profile | **P0** |
| 53 | Update profile name | `updateProfileName()` | ✅ Test | ❌ | Profile | **P0** |
| 54 | Update profile status | `updateProfileStatus()` | ✅ Test | ❌ | Profile | **P0** |
|
| **Presence & UX Features** |
|---|---------|------------------|------------------|-------------|----------|----------|
| 55 | Mark as read | `markAsRead()` | ✅ Test | ❌ | Presence | **P1** |
| 56 | Send typing indicator | `sendTyping()` | ✅ Test | ❌ | Presence | **P1** |
| 57 | Send recording indicator | `sendRecording()` | ✅ Test | ❌ | Presence | **P1** |
| 58 | Stop typing/recording | `stopTyping()` | ✅ Test | ❌ | Presence | **P1** |
| 59 | Set presence status | `setPresence()` | ✅ Test | ❌ | Presence | **P1** |
| 60 | Subscribe to presence | `subscribePresence()` | ✅ Test | ❌ | Presence | **P1** |
|
| **Business - Labels (WhatsApp Business Only)** |
|---|---------|------------------|------------------|-------------|----------|----------|
| 61 | Add/create label | `addLabel()` | ✅ Test | ❌ | Label | **P0** |
| 62 | Add label to chat | `addChatLabel()` | ✅ Test | ❌ | Label | **P0** |
| 63 | Remove label from chat | `removeChatLabel()` | ✅ Test | ❌ | Label | **P0** |
| 64 | Add label to message | `addMessageLabel()` | ✅ Test | ❌ | Label | **P1** |
| 65 | Remove label from message | `removeMessageLabel()` | ✅ Test | ❌ | Label | **P1** |
|
| **Business - Catalog (WhatsApp Business Only)** |
|---|---------|------------------|------------------|-------------|----------|----------|
| 66 | Get catalog | `getCatalog()` | ✅ Test | ❌ | Catalog | **P0** |
| 67 | Get collections | `getCollections()` | ✅ Test | ❌ | Catalog | **P0** |
| 68 | Create product | `createProduct()` | ✅ Test | ❌ | Catalog | **P0** |
| 69 | Update product | `updateProduct()` | ✅ Test | ❌ | Catalog | **P0** |
| 70 | Delete products | `deleteProducts()` | ✅ Test | ❌ | Catalog | **P0** |
|
| **Newsletter/Channel Operations** |
|---|---------|------------------|------------------|-------------|----------|----------|
| 71 | Create newsletter | `createNewsletter()` | ✅ Test | ❌ | Newsletter | **P2** |
| 72 | Get newsletter metadata | `getNewsletterMetadata()` | ✅ Test | ❌ | Newsletter | **P2** |
| 73 | Follow newsletter | `followNewsletter()` | ✅ Test | ❌ | Newsletter | **P2** |
| 74 | Unfollow newsletter | `unfollowNewsletter()` | ✅ Test | ❌ | Newsletter | **P2** |
| 75 | Mute newsletter | `muteNewsletter()` | ✅ Test | ❌ | Newsletter | **P2** |
| 76 | Unmute newsletter | `unmuteNewsletter()` | ✅ Test | ❌ | Newsletter | **P2** |
| 77 | Send newsletter text | `sendNewsletterMessage()` | ✅ Test | ❌ | Newsletter | **P2** |
| 78 | Send newsletter image | `sendNewsletterImage()` | ✅ Test | ❌ | Newsletter | **P2** |
| 79 | Send newsletter video | `sendNewsletterVideo()` | ✅ Test | ❌ | Newsletter | **P2** |
| 80 | Fetch newsletter messages | `fetchNewsletterMessages()` | ✅ Test | ❌ | Newsletter | **P2** |
| 81 | React to newsletter message | `reactToNewsletterMessage()` | ✅ Test | ❌ | Newsletter | **P2** |
| 82 | Subscribe to updates | `subscribeNewsletterUpdates()` | ✅ Test | ❌ | Newsletter | **P2** |
| 83 | Get subscriber count | `getNewsletterSubscribers()` | ✅ Test | ❌ | Newsletter | **P2** |
| 84 | Get admin count | `getNewsletterAdminCount()` | ✅ Test | ❌ | Newsletter | **P2** |
| 85 | Update newsletter name | `updateNewsletterName()` | ✅ Test | ❌ | Newsletter | **P2** |
| 86 | Update newsletter description | `updateNewsletterDescription()` | ✅ Test | ❌ | Newsletter | **P2** |
| 87 | Update newsletter picture | `updateNewsletterPicture()` | ✅ Test | ❌ | Newsletter | **P2** |
| 88 | Remove newsletter picture | `removeNewsletterPicture()` | ✅ Test | ❌ | Newsletter | **P2** |
| 89 | Change newsletter owner | `changeNewsletterOwner()` | ✅ Test | ❌ | Newsletter | **P2** |
| 90 | Demote newsletter admin | `demoteNewsletterAdmin()` | ✅ Test | ❌ | Newsletter | **P2** |
| 91 | Delete newsletter | `deleteNewsletter()` | ✅ Test | ❌ | Newsletter | **P2** |
|
| **LID/Privacy Features** |
|---|---------|------------------|------------------|-------------|----------|----------|
| 92 | Resolve LID to JID | `resolveLidToJid()` | ⚠️ Partial | ❌ | LID | **P3** |
| 93 | Get phone from JID | `getPhoneFromJid()` | ⚠️ Partial | ❌ | LID | **P3** |
| 94 | Register LID mapping | `registerLidMapping()` | ⚠️ Partial | ❌ | LID | **P3** |
| 95 | Get LID mappings | `getLidMappings()` | ⚠️ Partial | ❌ | LID | **P3** |
| 96 | Get LID cache size | `getLidCacheSize()` | ⚠️ Partial | ❌ | LID | **P3** |
| 97 | Clear LID cache | `clearLidCache()` | ⚠️ Partial | ❌ | LID | **P3** |
|
| **Debug Mode Control** |
|---|---------|------------------|------------------|-------------|----------|----------|
| 98 | Enable debug mode | `enableDebug()` | ✅ Test | ✅ `debug on` (REPL) | Debug | - |
| 99 | Disable debug mode | `disableDebug()` | ✅ Test | ✅ `debug off` (REPL) | Debug | - |
| 100 | Check debug enabled | `isDebugEnabled()` | ✅ Test | ✅ `debug status` (REPL) | Debug | - |
| 101 | Set debug mode | `setDebug()` | ✅ Test | ✅ `debug [on|off]` (REPL) | Debug | - |
|
| **REPL-Only Features** |
|---|---------|------------------|------------------|-------------|----------|----------|
| 102 | Switch instance | N/A | N/A | ✅ `use <instance>` (REPL) | REPL | - |
| 103 | Show instances list | N/A | N/A | ✅ `instances` (REPL) | REPL | - |
| 104 | Show connection status | N/A | N/A | ✅ `status` (REPL) | REPL | - |
| 105 | Show help | N/A | N/A | ✅ `help` (REPL) | REPL | - |
| 106 | Exit REPL | N/A | N/A | ✅ `exit` (REPL) | REPL | - |

---

## Summary Statistics by Category

| Category | Total Features | CLI Available | CLI Missing | Coverage |
|----------|----------------|---------------|-------------|----------|
| **Instance Management** | 10 | 7 | 3 | 70% |
| **Basic GET Operations** | 6 | 6 | 0 | **100%** ✅ |
| **Basic Messaging** | 6 | 3 | 3 | 50% |
| **Advanced Messaging** | 6 | 0 | 6 | **0%** ❌ |
| **Contact & Validation** | 7 | 2 | 5 | 29% |
| **Group Management** | 16 | 16 | 0 | **100%** ✅ |
| **Profile Management** | 4 | 0 | 4 | **0%** ❌ |
| **Presence & UX** | 6 | 0 | 6 | **0%** ❌ |
| **Business - Labels** | 5 | 0 | 5 | **0%** ❌ |
| **Business - Catalog** | 5 | 0 | 5 | **0%** ❌ |
| **Newsletter/Channel** | 21 | 0 | 21 | **0%** ❌ |
| **LID/Privacy** | 6 | 0 | 6 | **0%** ❌ |
| **Debug Mode** | 4 | 4 (REPL) | 0 | **100%** ✅ |
| **REPL Features** | 5 | 5 (REPL) | 0 | **100%** ✅ |
| **TOTAL** | **107** | **43** | **64** | **40%** |

---

## Missing CLI Commands by Priority

### 🔴 Priority 0 (P0) - Essential Core Features (15 missing)

| # | Feature | miaw-core Method | Proposed CLI Command |
|---|---------|------------------|---------------------|
| **Basic Messaging (2)** |
| 20 | Send video | `sendVideo()` | `send video <phone> <path> [caption]` |
| 21 | Send audio | `sendAudio()` | `send audio <phone> <path>` |
| **Contact Operations (5)** |
| 31 | Get contact info | `getContactInfo()` | `contact info <phone>` |
| 32 | Get business profile | `getBusinessProfile()` | `contact business <phone>` |
| 33 | Get profile picture | `getProfilePicture()` | `contact picture <phone> [high]` |
| 34 | Add/edit contact | `addOrEditContact()` | `contact add <phone> <name>` |
| 35 | Remove contact | `removeContact()` | `contact remove <phone>` |
| **Profile Management (4)** |
| 51 | Update picture | `updateProfilePicture()` | `profile picture set <path>` |
| 52 | Remove picture | `removeProfilePicture()` | `profile picture remove` |
| 53 | Update name | `updateProfileName()` | `profile name set <name>` |
| 54 | Update status | `updateProfileStatus()` | `profile status set <status>` |
| **Business Labels - Chat (3)** |
| 61 | Create label | `addLabel()` | `label add <name> [color]` |
| 62 | Add to chat | `addChatLabel()` | `label chat add <jid> <labelId>` |
| 63 | Remove from chat | `removeChatLabel()` | `label chat remove <jid> <labelId>` |
| **Other (1)** |
| 22 | Download media | `downloadMedia()` | `media download <jid> <msgId> <path>` |

---

### 🟡 Priority 1 (P1) - Common Use Cases (13 missing)

| # | Feature | miaw-core Method | Proposed CLI Command |
|---|---------|------------------|---------------------|
| **Advanced Messaging (6)** |
| 23 | Send reaction | `sendReaction()` | `message react <jid> <msgId> <emoji>` |
| 24 | Remove reaction | `removeReaction()` | `message react-remove <jid> <msgId>` |
| 25 | Forward message | `forwardMessage()` | `message forward <jid> <msgId> <to>` |
| 26 | Edit message | `editMessage()` | `message edit <jid> <msgId> <newText>` |
| 27 | Delete for everyone | `deleteMessage()` | `message delete <jid> <msgId>` |
| 28 | Delete for me only | `deleteMessageForMe()` | `message delete-for-me <jid> <msgId>` |
| **Presence Features (6)** |
| 55 | Mark as read | `markAsRead()` | `presence read <jid> <msgId>` |
| 56 | Send typing | `sendTyping()` | `presence typing <jid> [duration]` |
| 57 | Send recording | `sendRecording()` | `presence recording <jid> [duration]` |
| 58 | Stop typing/recording | `stopTyping()` | `presence stop <jid>` |
| 59 | Set presence | `setPresence()` | `presence set <available\|unavailable>` |
| 60 | Subscribe presence | `subscribePresence()` | `presence subscribe <jid>` |
| **Label - Message (1)** |
| 64 | Add to message | `addMessageLabel()` | `label message add <jid> <msgId> <labelId>` |
| 65 | Remove from message | `removeMessageLabel()` | `label message remove <jid> <msgId> <labelId>` |

---

### 🟢 Priority 2 (P2) - Newsletter Features (21 missing)

| # | Feature | miaw-core Method | Proposed CLI Command |
|---|---------|------------------|---------------------|
| **Newsletter (21)** |
| 71 | Create newsletter | `createNewsletter()` | `newsletter create <name> [desc]` |
| 72 | Get metadata | `getNewsletterMetadata()` | `newsletter info <id>` |
| 73 | Follow | `followNewsletter()` | `newsletter follow <id>` |
| 74 | Unfollow | `unfollowNewsletter()` | `newsletter unfollow <id>` |
| 75 | Mute | `muteNewsletter()` | `newsletter mute <id>` |
| 76 | Unmute | `unmuteNewsletter()` | `newsletter unmute <id>` |
| 77 | Send text | `sendNewsletterMessage()` | `newsletter send text <id> <message>` |
| 78 | Send image | `sendNewsletterImage()` | `newsletter send image <id> <path> [caption]` |
| 79 | Send video | `sendNewsletterVideo()` | `newsletter send video <id> <path> [caption]` |
| 80 | Fetch messages | `fetchNewsletterMessages()` | `newsletter messages <id> [--limit N]` |
| 81 | React | `reactToNewsletterMessage()` | `newsletter react <id> <msgId> <emoji>` |
| 82 | Subscribe updates | `subscribeNewsletterUpdates()` | `newsletter subscribe <id>` |
| 83 | Get subscribers | `getNewsletterSubscribers()` | `newsletter subscribers <id>` |
| 84 | Get admins | `getNewsletterAdminCount()` | `newsletter admins <id>` |
| 85 | Update name | `updateNewsletterName()` | `newsletter update name <id> <name>` |
| 86 | Update description | `updateNewsletterDescription()` | `newsletter update desc <id> <desc>` |
| 87 | Update picture | `updateNewsletterPicture()` | `newsletter update picture <id> <path>` |
| 88 | Remove picture | `removeNewsletterPicture()` | `newsletter picture remove <id>` |
| 89 | Change owner | `changeNewsletterOwner()` | `newsletter owner set <id> <newOwner>` |
| 90 | Demote admin | `demoteNewsletterAdmin()` | `newsletter admin demote <id> <adminJid>` |
| 91 | Delete newsletter | `deleteNewsletter()` | `newsletter delete <id>` |

---

### 🔵 Priority 3 (P3) - Advanced/Power-User Features (6 missing)

| # | Feature | miaw-core Method | Proposed CLI Command |
|---|---------|------------------|---------------------|
| **LID/Privacy (6)** |
| 92 | Resolve LID | `resolveLidToJid()` | `lid resolve <lid>` |
| 93 | Get phone from JID | `getPhoneFromJid()` | `lid phone <jid>` |
| 94 | Register mapping | `registerLidMapping()` | `lid register <lid> <phone>` |
| 95 | Get mappings | `getLidMappings()` | `lid cache show` |
| 96 | Get cache size | `getLidCacheSize()` | `lid cache size` |
| 97 | Clear cache | `clearLidCache()` | `lid cache clear` |
| **Other (3)** |
| 10 | Dispose client | `dispose()` | `instance dispose <id>` |
| 8 | Get instance ID | `getInstanceId()` | `instance id` |
| 9 | Check connected | `isConnected()` | `instance connected` |

---

## Implementation Roadmap

### Phase 1: P0 Essential Features (26 commands)

**Target:** MVP completion with essential messaging, contact, profile, group join/leave, business labels, and catalog

**Timeline:** Immediate - High priority for most users

**Commands to implement:**
- Basic Messaging: `send video`, `send audio`
- Contact Operations: `contact info/business/picture/add/remove`
- Group Join/Leave: `group leave`, `group invite accept`
- Profile: `profile picture set/remove`, `profile name/status set`
- Business Labels (Chat): `label add`, `label chat add/remove`
- Business Catalog: `catalog list/collections/product create/update/delete`
- Other: `media download`, `group participants add/remove`

**Expected coverage after Phase 1:** 57/106 (54%)

---

### Phase 2: P1 Common Use Cases (27 commands)

**Target:** Advanced messaging, group management, presence, and catalog features

**Timeline:** Short-term following Phase 1

**Commands to implement:**
- Advanced Messaging: `message react`, `message react-remove`, `message forward`, `message edit`, `message delete`, `message delete-for-me`
- Group Management: `group participants promote/demote`, `group name/description/picture set`, `group invite revoke/info`
- Presence: `presence read/typing/recording/stop/set/subscribe`
- Business Catalog: `catalog list/collections/product create/update/delete`
- Labels: `label message add/remove`

**Expected coverage after Phase 2:** 79/106 (75%)

---

### Phase 3: P2 Newsletter Features (21 commands)

**Target:** Complete newsletter/channel support

**Timeline:** Medium-term

**Commands to implement:**
- Newsletter: All 21 newsletter commands

**Expected coverage after Phase 3:** 100/106 (94%)

---

### Phase 4: P3 Advanced Features (6 commands)

**Target:** Power-user and debugging features

**Timeline:** Long-term / On-demand

**Commands to implement:**
- LID: 6 LID/privacy commands
- Other: `instance dispose`, `instance id`, `instance connected`

**Expected coverage after Phase 4:** 106/106 (100%)

---

## File Structure for New Commands

```
src/cli/commands/
├── index.ts                 # Command router (existing)
├── commands-index.ts        # Command exports (existing)
├── instance.ts              # Instance commands (existing) ⚡ Phase 4
├── get.ts                   # GET commands (existing) ✅
├── send.ts                  # Send commands (existing) ⚡ Phase 1
├── group.ts                 # Group commands (existing) ⚡ Phase 1/2
├── misc.ts                  # Misc commands (existing) ⚡ Phase 1
├── message.ts               # NEW ⚡ Phase 2
├── profile.ts               # NEW ⚡ Phase 1
├── contact.ts               # NEW ⚡ Phase 1
├── presence.ts              # NEW ⚡ Phase 2
├── label.ts                 # NEW ⚡ Phase 1/2
├── catalog.ts               # NEW ⚡ Phase 2
├── newsletter.ts            # NEW ⚡ Phase 3
└── lid.ts                   # NEW ⚡ Phase 4
```

---

## Success Metrics

### Coverage Targets

| Phase | New Commands | Total Commands | Coverage | Target Status |
|-------|--------------|----------------|----------|---------------|
| Current | - | 43 | 40% | Baseline |
| Phase 1 (P0) | +15 | 58 | 54% | ✅ MVP |
| Phase 2 (P1) | +13 | 71 | 66% | ✅ Complete |
| Phase 3 (P2) | +21 | 92 | 86% | ✅ Full Feature |
| Phase 4 (P3) | +15 | 107 | 100% | ✅ Power User |

### Quality Metrics

- **Code Coverage:** Maintain >90% test coverage for new commands
- **Documentation:** All commands in `--help` and REPL `help`
- **Error Handling:** Consistent error messages across all commands
- **Type Safety:** Full TypeScript types for all command options
- **REPL Integration:** Autocomplete support for all new commands

---

## Conclusion

The current miaw-cli provides a solid foundation with **43 commands** (including REPL-only features). There is a **60% coverage gap** with **64 missing CLI commands** out of 107 total features.

**Key Findings:**

1. **Basic GET Operations** are 100% complete ✅
2. **Group Management** is 100% complete ✅ (16/16 commands)
3. **Debug & REPL features** are 100% complete ✅
4. **Advanced Messaging** has 0% coverage ❌ (6 missing - P1)
5. **Profile Management** has 0% coverage ❌ (4 missing - P0)
6. **Presence & UX** has 0% coverage ❌ (6 missing - P1)
7. **Contact Operations** has 29% coverage ⚠️ (5 missing - P0)
8. **Business Labels (Chat)** has 0% coverage ❌ (3 missing - P0)
9. **Business Catalog** has 0% coverage ❌ (5 missing - P0)
10. **Newsletter** has 0% coverage ❌ (21 missing - P2)

**Recommended Action Plan:**

1. **Phase 1 (Immediate):** Implement 15 P0 essential commands including contact operations, profile management, business labels, and catalog
2. **Phase 2 (Short-term):** Add 13 P1 common use case commands (advanced messaging, presence)
3. **Phase 3 (Medium-term):** Complete newsletter features with 21 P2 commands
4. **Phase 4 (Long-term):** Add 6 P3 advanced power-user features (LID/privacy, instance utilities)

This phased approach ensures the CLI evolves to match miaw-core's comprehensive capabilities while maintaining code quality and user experience.

---

**Document Status:** ✅ Complete (Updated v4.0.0 - Group Management 100% complete)
**Next Steps:** Review with team, begin Phase 1 implementation with focus on contact operations, profile management, business labels, and catalog
