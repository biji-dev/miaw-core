/**
 * CLI Integration Tests: Check Command
 *
 * Tests phone number validation against WhatsApp.
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

describe("CLI Check Command", () => {
  test("check single valid phone returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.contactPhoneA) {
      console.log("⏭️  Skipping: no contact configured");
      return;
    }
    const result = await runCmd("check", [CLI_TEST_CONFIG.contactPhoneA]);
    expect(result).toBe(true);
  });

  test("check multiple phones returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.contactPhoneA || !CLI_TEST_CONFIG.contactPhoneB) {
      console.log("⏭️  Skipping: need two contacts configured");
      return;
    }
    const result = await runCmd("check", [
      CLI_TEST_CONFIG.contactPhoneA,
      CLI_TEST_CONFIG.contactPhoneB,
    ]);
    expect(result).toBe(true);
  });

  test("check with --json outputs valid JSON", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.contactPhoneA) {
      console.log("⏭️  Skipping: no contact configured");
      return;
    }
    const capture = captureConsole();
    try {
      const result = await runCmd("check", [CLI_TEST_CONFIG.contactPhoneA], { jsonOutput: true });
      expect(result).toBe(true);
      const output = capture.getFullOutput();
      expect(() => JSON.parse(output)).not.toThrow();
    } finally {
      capture.stop();
    }
  });

  test("check no args returns false", async () => {
    const capture = captureConsole();
    try {
      const result = await runCmd("check", []);
      expect(result).toBe(false);
      expect(capture.getFullOutput()).toContain("Usage:");
    } finally {
      capture.stop();
    }
  });
});
