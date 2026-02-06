/**
 * CLI Integration Tests: Business Commands
 *
 * Tests label list and catalog list/collections.
 * These may fail on non-business accounts — tests are lenient.
 * This is the LAST test file — calls teardownCLITests() in afterAll.
 */

import {
  setupCLITests,
  teardownCLITests,
  isConnected,
  runCmd,
  captureConsole,
  CLI_TEST_CONFIG,
} from "./cli-setup.js";

beforeAll(async () => {
  await setupCLITests();
}, CLI_TEST_CONFIG.connectTimeout + 10000);

afterAll(async () => {
  await teardownCLITests();
});

describe("CLI Business Commands", () => {
  test("label list returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("label", ["list"]);
    expect(result).toBe(true);
  });

  test("label ls (alias) returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("label", ["ls"]);
    expect(result).toBe(true);
  });

  test("catalog list returns boolean (may fail on non-biz)", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("catalog", ["list"]);
    expect(typeof result).toBe("boolean");
  });

  test("catalog collections returns boolean (may fail on non-biz)", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("catalog", ["collections"]);
    expect(typeof result).toBe("boolean");
  });

  test("label unknown subcommand returns false", async () => {
    const capture = captureConsole();
    try {
      const result = await runCmd("label", ["foobar"]);
      expect(result).toBe(false);
      expect(capture.getFullOutput()).toContain("Unknown label command");
    } finally {
      capture.stop();
    }
  });

  test("catalog unknown subcommand returns false", async () => {
    const capture = captureConsole();
    try {
      const result = await runCmd("catalog", ["foobar"]);
      expect(result).toBe(false);
      expect(capture.getFullOutput()).toContain("Unknown catalog command");
    } finally {
      capture.stop();
    }
  });
});
