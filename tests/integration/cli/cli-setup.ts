/**
 * CLI Integration Test Setup
 *
 * Pre-warms the client cache so runCommand() finds an already-connected client.
 * All test files share a single WhatsApp connection via the module-level cache singleton.
 *
 * Usage in test files:
 *   beforeAll(async () => { await setupCLITests(); }, CLI_TEST_CONFIG.connectTimeout + 10000);
 *   // In last test file only:
 *   afterAll(async () => { await teardownCLITests(); });
 */

import { config } from "dotenv";
import { MiawClient } from "../../../src/index.js";
import { getOrCreateClient, disconnectAll } from "../../../src/cli/utils/client-cache.js";
import { waitForConnection } from "../../../src/cli/utils/session.js";
import { runCommand, type CommandContext } from "../../../src/cli/commands/index.js";

// Load test environment variables
config({ path: ".env.test" });

export const CLI_TEST_CONFIG = {
  instanceId: process.env.TEST_INSTANCE_ID || "miaw-test-bot",
  sessionPath: process.env.TEST_SESSION_PATH || "./test-sessions",
  contactPhoneA: process.env.TEST_CONTACT_PHONE_A || "",
  contactPhoneB: process.env.TEST_CONTACT_PHONE_B || "",
  groupJid: process.env.TEST_GROUP_JID || "",
  connectTimeout: parseInt(process.env.TEST_CONNECT_TIMEOUT || "60000"),
};

// Shared state
let client: MiawClient | null = null;
let connected = false;

/**
 * The clientConfig used for all runCommand() calls.
 * Must match the cache key used by setupCLITests().
 */
export const clientConfig = {
  instanceId: CLI_TEST_CONFIG.instanceId,
  sessionPath: CLI_TEST_CONFIG.sessionPath,
  debug: false,
};

/**
 * Initialize the shared client via getOrCreateClient() (warms the cache).
 * Idempotent — subsequent calls return immediately if already connected.
 */
export async function setupCLITests(): Promise<void> {
  if (connected) return;

  // Use getOrCreateClient — the SAME function runCommand() uses internally.
  // This puts the client in the cache under the key `${instanceId}:${sessionPath}`.
  client = getOrCreateClient(clientConfig);

  const state = client.getConnectionState();
  if (state === "connected") {
    connected = true;
    return;
  }

  client.connect();
  const ok = await waitForConnection(client, CLI_TEST_CONFIG.connectTimeout);

  if (ok && client.getConnectionState() === "connected") {
    connected = true;
    console.log("\n=== CLI TEST CLIENT CONNECTED ===\n");
  } else {
    connected = false;
    console.log("\n=== CLI TEST CLIENT NOT CONNECTED - TESTS WILL BE SKIPPED ===\n");
  }
}

/**
 * Tear down: disconnect and clear the cache.
 * Called only in the last test file's afterAll.
 */
export async function teardownCLITests(): Promise<void> {
  await disconnectAll();
  client = null;
  connected = false;
}

/**
 * Returns whether the shared client is connected.
 */
export function isConnected(): boolean {
  return connected;
}

/**
 * Returns the shared client (for direct inspection if needed).
 */
export function getClient(): MiawClient | null {
  return client;
}

/**
 * Run a CLI command with the shared context.
 */
export async function runCmd(
  command: string,
  args: string[] = [],
  options?: { jsonOutput?: boolean }
): Promise<boolean | { success: boolean; switchToInstance?: string }> {
  const context: CommandContext = {
    clientConfig,
    jsonOutput: options?.jsonOutput ?? false,
  };

  return runCommand(command, args, context);
}

// ── Console Capture Helpers ──

/**
 * Start capturing console.log output.
 * Always use in try/finally to ensure stop() is called.
 */
export function captureConsole(): {
  getOutput: () => string[];
  getFullOutput: () => string;
  stop: () => void;
} {
  const lines: string[] = [];
  const originalLog = console.log;

  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(" "));
  };

  return {
    getOutput: () => [...lines],
    getFullOutput: () => lines.join("\n"),
    stop: () => {
      console.log = originalLog;
    },
  };
}

// ── Sleep Helper ──

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
