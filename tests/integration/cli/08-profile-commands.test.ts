/**
 * CLI Integration Tests: Profile Commands
 *
 * Tests profile name/status set (reversible writes).
 * Restores original name after testing.
 * Does NOT test profile picture set/remove (harder to reverse).
 */

import {
  setupCLITests,
  isConnected,
  runCmd,
  captureConsole,
  getClient,
  CLI_TEST_CONFIG,
  sleep,
} from "./cli-setup.js";

beforeAll(async () => {
  await setupCLITests();
}, CLI_TEST_CONFIG.connectTimeout + 10000);

describe("CLI Profile Commands", () => {
  let originalName: string | undefined;

  test("profile name set returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    // Save original name for restoration
    const client = getClient();
    if (client) {
      const profile = await client.getOwnProfile();
      originalName = profile?.name;
    }
    const result = await runCmd("profile", ["name", "set", "CLI Test Bot"]);
    expect(result).toBe(true);
  });

  test("profile name set restores original name", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!originalName) {
      console.log("⏭️  Skipping: no original name to restore");
      return;
    }
    await sleep(1000);
    const result = await runCmd("profile", ["name", "set", originalName]);
    expect(result).toBe(true);
  });

  test("profile status set returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("profile", ["status", "set", "CLI integration test"]);
    expect(result).toBe(true);
  });

  test("profile status set empty clears status", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    await sleep(1000);
    // "profile status set" with no text sets empty status
    const result = await runCmd("profile", ["status", "set"]);
    expect(result).toBe(true);
  });

  test("profile name set missing arg returns false", async () => {
    const capture = captureConsole();
    try {
      const result = await runCmd("profile", ["name", "set"]);
      expect(result).toBe(false);
      expect(capture.getFullOutput()).toContain("Usage:");
    } finally {
      capture.stop();
    }
  });

  test("profile unknown subcommand returns false", async () => {
    const capture = captureConsole();
    try {
      const result = await runCmd("profile", ["unknown"]);
      expect(result).toBe(false);
      expect(capture.getFullOutput()).toContain("Unknown profile command");
    } finally {
      capture.stop();
    }
  });
});
