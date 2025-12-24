# Manual Test Checklist for v1.0.0

**How to use this checklist:**

1. Run the test bot: `node examples/realworld/group-admin-bot.ts` or your own test bot
2. For each test, perform the action and check the box when it works
3. Use `- [ ]` for pending, `- [x]` for completed

---

## Prerequisites

- [ ] Test bot is running
- [ ] WhatsApp is connected (QR code scanned)
- [ ] Have at least 2 test phone numbers available
- [ ] Have a test group (or create one during testing)
- [ ] Have a business account for business features (optional)

---

## Core Client (7 methods)

### Connection & Lifecycle

- [ ] `constructor` - Create client with options
  ```typescript
  const client = new MiawClient({
    instanceId: "test-bot",
    sessionPath: "./sessions",
    debug: true,
  });
  ```
- [ ] `connect()` - Connect to WhatsApp and scan QR code
- [ ] `disconnect()` - Disconnect from WhatsApp
- [ ] `dispose()` - Clean up resources before shutdown
- [ ] `getConnectionState()` - Get current connection state
  ```typescript
  const state = client.getConnectionState(); // "connected" | "connecting" | ...
  ```
- [ ] `getInstanceId()` - Get instance ID
- [ ] `isConnected()` - Check if connected

---

## Messaging (6 methods)

### Sending Messages

- [ ] `sendText(to, text, options?)` - Send text message
  - [ ] Send plain text to individual
  - [ ] Send plain text to group
  - [ ] Send with quoted/quoted message
- [ ] `sendImage(to, media, options?)` - Send image
  - [ ] Send from file path
  - [ ] Send from URL
  - [ ] Send from Buffer
  - [ ] Send with caption
  - [ ] Send as view-once
- [ ] `sendDocument(to, media, options?)` - Send document
  - [ ] Send PDF file
  - [ ] Send with custom mimetype
  - [ ] Send with caption
- [ ] `sendVideo(to, media, options?)` - Send video
  - [ ] Send MP4 video
  - [ ] Send with caption
  - [ ] Send as GIF
  - [ ] Send as PTV (video note/round video)
- [ ] `sendAudio(to, media, options?)` - Send audio
  - [ ] Send audio file
  - [ ] Send as PTT (voice note)
- [ ] `downloadMedia(message)` - Download media from message
  - [ ] Download received image
  - [ ] Download received video
  - [ ] Download received document
  - [ ] Download received audio

---

## Message Operations (6 methods)

- [ ] `sendReaction(messageId, chatId, emoji)` - Send reaction
  - [ ] React with thumb up (👍)
  - [ ] React with heart (❤️)
  - [ ] React with custom emoji
- [ ] `removeReaction(message)` - Remove reaction
- [ ] `forwardMessage(to, message)` - Forward message
  - [ ] Forward text message
  - [ ] Forward media message
- [ ] `editMessage(messageId, chatId, text)` - Edit own message
  - [ ] Edit text within 15 minutes
  - [ ] Verify edit fails after timeout
- [ ] `deleteMessage(message, chatId?)` - Delete for everyone
  - [ ] Delete own sent message
- [ ] `deleteMessageForMe(messageId, chatId)` - Delete only for me

---

## Contact Information (5 methods)

### Number Validation

- [ ] `checkNumber(phone)` - Check if number is on WhatsApp
  - [ ] Check valid WhatsApp number
  - [ ] Check non-WhatsApp number
- [ ] `checkNumbers(phones[])` - Batch check numbers
  - [ ] Check multiple numbers at once
  - [ ] Verify all results returned

### Contact & Business Info

- [ ] `getContactInfo(jidOrPhone)` - Get contact info
  - [ ] Get contact name and status
- [ ] `getBusinessProfile(jidOrPhone)` - Get business profile
  - [ ] Get business profile from business account
  - [ ] Verify error for non-business account
- [ ] `getProfilePicture(jidOrPhone, type?)` - Get profile picture
  - [ ] Get low resolution profile picture
  - [ ] Get high resolution profile picture (type: "preview")

---

## Group Information (2 methods)

- [ ] `getGroupInfo(groupJid)` - Get group metadata
  - [ ] Get group name
  - [ ] Get group description
  - [ ] Get group settings
- [ ] `getGroupParticipants(groupJid)` - Get group members
  - [ ] List all participants
  - [ ] Identify admins vs regular members
  - [ ] Identify super admin

---

## Group Management (11 methods)

### Group Creation

- [ ] `createGroup(name, participants[])` - Create new group
  - [ ] Create group with 2+ participants
  - [ ] Verify group JID is returned

### Participant Management

- [ ] `addParticipants(groupJid, phones[])` - Add members
  - [ ] Add single participant
  - [ ] Add multiple participants
  - [ ] Verify error when not admin
- [ ] `removeParticipants(groupJid, phones[])` - Remove members
  - [ ] Remove single participant
  - [ ] Remove multiple participants
  - [ ] Verify error when not admin
- [ ] `leaveGroup(groupJid)` - Leave group
  - [ ] Leave a group successfully

### Admin Management

- [ ] `promoteToAdmin(groupJid, phones[])` - Promote to admin
  - [ ] Promote single member
  - [ ] Promote multiple members
  - [ ] Verify error when not admin
- [ ] `demoteFromAdmin(groupJid, phones[])` - Demote from admin
  - [ ] Demote single admin
  - [ ] Demote multiple admins
  - [ ] Verify error when not admin

### Group Settings

- [ ] `updateGroupName(groupJid, name)` - Change group name
  - [ ] Update group subject/name
  - [ ] Verify change reflected in group
- [ ] `updateGroupDescription(groupJid, desc?)` - Set/clear description
  - [ ] Set group description
  - [ ] Clear group description (pass empty/undefined)
- [ ] `updateGroupPicture(groupJid, media)` - Change group picture
  - [ ] Upload from file path
  - [ ] Upload from URL
  - [ ] Upload from Buffer

### Group Invites

- [ ] `getGroupInviteLink(groupJid)` - Get invite link
  - [ ] Generate invite link
  - [ ] Verify link format (https://chat.whatsapp.com/...)
- [ ] `revokeGroupInvite(groupJid)` - Revoke and regenerate link
  - [ ] Revoke current invite
  - [ ] Verify new link is generated
- [ ] `acceptGroupInvite(inviteCode)` - Join via invite
  - [ ] Join group with invite code
  - [ ] Join group with full invite URL
- [ ] `getGroupInviteInfo(inviteCode)` - Preview group info
  - [ ] Get group name before joining
  - [ ] Get participant count before joining

---

## Profile Management (4 methods)

- [ ] `updateProfilePicture(media)` - Update own profile picture
  - [ ] Upload from file path
  - [ ] Upload from URL
  - [ ] Upload from Buffer
- [ ] `removeProfilePicture()` - Remove profile picture
  - [ ] Successfully remove profile picture
- [ ] `updateProfileName(name)` - Update display name (push name)
  - [ ] Set new profile name
  - [ ] Verify name changed
- [ ] `updateProfileStatus(status)` - Update "About" text
  - [ ] Set new status message
  - [ ] Verify status changed

---

## Label Operations (WhatsApp Business only) (5 methods)

> **Requires:** Business account

- [ ] `addLabel(label)` - Create or edit label
  - [ ] Create new label with name
  - [ ] Create label with color (LabelColor enum)
  - [ ] Edit existing label
- [ ] `addChatLabel(chatJid, labelId)` - Add label to chat
  - [ ] Label a conversation
- [ ] `removeChatLabel(chatJid, labelId)` - Remove label from chat
  - [ ] Remove label from conversation
- [ ] `addMessageLabel(msgId, chatId, labelId)` - Add label to message
  - [ ] Label specific message
- [ ] `removeMessageLabel(msgId, chatId, labelId)` - Remove label from message
  - [ ] Remove label from specific message

---

## Catalog Operations (WhatsApp Business only) (5 methods)

> **Requires:** Business account with catalog

- [ ] `getCatalog(businessJid?, limit?, cursor?)` - Fetch product catalog
  - [ ] Get all products
  - [ ] Get with limit
  - [ ] Test pagination with cursor
- [ ] `getCollections(businessJid?, limit?)` - Get catalog collections
  - [ ] List all collections
- [ ] `createProduct(options)` - Add new product
  - [ ] Create product with name, price, description
  - [ ] Create product with image
  - [ ] Verify product added
- [ ] `updateProduct(productId, options)` - Modify product
  - [ ] Update product name
  - [ ] Update product price
- [ ] `deleteProducts(productIds[])` - Remove products
  - [ ] Delete single product
  - [ ] Batch delete multiple products

---

## Newsletter/Channel Operations (17 methods)

- [ ] `createNewsletter(name, description?)` - Create newsletter/channel
  - [ ] Create with name only
  - [ ] Create with name and description
  - [ ] Verify newsletter ID returned
- [ ] `getNewsletterMetadata(newsletterId)` - Get newsletter info
  - [ ] Fetch newsletter metadata
  - [ ] Get subscriber count
- [ ] `followNewsletter(newsletterId)` - Follow/subscribe
  - [ ] Subscribe to newsletter
- [ ] `unfollowNewsletter(newsletterId)` - Unsubscribe
  - [ ] Unsubscribe from newsletter
- [ ] `muteNewsletter(newsletterId)` - Mute notifications
  - [ ] Mute newsletter updates
- [ ] `unmuteNewsletter(newsletterId)` - Unmute notifications
  - [ ] Unmute newsletter updates
- [ ] `updateNewsletterName(newsletterId, name)` - Update name
  - [ ] Change newsletter name
- [ ] `updateNewsletterDescription(newsletterId, desc)` - Update description
  - [ ] Change newsletter description
- [ ] `updateNewsletterPicture(newsletterId, media)` - Update cover image
  - [ ] Upload from file path
  - [ ] Upload from URL
- [ ] `removeNewsletterPicture(newsletterId)` - Remove cover image
  - [ ] Remove newsletter picture
- [ ] `reactToNewsletterMessage(newsletterId, msgId, emoji)` - React to post
  - [ ] React with emoji to newsletter post
- [ ] `fetchNewsletterMessages(newsletterId, limit?, cursor?)` - Get message history
  - [ ] Fetch recent messages
  - [ ] Test pagination
- [ ] `subscribeNewsletterUpdates(newsletterId)` - Subscribe to live updates
  - [ ] Enable live updates
- [ ] `getNewsletterSubscribers(newsletterId)` - Get subscribers
  - [ ] Get subscriber count
- [ ] `getNewsletterAdminCount(newsletterId)` - Get admin count
  - [ ] Get number of admins
- [ ] `changeNewsletterOwner(newsletterId, newOwner)` - Transfer ownership
  - [ ] Transfer newsletter to another user
- [ ] `demoteNewsletterAdmin(newsletterId, adminJid)` - Demote admin
  - [ ] Demote newsletter admin
- [ ] `deleteNewsletter(newsletterId)` - Delete newsletter
  - [ ] Delete own newsletter

---

## Contact Management (2 methods)

- [ ] `addOrEditContact(contact)` - Add or update contact
  - [ ] Add new contact with phone and name
  - [ ] Edit existing contact
  - [ ] Verify contact saved
- [ ] `removeContact(phone)` - Remove contact
  - [ ] Remove saved contact
  - [ ] Verify contact removed

---

## LID Mapping (6 methods)

> **Note:** LID is WhatsApp's privacy format for phone numbers

- [ ] `resolveLidToJid(lid)` - Resolve LID to JID
  - [ ] Resolve @lid JID to phone JID
- [ ] `getPhoneFromJid(jid)` - Extract phone from JID
  - [ ] Extract phone number from JID
  - [ ] Handle @s.whatsapp.net JIDs
  - [ ] Handle @g.us JIDs
- [ ] `registerLidMapping(lid, phoneJid)` - Register mapping
  - [ ] Manually register LID to phone mapping
- [ ] `getLidMappings()` - Get all mappings
  - [ ] Get all LID mappings as Record
- [ ] `getLidCacheSize()` - Get cache size
  - [ ] Check current LRU cache size
- [ ] `clearLidCache()` - Clear cache
  - [ ] Clear all LID mappings
  - [ ] Verify cache is empty

---

## UX Features (6 methods)

### Read Receipts

- [ ] `markAsRead(message)` - Mark message as read
  - [ ] Mark individual message as read
  - [ ] Verify blue checkmark appears

### Typing Indicators

- [ ] `sendTyping(to)` - Send typing indicator
  - [ ] Send typing to individual chat
  - [ ] Send typing to group
  - [ ] Verify "typing..." appears
- [ ] `sendRecording(to)` - Send recording indicator
  - [ ] Send "recording audio..." indicator
- [ ] `stopTyping(to)` - Stop typing/recording indicator
  - [ ] Stop typing indicator
  - [ ] Verify indicator disappears

### Presence

- [ ] `setPresence(status)` - Set online/offline status
  - [ ] Set to 'available' (online)
  - [ ] Set to 'unavailable' (offline)
- [ ] `subscribePresence(jidOrPhone)` - Subscribe to presence updates
  - [ ] Subscribe to contact's presence
  - [ ] Receive `presence` events when status changes

---

## Events (10 events)

Verify all events are emitted correctly:

- [ ] `qr` - QR code emitted on first connection
- [ ] `ready` - Client is ready and connected
- [ ] `message` - New message received
  - [ ] Text message
  - [ ] Image message
  - [ ] Video message
  - [ ] Document message
  - [ ] Audio message
  - [ ] Sticker message
- [ ] `message_edit` - Message edited
  - [ ] Receive edit notification
- [ ] `message_delete` - Message deleted/revoked
  - [ ] Receive delete notification
- [ ] `message_reaction` - Reaction added/removed
  - [ ] Receive reaction event
- [ ] `presence` - Presence update
  - [ ] Receive presence change event
- [ ] `connection` - Connection state changed
  - [ ] Receive state updates
- [ ] `disconnected` - Client disconnected
  - [ ] Receive disconnect event with reason
- [ ] `reconnecting` - Reconnection attempt started
  - [ ] Receive reconnect event with attempt number
- [ ] `error` - Error occurred
  - [ ] Receive error event
- [ ] `session_saved` - Session persisted to disk
  - [ ] Receive session saved event

---

## Edge Cases & Error Handling

- [ ] Connection drops and reconnects automatically
- [ ] Invalid phone number handled gracefully
- [ ] Non-existent group handled gracefully
- [ ] Sending message to non-WhatsApp number fails properly
- [ ] Media download from non-media message returns null
- [ ] Operations without proper permissions fail with clear error
- [ ] Network timeout handled properly
- [ ] Session persists after restart

---

## Performance Tests

- [ ] Send 100 messages in succession
- [ ] Handle 10 concurrent message sends
- [ ] LID cache stays under limit (1000 entries)
- [ ] Memory usage stable over 1 hour
- [ ] Reconnection happens within expected time

---

## Test Summary

| Category      | Total   | Passed | Failed | Skipped |
| ------------- | ------- | ------ | ------ | ------- |
| Core Client   | 7       |        |        |         |
| Messaging     | 6       |        |        |         |
| Message Ops   | 6       |        |        |         |
| Contact Info  | 5       |        |        |         |
| Group Info    | 2       |        |        |         |
| Group Mgmt    | 11      |        |        |         |
| Profile Mgmt  | 4       |        |        |         |
| Labels (Biz)  | 5       |        |        |         |
| Catalog (Biz) | 5       |        |        |         |
| Newsletter    | 17      |        |        |         |
| Contacts      | 2       |        |        |         |
| LID Mapping   | 6       |        |        |         |
| UX Features   | 6       |        |        |         |
| Events        | 10+     |        |        |         |
| **TOTAL**     | **81+** |        |        |         |

---

## Notes

Use this section to document any issues found during testing:

```
Test Date: ____________________
Tester: ____________________
WhatsApp Version: ____________________
Node.js Version: ____________________
Miaw Core Version: 1.0.0

Issues Found:
1. _______________________________________________________________
2. _______________________________________________________________
3. _______________________________________________________________

General Notes:
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
```
