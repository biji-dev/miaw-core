# CLI Integration Test Plan

## Overview

End-to-end integration tests for the miaw-core CLI tool. All tests run against a real WhatsApp connection — no mocks. If the account is not paired/connected, the entire suite is skipped.

**Framework**: Jest (same as existing tests)
**Location**: `tests/integration/cli/`
**Run command**: `npm run test:cli`

---

## Implementation Checklist

### Phase 1: Infrastructure

- [ ] **1.1** Create `tests/integration/cli/` directory
- [ ] **1.2** Create shared test setup (`tests/integration/cli/cli-setup.ts`)
  - Connect client once in `beforeAll`, disconnect in `afterAll`
  - `skipIfNotConnected()` helper — skips suite if no session/not paired
  - `runCmd(command, args)` wrapper around `runCommand()` with shared client context
  - Capture `console.log` output for assertion (spy on stdout)
- [ ] **1.3** Create test fixtures (`tests/fixtures/`)
  - `test-image.jpg` — small JPEG (~1KB) for send image tests
  - `test-doc.txt` — small text file for send document tests
- [ ] **1.4** Add npm script `"test:cli"` in `package.json`
  - `NODE_OPTIONS='--experimental-vm-modules' jest --testPathPattern='tests/integration/cli'`
- [ ] **1.5** Verify `.env.test` has required vars documented
  - `TEST_INSTANCE_ID`, `TEST_SESSION_PATH`
  - `TEST_CONTACT_PHONE_A`, `TEST_CONTACT_PHONE_B`
  - `TEST_GROUP_JID`

### Phase 2: Read-Only Command Tests (safe, no side effects)

- [ ] **2.1** Create `tests/integration/cli/01-command-router.test.ts`
  - [ ] Unknown command returns `false`
  - [ ] Empty subcommand shows help, returns `false`
  - [ ] Flag parsing works (`get contacts --limit 5`)

- [ ] **2.2** Create `tests/integration/cli/02-get-commands.test.ts`
  - [ ] `get profile` — own profile, returns `true`
  - [ ] `get profile <contactJid>` — contact profile, returns `true`
  - [ ] `get contacts` — no filter, returns `true`
  - [ ] `get contacts --limit 3` — returns `true`
  - [ ] `get contacts --filter <knownName>` — returns `true`
  - [ ] `get groups` — no filter, returns `true`
  - [ ] `get groups --limit 2` — returns `true`
  - [ ] `get groups --filter <partialName>` — returns `true`
  - [ ] `get chats` — returns `true`
  - [ ] `get chats --limit 5` — returns `true`
  - [ ] `get messages <jid>` — returns `true`
  - [ ] `get messages <jid> --limit 3` — returns `true`
  - [ ] `get labels` — returns `true` (or graceful empty)

- [ ] **2.3** Create `tests/integration/cli/03-check-command.test.ts`
  - [ ] `check <validPhone>` — returns `true`
  - [ ] `check <phone1> <phone2>` — batch check, returns `true`
  - [ ] `check` (no args) — returns `false`

- [ ] **2.4** Create `tests/integration/cli/04-contact-commands.test.ts`
  - [ ] `contact list` — returns `true`
  - [ ] `contact list --filter <name>` — returns `true`
  - [ ] `contact list --limit 5` — returns `true`
  - [ ] `contact info <phone>` — returns `true`
  - [ ] `contact picture <phone>` — returns `true` or `false` (privacy OK)
  - [ ] `contact business <phone>` — returns `true` or `false` (non-biz OK)

- [ ] **2.5** Create `tests/integration/cli/05-group-commands.test.ts`
  - [ ] `group list` — returns `true`
  - [ ] `group list --filter <name>` — returns `true`
  - [ ] `group list --limit 3` — returns `true`
  - [ ] `group info <groupJid>` — returns `true`
  - [ ] `group participants <groupJid>` — returns `true`
  - [ ] `group participants <groupJid> --filter admin` — returns `true`
  - [ ] `group invite-link <groupJid>` — returns `true` (needs admin)

### Phase 3: Write Command Tests (controlled side effects)

- [ ] **3.1** Create `tests/integration/cli/06-send-commands.test.ts`
  - [ ] `send text <phone> "CLI integration test"` — returns `true`
  - [ ] `send text` (missing args) — returns `false`
  - [ ] `send image <phone> <testImagePath>` — returns `true`
  - [ ] `send image <phone> <path> "caption"` — returns `true`
  - [ ] `send image <phone> /nonexistent.jpg` — returns `false`
  - [ ] `send document <phone> <testDocPath>` — returns `true`

- [ ] **3.2** Create `tests/integration/cli/07-load-commands.test.ts`
  - [ ] `load messages <jid>` — returns `true`
  - [ ] `load messages <jid> --count 10` — returns `true`
  - [ ] `load messages` (missing JID) — returns `false`

- [ ] **3.3** Create `tests/integration/cli/08-profile-commands.test.ts`
  - [ ] `profile name set "Test Bot"` — returns `true`
  - [ ] `profile status set "CLI integration test"` — returns `true`
  - [ ] `profile status set` (empty = clear) — returns `true`
  - [ ] `profile name set` (missing arg) — returns `false`

### Phase 4: Instance & Business Tests

- [ ] **4.1** Create `tests/integration/cli/09-instance-commands.test.ts`
  - [ ] `instance list` — returns `true`
  - [ ] `instance ls` (alias) — returns `true`
  - [ ] `instance status <instanceId>` — returns `true`
  - [ ] `instance status nonexistent-xxx` — returns `false`
  - [ ] `instance foobar` (unknown sub) — returns `false`

- [ ] **4.2** Create `tests/integration/cli/10-business-commands.test.ts`
  - [ ] `label list` — returns `true`
  - [ ] `catalog list` — returns `true` or graceful failure
  - [ ] `catalog collections` — returns `true` or graceful failure

### Phase 5: Finalize

- [ ] **5.1** Run full suite, verify all pass with real connection
- [ ] **5.2** Verify suite skips gracefully when no session exists
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
