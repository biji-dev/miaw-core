/**
 * CLI Context - Shared state for CLI commands
 * Eliminates circular dependencies by providing central access to shared resources
 */

import * as instanceRegistry from "./utils/instance-registry.js";
import * as clientCache from "./utils/client-cache.js";

/**
 * CLI Context holds shared state and utilities
 */
export interface CLIContext {
  registry: typeof instanceRegistry;
  cache: typeof clientCache;
}

/**
 * Create CLI context
 * @returns New CLI context instance
 */
export function createCLIContext(): CLIContext {
  return {
    registry: instanceRegistry,
    cache: clientCache,
  };
}

/**
 * Default singleton context (for convenience)
 */
export const defaultCLIContext = createCLIContext();
