/**
 * CLI Integration Tests: Send Commands
 *
 * Tests sending text, image, document messages.
 * Sends real messages to TEST_CONTACT_PHONE_A.
 */

import * as path from "path";
import {
  setupCLITests,
  isConnected,
  runCmd,
  captureConsole,
  CLI_TEST_CONFIG,
  sleep,
} from "./cli-setup.js";

const FIXTURES_DIR = path.resolve(process.cwd(), "tests/fixtures");

beforeAll(async () => {
  await setupCLITests();
}, CLI_TEST_CONFIG.connectTimeout + 10000);

describe("CLI Send Commands", () => {
  test("send text returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.contactPhoneA) {
      console.log("⏭️  Skipping: no contact configured");
      return;
    }
    const result = await runCmd("send", [
      "text",
      CLI_TEST_CONFIG.contactPhoneA,
      `CLI integration test ${Date.now()}`,
    ]);
    expect(result).toBe(true);
  });

  test("send text missing args returns false", async () => {
    const capture = captureConsole();
    try {
      const result = await runCmd("send", ["text"]);
      expect(result).toBe(false);
      expect(capture.getFullOutput()).toContain("Usage:");
    } finally {
      capture.stop();
    }
  });

  test("send image returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.contactPhoneA) {
      console.log("⏭️  Skipping: no contact configured");
      return;
    }
    await sleep(1000);
    const imagePath = path.join(FIXTURES_DIR, "test-image.jpg");
    const result = await runCmd("send", [
      "image",
      CLI_TEST_CONFIG.contactPhoneA,
      imagePath,
    ]);
    expect(result).toBe(true);
  });

  test("send image with caption returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.contactPhoneA) {
      console.log("⏭️  Skipping: no contact configured");
      return;
    }
    await sleep(1000);
    const imagePath = path.join(FIXTURES_DIR, "test-image.jpg");
    const result = await runCmd("send", [
      "image",
      CLI_TEST_CONFIG.contactPhoneA,
      imagePath,
      "Test caption",
    ]);
    expect(result).toBe(true);
  });

  test("send image nonexistent file returns false", async () => {
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
      const result = await runCmd("send", [
        "image",
        CLI_TEST_CONFIG.contactPhoneA,
        "/nonexistent/path.jpg",
      ]);
      expect(result).toBe(false);
      expect(capture.getFullOutput()).toContain("File not found");
    } finally {
      capture.stop();
    }
  });

  test("send document returns true", async () => {
    if (!isConnected()) {
      console.log("⏭️  Skipping: not connected");
      return;
    }
    if (!CLI_TEST_CONFIG.contactPhoneA) {
      console.log("⏭️  Skipping: no contact configured");
      return;
    }
    await sleep(1000);
    const docPath = path.join(FIXTURES_DIR, "test-doc.txt");
    const result = await runCmd("send", [
      "document",
      CLI_TEST_CONFIG.contactPhoneA,
      docPath,
    ]);
    expect(result).toBe(true);
  });
});
