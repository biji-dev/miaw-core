# Miaw-Core Integration Tests

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Test Environment

```bash
# Copy the example env file
cp .env.test.example .env.test

# Edit .env.test with your test phone numbers
nano .env.test
```

### 3. First Run (Pairing)

```bash
# Run connection test to pair your test WhatsApp number
npm test -- --testNamePattern="test_initial_connection"

# Scan QR code when prompted
```

### 4. Run All Tests

```bash
# Run complete test suite
npm test

# Run specific test file
npm test -- 01-connection

# Run in watch mode
npm test:watch

# Generate coverage report
npm test:coverage
```

## Test Files

### 01-connection.test.ts

Tests connection, authentication, and session persistence.

- ✅ Fully automated after first pairing
- No manual interaction needed

### 02-message-receive.test.ts

Tests receiving messages from different JID types.

- ⚠️ Requires manual interaction (sending test messages)
- Follow on-screen prompts during test execution

### 03-message-send.test.ts

Tests sending messages to different JID types.

- ✅ Mostly automated
- May need @lid JID configuration

### 04-jid-formatting.test.ts

Tests JID formatting and validation logic.

- ✅ Fully automated
- No WhatsApp connection needed

## Running Tests Manually

### Test Connection Only

```bash
npm test -- 01-connection
```

### Test Message Receiving (Interactive)

```bash
npm test -- 02-message-receive
# Be ready to send messages when prompted!
```

### Test Message Sending

```bash
npm test -- 03-message-send
```

### Test JID Formatting

```bash
npm test -- 04-jid-formatting
```

## Troubleshooting

### QR Code Not Showing

- Make sure `debug: true` in test setup
- Check that session doesn't already exist
- Delete `test-sessions/` and try again

### Tests Timing Out

- Increase timeout in `.env.test`:

  ```env
  TEST_CONNECT_TIMEOUT=120000
  TEST_MESSAGE_TIMEOUT=60000
  ```

### Session Expired

- Delete `test-sessions/` directory
- Re-run connection test to re-pair

### Rate Limiting

- Add delays between tests
- Don't run tests too frequently
- WhatsApp may temporarily block rapid messaging

## CI/CD Notes

These tests are **NOT suitable for CI/CD** because they:

1. Require QR code scanning (first time)
2. Need manual message sending (receive tests)
3. Depend on external WhatsApp service
4. May be rate-limited

For CI/CD, consider:

- Running only unit tests (JID formatting)
- Mocking Baileys socket
- Using recorded fixtures

## Test Coverage Goals

Current implementation covers:

- ✅ Connection & Authentication
- ✅ @lid format support
- ✅ Standard phone number messaging
- ✅ JID format preservation
- ✅ Sender information extraction
- ⏳ Group messaging (partial)
- ⏳ Media messages (not implemented)
- ⏳ Error handling (not implemented)

See `TESTS.md` for complete test plan.
