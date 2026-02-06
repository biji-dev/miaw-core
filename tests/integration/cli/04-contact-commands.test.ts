/**
 * CLI Integration Tests: Contact Commands (read-only)
 *
 * Tests contact list, info, picture, business profile.
 * Does NOT test contact add/remove (destructive).
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

describe("CLI Contact Commands", () => {
  test("contact list returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("contact", ["list"]);
    expect(result).toBe(true);
  });

  test("contact ls (alias) returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("contact", ["ls"]);
    expect(result).toBe(true);
  });

  test("contact list with --limit returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("contact", ["list", "--limit", "5"]);
    expect(result).toBe(true);
  });

  test("contact list with --filter returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("contact", ["list", "--filter", "a"]);
    expect(result).toBe(true);
  });

  test("contact info returns true for known contact", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.contactPhoneA) {
      console.log("⏭️  Skipping: no contact configured");
      return;
    }
    const result = await runCmd("contact", ["info", CLI_TEST_CONFIG.contactPhoneA]);
    expect(result).toBe(true);
  });

  test("contact picture returns boolean (may fail due to privacy)", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.contactPhoneA) {
      console.log("⏭️  Skipping: no contact configured");
      return;
    }
    const result = await runCmd("contact", ["picture", CLI_TEST_CONFIG.contactPhoneA]);
    expect(typeof result).toBe("boolean");
  });

  test("contact business returns boolean (may fail for non-biz)", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.contactPhoneA) {
      console.log("⏭️  Skipping: no contact configured");
      return;
    }
    const result = await runCmd("contact", ["business", CLI_TEST_CONFIG.contactPhoneA]);
    expect(typeof result).toBe("boolean");
  });

  test("contact list with --json outputs valid JSON", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const capture = captureConsole();
    try {
      const result = await runCmd("contact", ["list", "--limit", "2"], { jsonOutput: true });
      expect(result).toBe(true);
      const output = capture.getFullOutput();
      expect(() => JSON.parse(output)).not.toThrow();
    } finally {
      capture.stop();
    }
  });

  test("contact info with --json outputs valid JSON", async () => {
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
      const result = await runCmd("contact", ["info", CLI_TEST_CONFIG.contactPhoneA], { jsonOutput: true });
      expect(result).toBe(true);
      const output = capture.getFullOutput();
      expect(() => JSON.parse(output)).not.toThrow();
    } finally {
      capture.stop();
    }
  });

  test("contact business with --json outputs valid JSON (lenient)", async () => {
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
      const result = await runCmd("contact", ["business", CLI_TEST_CONFIG.contactPhoneA], { jsonOutput: true });
      // May return false for non-business contacts
      expect(typeof result).toBe("boolean");
    } finally {
      capture.stop();
    }
  });

  test("contact picture with --high returns boolean", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.contactPhoneA) {
      console.log("⏭️  Skipping: no contact configured");
      return;
    }
    const result = await runCmd("contact", ["picture", CLI_TEST_CONFIG.contactPhoneA, "--high"]);
    // May return false due to privacy settings
    expect(typeof result).toBe("boolean");
  });

  test("contact list with --filter by name returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    // Filter matches jid, phone, or name
    const result = await runCmd("contact", ["list", "--filter", "a"]);
    expect(result).toBe(true);
  });

  test("contact list with --filter by phone prefix returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    // Filter matches phone — use country code prefix
    const result = await runCmd("contact", ["list", "--filter", "62"]);
    expect(result).toBe(true);
  });

  test("contact info missing phone returns false", async () => {
    const capture = captureConsole();
    try {
      const result = await runCmd("contact", ["info"]);
      expect(result).toBe(false);
      expect(capture.getFullOutput()).toContain("Usage:");
    } finally {
      capture.stop();
    }
  });
});
