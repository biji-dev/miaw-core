/**
 * CLI Integration Tests: Get Commands
 *
 * Tests all read-only data retrieval commands:
 * get profile, contacts, groups, chats, messages, labels
 */

import {
  setupCLITests,
  isConnected,
  runCmd,
  captureConsole,
  CLI_TEST_CONFIG,
} from "./cli-setup.js";

beforeAll(async () => {
  await setupCLITests();
}, CLI_TEST_CONFIG.connectTimeout + 10000);

describe("CLI Get Commands", () => {
  test("get profile (own) returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("get", ["profile"]);
    expect(result).toBe(true);
  });

  test("get profile with contact JID returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.contactPhoneA) {
      console.log("⏭️  Skipping: no contact configured");
      return;
    }
    const jid = `${CLI_TEST_CONFIG.contactPhoneA}@s.whatsapp.net`;
    const result = await runCmd("get", ["profile", jid]);
    expect(result).toBe(true);
  });

  test("get contacts returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("get", ["contacts"]);
    expect(result).toBe(true);
  });

  test("get contacts with --limit returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("get", ["contacts", "--limit", "3"]);
    expect(result).toBe(true);
  });

  test("get contacts with --filter returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    // Use a generic filter that's likely to match something
    const result = await runCmd("get", ["contacts", "--filter", "a"]);
    expect(result).toBe(true);
  });

  test("get groups returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("get", ["groups"]);
    expect(result).toBe(true);
  });

  test("get groups with --limit returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("get", ["groups", "--limit", "2"]);
    expect(result).toBe(true);
  });

  test("get groups with --filter returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("get", ["groups", "--filter", "a"]);
    expect(result).toBe(true);
  });

  test("get chats returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("get", ["chats"]);
    expect(result).toBe(true);
  });

  test("get chats with --limit returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("get", ["chats", "--limit", "5"]);
    expect(result).toBe(true);
  });

  test("get messages with jid returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.contactPhoneA) {
      console.log("⏭️  Skipping: no contact configured");
      return;
    }
    const jid = `${CLI_TEST_CONFIG.contactPhoneA}@s.whatsapp.net`;
    const result = await runCmd("get", ["messages", jid]);
    expect(result).toBe(true);
  });

  test("get messages with --limit returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.contactPhoneA) {
      console.log("⏭️  Skipping: no contact configured");
      return;
    }
    const jid = `${CLI_TEST_CONFIG.contactPhoneA}@s.whatsapp.net`;
    const result = await runCmd("get", ["messages", jid, "--limit", "3"]);
    expect(result).toBe(true);
  });

  test("get labels returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("get", ["labels"]);
    expect(result).toBe(true);
  });

  test("get contacts with --json outputs valid JSON", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const capture = captureConsole();
    try {
      const result = await runCmd("get", ["contacts", "--limit", "2"], { jsonOutput: true });
      expect(result).toBe(true);
      const output = capture.getFullOutput();
      expect(() => JSON.parse(output)).not.toThrow();
    } finally {
      capture.stop();
    }
  });
});
