# Test Plan for Miaw-Core v1.0.0

## Testing Strategy

**Goal**: Ensure miaw-core works correctly and doesn't break when updating to newer Baileys versions due to WhatsApp protocol changes.

**Approach**:

1. **Unit Tests** - Fast, isolated tests for utilities and types (68 tests)
2. **Integration Tests** - Real WhatsApp connection tests for all features
3. **Manual Testing** - Interactive checklist for validation

## Test Environment Setup

### Prerequisites

1. **Dedicated Test Phone Number**

   - A real phone number with WhatsApp installed
   - NOT your personal number (tests will send/receive messages)
   - Can be a secondary SIM, Google Voice, or virtual number

2. **Test Contact Setup**

   - At least 2 other WhatsApp contacts for testing:
     - Contact A: Standard contact (phone number visible)
     - Contact B: Contact with @lid (privacy mode enabled, phone hidden)
   - A test group with both contacts
   - (Optional) Business account for business features

3. **Environment Configuration**

   Create `.env.test` file (gitignored):

   ```env
   TEST_INSTANCE_ID=miaw-test-bot
   TEST_SESSION_PATH=./test-sessions
   TEST_CONTACT_PHONE_A=6281234567890  # Standard contact
   TEST_CONTACT_PHONE_B=6289876543210  # @lid contact (if known)
   TEST_GROUP_JID=123456789@g.us       # Test group
   ```

4. **First-Time Pairing**
   - Run tests for the first time
   - Scan QR code with test WhatsApp number
   - Session will persist in `./test-sessions/`
   - Subsequent test runs won't require QR scanning

## Test Files Structure

### Unit Tests (`tests/unit/`)

Fast, isolated tests that don't require WhatsApp connection:

| Test File                 | Tests | Coverage                              |
| ------------------------- | ----- | ------------------------------------- |
| `message-handler.test.ts` | 26    | Message normalization, JID formatting |
| `auth-handler.test.ts`    | 12    | Auth state management                 |
| `types.test.ts`           | 30    | Type definitions and validation       |

Run unit tests only:

```bash
npm test -- --testPathIgnorePatterns=integration
```

### Integration Tests (`tests/integration/`)

Real WhatsApp connection tests for all features:

| Test File                        | Version | Feature                         | Tests |
| -------------------------------- | ------- | ------------------------------- | ----- |
| `01-connection.test.ts`          | v0.1.0  | Connection & Auth               | 8     |
| `02-message-receive.test.ts`     | v0.1.0  | Receive messages                | 8     |
| `03-message-send.test.ts`        | v0.1.0  | Send messages                   | 8     |
| `04-jid-formatting.test.ts`      | v0.1.0  | JID handling                    | 7     |
| `05-media-send.test.ts`          | v0.2.0  | Media sending                   | 12    |
| `06-media-download.test.ts`      | v0.2.0  | Media download                  | 4     |
| `07-message-context.test.ts`     | v0.3.0  | Reply, edit, delete             | 16    |
| `08-validation-social.test.ts`   | v0.4.0  | Contact/group info              | 7     |
| `09-ux-polish.test.ts`           | v0.5.0  | Typing, presence, read receipts | 10    |
| `10-advanced-messaging.test.ts`  | v0.6.0  | Reactions, forward              | 8     |
| `11-group-management.test.ts`    | v0.7.0  | Group operations                | 13    |
| `12-profile-management.test.ts`  | v0.8.0  | Profile operations              | 5     |
| `13-business-features.test.ts`   | v0.9.0  | Labels & catalog                | 10    |
| `14-newsletter-features.test.ts` | v0.9.0  | Newsletter operations           | 18    |

Run integration tests:

```bash
npm test -- 01-connection
npm test -- 02-message-receive
# ... etc
```

## Test Categories by Version

### v0.1.0 - Core Functionality

**Purpose**: Basic WhatsApp connectivity and messaging

| Category          | Tests | Key Features                               |
| ----------------- | ----- | ------------------------------------------ |
| Connection & Auth | 8     | QR code, session persistence, reconnection |
| Message Receiving | 8     | Text, @lid support, group messages         |
| Message Sending   | 8     | Phone/JID/lid/group targets                |
| JID Formatting    | 7     | All JID type handling                      |

**Success Criteria for v0.1.0**:

- [x] All unit tests pass (100%) - ✅ 68/68 passing
- [ ] Connection tests pass (QR, persistence, reconnection) - Requires manual
- [ ] Can send/receive text messages - Requires manual
- [ ] @lid JIDs preserved correctly - Unit tests verified
- [ ] Session persists after restart - Requires manual

---

### v0.2.0 - Media Support

**Purpose**: Send and receive media files

| Test Case                       | Description                | Success Criteria                    |
| ------------------------------- | -------------------------- | ----------------------------------- |
| `test_send_image_from_path`     | Send image file            | Image sent, messageId returned      |
| `test_send_image_with_caption`  | Image with caption         | Caption shown correctly             |
| `test_send_image_view_once`     | View-once image            | View-once flag applied              |
| `test_send_document_from_path`  | Send document              | Document sent with correct mimetype |
| `test_send_video_from_path`     | Send video                 | Video sent successfully             |
| `test_send_video_as_gif`        | Video as GIF loop          | GIF playback enabled                |
| `test_send_audio_from_path`     | Send audio                 | Audio sent successfully             |
| `test_send_audio_as_voice_note` | Send as PTT                | Shown as voice note                 |
| `test_download_image`           | Download received image    | Returns Buffer                      |
| `test_download_video`           | Download received video    | Returns Buffer                      |
| `test_download_document`        | Download received document | Returns Buffer                      |
| `test_download_non_media_fails` | Download text message      | Returns null                        |

---

### v0.3.0 - Message Context

**Purpose**: Reply, edit, delete, and react to messages

| Test Case                          | Description           | Success Criteria             |
| ---------------------------------- | --------------------- | ---------------------------- |
| `test_reply_text_to_message`       | Reply with text       | Quote visible                |
| `test_reply_image_to_message`      | Reply with image      | Image + quote                |
| `test_receive_edit_notification`   | Message edited event  | `message_edit` fires         |
| `test_receive_delete_notification` | Message deleted event | `message_delete` fires       |
| `test_receive_reaction`            | Reaction event        | `message_reaction` fires     |
| `test_edit_message`                | Edit own message      | Text updated (15-min window) |
| `test_delete_message`              | Delete for everyone   | Message removed              |
| `test_send_reaction`               | Send emoji reaction   | Reaction appears             |
| `test_remove_reaction`             | Remove reaction       | Reaction removed             |
| `test_forward_message`             | Forward message       | Message forwarded            |

---

### v0.4.0 - Validation & Info

**Purpose**: Contact validation and information retrieval

| Test Case                     | Description               | Success Criteria          |
| ----------------------------- | ------------------------- | ------------------------- |
| `test_check_valid_number`     | Check WhatsApp number     | Returns exists=true       |
| `test_check_invalid_number`   | Check non-WhatsApp number | Returns exists=false      |
| `test_check_multiple_numbers` | Batch check               | Returns array of results  |
| `test_get_contact_info`       | Get contact info          | Returns ContactInfo       |
| `test_get_business_profile`   | Get business profile      | Returns BusinessProfile   |
| `test_get_profile_picture`    | Get profile pic URL       | Returns URL               |
| `test_get_group_info`         | Get group metadata        | Returns GroupInfo         |
| `test_get_group_participants` | List group members        | Returns participant array |

---

### v0.5.0 - UX Polish

**Purpose**: Read receipts, typing indicators, presence

| Test Case                       | Description          | Success Criteria       |
| ------------------------------- | -------------------- | ---------------------- |
| `test_mark_as_read`             | Mark message as read | Read receipt sent      |
| `test_send_typing_indicator`    | Send "typing..."     | Contact sees typing    |
| `test_send_recording_indicator` | Send "recording..."  | Contact sees recording |
| `test_stop_typing`              | Stop indicator       | Indicator disappears   |
| `test_set_presence_available`   | Set online           | Presence updated       |
| `test_set_presence_unavailable` | Set offline          | Presence updated       |
| `test_subscribe_presence`       | Subscribe to updates | Events received        |

---

### v0.6.0 - Advanced Messaging

**Purpose**: Enhanced messaging features

| Test Case                    | Description         | Success Criteria  |
| ---------------------------- | ------------------- | ----------------- |
| `test_send_reaction`         | React to message    | Reaction sent     |
| `test_remove_reaction`       | Remove reaction     | Reaction removed  |
| `test_forward_message`       | Forward to chat     | Message forwarded |
| `test_edit_message`          | Edit own message    | Text changed      |
| `test_delete_message`        | Delete for everyone | Message removed   |
| `test_delete_message_for_me` | Delete locally      | Only for me       |

---

### v0.7.0 - Group Management

**Purpose**: Full group administration

| Test Case                       | Description       | Success Criteria   |
| ------------------------------- | ----------------- | ------------------ |
| `test_create_group`             | Create new group  | Group JID returned |
| `test_add_participants`         | Add members       | Members added      |
| `test_remove_participants`      | Remove members    | Members removed    |
| `test_promote_to_admin`         | Promote to admin  | Admin promoted     |
| `test_demote_from_admin`        | Demote admin      | Admin demoted      |
| `test_update_group_name`        | Change group name | Name updated       |
| `test_update_group_description` | Set description   | Description set    |
| `test_update_group_picture`     | Change group pic  | Picture updated    |
| `test_get_group_invite_link`    | Get invite link   | Link returned      |
| `test_revoke_group_invite`      | Revoke invite     | New link generated |
| `test_accept_group_invite`      | Join via invite   | Joined group       |
| `test_leave_group`              | Leave group       | Left successfully  |

---

### v0.8.0 - Profile Management

**Purpose**: Bot profile customization

| Test Case                     | Description                 | Success Criteria |
| ----------------------------- | --------------------------- | ---------------- |
| `test_update_profile_picture` | Update from path/URL/Buffer | Picture changed  |
| `test_remove_profile_picture` | Remove picture              | Picture removed  |
| `test_update_profile_name`    | Set display name            | Name updated     |
| `test_update_profile_status`  | Set "About" text            | Status updated   |

---

### v0.9.0 - Business & Social

**Purpose**: WhatsApp Business features

#### Labels (Business Only)

| Test Case                   | Description          | Success Criteria |
| --------------------------- | -------------------- | ---------------- |
| `test_add_label`            | Create label         | Label created    |
| `test_add_chat_label`       | Label a chat         | Chat labeled     |
| `test_remove_chat_label`    | Remove chat label    | Label removed    |
| `test_add_message_label`    | Label message        | Message labeled  |
| `test_remove_message_label` | Remove message label | Label removed    |

#### Catalog (Business Only)

| Test Case              | Description     | Success Criteria   |
| ---------------------- | --------------- | ------------------ |
| `test_get_catalog`     | Fetch catalog   | Products returned  |
| `test_get_collections` | Get collections | Collections listed |
| `test_create_product`  | Add product     | Product created    |
| `test_update_product`  | Edit product    | Product updated    |
| `test_delete_products` | Remove products | Products deleted   |

#### Newsletter/Channels

| Test Case                            | Description          | Success Criteria       |
| ------------------------------------ | -------------------- | ---------------------- |
| `test_create_newsletter`             | Create channel       | Newsletter ID returned |
| `test_get_newsletter_metadata`       | Get channel info     | Metadata returned      |
| `test_follow_newsletter`             | Follow channel       | Following enabled      |
| `test_unfollow_newsletter`           | Unfollow             | Following disabled     |
| `test_mute_newsletter`               | Mute notifications   | Muted                  |
| `test_unmute_newsletter`             | Unmute               | Unmuted                |
| `test_update_newsletter_name`        | Change name          | Name updated           |
| `test_update_newsletter_description` | Change description   | Description updated    |
| `test_update_newsletter_picture`     | Update cover         | Picture updated        |
| `test_remove_newsletter_picture`     | Remove cover         | Picture removed        |
| `test_react_to_newsletter_message`   | React to post        | Reaction sent          |
| `test_fetch_newsletter_messages`     | Get messages         | Messages returned      |
| `test_subscribe_newsletter_updates`  | Live updates         | Updates received       |
| `test_get_newsletter_subscribers`    | Get subscriber count | Count returned         |
| `test_change_newsletter_owner`       | Transfer ownership   | Owner changed          |
| `test_delete_newsletter`             | Delete channel       | Channel deleted        |

---

## Manual Testing Checklist

For comprehensive manual testing, see `tests/MANUAL_TEST_CHECKLIST.md`.

This interactive checklist includes:

- All 81 public methods
- Checkbox tracking
- Test summary table
- Notes section for issues

## Running Tests

### Unit Tests (Fast, No WhatsApp Required)

```bash
# Run all unit tests
npm test -- --testPathIgnorePatterns=integration

# Run specific unit test file
npm test -- message-handler
npm test -- auth-handler
npm test -- types
```

### Integration Tests (Requires WhatsApp)

```bash
# Run all integration tests
npm test

# Run specific test file
npm test -- 01-connection
npm test -- 02-message-receive
npm test -- 05-media-send
npm test -- 11-group-management

# Run with verbose output
npm test -- --verbose

# Run in watch mode
npm test -- --watch
```

### First-Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Create test environment
cp .env.test.example .env.test
# Edit .env.test with your test phone numbers

# 3. Run connection test (pair your number)
npm test -- --testNamePattern="test_initial_connection"
# Scan QR code when prompted

# 4. Run all tests
npm test
```

## Baileys Update Testing Protocol

When updating Baileys to a new version:

### 1. Pre-Update

```bash
# Run full test suite on current version
npm test

# Document passing tests
# Note current Baileys version
npm list @whiskeysockets/baileys
```

### 2. Update Baileys

```bash
npm install @whiskeysockets/baileys@latest
npm run build
```

### 3. Run Test Suite

```bash
# Run all tests
npm test

# Document any failures
```

### 4. Fix Breaking Changes

- Check Baileys changelog for breaking changes
- Update miaw-core to accommodate changes
- Re-run failed tests

### 5. Regression Testing

```bash
# Run full suite again
npm test

# All tests should pass
# Commit with Baileys version in message
```

## Success Criteria for v1.0.0

**Release Checklist**:

### Unit Tests ✅

- [x] 68/68 unit tests pass (100%)
- [x] Message handler tests pass (26/26)
- [x] Auth handler tests pass (12/12)
- [x] Type validation tests pass (30/30)

### Integration Tests ⏳

- [ ] Core functionality tests pass (v0.1.0) - Requires WhatsApp connection
- [ ] Media tests pass (v0.2.0) - Requires WhatsApp connection
- [ ] Message context tests pass (v0.3.0) - Requires WhatsApp connection
- [ ] Validation tests pass (v0.4.0) - Requires WhatsApp connection
- [ ] UX polish tests pass (v0.5.0) - Requires WhatsApp connection
- [ ] Advanced messaging tests pass (v0.6.0) - Requires WhatsApp connection
- [ ] Group management tests pass (v0.7.0) - Requires WhatsApp connection
- [ ] Profile management tests pass (v0.8.0) - Requires WhatsApp connection
- [ ] Business features tests pass (v0.9.0) - Requires WhatsApp connection + Business account

### Manual Testing

- [ ] Complete manual test checklist
- [ ] All 81 public methods tested
- [ ] Edge cases verified
- [ ] No critical errors

## Test Coverage Goals

| Category          | Goal | Status                       |
| ----------------- | ---- | ---------------------------- |
| Unit Tests        | 100% | ✅ 68/68 passing             |
| Integration Tests | 90%+ | ⏳ Requires manual execution |
| API Methods       | 100% | ✅ 81 methods covered        |
| Type Definitions  | 100% | ✅ Full coverage             |

## Known Limitations

1. **Integration Test Timeouts**: Tests require manual interaction (sending messages, scanning QR)
2. **Rate Limiting**: WhatsApp may rate limit test messages (add delays)
3. **Session Expiry**: Sessions may expire after long periods (handle re-pairing)
4. **Business Features**: Require WhatsApp Business account
5. **CI/CD**: Integration tests not suitable for automated pipelines

## Test Maintenance

### Adding New Tests

When adding features:

1. Add unit test to `tests/unit/`
2. Add integration test to `tests/integration/`
3. Update this `TESTS.md` with test cases
4. Update `MANUAL_TEST_CHECKLIST.md` if needed

### Updating Tests

When Baileys changes:

1. Update test expectations
2. Document changes in test comments
3. Verify test still validates functionality
4. Run full test suite

## Quick Reference

### Test Files by Feature

| Feature    | Test File                        | Command                     |
| ---------- | -------------------------------- | --------------------------- |
| Connection | `01-connection.test.ts`          | `npm test -- 01-connection` |
| Messages   | `02-*.test.ts`, `03-*.test.ts`   | `npm test -- "0[23]-"`      |
| Media      | `05-*.test.ts`, `06-*.test.ts`   | `npm test -- "0[56]-"`      |
| Groups     | `11-group-management.test.ts`    | `npm test -- 11-group`      |
| Business   | `13-business-features.test.ts`   | `npm test -- 13-business`   |
| Newsletter | `14-newsletter-features.test.ts` | `npm test -- 14-newsletter` |

### Environment Variables

| Variable               | Description       | Example           |
| ---------------------- | ----------------- | ----------------- |
| `TEST_INSTANCE_ID`     | Bot instance ID   | `miaw-test-bot`   |
| `TEST_SESSION_PATH`    | Session directory | `./test-sessions` |
| `TEST_CONTACT_PHONE_A` | Test contact 1    | `6281234567890`   |
| `TEST_CONTACT_PHONE_B` | Test contact 2    | `6289876543210`   |
| `TEST_GROUP_JID`       | Test group        | `123456789@g.us`  |
| `TEST_CONNECT_TIMEOUT` | Connect timeout   | `120000`          |
| `TEST_MESSAGE_TIMEOUT` | Message timeout   | `60000`           |

---

**Last Updated:** 2025-12-24
**Version:** 1.0.0
**Status:** Stable Release
