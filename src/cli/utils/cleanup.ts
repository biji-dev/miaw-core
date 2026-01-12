/**
 * CLI Cleanup Manager
 *
 * Handles process signal handlers (SIGINT, SIGTERM) for graceful shutdown.
 * IMPORTANT: This should ONLY be called from CLI entry points, never when
 * miaw-core is used as a library.
 */

import { disconnectAll } from "./client-cache.js";

/**
 * Track if cleanup handlers have been registered
 */
let handlersRegistered = false;

/**
 * Initialize CLI cleanup handlers for graceful shutdown
 *
 * Registers process signal handlers that disconnect all clients before exit.
 * This function is idempotent - calling it multiple times has no effect.
 *
 * @example
 * ```typescript
 * // In CLI entry point (bin/miaw-cli.ts or src/cli/repl.ts)
 * import { initializeCLICleanup } from './utils/cleanup.js';
 * initializeCLICleanup();
 * ```
 *
 * @remarks
 * NEVER call this function when using miaw-core as a library.
 * It registers global process handlers that hijack signal handling.
 * Only CLI applications should call this at startup.
 */
export function initializeCLICleanup(): void {
  if (handlersRegistered) {
    return; // Already registered, skip
  }

  handlersRegistered = true;

  // Handle Ctrl+C (SIGINT)
  process.on("SIGINT", async () => {
    console.log("\n🔄 Disconnecting all clients...");
    await disconnectAll();
    process.exit(0);
  });

  // Handle termination signal (SIGTERM)
  process.on("SIGTERM", async () => {
    console.log("\n🔄 Disconnecting all clients...");
    await disconnectAll();
    process.exit(0);
  });

  // Handle normal process exit
  process.on("exit", () => {
    // Note: Only synchronous cleanup possible here
    // Actual disconnect should have happened in SIGINT/SIGTERM handlers
  });
}

/**
 * Check if cleanup handlers are registered
 * @returns true if handlers have been initialized
 */
export function isCleanupInitialized(): boolean {
  return handlersRegistered;
}
