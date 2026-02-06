# Miaw-Core Integration Tests

Complete guide for running integration tests with real WhatsApp connection.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Step-by-Step Guide](#step-by-step-guide)
- [Test Files Reference](#test-files-reference)
- [Running Tests](#running-tests)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up test environment
cp .env.test.example .env.test
nano .env.test  # Edit with your test phone number

# 3. First time: Pair with QR code
npm test -- 01-connection
# Scan QR code with WhatsApp when it appears

# 4. Run tests
npm test
```

---

## Step-by-Step Guide

### Step 1: Configure Test Environment

Create `.env.test` file:

```bash
cp .env.test.example .env.test
```

Edit `.env.test` with your values:

```env
# Test bot instance ID
TEST_INSTANCE_ID=miaw-test-bot

# Directory for test session storage
TEST_SESSION_PATH=./test-sessions

# Test contact phone numbers (without + or spaces)
TEST_CONTACT_PHONE_A=6281234567890  # Your test number
TEST_CONTACT_PHONE_B=6289876543210  # Optional: another contact

# Optional: Test group JID (format: 123456789@g.us)
TEST_GROUP_JID=

# Test timeouts (milliseconds)
TEST_CONNECT_TIMEOUT=120000   # 2 minutes for QR scan
TEST_MESSAGE_TIMEOUT=60000    # 1 minute for message receive
```

### Step 2: First-Time Pairing (QR Code Scan)

**Only needed the first time!**

Run the connection test:

```bash
npm test -- 01-connection
```

**What happens:**

1. A QR code appears in your terminal (ASCII art)
2. Open WhatsApp on your phone
3. Go to **Settings → Linked Devices** (or **Three dots → Linked Devices**)
4. Tap **Link a Device**
5. Scan the QR code from your terminal

**After scanning:**

- Session is saved in `./test-sessions/miaw-test-bot/`
- Next runs auto-login (no QR code needed)
- Connection test completes automatically

**To reset pairing:** Delete `./test-sessions/` folder

### Step 3: Running Tests

After pairing, you can run tests:

```bash
# Run all integration tests
npm test

# Run specific test file
npm test -- 01-connection
npm test -- 02-message-receive
npm test -- 05-media-send
```

### Step 4: Interactive Tests (Need Your Input)

Some tests require manual interaction:

```bash
# This waits for you to send messages
npm test -- 02-message-receive
```

When prompted:
1. Open WhatsApp on another phone
2. Send a message to the test bot
3. The test will process it automatically

---

## Test Files Reference

### Connection & Auth (01-connection.test.ts)

| Test | Description | Manual? |
|------|-------------|---------|
| `test_initial_connection` | First-time QR pairing | Yes (first time only) |
| `test_reconnect_with_session` | Auto-login with saved session | No |
| `test_connection_events` | Connection state events | No |
| `test_graceful_disconnect` | Proper disconnect & cleanup | No |

**Command:** `npm test -- 01-connection`

---

### Message Receiving (02-message-receive.test.ts)

| Test | Description | Manual? |
|------|-------------|---------|
| `test_receive_text` | Receive text message | Yes, send text |
| `test_receive_from_lid` | Receive from @lid contact | Yes |
| `test_receive_group_message` | Receive group message | Yes |
| `test_receive_image` | Receive image | Yes, send image |
| `test_receive_video` | Receive video | Yes, send video |

**Command:** `npm test -- 02-message-receive`

**What to do:** Send messages from another phone to the bot during test.

---

### Message Sending (03-message-send.test.ts)

| Test | Description | Manual? |
|------|-------------|---------|
| `test_send_to_phone` | Send to raw phone number | No |
| `test_send_to_jid` | Send to JID format | No |
| `test_send_to_group` | Send to group | No |
| `test_send_long_text` | Send long message (>1000 chars) | No |

**Command:** `npm test -- 03-message-send`

---

### Media Sending (05-media-send.test.ts)

| Test | Description | Manual? |
|------|-------------|---------|
| `test_send_image` | Send image from path | No |
| `test_send_image_with_caption` | Image with caption | No |
| `test_send_document` | Send document | No |
| `test_send_video` | Send video | No |
| `test_send_audio` | Send audio | No |

**Command:** `npm test -- 05-media-send`

**Note:** Tests use sample media files from `tests/fixtures/` directory.

---

### Message Context (07-message-context.test.ts)

| Test | Description | Manual? |
|------|-------------|---------|
| `test_reply_to_message` | Reply with quote | No |
| `test_edit_message` | Edit own message | No |
| `test_delete_message` | Delete for everyone | No |
| `test_send_reaction` | Send emoji reaction | No |
| `test_forward_message` | Forward message | No |

**Command:** `npm test -- 07-message-context`

---

### Group Management (11-group-management.test.ts)

| Test | Description | Manual? |
|------|-------------|---------|
| `test_create_group` | Create new group | No |
| `test_add_participants` | Add members | No |
| `test_remove_participants` | Remove members | No |
| `test_promote_admin` | Promote to admin | No |
| `test_group_invite_link` | Get invite link | No |

**Command:** `npm test -- 11-group-management`

**Note:** Bot must be admin in the test group for some operations.

---

### Profile Management (12-profile-management.test.ts)

| Test | Description | Manual? |
|------|-------------|---------|
| `test_update_profile_picture` | Update profile pic | No |
| `test_update_profile_name` | Update display name | No |
| `test_update_profile_status` | Update "About" | No |

**Command:** `npm test -- 12-profile-management`

---

### Business Features (13-business-features.test.ts)

| Test | Description | Requires |
|------|-------------|----------|
| `test_add_label` | Create label | Business account |
| `test_get_catalog` | Get products | Business account |
| `test_create_product` | Add product | Business account |

**Command:** `npm test -- 13-business-features`

**Note:** Requires WhatsApp Business account.

---

### Newsletter (14-newsletter-features.test.ts)

| Test | Description | Manual? |
|------|-------------|---------|
| `test_create_newsletter` | Create channel | No |
| `test_follow_newsletter` | Follow channel | No |
| `test_fetch_messages` | Get channel messages | No |

**Command:** `npm test -- 14-newsletter-features`

---

## Running Tests

### Run All Tests

```bash
npm test
```

**Note:** This will take a while and requires interaction for some tests.

### Run Specific Category

```bash
npm test -- 01-connection       # Connection only
npm test -- 02-message-receive   # Receive tests (interactive!)
npm test -- 03-message-send      # Send tests
npm test -- 05-media-send        # Media tests
npm test -- 07-message-context   # Reply, edit, delete
npm test -- 11-group-management  # Group operations
npm test -- 12-profile-management # Profile operations
```

### Run Unit Tests Only (Fast, No WhatsApp)

```bash
npm test -- --testPathIgnorePatterns=integration
```

### Run with Verbose Output

```bash
npm test -- --verbose
```

---

## Troubleshooting

### QR Code Not Showing

**Problem:** Test starts but no QR code appears.

**Solution:**
```bash
# Delete old session
rm -rf test-sessions/

# Try again
npm test -- 01-connection
```

### Tests Timing Out

**Problem:** Tests fail with "Exceeded timeout" error.

**Solution:** Increase timeouts in `.env.test`:

```env
TEST_CONNECT_TIMEOUT=120000   # 2 minutes
TEST_MESSAGE_TIMEOUT=60000    # 1 minute
```

### Session Expired

**Problem:** "Session close" or authentication errors.

**Solution:**
```bash
# Delete session and re-pair
rm -rf test-sessions/
npm test -- 01-connection  # Scan QR again
```

### Rate Limiting

**Problem:** Tests fail with "Too many requests" or similar.

**Solution:**
- Wait a few minutes before retrying
- Run tests less frequently
- WhatsApp may temporarily block rapid messaging

### Phone Number Format

**Problem:** "Invalid JID" or "Phone not found" errors.

**Solution:** Use correct format in `.env.test`:

```env
# Correct: No +, no spaces, no dashes
TEST_CONTACT_PHONE_A=6281234567890

# Wrong:
# TEST_CONTACT_PHONE_A=+62-812-3456-7890
# TEST_CONTACT_PHONE_A=081234567890
```

### Test File Not Found

**Problem:** "Test file not found" error.

**Solution:** Use correct test file name pattern:

```bash
# Correct
npm test -- 01-connection
npm test -- 02-message-receive

# Wrong
npm test -- connection.test.ts
npm test -- test-connection
```

---

## CLI Integration Tests

Automated tests for all CLI commands via `runCommand()`. Uses a real WhatsApp connection — no mocks. Skips gracefully when not connected.

### Quick Start

```bash
npm run test:cli
```

### How It Works

- **Shared setup** (`tests/integration/cli/cli-setup.ts`): Pre-warms the client cache so `runCommand()` finds the connected client. Idempotent — first call connects, subsequent calls return immediately.
- **Sequential execution** (`--runInBand`): All 10 test files share one WhatsApp connection via the module-level client cache singleton.
- **Skip logic**: Each connection-dependent test checks `isConnected()` and returns early if not paired.
- **Teardown**: Only the last test file (`10-business-commands.test.ts`) calls `teardownCLITests()`.

### Test Files (77 tests)

| File | Tests | Connection Required | Description |
|------|-------|-------------------|-------------|
| `01-command-router` | 15 | No | Routing, unknown commands, missing args |
| `02-get-commands` | 14 | Yes | profile, contacts, groups, chats, messages, labels |
| `03-check-command` | 4 | Yes | Phone number validation, JSON output |
| `04-contact-commands` | 8 | Yes | list, info, picture, business profile |
| `05-group-commands` | 9 | Yes | list, info, participants, invite-link |
| `06-send-commands` | 6 | Yes | text, image, document + error cases |
| `07-load-commands` | 4 | Yes | Message history loading |
| `08-profile-commands` | 6 | Yes | name/status set with restore |
| `09-instance-commands` | 5 | Partial | list, status |
| `10-business-commands` | 6 | Yes | labels, catalog |

### Environment Variables

Same `.env.test` file as the main integration tests. Key variables:

```env
TEST_INSTANCE_ID=miaw-test-bot
TEST_SESSION_PATH=./test-sessions
TEST_CONTACT_PHONE_A=6281234567890
TEST_CONTACT_PHONE_B=6289876543210
TEST_GROUP_JID=120363012345678@g.us
TEST_CONNECT_TIMEOUT=60000
```

### Running Individual Files

```bash
NODE_OPTIONS='--experimental-vm-modules' jest --testPathPattern='tests/integration/cli/01' --runInBand --forceExit
```

See [CLI Integration Test Plan](../docs/CLI_INTEGRATION_TEST_PLAN.md) for the full checklist.

---

## Test Coverage

| Category | Status | Test File |
|----------|--------|-----------|
| Connection & Auth | ✅ Complete | `01-connection.test.ts` |
| Message Receiving | ✅ Complete | `02-message-receive.test.ts` |
| Message Sending | ✅ Complete | `03-message-send.test.ts` |
| JID Formatting | ✅ Complete | `04-jid-formatting.test.ts` |
| Media Sending | ✅ Complete | `05-media-send.test.ts` |
| Media Download | ✅ Complete | `06-media-download.test.ts` |
| Message Context | ✅ Complete | `07-message-context.test.ts` |
| Contact Info | ✅ Complete | `08-validation-social.test.ts` |
| UX Polish | ✅ Complete | `09-ux-polish.test.ts` |
| Advanced Messaging | ✅ Complete | `10-advanced-messaging.test.ts` |
| Group Management | ✅ Complete | `11-group-management.test.ts` |
| Profile Management | ✅ Complete | `12-profile-management.test.ts` |
| Business Features | ✅ Complete | `13-business-features.test.ts` |
| Newsletter | ✅ Complete | `14-newsletter-features.test.ts` |

---

## Quick Command Reference

| Command | Purpose |
|---------|---------|
| `npm test -- 01-connection` | Test connection & QR pairing |
| `npm test -- 02-message-receive` | Test receiving messages (interactive) |
| `npm test -- 03-message-send` | Test sending messages |
| `npm test -- 05-media-send` | Test sending media |
| `npm test -- 11-group-management` | Test group operations |
| `npm test -- --testPathIgnorePatterns=integration` | Run unit tests only |
| `rm -rf test-sessions/` | Reset pairing (delete session) |

---

## Important Notes

1. **First time = QR scan** - After that, session is saved
2. **Session location:** `./test-sessions/miaw-test-bot/`
3. **Some tests need 2 phones** - One for bot, one for sending test messages
4. **Tests timeout after 60 seconds** - Interact within that time
5. **Business features** require WhatsApp Business account
6. **Not suitable for CI/CD** - Requires manual interaction and external service

---

## Related Documentation

- [TESTS.md](./TESTS.md) - Detailed test plan for v1.0.0
- [MANUAL_TEST_CHECKLIST.md](./MANUAL_TEST_CHECKLIST.md) - Interactive testing checklist
- [../docs/USAGE.md](../docs/USAGE.md) - Complete usage guide
- [../docs/MIGRATION.md](../docs/MIGRATION.md) - Migration guide between versions

---

**Last Updated:** 2025-12-24
**Version:** 1.0.0
