# miaw-cli - Feature Analysis & Comparison

**Document Version:** 2.0.0
**Analysis Date:** 2026-01-10
**miaw-core Version:** v1.0.0
**Purpose:** Analyze current CLI features and provide recommendations for enhancement

---

## Executive Summary

The current miaw-cli implements **22 commands** covering basic WhatsApp operations. However, miaw-core exposes **102+ public methods** across 10 feature categories. This analysis identifies **80 missing CLI commands** (approximately **78% coverage gap**) and provides a phased roadmap for CLI enhancement.

### Key Metrics

| Metric | Current | Potential | Gap |
|--------|---------|-----------|-----|
| **Total Methods** | 102+ | 102+ | - |
| **CLI Commands** | 22 | ~102 | **80 (78%)** |
| **Feature Categories** | 5/10 | 10 | **5 (50%)** |

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
| 23 | Send reaction | `sendReaction()` | ✅ Test | ❌ | Message | **P0** |
| 24 | Remove reaction | `removeReaction()` | ✅ Test | ❌ | Message | **P0** |
| 25 | Forward message | `forwardMessage()` | ✅ Test | ❌ | Message | **P0** |
| 26 | Edit message | `editMessage()` | ✅ Test | ❌ | Message | **P0** |
| 27 | Delete message (everyone) | `deleteMessage()` | ✅ Test | ❌ | Message | **P0** |
| 28 | Delete message (me only) | `deleteMessageForMe()` | ✅ Test | ❌ | Message | **P0** |
|
| **Contact & Validation** |
|---|---------|------------------|------------------|-------------|----------|----------|
| 29 | Check phone number | `checkNumber()` | ✅ Test | ✅ `check <phone>` | Misc | - |
| 30 | Batch check numbers | `checkNumbers()` | ✅ Test | ✅ `check <phone1> <phone2>` | Misc | - |
| 31 | Get contact info | `getContactInfo()` | ✅ Test | ❌ | Contact | **P1** |
| 32 | Get business profile | `getBusinessProfile()` | ✅ Test | ❌ | Contact | **P1** |
| 33 | Get profile picture | `getProfilePicture()` | ✅ Test | ❌ | Contact | **P1** |
| 34 | Add/edit contact | `addOrEditContact()` | ✅ Test | ❌ | Contact | **P1** |
| 35 | Remove contact | `removeContact()` | ✅ Test | ❌ | Contact | **P1** |
|
| **Group Management** |
|---|---------|------------------|------------------|-------------|----------|----------|
| 36 | Get group info | `getGroupInfo()` | ✅ Test | ✅ `group info <jid>` | Group | - |
| 37 | Get group participants | `getGroupParticipants()` | ✅ Test | ✅ `group participants <jid>` | Group | - |
| 38 | Create group | `createGroup()` | ✅ Test | ✅ `group create <name> <phones..>` | Group | - |
| 39 | Get invite link | `getGroupInviteLink()` | ✅ Test | ✅ `group invite-link <jid>` | Group | - |
| 40 | Add participants | `addParticipants()` | ✅ Test | ❌ | Group | **P0** |
| 41 | Remove participants | `removeParticipants()` | ✅ Test | ❌ | Group | **P0** |
| 42 | Leave group | `leaveGroup()` | ✅ Test | ❌ | Group | **P0** |
| 43 | Promote to admin | `promoteToAdmin()` | ✅ Test | ❌ | Group | **P0** |
| 44 | Demote from admin | `demoteFromAdmin()` | ✅ Test | ❌ | Group | **P0** |
| 45 | Update group name | `updateGroupName()` | ✅ Test | ❌ | Group | **P0** |
| 46 | Update group description | `updateGroupDescription()` | ✅ Test | ❌ | Group | **P0** |
| 47 | Update group picture | `updateGroupPicture()` | ✅ Test | ❌ | Group | **P0** |
| 48 | Revoke invite link | `revokeGroupInvite()` | ✅ Test | ❌ | Group | **P0** |
| 49 | Accept group invite | `acceptGroupInvite()` | ✅ Test | ❌ | Group | **P0** |
| 50 | Get invite info | `getGroupInviteInfo()` | ✅ Test | ❌ | Group | **P0** |
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
| 61 | Add/create label | `addLabel()` | ✅ Test | ❌ | Label | **P1** |
| 62 | Add label to chat | `addChatLabel()` | ✅ Test | ❌ | Label | **P1** |
| 63 | Remove label from chat | `removeChatLabel()` | ✅ Test | ❌ | Label | **P1** |
| 64 | Add label to message | `addMessageLabel()` | ✅ Test | ❌ | Label | P2 |
| 65 | Remove label from message | `removeMessageLabel()` | ✅ Test | ❌ | Label | P2 |
|
| **Business - Catalog (WhatsApp Business Only)** |
|---|---------|------------------|------------------|-------------|----------|----------|
| 66 | Get catalog | `getCatalog()` | ✅ Test | ❌ | Catalog | **P2** |
| 67 | Get collections | `getCollections()` | ✅ Test | ❌ | Catalog | **P2** |
| 68 | Create product | `createProduct()` | ✅ Test | ❌ | Catalog | **P2** |
| 69 | Update product | `updateProduct()` | ✅ Test | ❌ | Catalog | **P2** |
| 70 | Delete products | `deleteProducts()` | ✅ Test | ❌ | Catalog | **P2** |
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
| **Group Management** | 15 | 4 | 11 | 27% |
| **Profile Management** | 4 | 0 | 4 | **0%** ❌ |
| **Presence & UX** | 6 | 0 | 6 | **0%** ❌ |
| **Business - Labels** | 5 | 0 | 5 | **0%** ❌ |
| **Business - Catalog** | 5 | 0 | 5 | **0%** ❌ |
| **Newsletter/Channel** | 21 | 0 | 21 | **0%** ❌ |
| **LID/Privacy** | 6 | 0 | 6 | **0%** ❌ |
| **Debug Mode** | 4 | 4 (REPL) | 0 | **100%** ✅ |
| **REPL Features** | 5 | 5 (REPL) | 0 | **100%** ✅ |
| **TOTAL** | **106** | **31** | **75** | **29%** |

---

## Missing CLI Commands by Priority

### 🔴 Priority 0 (P0) - High-Value Core Features (22 missing)

| # | Feature | miaw-core Method | Proposed CLI Command |
|---|---------|------------------|---------------------|
| **Basic Messaging (2)** |
| 20 | Send video | `sendVideo()` | `send video <phone> <path> [caption]` |
| 21 | Send audio | `sendAudio()` | `send audio <phone> <path>` |
| **Advanced Messaging (6)** |
| 23 | Send reaction | `sendReaction()` | `message react <jid> <msgId> <emoji>` |
| 24 | Remove reaction | `removeReaction()` | `message react-remove <jid> <msgId>` |
| 25 | Forward message | `forwardMessage()` | `message forward <jid> <msgId> <to>` |
| 26 | Edit message | `editMessage()` | `message edit <jid> <msgId> <newText>` |
| 27 | Delete for everyone | `deleteMessage()` | `message delete <jid> <msgId>` |
| 28 | Delete for me only | `deleteMessageForMe()` | `message delete-for-me <jid> <msgId>` |
| **Group Management (11)** |
| 40 | Add participants | `addParticipants()` | `group participants add <jid> <phones..>` |
| 41 | Remove participants | `removeParticipants()` | `group participants remove <jid> <phones..>` |
| 42 | Leave group | `leaveGroup()` | `group leave <jid>` |
| 43 | Promote to admin | `promoteToAdmin()` | `group participants promote <jid> <phones..>` |
| 44 | Demote from admin | `demoteFromAdmin()` | `group participants demote <jid> <phones..>` |
| 45 | Update group name | `updateGroupName()` | `group name set <jid> <name>` |
| 46 | Update description | `updateGroupDescription()` | `group description set <jid> [desc]` |
| 47 | Update picture | `updateGroupPicture()` | `group picture set <jid> <path>` |
| 48 | Revoke invite | `revokeGroupInvite()` | `group invite revoke <jid>` |
| 49 | Accept invite | `acceptGroupInvite()` | `group invite accept <code>` |
| 50 | Get invite info | `getGroupInviteInfo()` | `group invite info <code>` |
| **Profile Management (4)** |
| 51 | Update picture | `updateProfilePicture()` | `profile picture set <path>` |
| 52 | Remove picture | `removeProfilePicture()` | `profile picture remove` |
| 53 | Update name | `updateProfileName()` | `profile name set <name>` |
| 54 | Update status | `updateProfileStatus()` | `profile status set <status>` |

---

### 🟡 Priority 1 (P1) - Common Use Cases (17 missing)

| # | Feature | miaw-core Method | Proposed CLI Command |
|---|---------|------------------|---------------------|
| **Contact Operations (5)** |
| 31 | Get contact info | `getContactInfo()` | `contact info <phone>` |
| 32 | Get business profile | `getBusinessProfile()` | `contact business <phone>` |
| 33 | Get profile picture | `getProfilePicture()` | `contact picture <phone> [high]` |
| 34 | Add/edit contact | `addOrEditContact()` | `contact add <phone> <name>` |
| 35 | Remove contact | `removeContact()` | `contact remove <phone>` |
| **Presence Features (6)** |
| 55 | Mark as read | `markAsRead()` | `presence read <jid> <msgId>` |
| 56 | Send typing | `sendTyping()` | `presence typing <jid> [duration]` |
| 57 | Send recording | `sendRecording()` | `presence recording <jid> [duration]` |
| 58 | Stop typing/recording | `stopTyping()` | `presence stop <jid>` |
| 59 | Set presence | `setPresence()` | `presence set <available\|unavailable>` |
| 60 | Subscribe presence | `subscribePresence()` | `presence subscribe <jid>` |
| **Business Labels (3)** |
| 61 | Create label | `addLabel()` | `label add <name> [color]` |
| 62 | Add to chat | `addChatLabel()` | `label chat add <jid> <labelId>` |
| 63 | Remove from chat | `removeChatLabel()` | `label chat remove <jid> <labelId>` |
| **Other (3)** |
| 22 | Download media | `downloadMedia()` | `media download <jid> <msgId> <path>` |
| 8 | Get instance ID | `getInstanceId()` | `instance id` |
| 9 | Check connected | `isConnected()` | `instance connected` |

---

### 🟢 Priority 2 (P2) - Business Features (26 missing)

| # | Feature | miaw-core Method | Proposed CLI Command |
|---|---------|------------------|---------------------|
| **Catalog (5)** |
| 66 | Get catalog | `getCatalog()` | `catalog list [--limit N]` |
| 67 | Get collections | `getCollections()` | `catalog collections` |
| 68 | Create product | `createProduct()` | `catalog product create <name> <price> <image>` |
| 69 | Update product | `updateProduct()` | `catalog product update <id> [options]` |
| 70 | Delete products | `deleteProducts()` | `catalog product delete <id>` |
| **Labels - Message (2)** |
| 64 | Add to message | `addMessageLabel()` | `label message add <jid> <msgId> <labelId>` |
| 65 | Remove from message | `removeMessageLabel()` | `label message remove <jid> <msgId> <labelId>` |
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

### 🔵 Priority 3 (P3) - Advanced/Power-User Features (10 missing)

| # | Feature | miaw-core Method | Proposed CLI Command |
|---|---------|------------------|---------------------|
| **LID/Privacy (6)** |
| 92 | Resolve LID | `resolveLidToJid()` | `lid resolve <lid>` |
| 93 | Get phone from JID | `getPhoneFromJid()` | `lid phone <jid>` |
| 94 | Register mapping | `registerLidMapping()` | `lid register <lid> <phone>` |
| 95 | Get mappings | `getLidMappings()` | `lid cache show` |
| 96 | Get cache size | `getLidCacheSize()` | `lid cache size` |
| 97 | Clear cache | `clearLidCache()` | `lid cache clear` |
| **Other (4)** |
| 10 | Dispose client | `dispose()` | `instance dispose <id>` |
| 103-106 | REPL commands | N/A | Already in REPL |

---

## Implementation Roadmap

### Phase 1: P0 High-Value Features (22 commands)

**Target:** MVP completion with essential messaging, profile, and group operations

**Timeline:** Immediate - High priority for most users

**Commands to implement:**
- Basic Messaging: `send video`, `send audio`
- Advanced Messaging: `message react`, `message react-remove`, `message forward`, `message edit`, `message delete`, `message delete-for-me`
- Group Management: `group participants add/remove/promote/demote`, `group leave`, `group name/description/picture set`, `group invite revoke/accept/info`
- Profile: `profile picture set/remove`, `profile name/status set`

**Expected coverage after Phase 1:** 53/106 (50%)

---

### Phase 2: P1 Common Use Cases (17 commands)

**Target:** Full contact management and presence features

**Timeline:** Short-term following Phase 1

**Commands to implement:**
- Contact: `contact info/business/picture/add/remove`
- Presence: `presence read/typing/recording/stop/set/subscribe`
- Labels: `label add`, `label chat add/remove`
- Other: `media download`, `instance id`, `instance connected`

**Expected coverage after Phase 2:** 70/106 (66%)

---

### Phase 3: P2 Business Features (26 commands)

**Target:** Complete business automation support

**Timeline:** Medium-term

**Commands to implement:**
- Catalog: `catalog list/collections/product create/update/delete`
- Newsletter: 21 newsletter commands
- Labels: `label message add/remove`

**Expected coverage after Phase 3:** 96/106 (91%)

---

### Phase 4: P3 Advanced Features (10 commands)

**Target:** Power-user and debugging features

**Timeline:** Long-term / On-demand

**Commands to implement:**
- LID: 6 LID/privacy commands
- Other: `instance dispose`, remaining instance utilities

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
├── group.ts                 # Group commands (existing) ⚡ Phase 1
├── misc.ts                  # Misc commands (existing) ⚡ Phase 2
├── message.ts               # NEW ⚡ Phase 1
├── profile.ts               # NEW ⚡ Phase 1
├── contact.ts               # NEW ⚡ Phase 2
├── presence.ts              # NEW ⚡ Phase 2
├── label.ts                 # NEW ⚡ Phase 2
├── catalog.ts               # NEW ⚡ Phase 3
├── newsletter.ts            # NEW ⚡ Phase 3
└── lid.ts                   # NEW ⚡ Phase 4
```

---

## Success Metrics

### Coverage Targets

| Phase | New Commands | Total Commands | Coverage | Target Status |
|-------|--------------|----------------|----------|---------------|
| Current | - | 31 | 29% | Baseline |
| Phase 1 (P0) | +22 | 53 | 50% | ✅ MVP |
| Phase 2 (P1) | +17 | 70 | 66% | ✅ Complete |
| Phase 3 (P2) | +26 | 96 | 91% | ✅ Full Feature |
| Phase 4 (P3) | +10 | 106 | 100% | ✅ Power User |

### Quality Metrics

- **Code Coverage:** Maintain >90% test coverage for new commands
- **Documentation:** All commands in `--help` and REPL `help`
- **Error Handling:** Consistent error messages across all commands
- **Type Safety:** Full TypeScript types for all command options
- **REPL Integration:** Autocomplete support for all new commands

---

## Conclusion

The current miaw-cli provides a solid foundation with **31 commands** (including REPL-only features). However, there is a **71% coverage gap** with **75 missing CLI commands** out of 106 total features.

**Key Findings:**

1. **Basic GET Operations** are 100% complete ✅
2. **Debug & REPL features** are 100% complete ✅
3. **Advanced Messaging** has 0% coverage ❌ (6 missing)
4. **Profile Management** has 0% coverage ❌ (4 missing)
5. **Presence & UX** has 0% coverage ❌ (6 missing)
6. **Business Features** have 0% coverage ❌ (31 missing)

**Recommended Action Plan:**

1. **Phase 1 (Immediate):** Implement 22 P0 high-value commands
2. **Phase 2 (Short-term):** Add 17 P1 common use case commands
3. **Phase 3 (Medium-term):** Complete business features with 26 P2 commands
4. **Phase 4 (Long-term):** Add 10 P3 advanced power-user features

This phased approach ensures the CLI evolves to match miaw-core's comprehensive capabilities while maintaining code quality and user experience.

---

**Document Status:** ✅ Complete (Updated with detailed feature comparison table)
**Next Steps:** Review with team, prioritize based on user feedback, begin Phase 1 implementation
