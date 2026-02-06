/**
 * CLI Integration Tests: Load Commands
 *
 * Tests loading older messages from chat history.
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

describe("CLI Load Commands", () => {
  test("load messages returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.contactPhoneA) {
      console.log("⏭️  Skipping: no contact configured");
      return;
    }
    const jid = `${CLI_TEST_CONFIG.contactPhoneA}@s.whatsapp.net`;
    const result = await runCmd("load", ["messages", jid]);
    expect(result).toBe(true);
  });

  test("load messages with --count returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.contactPhoneA) {
      console.log("⏭️  Skipping: no contact configured");
      return;
    }
    const jid = `${CLI_TEST_CONFIG.contactPhoneA}@s.whatsapp.net`;
    const result = await runCmd("load", ["messages", jid, "--count", "10"]);
    expect(result).toBe(true);
  });

  test("load messages missing jid returns false", async () => {
    const capture = captureConsole();
    try {
      const result = await runCmd("load", ["messages"]);
      expect(result).toBe(false);
      expect(capture.getFullOutput()).toContain("Usage:");
    } finally {
      capture.stop();
    }
  });

  test("unknown load subcommand returns false", async () => {
    const capture = captureConsole();
    try {
      const result = await runCmd("load", ["foobar"]);
      expect(result).toBe(false);
      expect(capture.getFullOutput()).toContain("Unknown load command: foobar");
    } finally {
      capture.stop();
    }
  });
});
