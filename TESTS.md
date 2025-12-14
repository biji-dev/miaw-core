# Test Plan for Miaw-Core v0.1.0

## Testing Strategy

**Goal**: Ensure miaw-core works correctly and doesn't break when updating to newer Baileys versions due to WhatsApp protocol changes.

**Approach**: Automated integration tests using a dedicated test WhatsApp number. Tests run against real WhatsApp to catch protocol changes, Baileys incompatibilities, and real-world edge cases.

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
   - Optional: A test group with both contacts

3. **Environment Configuration**

   - Create `.env.test` file (gitignored):

     ```env
     TEST_INSTANCE_ID=miaw-test-bot
     TEST_SESSION_PATH=./test-sessions
     TEST_CONTACT_PHONE_A=6281234567890  # Standard contact
     TEST_CONTACT_PHONE_B=6289876543210  # @lid contact (if known)
     TEST_GROUP_JID=123456789@g.us       # Optional test group
     ```

4. **First-Time Pairing**
   - Run tests for the first time
   - Scan QR code with test WhatsApp number
   - Session will persist in `./test-sessions/`
   - Subsequent test runs won't require QR scanning

## Test Categories

### 1. Connection & Authentication Tests

**Purpose**: Verify connection stability and session persistence

| Test Case                      | Description                          | Success Criteria                            |
| ------------------------------ | ------------------------------------ | ------------------------------------------- |
| `test_initial_connection`      | Connect to WhatsApp for first time   | QR code generated, connection succeeds      |
| `test_session_persistence`     | Reconnect using saved session        | No QR code, auto-connect with saved session |
| `test_connection_events`       | Verify all connection events fire    | Events: `connecting`, `connected`, `ready`  |
| `test_graceful_disconnect`     | Properly disconnect and cleanup      | Socket closed, no hanging processes         |
| `test_reconnection_on_failure` | Handle network interruption          | Auto-reconnect, exponential backoff works   |
| `test_logout_handling`         | Handle logout (don't auto-reconnect) | Detect `loggedOut`, stop reconnection       |

### 2. Message Receiving Tests

**Purpose**: Verify all message types are received and normalized correctly

| Test Case                            | Description                         | Success Criteria                        |
| ------------------------------------ | ----------------------------------- | --------------------------------------- |
| `test_receive_text_standard`         | Receive text from @s.whatsapp.net   | Message received, JID format correct    |
| `test_receive_text_lid`              | Receive text from @lid contact      | Message received, @lid JID preserved    |
| `test_extract_sender_phone_standard` | Extract phone from standard contact | `senderPhone` matches known number      |
| `test_extract_sender_phone_lid`      | Extract phone from @lid contact     | `senderPhone` extracted from `senderPn` |
| `test_extract_sender_name`           | Extract sender display name         | `senderName` from `pushName` present    |
| `test_receive_group_message`         | Receive message from group          | `isGroup=true`, `participant` set       |
| `test_receive_image_with_caption`    | Receive image message               | Type=image, caption extracted           |
| `test_receive_video_with_caption`    | Receive video message               | Type=video, caption extracted           |
| `test_receive_document`              | Receive document message            | Type=document detected                  |
| `test_receive_audio`                 | Receive audio message               | Type=audio detected                     |
| `test_receive_sticker`               | Receive sticker message             | Type=sticker detected                   |
| `test_ignore_own_messages`           | Don't process own messages          | `fromMe=true` messages skipped          |
| `test_message_timestamp`             | Timestamp accuracy                  | Unix timestamp within 5 seconds         |

### 3. Message Sending Tests

**Purpose**: Verify messages can be sent to all JID types

| Test Case                      | Description                  | Success Criteria                          |
| ------------------------------ | ---------------------------- | ----------------------------------------- |
| `test_send_to_phone_number`    | Send using raw phone number  | Converts to @s.whatsapp.net, sends        |
| `test_send_to_standard_jid`    | Send to @s.whatsapp.net      | Preserves format, sends successfully      |
| `test_send_to_lid_jid`         | Send to @lid address         | Preserves @lid format, sends successfully |
| `test_send_to_group`           | Send to group (@g.us)        | Message appears in group                  |
| `test_send_long_message`       | Send message >1000 chars     | Full message delivered                    |
| `test_send_special_characters` | Send emoji, unicode, symbols | Characters preserved correctly            |
| `test_send_when_disconnected`  | Send while disconnected      | Returns error, doesn't crash              |
| `test_send_invalid_jid`        | Send to malformed JID        | Returns error gracefully                  |

### 3.1 Media Sending Tests (v0.2.0)

**Purpose**: Verify media messages can be sent correctly

#### Image Sending

| Test Case                        | Description                   | Success Criteria                          |
| -------------------------------- | ----------------------------- | ----------------------------------------- |
| `test_send_image_from_path`      | Send image using file path    | Image sent, messageId returned            |
| `test_send_image_with_caption`   | Send image with caption text  | Image + caption sent successfully         |
| `test_send_image_from_buffer`    | Send image from Buffer        | Buffer converted to image, sent           |
| `test_send_image_view_once`      | Send view-once image          | View-once flag applied, sent              |
| `test_send_image_to_group`       | Send image to group           | Image appears in group chat               |
| `test_send_image_when_disconnected` | Send image while disconnected | Returns error, doesn't crash           |

#### Document Sending

| Test Case                          | Description                     | Success Criteria                        |
| ---------------------------------- | ------------------------------- | --------------------------------------- |
| `test_send_document_from_path`     | Send document using file path   | Document sent, messageId returned       |
| `test_send_document_with_filename` | Send document with custom name  | Custom filename shown to recipient      |
| `test_send_document_with_caption`  | Send document with caption      | Document + caption sent successfully    |
| `test_send_document_pdf`           | Send PDF document               | PDF mimetype detected/applied           |
| `test_send_document_from_buffer`   | Send document from Buffer       | Buffer sent as document                 |

#### Video Sending

| Test Case                        | Description                   | Success Criteria                          |
| -------------------------------- | ----------------------------- | ----------------------------------------- |
| `test_send_video_from_path`      | Send video using file path    | Video sent, messageId returned            |
| `test_send_video_with_caption`   | Send video with caption text  | Video + caption sent successfully         |
| `test_send_video_as_gif`         | Send video with gifPlayback   | Video plays as GIF loop                   |
| `test_send_video_from_buffer`    | Send video from Buffer        | Buffer converted to video, sent           |

#### Audio Sending

| Test Case                        | Description                   | Success Criteria                          |
| -------------------------------- | ----------------------------- | ----------------------------------------- |
| `test_send_audio_from_path`      | Send audio using file path    | Audio sent, messageId returned            |
| `test_send_audio_as_voice_note`  | Send audio as PTT (voice)     | Audio shown as voice note                 |
| `test_send_audio_from_buffer`    | Send audio from Buffer        | Buffer converted to audio, sent           |

### 3.2 Media Download Tests (v0.2.0)

**Purpose**: Verify media can be downloaded from received messages

| Test Case                          | Description                        | Success Criteria                        |
| ---------------------------------- | ---------------------------------- | --------------------------------------- |
| `test_download_image`              | Download image from message        | Returns Buffer with image data          |
| `test_download_video`              | Download video from message        | Returns Buffer with video data          |
| `test_download_audio`              | Download audio from message        | Returns Buffer with audio data          |
| `test_download_document`           | Download document from message     | Returns Buffer with document data       |
| `test_download_non_media_fails`    | Attempt download on text message   | Returns null, logs error gracefully     |
| `test_download_without_raw_fails`  | Download message without raw field | Returns null, logs error gracefully     |

### 3.3 Message Context Tests (v0.3.0)

**Purpose**: Verify message context features (replies, edits, deletes, reactions)

#### Reply to Messages (Quoted)

| Test Case                          | Description                        | Success Criteria                        |
| ---------------------------------- | ---------------------------------- | --------------------------------------- |
| `test_reply_text_to_message`       | Reply to message with text         | Text sent as reply with quote visible   |
| `test_reply_text_without_raw_field`| Reply with invalid MiawMessage     | Sends normally (quote ignored)          |
| `test_reply_image_to_message`      | Reply to message with image        | Image sent as reply with quote visible  |
| `test_reply_document_to_message`   | Reply to message with document     | Document sent as reply with quote       |
| `test_reply_video_to_message`      | Reply to message with video        | Video sent as reply with quote visible  |
| `test_reply_audio_to_message`      | Reply to message with audio        | Audio sent as reply with quote visible  |
| `test_reply_to_group_message`      | Reply to message in group          | Reply appears in group with quote       |
| `test_reply_to_own_message`        | Reply to bot's own message         | Self-reply works if raw available       |

#### Edit Notifications

| Test Case                          | Description                        | Success Criteria                        |
| ---------------------------------- | ---------------------------------- | --------------------------------------- |
| `test_receive_edit_notification`   | Receive edit notification          | `message_edit` event fires              |
| `test_edit_notification_has_new_text` | Edit contains new text          | `newText` field has updated content     |
| `test_edit_notification_has_timestamp` | Edit has timestamp             | `editTimestamp` is valid number         |

#### Delete Notifications

| Test Case                          | Description                        | Success Criteria                        |
| ---------------------------------- | ---------------------------------- | --------------------------------------- |
| `test_receive_delete_notification` | Receive delete notification        | `message_delete` event fires            |
| `test_delete_notification_has_fromMe` | Delete has fromMe field         | `fromMe` boolean indicates sender       |

#### Reactions

| Test Case                          | Description                        | Success Criteria                        |
| ---------------------------------- | ---------------------------------- | --------------------------------------- |
| `test_receive_reaction`            | Receive reaction to message        | `message_reaction` event fires          |
| `test_reaction_emoji_field`        | Reaction has emoji                 | `emoji` field contains reaction         |
| `test_reaction_is_removal_field`   | Reaction has isRemoval flag        | `isRemoval` indicates if removed        |

### 3.4 Contact Validation & Group Info Tests (v0.4.0)

**Purpose**: Verify contact validation and group information features

#### Check Number

| Test Case                          | Description                        | Success Criteria                        |
| ---------------------------------- | ---------------------------------- | --------------------------------------- |
| `test_check_valid_number`          | Check valid WhatsApp number        | Returns exists=true with JID            |
| `test_check_invalid_number`        | Check invalid number               | Returns exists=false                    |
| `test_check_number_with_formatting`| Check number with +, -, spaces     | Cleans and checks correctly             |
| `test_check_multiple_numbers`      | Batch check multiple numbers       | Returns array of results                |

#### Contact Info

| Test Case                          | Description                        | Success Criteria                        |
| ---------------------------------- | ---------------------------------- | --------------------------------------- |
| `test_get_contact_info`            | Get contact information            | Returns ContactInfo with JID, status    |
| `test_get_business_profile`        | Get business profile               | Returns BusinessProfile or null         |

#### Profile Picture

| Test Case                          | Description                        | Success Criteria                        |
| ---------------------------------- | ---------------------------------- | --------------------------------------- |
| `test_get_profile_picture_low_res` | Get low-res profile picture        | Returns URL or null                     |
| `test_get_profile_picture_high_res`| Get high-res profile picture       | Returns URL or null                     |

#### Group Info

| Test Case                          | Description                        | Success Criteria                        |
| ---------------------------------- | ---------------------------------- | --------------------------------------- |
| `test_get_group_info`              | Get group metadata                 | Returns GroupInfo with participants     |
| `test_get_group_participants`      | Get group participant list         | Returns array of GroupParticipant       |
| `test_get_group_info_invalid_jid`  | Get info for invalid group JID     | Returns null                            |
| `test_get_group_profile_picture`   | Get group profile picture          | Returns URL or null                     |

### 3.5 UX Polish Tests (v0.5.0)

**Purpose**: Verify read receipts, typing indicators, and presence features

#### Read Receipts

| Test Case                          | Description                        | Success Criteria                        |
| ---------------------------------- | ---------------------------------- | --------------------------------------- |
| `test_mark_as_read_requires_raw_message` | markAsRead needs raw field   | Returns false without raw data          |
| `test_mark_as_read_with_received_message` | Mark actual message as read | Returns true, read receipt sent         |

#### Typing & Recording Indicators

| Test Case                          | Description                        | Success Criteria                        |
| ---------------------------------- | ---------------------------------- | --------------------------------------- |
| `test_send_typing_indicator`       | Send typing indicator              | Contact sees "typing..."                |
| `test_send_recording_indicator`    | Send recording indicator           | Contact sees "recording audio..."       |
| `test_send_typing_to_group`        | Send typing indicator to group     | Group members see typing indicator      |

#### Presence

| Test Case                          | Description                        | Success Criteria                        |
| ---------------------------------- | ---------------------------------- | --------------------------------------- |
| `test_set_presence_available`      | Set bot presence to online         | Presence updated to 'available'         |
| `test_set_presence_unavailable`    | Set bot presence to offline        | Presence updated to 'unavailable'       |
| `test_subscribe_presence`          | Subscribe to contact presence      | `presence` events received on changes   |
| `test_presence_event_structure`    | Verify PresenceUpdate type         | Contains jid, status, lastSeen fields   |

### 4. JID Format Handling Tests

**Purpose**: Ensure all WhatsApp JID formats are handled correctly

| Test Case                         | Description                 | Success Criteria       |
| --------------------------------- | --------------------------- | ---------------------- |
| `test_format_phone_to_jid`        | Raw phone → @s.whatsapp.net | Correct conversion     |
| `test_preserve_lid_format`        | @lid input → @lid output    | No conversion          |
| `test_preserve_group_format`      | @g.us input → @g.us output  | No conversion          |
| `test_preserve_broadcast_format`  | @broadcast preserved        | No conversion          |
| `test_preserve_newsletter_format` | @newsletter preserved       | No conversion          |
| `test_preserve_cus_format`        | @c.us preserved             | No conversion          |
| `test_clean_phone_input`          | Phone with +, -, spaces     | Cleaned and formatted  |
| `test_is_group_jid`               | Detect group JIDs           | Returns true for @g.us |

### 5. Message Normalization Tests

**Purpose**: Verify Baileys messages are correctly normalized to MiawMessage

| Test Case                          | Description                 | Success Criteria                   |
| ---------------------------------- | --------------------------- | ---------------------------------- |
| `test_normalize_conversation`      | Simple conversation message | Text extracted from `conversation` |
| `test_normalize_extended_text`     | Extended text message       | Text from `extendedTextMessage`    |
| `test_normalize_image_caption`     | Image with caption          | Caption extracted, type=image      |
| `test_normalize_video_caption`     | Video with caption          | Caption extracted, type=video      |
| `test_normalize_missing_fields`    | Message with missing data   | Graceful handling, no crash        |
| `test_normalize_group_participant` | Group message participant   | `participant` field populated      |
| `test_raw_message_preserved`       | Original message stored     | `raw` field contains Baileys msg   |

### 6. Error Handling & Edge Cases

**Purpose**: Verify robust error handling

| Test Case                         | Description                   | Success Criteria                    |
| --------------------------------- | ----------------------------- | ----------------------------------- |
| `test_invalid_instance_id`        | Empty/invalid instance ID     | Throws clear error                  |
| `test_invalid_session_path`       | Non-existent path             | Creates directory or errors cleanly |
| `test_multiple_instances`         | Run 2+ clients simultaneously | No conflicts, separate sessions     |
| `test_connection_timeout`         | Network unavailable           | Timeout error, retry logic          |
| `test_malformed_message`          | Receive corrupted message     | Logs error, doesn't crash           |
| `test_rapid_disconnect_reconnect` | Disconnect/connect rapidly    | No race conditions                  |
| `test_send_rate_limiting`         | Send many messages quickly    | Handle WhatsApp rate limits         |

### 7. Debug & Logging Tests

**Purpose**: Verify logging and debugging features

| Test Case                    | Description                 | Success Criteria               |
| ---------------------------- | --------------------------- | ------------------------------ |
| `test_debug_mode_enabled`    | `debug: true` logs output   | Raw Baileys messages logged    |
| `test_debug_mode_disabled`   | `debug: false` minimal logs | Raw messages not logged        |
| `test_custom_logger`         | Use custom logger instance  | Custom logger receives logs    |
| `test_message_event_emitted` | Message event fires         | Event handler receives message |
| `test_error_event_emitted`   | Error event fires           | Error handler receives error   |

## Test Execution Plan

### Phase 1: Core Functionality (Must Pass)

Run these tests first - if any fail, fix before proceeding:

- All Connection & Authentication tests
- `test_receive_text_standard`
- `test_send_to_phone_number`
- `test_format_phone_to_jid`

### Phase 2: @lid Support (Critical for v0.1.0)

Test the new @lid functionality:

- `test_receive_text_lid`
- `test_extract_sender_phone_lid`
- `test_send_to_lid_jid`
- `test_preserve_lid_format`

### Phase 3: Full Message Support

Test all message types:

- All Message Receiving tests
- All Message Sending tests
- All Message Normalization tests

### Phase 4: Edge Cases & Stability

Run remaining tests for robustness:

- Error Handling & Edge Cases
- Debug & Logging tests

## Running Tests

### Setup

```bash
# Install test dependencies
npm install --save-dev jest @types/jest ts-jest dotenv

# Create test environment file
cp .env.test.example .env.test
# Edit .env.test with your test phone numbers

# First run: Pair test WhatsApp number
npm test -- --testNamePattern="test_initial_connection"
# Scan QR code when prompted

# Subsequent runs: All tests
npm test
```

### Test Commands

```bash
# Run all tests
npm test

# Run specific category
npm test -- --testNamePattern="Connection"
npm test -- --testNamePattern="@lid"

# Run in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## Baileys Update Testing Protocol

When updating Baileys to a new version:

1. **Pre-Update**

   - Run full test suite on current version
   - Document all passing tests
   - Note current Baileys version

2. **Update Baileys**

   ```bash
   npm install @whiskeysockets/baileys@latest
   npm run build
   ```

3. **Run Test Suite**

   - Run all tests in order (Phase 1-4)
   - Document any failures

4. **Fix Breaking Changes**

   - For failed tests, check Baileys changelog
   - Update miaw-core to accommodate changes
   - Re-run failed tests

5. **Regression Testing**
   - Run full suite again
   - All tests should pass
   - Commit changes with Baileys version in commit message

## Success Criteria for v0.1.0

**Release Checklist**:

- [ ] All Phase 1 tests pass (100%)
- [ ] All Phase 2 tests pass (100%)
- [ ] At least 90% of Phase 3 tests pass
- [ ] At least 80% of Phase 4 tests pass
- [ ] No critical errors or crashes
- [ ] @lid messages work end-to-end
- [ ] Standard phone number messages work
- [ ] Session persists after restart

## Test Maintenance

### Adding New Tests

When adding features, add corresponding tests:

1. Document test case in this file
2. Implement test in `tests/integration/`
3. Run test to verify it passes
4. Update success criteria if needed

### Updating Tests

When Baileys changes:

1. Update test expectations to match new behavior
2. Document changes in test comments
3. Verify test still validates the same functionality

## Known Limitations

1. **Cannot test @lid → phone conversion**: WhatsApp doesn't allow reverse lookup of @lid to phone number
2. **Rate limiting**: WhatsApp may rate limit test messages (add delays between sends)
3. **QR expiry**: QR codes expire after ~60 seconds (tests should handle retry)
4. **Session expiry**: Sessions may expire after long periods (tests should handle re-pairing)

## Test Coverage Goals

- **Connection handling**: 100%
- **Message receiving**: 90%+
- **Message sending**: 90%+
- **JID formatting**: 100%
- **Error handling**: 80%+

---

_Last Updated: 2025-12-14_
_Version: 0.5.0_
