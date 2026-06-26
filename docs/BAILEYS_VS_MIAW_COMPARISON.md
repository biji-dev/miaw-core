# Baileys vs Miaw Core - Comprehensive Feature Comparison

**Last Updated:** June 26, 2026  
**Baileys Version:** 7.0.0-rc13  
**Miaw Core Version:** 1.4.1

## Overview

This document provides a comprehensive comparison between [Baileys](https://github.com/WhiskeySockets/Baileys) (the underlying WhatsApp Web API library) and Miaw Core (the simplified wrapper). The analysis covers all capabilities found in both libraries.

### Key Differences

| Aspect                 | Baileys                          | Miaw Core                             |
| ---------------------- | -------------------------------- | ------------------------------------- |
| **Complexity**         | Low-level, complex API           | Simplified, high-level API            |
| **Learning Curve**     | Steep                            | Gentle                                |
| **Message Format**     | Raw WhatsApp protobuf structures | Normalized `MiawMessage` format       |
| **Session Management** | Manual setup required            | Automatic with `AuthHandler`          |
| **Reconnection**       | Manual implementation            | Built-in auto-reconnect               |
| **TypeScript**         | Partial types                    | Full type safety                      |
| **Events**             | Many granular events             | Consolidated, simplified events       |
| **Error Handling**     | Exceptions, Boom errors          | Structured `{success, error}` results |

---

## Feature Comparison Tables

### Legend

| Symbol | Meaning               |
| ------ | --------------------- |
| ✅     | Fully implemented     |
| 🔶     | Partially implemented |
| ❌     | Not implemented       |
| 🏗️     | Planned for future    |
| N/A    | Not applicable        |

---

## 1. Connection & Authentication

| Feature                                  | Baileys | Miaw Core | Notes                                 |
| ---------------------------------------- | ------- | --------- | ------------------------------------- |
| **QR Code Authentication**               | ✅      | ✅        | Miaw emits `qr` event                 |
| **Pairing Code (Phone Number)**          | ✅      | ❌        | Request pairing code via phone number |
| **Session Persistence (Multi-file)**     | ✅      | ✅        | `AuthHandler` manages automatically   |
| **Session Persistence (Single-file)**    | ✅      | ❌        | Multi-file only in Miaw               |
| **Session Persistence (External Store)** | ✅      | ❌        | Redis, MongoDB, etc.                  |
| **Auto-Reconnection**                    | ❌      | ✅        | Manual in Baileys, built-in in Miaw   |
| **Connection State Events**              | ✅      | ✅        | Simplified in Miaw                    |
| **Logout/Disconnect**                    | ✅      | ✅        | `disconnect()` method                 |
| **Clear Session**                        | ✅      | ✅        | `clearSession()` method               |
| **Multiple Instances**                   | ✅      | ✅        | Full support in both                  |
| **Browser Config**                       | ✅      | 🔶        | Fixed browser config in Miaw          |
| **Custom Logger**                        | ✅      | ✅        | Pino-based in both                    |
| **Proxy Support**                        | ✅      | ✅        | HTTP/SOCKS via `proxyUrl` config (v1.3.0) |
| **WebSocket Options**                    | ✅      | ❌        | Custom WS configuration               |

---

## 2. Sending Messages

### 2.1 Text Messages

| Feature                    | Baileys | Miaw Core | Notes                                  |
| -------------------------- | ------- | --------- | -------------------------------------- |
| **Send Text**              | ✅      | ✅        | `sendText()`                           |
| **Send with Quote/Reply**  | ✅      | ✅        | `options.quoted`                       |
| **Send with Mentions**     | ✅      | ❌        | `@mentions` in text                    |
| **Send with Link Preview** | ✅      | 🔶        | Auto-generated in Baileys              |
| **Send Extended Text**     | ✅      | ❌        | Bold, italic, strikethrough, monospace |

### 2.2 Media Messages

| Feature                     | Baileys | Miaw Core | Notes                       |
| --------------------------- | ------- | --------- | --------------------------- |
| **Send Image**              | ✅      | ✅        | `sendImage()` with caption  |
| **Send Video**              | ✅      | ✅        | `sendVideo()` with caption  |
| **Send Audio**              | ✅      | ✅        | `sendAudio()`               |
| **Send Voice Note (PTT)**   | ✅      | ✅        | `options.ptt: true`         |
| **Send Video Note (PTV)**   | ✅      | ✅        | `options.ptv: true`         |
| **Send Document**           | ✅      | ✅        | `sendDocument()`            |
| **Send Sticker**            | ✅      | ❌        | WebP sticker messages       |
| **Send GIF**                | ✅      | ✅        | `options.gifPlayback: true` |
| **View Once (Image/Video)** | ✅      | ✅        | `options.viewOnce: true`    |
| **Media from URL**          | ✅      | ✅        | Pass URL string             |
| **Media from Buffer**       | ✅      | ✅        | Pass Buffer                 |
| **Media from Stream**       | ✅      | ❌        | Readable stream             |
| **Custom Thumbnail**        | ✅      | ❌        | `jpegThumbnail` option      |

### 2.3 Special Messages

| Feature                    | Baileys | Miaw Core | Notes                                  |
| -------------------------- | ------- | --------- | -------------------------------------- |
| **Send Location**          | ✅      | ❌        | Latitude/longitude                     |
| **Send Live Location**     | ✅      | ❌        | Live location sharing                  |
| **Send Contact (vCard)**   | ✅      | ❌        | Contact cards                          |
| **Send Multiple Contacts** | ✅      | ❌        | Multiple vCards                        |
| **Send Poll**              | ✅      | ❌        | Poll messages                          |
| **Send Product**           | ✅      | ❌        | Product message                        |
| **Send Event**             | ✅      | ❌        | Event/calendar messages                |
| **Send Group Invite**      | ✅      | ❌        | Group invite message                   |
| **Send Buttons**           | ✅      | ❌        | Interactive buttons (deprecated by WA) |
| **Send List**              | ✅      | ❌        | List messages (deprecated by WA)       |
| **Send Template**          | ✅      | ❌        | Template messages (deprecated by WA)   |

### 2.4 Message Operations

| Feature                 | Baileys | Miaw Core | Notes                                 |
| ----------------------- | ------- | --------- | ------------------------------------- |
| **Forward Message**     | ✅      | ✅        | `forwardMessage()`                    |
| **Edit Message**        | ✅      | ✅        | `editMessage()` (own messages, 15min) |
| **Delete for Everyone** | ✅      | ✅        | `deleteMessage()`                     |
| **Delete for Me**       | ✅      | ✅        | `deleteMessageForMe()`                |
| **Send Reaction**       | ✅      | ✅        | `sendReaction()`                      |
| **Remove Reaction**     | ✅      | ✅        | `removeReaction()`                    |
| **Pin Message**         | ✅      | ❌        | Pin to chat/group                     |
| **Star Message**        | ✅      | ❌        | Star/favorite message                 |

---

## 3. Receiving & Events

### 3.1 Message Events

| Feature                      | Baileys | Miaw Core | Notes                              |
| ---------------------------- | ------- | --------- | ---------------------------------- |
| **Receive Messages**         | ✅      | ✅        | `message` event with `MiawMessage` |
| **Message Edit Event**       | ✅      | ✅        | `message_edit` event               |
| **Message Delete Event**     | ✅      | ✅        | `message_delete` event             |
| **Message Reaction Event**   | ✅      | ✅        | `message_reaction` event           |
| **History Sync**             | ✅      | 🔶        | Chats/contacts synced to stores    |
| **Poll Updates**             | ✅      | ❌        | Poll vote events                   |
| **Receipt Events**           | ✅      | ❌        | Delivery/read receipts             |
| **Call Events**              | ✅      | ❌        | Incoming/outgoing calls            |
| **Label Association Events** | ✅      | ❌        | Label add/remove events            |

### 3.2 Connection Events

| Feature                | Baileys | Miaw Core | Notes                 |
| ---------------------- | ------- | --------- | --------------------- |
| **Connection Update**  | ✅      | ✅        | `connection` event    |
| **QR Event**           | ✅      | ✅        | `qr` event            |
| **Ready Event**        | ✅      | ✅        | `ready` event         |
| **Disconnected Event** | ✅      | ✅        | `disconnected` event  |
| **Reconnecting Event** | N/A     | ✅        | Miaw-specific         |
| **Credentials Update** | ✅      | ✅        | `session_saved` event |
| **Error Event**        | ✅      | ✅        | `error` event         |

### 3.3 Presence Events

| Feature                | Baileys | Miaw Core | Notes                                                |
| ---------------------- | ------- | --------- | ---------------------------------------------------- |
| **Presence Update**    | ✅      | ✅        | `presence` event                                     |
| **Subscribe Presence** | ✅      | ✅        | `subscribePresence()`                                |
| **Presence Types**     | ✅      | ✅        | available, unavailable, composing, recording, paused |

---

## 4. Media Download & Processing

| Feature                     | Baileys | Miaw Core | Notes                             |
| --------------------------- | ------- | --------- | --------------------------------- |
| **Download Media**          | ✅      | ✅        | `downloadMedia()`                 |
| **Re-upload Expired Media** | ✅      | ✅        | Auto-handled in `downloadMedia()` |
| **Generate Thumbnail**      | ✅      | ❌        | Auto-generate thumbnails          |
| **Get Media Stream**        | ✅      | ❌        | Stream instead of buffer          |

---

## 5. Chat Management

| Feature                   | Baileys | Miaw Core | Notes                     |
| ------------------------- | ------- | --------- | ------------------------- |
| **Mark as Read**          | ✅      | ✅        | `markAsRead()`            |
| **Send Typing**           | ✅      | ✅        | `sendTyping()`            |
| **Send Recording**        | ✅      | ✅        | `sendRecording()`         |
| **Stop Typing**           | ✅      | ✅        | `stopTyping()`            |
| **Set Presence**          | ✅      | ✅        | `setPresence()`           |
| **Archive Chat**          | ✅      | ❌        | Archive/unarchive         |
| **Mute Chat**             | ✅      | ❌        | Mute/unmute notifications |
| **Pin Chat**              | ✅      | ❌        | Pin chat to top           |
| **Delete Chat**           | ✅      | ❌        | Delete entire chat        |
| **Clear Chat**            | ✅      | ❌        | Clear all messages        |
| **Disappearing Messages** | ✅      | ❌        | Set ephemeral timer       |
| **Fetch Message History** | ✅      | ✅        | `loadMoreMessages()`      |
| **Chat Modify**           | ✅      | 🔶        | Used internally           |

---

## 6. User & Contact Operations

| Feature                      | Baileys | Miaw Core | Notes                             |
| ---------------------------- | ------- | --------- | --------------------------------- |
| **Check Number on WhatsApp** | ✅      | ✅        | `checkNumber()`, `checkNumbers()` |
| **Get Contact Info**         | ✅      | ✅        | `getContactInfo()`                |
| **Get Profile Picture**      | ✅      | ✅        | `getProfilePicture()`             |
| **Fetch Status/About**       | ✅      | ✅        | In `getContactInfo()`             |
| **Get Business Profile**     | ✅      | ✅        | `getBusinessProfile()`            |
| **Add/Edit Contact**         | ✅      | ✅        | `addOrEditContact()`              |
| **Remove Contact**           | ✅      | ✅        | `removeContact()`                 |
| **Block User**               | ✅      | ❌        | Block/unblock contacts            |
| **Get Blocklist**            | ✅      | ❌        | List blocked contacts             |
| **Fetch All Contacts**       | ✅      | ✅        | `fetchAllContacts()`              |

---

## 7. Profile Management

| Feature                    | Baileys | Miaw Core | Notes                    |
| -------------------------- | ------- | --------- | ------------------------ |
| **Update Profile Picture** | ✅      | ✅        | `updateProfilePicture()` |
| **Remove Profile Picture** | ✅      | ✅        | `removeProfilePicture()` |
| **Update Profile Name**    | ✅      | ✅        | `updateProfileName()`    |
| **Update Profile Status**  | ✅      | ✅        | `updateProfileStatus()`  |
| **Get Own Profile**        | ✅      | ✅        | `getOwnProfile()`        |

---

## 8. Group Management

### 8.1 Group Operations

| Feature                    | Baileys | Miaw Core | Notes                    |
| -------------------------- | ------- | --------- | ------------------------ |
| **Create Group**           | ✅      | ✅        | `createGroup()`          |
| **Leave Group**            | ✅      | ✅        | `leaveGroup()`           |
| **Get Group Info**         | ✅      | ✅        | `getGroupInfo()`         |
| **Get Group Participants** | ✅      | ✅        | `getGroupParticipants()` |
| **Fetch All Groups**       | ✅      | ✅        | `fetchAllGroups()`       |

### 8.2 Group Participants

| Feature                 | Baileys | Miaw Core | Notes                  |
| ----------------------- | ------- | --------- | ---------------------- |
| **Add Participants**    | ✅      | ✅        | `addParticipants()`    |
| **Remove Participants** | ✅      | ✅        | `removeParticipants()` |
| **Promote to Admin**    | ✅      | ✅        | `promoteToAdmin()`     |
| **Demote from Admin**   | ✅      | ✅        | `demoteFromAdmin()`    |
| **Get Join Requests**   | ✅      | ❌        | Pending join requests  |
| **Approve/Reject Join** | ✅      | ❌        | Handle join requests   |

### 8.3 Group Settings

| Feature                      | Baileys | Miaw Core | Notes                      |
| ---------------------------- | ------- | --------- | -------------------------- |
| **Update Group Name**        | ✅      | ✅        | `updateGroupName()`        |
| **Update Group Description** | ✅      | ✅        | `updateGroupDescription()` |
| **Update Group Picture**     | ✅      | ✅        | `updateGroupPicture()`     |
| **Announcement Mode**        | ✅      | ❌        | Only admins can send       |
| **Restrict Mode**            | ✅      | ❌        | Only admins can edit info  |
| **Member Add Mode**          | ✅      | ❌        | Who can add members        |
| **Ephemeral Mode**           | ✅      | ❌        | Disappearing messages      |

### 8.4 Group Invites

| Feature                     | Baileys | Miaw Core | Notes                      |
| --------------------------- | ------- | --------- | -------------------------- |
| **Get Invite Link**         | ✅      | ✅        | `getGroupInviteLink()`     |
| **Revoke Invite Link**      | ✅      | ✅        | `revokeGroupInvite()`      |
| **Accept Invite**           | ✅      | ✅        | `acceptGroupInvite()`      |
| **Get Invite Info**         | ✅      | ✅        | `getGroupInviteInfo()`     |
| **Join via Invite Message** | ✅      | ❌        | Join from received message |

---

## 9. Business Features (WhatsApp Business)

### 9.1 Labels

| Feature                       | Baileys | Miaw Core | Notes                  |
| ----------------------------- | ------- | --------- | ---------------------- |
| **Add/Edit Label**            | ✅      | ✅        | `addLabel()`           |
| **Fetch All Labels**          | ✅      | ✅        | `fetchAllLabels()`     |
| **Add Label to Chat**         | ✅      | ✅        | `addChatLabel()`       |
| **Remove Label from Chat**    | ✅      | ✅        | `removeChatLabel()`    |
| **Add Label to Message**      | ✅      | ✅        | `addMessageLabel()`    |
| **Remove Label from Message** | ✅      | ✅        | `removeMessageLabel()` |

### 9.2 Catalog & Products

| Feature               | Baileys | Miaw Core | Notes              |
| --------------------- | ------- | --------- | ------------------ |
| **Get Catalog**       | ✅      | ✅        | `getCatalog()`     |
| **Get Collections**   | ✅      | ✅        | `getCollections()` |
| **Create Product**    | ✅      | ✅        | `createProduct()`  |
| **Update Product**    | ✅      | ✅        | `updateProduct()`  |
| **Delete Products**   | ✅      | ✅        | `deleteProducts()` |
| **Get Order Details** | ✅      | ❌        | Order information  |

### 9.3 Business Profile

| Feature                     | Baileys | Miaw Core | Notes                       |
| --------------------------- | ------- | --------- | --------------------------- |
| **Get Business Profile**    | ✅      | ✅        | `getBusinessProfile()`      |
| **Update Business Profile** | ✅      | ❌        | Update address, hours, etc. |
| **Update Cover Photo**      | ✅      | ❌        | Business cover image        |
| **Remove Cover Photo**      | ✅      | ❌        | Remove business cover       |

### 9.4 Quick Replies (Business)

| Feature                | Baileys | Miaw Core | Notes              |
| ---------------------- | ------- | --------- | ------------------ |
| **Add Quick Reply**    | ✅      | ❌        | Create quick reply |
| **Remove Quick Reply** | ✅      | ❌        | Delete quick reply |

---

## 10. Newsletter/Channel Features

| Feature                           | Baileys | Miaw Core | Notes                           |
| --------------------------------- | ------- | --------- | ------------------------------- |
| **Create Newsletter**             | ✅      | ✅        | `createNewsletter()`            |
| **Delete Newsletter**             | ✅      | ✅        | `deleteNewsletter()`            |
| **Get Newsletter Metadata**       | ✅      | ✅        | `getNewsletterMetadata()`       |
| **Follow Newsletter**             | ✅      | ✅        | `followNewsletter()`            |
| **Unfollow Newsletter**           | ✅      | ✅        | `unfollowNewsletter()`          |
| **Mute Newsletter**               | ✅      | ✅        | `muteNewsletter()`              |
| **Unmute Newsletter**             | ✅      | ✅        | `unmuteNewsletter()`            |
| **Update Newsletter Name**        | ✅      | ✅        | `updateNewsletterName()`        |
| **Update Newsletter Description** | ✅      | ✅        | `updateNewsletterDescription()` |
| **Update Newsletter Picture**     | ✅      | ✅        | `updateNewsletterPicture()`     |
| **Remove Newsletter Picture**     | ✅      | ✅        | `removeNewsletterPicture()`     |
| **Send Newsletter Message**       | ✅      | ✅        | `sendNewsletterMessage()`       |
| **Send Newsletter Image**         | ✅      | ✅        | `sendNewsletterImage()`         |
| **Send Newsletter Video**         | ✅      | ✅        | `sendNewsletterVideo()`         |
| **React to Newsletter Message**   | ✅      | ✅        | `reactToNewsletterMessage()`    |
| **Fetch Newsletter Messages**     | ✅      | ✅        | `fetchNewsletterMessages()`     |
| **Subscribe Newsletter Updates**  | ✅      | ✅        | `subscribeNewsletterUpdates()`  |
| **Get Newsletter Subscribers**    | ✅      | ✅        | `getNewsletterSubscribers()`    |
| **Get Newsletter Admin Count**    | ✅      | ✅        | `getNewsletterAdminCount()`     |
| **Change Newsletter Owner**       | ✅      | ✅        | `changeNewsletterOwner()`       |
| **Demote Newsletter Admin**       | ✅      | ✅        | `demoteNewsletterAdmin()`       |

---

## 11. Privacy Settings

| Feature                              | Baileys | Miaw Core | Notes                |
| ------------------------------------ | ------- | --------- | -------------------- |
| **Get Privacy Settings**             | ✅      | ❌        | All privacy settings |
| **Update Last Seen Privacy**         | ✅      | ❌        | all/contacts/none    |
| **Update Online Privacy**            | ✅      | ❌        | all/match_last_seen  |
| **Update Profile Picture Privacy**   | ✅      | ❌        | all/contacts/none    |
| **Update Status Privacy**            | ✅      | ❌        | all/contacts/none    |
| **Update Read Receipts Privacy**     | ✅      | ❌        | all/none             |
| **Update Groups Add Privacy**        | ✅      | ❌        | all/contacts/none    |
| **Update Messages Privacy**          | ✅      | ❌        | all/contacts         |
| **Update Call Privacy**              | ✅      | ❌        | all/known            |
| **Update Default Disappearing Mode** | ✅      | ❌        | Default ephemeral    |

---

## 12. Status/Stories & Broadcasts

| Feature                        | Baileys | Miaw Core | Notes                     |
| ------------------------------ | ------- | --------- | ------------------------- |
| **Send Status/Story**          | ✅      | ❌        | Post to status            |
| **Delete Status**              | ✅      | ❌        | Delete status post        |
| **Send Broadcast**             | ✅      | ❌        | Send to broadcast list    |
| **Query Broadcast Recipients** | ✅      | ❌        | List broadcast recipients |

---

## 13. Communities

| Feature                        | Baileys | Miaw Core | Notes                   |
| ------------------------------ | ------- | --------- | ----------------------- |
| **Get Community Metadata**     | ✅      | ❌        | Community information   |
| **Get Community Sub-groups**   | ✅      | ❌        | List linked groups      |
| **Create Community**           | ✅      | ❌        | Create new community    |
| **Add Community Sub-group**    | ✅      | ❌        | Link group to community |
| **Remove Community Sub-group** | ✅      | ❌        | Unlink group            |
| **Deactivate Community**       | ✅      | ❌        | Deactivate community    |

---

## 14. Calls

| Feature              | Baileys | Miaw Core | Notes                      |
| -------------------- | ------- | --------- | -------------------------- |
| **Call Events**      | ✅      | ❌        | Receive call notifications |
| **Reject Call**      | ✅      | ❌        | Reject incoming call       |
| **Offer Call**       | ✅      | ❌        | Start audio/video call     |
| **Terminate Call**   | ✅      | ❌        | End active call            |
| **Group Video Call** | ✅      | ❌        | Group video calls          |

---

## 15. Utility Functions

| Feature                           | Baileys | Miaw Core | Notes                               |
| --------------------------------- | ------- | --------- | ----------------------------------- |
| **JID Encoding/Decoding**         | ✅      | 🔶        | `MessageHandler.formatPhoneToJid()` |
| **Check JID Type**                | ✅      | 🔶        | Group/user/newsletter/etc.          |
| **LID to JID Resolution**         | ✅      | ✅        | `resolveLidToJid()`                 |
| **Get Phone from JID**            | ✅      | ✅        | `getPhoneFromJid()`                 |
| **Generate Message ID**           | ✅      | ❌        | Custom message IDs                  |
| **Download Content from Message** | ✅      | ✅        | `downloadMedia()`                   |
| **Profile Picture Generation**    | ✅      | ❌        | Crop/resize for profile             |
| **App State Sync**                | ✅      | 🔶        | For labels, used internally         |

---

## 16. Low-Level / Advanced

| Feature                      | Baileys | Miaw Core | Notes                  |
| ---------------------------- | ------- | --------- | ---------------------- |
| **Raw Query**                | ✅      | ❌        | Send raw IQ queries    |
| **Custom Binary Node**       | ✅      | ❌        | Build custom nodes     |
| **Event Buffering**          | ✅      | ❌        | Batch event processing |
| **Signal Repository**        | ✅      | ❌        | Low-level encryption   |
| **USyncQuery**               | ✅      | ❌        | User sync queries      |
| **Custom WebSocket Handler** | ✅      | ❌        | WS event handling      |

---

## Summary Statistics

### Implementation Coverage

| Category                  | Baileys Features | Miaw Core Implemented | Coverage |
| ------------------------- | ---------------- | --------------------- | -------- |
| **Connection & Auth**     | 14               | 11                    | 79%      |
| **Sending Messages**      | 33               | 19                    | 58%      |
| **Receiving & Events**    | 17               | 12                    | 71%      |
| **Media**                 | 4                | 2                     | 50%      |
| **Chat Management**       | 11               | 6                     | 55%      |
| **User & Contacts**       | 10               | 8                     | 80%      |
| **Profile Management**    | 5                | 5                     | 100%     |
| **Group Management**      | 18               | 14                    | 78%      |
| **Business (Labels)**     | 6                | 6                     | 100%     |
| **Business (Catalog)**    | 6                | 5                     | 83%      |
| **Business (Profile/QR)** | 4                | 1                     | 25%      |
| **Newsletter/Channels**   | 19               | 19                    | 100%     |
| **Privacy**               | 10               | 0                     | 0%       |
| **Status/Broadcasts**     | 4                | 0                     | 0%       |
| **Communities**           | 5                | 0                     | 0%       |
| **Calls**                 | 5                | 0                     | 0%       |
| **Utilities**             | 7                | 4                     | 57%      |
| **Low-Level**             | 6                | 0                     | 0%       |
| **TOTAL**                 | ~175             | ~112                  | ~64%     |

### What Miaw Core Focuses On

Miaw Core prioritizes the features that **90% of WhatsApp bots actually need**:

1. ✅ **Core Messaging** - Text, media, reactions, editing, deletion
2. ✅ **Group Management** - Full admin capabilities
3. ✅ **Profile Management** - Complete profile control
4. ✅ **Business Features** - Labels, products, catalogs
5. ✅ **Newsletter/Channels** - Full channel support
6. ✅ **Contact Management** - Add/edit/remove contacts
7. ✅ **UX Features** - Typing indicators, read receipts, presence

### What Miaw Core Doesn't Implement (Yet)

These are all backed by methods that exist in Baileys 7.0.0-rc13 and can be wrapped. Ordered by the prioritized backlog (see **[ROADMAP.md → Not-Yet-Implemented Baileys Features](./ROADMAP.md)**):

1. ❌ **Chat Management** _(priority)_ - archive, pin, mute, clear, delete chat, star/unstar messages (`chatModify`)
2. ❌ **Rich Messages** _(priority)_ - location, contact/vCard, poll (+ vote decoding), sticker, group-invite, pin-in-chat, `@mentions`
3. ❌ **Privacy & Blocklist** - block/unblock, get blocklist, 10 privacy setters (`fetchBlocklist`, `updateBlockStatus`, `update*Privacy`)
4. ❌ **Group Admin & Disappearing** - announce/restrict, join-approval, member-add mode, ephemeral (`groupSettingUpdate`, `groupRequest*`, `groupToggleEphemeral`)
5. ❌ **Calls** - reject call, call events, call links (`rejectCall`, `createCallLink`)
6. ❌ **Business Extras** - update business profile, cover photo, order details, quick replies
7. ❌ **Status/Stories** - post to `status@broadcast`
8. ❌ **Communities** - full `community*` layer (largest surface)
9. 🔶 **Interactive Messages** - buttons/lists/templates deprecated by WhatsApp (low value)

---

## Design Philosophy Comparison

### Baileys Approach

- **Comprehensive** - Exposes nearly every WhatsApp Web feature
- **Low-level** - Direct access to protocol
- **Complex** - Requires understanding of WhatsApp internals
- **Flexible** - Can do anything WhatsApp Web can do
- **Events** - Many granular events to handle

### Miaw Core Approach

- **Focused** - Essential bot features only
- **High-level** - Simplified abstractions
- **Simple** - Easy to learn and use
- **Opinionated** - Best practices built-in
- **Events** - Consolidated, meaningful events

---

## Migration Considerations

### When to Use Baileys Directly

- Need low-level protocol access
- Implementing features Miaw doesn't have
- Custom session storage backends
- Need maximum control over behavior
- Building a full WhatsApp client

### When to Use Miaw Core

- Building WhatsApp bots
- Quick prototyping
- Don't want to handle reconnection logic
- Want simplified message handling
- Need normalized message format
- TypeScript with full type safety
- Multiple bot instances

---

## References

- **Baileys Repository:** https://github.com/WhiskeySockets/Baileys
- **Baileys Documentation:** https://baileys.whiskeysockets.io/
- **Miaw Core Documentation:** [docs/USAGE.md](./USAGE.md)
- **Miaw Core Roadmap:** [docs/ROADMAP.md](./ROADMAP.md)

---

_This analysis was last updated on June 26, 2026, based on Baileys v7.0.0-rc13 and Miaw Core v1.4.1._
