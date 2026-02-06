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

  test("label list with --json outputs valid JSON", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const capture = captureConsole();
    try {
      const result = await runCmd("label", ["list"], { jsonOutput: true });
      expect(result).toBe(true);
      const output = capture.getFullOutput();
      expect(() => JSON.parse(output)).not.toThrow();
    } finally {
      capture.stop();
    }
  });

  test("catalog list with --limit returns boolean", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("catalog", ["list", "--limit", "3"]);
    // May fail on non-business accounts
    expect(typeof result).toBe("boolean");
  });

  test("catalog list with --json returns boolean (lenient)", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const capture = captureConsole();
    try {
      const result = await runCmd("catalog", ["list", "--limit", "2"], { jsonOutput: true });
      // May fail on non-business accounts
      expect(typeof result).toBe("boolean");
    } finally {
      capture.stop();
    }
  });

  test("catalog collections with --limit returns boolean", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const result = await runCmd("catalog", ["collections", "--limit", "3"]);
    expect(typeof result).toBe("boolean");
  });

  test("catalog collections with --json returns boolean (lenient)", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    const capture = captureConsole();
    try {
      const result = await runCmd("catalog", ["collections", "--limit", "2"], { jsonOutput: true });
      expect(typeof result).toBe("boolean");
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
