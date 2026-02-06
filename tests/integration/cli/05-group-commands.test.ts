/**
 * CLI Integration Tests: Group Commands (read-only)
 *
 * Tests group list, info, participants, invite-link.
 * Does NOT test create/leave/participant-modify/settings (destructive).
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

describe("CLI Group Commands", () => {
  test("group list returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("group", ["list"]);
    expect(result).toBe(true);
  });

  test("group ls (alias) returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("group", ["ls"]);
    expect(result).toBe(true);
  });

  test("group list with --limit returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("group", ["list", "--limit", "3"]);
    expect(result).toBe(true);
  });

  test("group list with --filter returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("group", ["list", "--filter", "a"]);
    expect(result).toBe(true);
  });

  test("group info returns true for known group", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.groupJid) {
      console.log("⏭️  Skipping: no group JID configured");
      return;
    }
    const result = await runCmd("group", ["info", CLI_TEST_CONFIG.groupJid]);
    expect(result).toBe(true);
  });

  test("group participants returns true for known group", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.groupJid) {
      console.log("⏭️  Skipping: no group JID configured");
      return;
    }
    const result = await runCmd("group", ["participants", CLI_TEST_CONFIG.groupJid]);
    expect(result).toBe(true);
  });

  test("group participants with --filter returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.groupJid) {
      console.log("⏭️  Skipping: no group JID configured");
      return;
    }
    const result = await runCmd("group", [
      "participants",
      CLI_TEST_CONFIG.groupJid,
      "--filter",
      "admin",
    ]);
    expect(result).toBe(true);
  });

  test("group invite-link returns boolean (needs admin)", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.groupJid) {
      console.log("⏭️  Skipping: no group JID configured");
      return;
    }
    const result = await runCmd("group", ["invite-link", CLI_TEST_CONFIG.groupJid]);
    // May return false if not admin of the group
    expect(typeof result).toBe("boolean");
  });

  test("group list with --json outputs valid JSON", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const capture = captureConsole();
    try {
      const result = await runCmd("group", ["list", "--limit", "2"], { jsonOutput: true });
      expect(result).toBe(true);
      const output = capture.getFullOutput();
      expect(() => JSON.parse(output)).not.toThrow();
    } finally {
      capture.stop();
    }
  });

  test("group participants with --limit returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.groupJid) {
      console.log("⏭️  Skipping: no group JID configured");
      return;
    }
    const result = await runCmd("group", [
      "participants",
      CLI_TEST_CONFIG.groupJid,
      "--limit",
      "5",
    ]);
    expect(result).toBe(true);
  });

  test("group participants with --json outputs valid JSON", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.groupJid) {
      console.log("⏭️  Skipping: no group JID configured");
      return;
    }
    const capture = captureConsole();
    try {
      const result = await runCmd("group", ["participants", CLI_TEST_CONFIG.groupJid, "--limit", "3"], { jsonOutput: true });
      expect(result).toBe(true);
      const output = capture.getFullOutput();
      expect(() => JSON.parse(output)).not.toThrow();
    } finally {
      capture.stop();
    }
  });

  test("group participants with --filter by phone prefix returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.groupJid) {
      console.log("⏭️  Skipping: no group JID configured");
      return;
    }
    // Filter matches jid, phone, name, or role
    const result = await runCmd("group", [
      "participants",
      CLI_TEST_CONFIG.groupJid,
      "--filter",
      "62",
    ]);
    expect(result).toBe(true);
  });

  test("group info with --json outputs valid JSON", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.groupJid) {
      console.log("⏭️  Skipping: no group JID configured");
      return;
    }
    const capture = captureConsole();
    try {
      const result = await runCmd("group", ["info", CLI_TEST_CONFIG.groupJid], { jsonOutput: true });
      expect(result).toBe(true);
      const output = capture.getFullOutput();
      expect(() => JSON.parse(output)).not.toThrow();
    } finally {
      capture.stop();
    }
  });

  test("group info missing jid returns false", async () => {
    const capture = captureConsole();
    try {
      const result = await runCmd("group", ["info"]);
      expect(result).toBe(false);
      expect(capture.getFullOutput()).toContain("Usage:");
    } finally {
      capture.stop();
    }
  });
});
