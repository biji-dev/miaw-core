/**
 * CLI Integration Tests: Instance Commands (read-only subset)
 *
 * Tests instance list, ls, status.
 * Does NOT test create/delete/connect/disconnect/logout (destructive).
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

describe("CLI Instance Commands", () => {
  test("instance list returns true", async () => {
    const result = await runCmd("instance", ["list"]);
    expect(result).toBe(true);
  });

  test("instance ls (alias) returns true", async () => {
    const result = await runCmd("instance", ["ls"]);
    expect(result).toBe(true);
  });

  test("instance status for current instance returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected (no session directory)");
      return;
    }
    const result = await runCmd("instance", ["status", CLI_TEST_CONFIG.instanceId]);
    expect(result).toBe(true);
  });

  test("instance status for nonexistent instance returns false", async () => {
    const capture = captureConsole();
    try {
      const result = await runCmd("instance", ["status", "nonexistent-xxx-12345"]);
      expect(result).toBe(false);
      expect(capture.getFullOutput()).toContain("not found");
    } finally {
      capture.stop();
    }
  });

  test("instance unknown subcommand returns false", async () => {
    const capture = captureConsole();
    try {
      const result = await runCmd("instance", ["foobar"]);
      expect(result).toBe(false);
      expect(capture.getFullOutput()).toContain("Unknown instance command");
    } finally {
      capture.stop();
    }
  });
});
