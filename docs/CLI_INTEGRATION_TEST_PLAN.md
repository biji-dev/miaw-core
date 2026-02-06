# CLI Integration Test Plan

## Overview

End-to-end integration tests for the miaw-core CLI tool. All tests run against a real WhatsApp connection — no mocks. If the account is not paired/connected, the entire suite is skipped.

**Framework**: Jest (same as existing tests)
**Location**: `tests/integration/cli/`
**Run command**: `npm run test:cli`

---

## Implementation Checklist

### Phase 1: Infrastructure

- [x] **1.1** Create `tests/integration/cli/` directory
- [x] **1.2** Create shared test setup (`tests/integration/cli/cli-setup.ts`)
  - Connect client once in `beforeAll`, disconnect in `afterAll`
  - `isConnected()` helper — skips test if no session/not paired
  - `runCmd(command, args)` wrapper around `runCommand()` with shared client context
  - `captureConsole()` manual start/stop for output assertions
- [x] **1.3** Create test fixtures (`tests/fixtures/`)
  - `test-image.jpg` — minimal 338-byte JPEG for send image tests
  - `test-doc.txt` — small text file for send document tests
- [x] **1.4** Add npm script `"test:cli"` in `package.json`
  - `NODE_OPTIONS='--experimental-vm-modules' jest --testPathPattern='tests/integration/cli' --runInBand --forceExit`
- [x] **1.5** Verify `.env.test` has required vars documented
  - `TEST_INSTANCE_ID`, `TEST_SESSION_PATH`
  - `TEST_CONTACT_PHONE_A`, `TEST_CONTACT_PHONE_B`
  - `TEST_GROUP_JID`

### Phase 2: Read-Only Command Tests (safe, no side effects)

- [x] **2.1** Create `tests/integration/cli/01-command-router.test.ts` (15 tests)
  - [x] Unknown command returns `false`
  - [x] Empty subcommand shows help for all 10 command categories
  - [x] Missing args validation (`get messages`, `check`, `send text`)

- [x] **2.2** Create `tests/integration/cli/02-get-commands.test.ts` (14 tests)
  - [x] `get profile` — own profile, returns `true`
  - [x] `get profile <contactJid>` — contact profile, returns `true`
  - [x] `get contacts` — no filter, returns `true`
  - [x] `get contacts --limit 3` — returns `true`
  - [x] `get contacts --filter <knownName>` — returns `true`
  - [x] `get groups` — no filter, returns `true`
  - [x] `get groups --limit 2` — returns `true`
  - [x] `get groups --filter <partialName>` — returns `true`
  - [x] `get chats` — returns `true`
  - [x] `get chats --limit 5` — returns `true`
  - [x] `get messages <jid>` — returns `true`
  - [x] `get messages <jid> --limit 3` — returns `true`
  - [x] `get labels` — returns `true` (or graceful empty)
  - [x] `get contacts --json` — validates JSON output

- [x] **2.3** Create `tests/integration/cli/03-check-command.test.ts` (4 tests)
  - [x] `check <validPhone>` — returns `true`
  - [x] `check <phone1> <phone2>` — batch check, returns `true`
  - [x] `check --json` — validates JSON output
  - [x] `check` (no args) — returns `false`

- [x] **2.4** Create `tests/integration/cli/04-contact-commands.test.ts` (8 tests)
  - [x] `contact list` — returns `true`
  - [x] `contact ls` (alias) — returns `true`
  - [x] `contact list --filter <name>` — returns `true`
  - [x] `contact list --limit 5` — returns `true`
  - [x] `contact info <phone>` — returns `true`
  - [x] `contact picture <phone>` — returns `true` or `false` (privacy OK)
  - [x] `contact business <phone>` — returns `true` or `false` (non-biz OK)
  - [x] `contact info` (missing phone) — returns `false`

- [x] **2.5** Create `tests/integration/cli/05-group-commands.test.ts` (9 tests)
  - [x] `group list` — returns `true`
  - [x] `group ls` (alias) — returns `true`
  - [x] `group list --filter <name>` — returns `true`
  - [x] `group list --limit 3` — returns `true`
  - [x] `group info <groupJid>` — returns `true`
  - [x] `group participants <groupJid>` — returns `true`
  - [x] `group participants <groupJid> --filter admin` — returns `true`
  - [x] `group invite-link <groupJid>` — returns boolean (needs admin)
  - [x] `group info` (missing JID) — returns `false`

### Phase 3: Write Command Tests (controlled side effects)

- [x] **3.1** Create `tests/integration/cli/06-send-commands.test.ts` (6 tests)
  - [x] `send text <phone> "CLI integration test"` — returns `true`
  - [x] `send text` (missing args) — returns `false`
  - [x] `send image <phone> <testImagePath>` — returns `true`
  - [x] `send image <phone> <path> "caption"` — returns `true`
  - [x] `send image <phone> /nonexistent.jpg` — returns `false`
  - [x] `send document <phone> <testDocPath>` — returns `true`

- [x] **3.2** Create `tests/integration/cli/07-load-commands.test.ts` (4 tests)
  - [x] `load messages <jid>` — returns `true`
  - [x] `load messages <jid> --count 10` — returns `true`
  - [x] `load messages` (missing JID) — returns `false`
  - [x] `load foobar` (unknown subcommand) — returns `false`

- [x] **3.3** Create `tests/integration/cli/08-profile-commands.test.ts` (6 tests)
  - [x] `profile name set "Test Bot"` — returns `true`
  - [x] `profile name set` restores original name
  - [x] `profile status set "CLI integration test"` — returns `true`
  - [x] `profile status set ""` (empty = clear) — returns `true`
  - [x] `profile name set` (missing arg) — returns `false`
  - [x] `profile foobar` (unknown subcommand) — returns `false`

### Phase 4: Instance & Business Tests

- [x] **4.1** Create `tests/integration/cli/09-instance-commands.test.ts` (5 tests)
  - [x] `instance list` — returns `true`
  - [x] `instance ls` (alias) — returns `true`
  - [x] `instance status <instanceId>` — returns `true` (skips if not connected)
  - [x] `instance status nonexistent-xxx` — returns `false`
  - [x] `instance foobar` (unknown sub) — returns `false`

- [x] **4.2** Create `tests/integration/cli/10-business-commands.test.ts` (6 tests)
  - [x] `label list` — returns `true`
  - [x] `label ls` (alias) — returns `true`
  - [x] `catalog list` — returns boolean (may fail on non-biz)
  - [x] `catalog collections` — returns boolean (may fail on non-biz)
  - [x] `label foobar` (unknown sub) — returns `false`
  - [x] `catalog foobar` (unknown sub) — returns `false`

### Phase 5: Finalize

- [x] **5.1** Run full suite, verify all pass (77/77 tests, 10/10 suites)
- [x] **5.2** Verify suite skips gracefully when no session exists
- [ ] **5.3** Update `CLAUDE.md` with CLI test documentation
- [ ] **5.4** Update `tests/README.md` with CLI test setup instructions

---

## Architecture

### Shared Setup (`cli-setup.ts`)

```
┌──────────────────────────────────────────────┐
│  beforeAll                                   │
│  ├─ Load .env.test                           │
│  ├─ Create MiawClient (reuse TEST_CONFIG)    │
│  ├─ Connect + wait for 'ready'               │
│  ├─ If timeout/fail → set SKIP_ALL = true    │
│  └─ Export: client, runCmd(), isConnected     │
│                                              │
│  runCmd(command, args)                        │
│  ├─ Calls runCommand(command, args, context)  │
│  ├─ context.clientConfig = shared config      │
│  └─ Returns boolean result                   │
│                                              │
│  afterAll                                    │
│  └─ client.disconnect()                      │
└──────────────────────────────────────────────┘
```

### Console Output Capture

Tests that need to assert output content will spy on `console.log`:

```typescript
let output: string[] = [];
beforeEach(() => {
  output = [];
  jest.spyOn(console, 'log').mockImplementation((...args) => {
    output.push(args.join(' '));
  });
});
afterEach(() => {
  jest.restoreAllMocks();
});
```

### Skip Logic

```typescript
// In each test file
const shouldSkip = !isConnected();

(shouldSkip ? describe.skip : describe)('Get Commands', () => {
  // tests here...
});
```

---

## Test Execution Order

```
01-command-router     →  Fast validation of infrastructure
02-get-commands       →  Read-only data access (profile, contacts, groups, chats)
03-check-command      →  Lightweight WhatsApp query
04-contact-commands   →  Read-only contact queries
05-group-commands     →  Read-only group queries
06-send-commands      →  Sends messages to test contact (write)
07-load-commands      →  Loads message history (safe)
08-profile-commands   →  Profile name/status updates (reversible write)
09-instance-commands  →  Instance list/status (read-only subset)
10-business-commands  →  Labels & catalog (conditional on Business account)
```

---

## What's Explicitly NOT Tested (and Why)

| Area | Reason |
|------|--------|
| REPL interactive loop | Requires stdin simulation; different testing approach |
| Tab completion | Pure function → better as unit test |
| Command history persistence | File I/O → better as unit test |
| `instance create/delete/logout` | Destructive to session state |
| `group create/leave` | Creates/destroys real WhatsApp groups |
| `group participants add/remove/promote/demote` | Modifies real group membership |
| `contact add/remove` | Modifies real contact list |
| `catalog product create/update/delete` | Modifies real product catalog |
| `media download` | Requires message with raw media in store |
| `group name/description/picture set` | Modifies real group settings |
| `profile picture set/remove` | Modifies real profile picture |

These should be tested with `npm run test:manual` or in a throwaway-account environment.

---

## Environment Variables (`.env.test`)

```bash
# Required for CLI integration tests
TEST_INSTANCE_ID=miaw-test-bot
TEST_SESSION_PATH=./test-sessions
TEST_CONTACT_PHONE_A=6281234567890    # Valid WhatsApp number (send target)
TEST_CONTACT_PHONE_B=6289876543210    # Secondary number
TEST_GROUP_JID=120363012345678@g.us   # Group where test account is admin
TEST_CONNECT_TIMEOUT=60000
TEST_MESSAGE_TIMEOUT=30000
```

---

## File Structure (Final)

```
tests/
├── fixtures/
│   ├── test-image.jpg
│   └── test-doc.txt
├── integration/
│   ├── cli/
│   │   ├── cli-setup.ts
│   │   ├── 01-command-router.test.ts
│   │   ├── 02-get-commands.test.ts
│   │   ├── 03-check-command.test.ts
│   │   ├── 04-contact-commands.test.ts
│   │   ├── 05-group-commands.test.ts
│   │   ├── 06-send-commands.test.ts
│   │   ├── 07-load-commands.test.ts
│   │   ├── 08-profile-commands.test.ts
│   │   ├── 09-instance-commands.test.ts
│   │   └── 10-business-commands.test.ts
│   ├── 01-connection.test.ts
│   ├── ... (existing tests)
│   └── 13-newsletter-features.test.ts
├── unit/
│   └── ... (existing)
├── setup.ts
└── README.md
```
