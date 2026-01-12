/**
 * Filtered Logger Utility
 *
 * Creates a Pino logger that filters out noisy libsignal logs without
 * overriding global console methods. This is a library-safe approach that
 * only affects miaw-core's own logging.
 */

import pino from "pino";
import { MiawLogger } from "../types/logger.js";

/**
 * Patterns to suppress from libsignal logs
 * These patterns match noisy session management logs from @whiskeysockets/baileys
 */
const SUPPRESS_PATTERNS = [
  "Closing session",
  "SessionEntry {",
  "_chains:",
  "registrationId:",
] as const;

/**
 * Check if log message should be suppressed
 * @param args - Log arguments to check
 * @returns true if message matches suppression patterns
 */
function shouldSuppressLog(args: unknown[]): boolean {
  const msg = args.map(String).join(" ");
  return SUPPRESS_PATTERNS.some((pattern) => msg.includes(pattern));
}

/**
 * Create a filtered Pino logger that suppresses libsignal noise
 *
 * @param debug - Enable debug logging (when false, all logs are silenced)
 * @returns Logger instance with libsignal filtering
 *
 * @example
 * ```typescript
 * const logger = createFilteredLogger(true);
 * logger.info("This will be logged");
 * logger.debug("Closing session"); // Suppressed
 * ```
 */
export function createFilteredLogger(debug: boolean): MiawLogger {
  // Create base Pino logger
  const baseLogger = pino({
    level: debug ? "debug" : "silent",
  });

  // If debug is off, return silent logger (no filtering needed)
  if (!debug) {
    return baseLogger as MiawLogger;
  }

  // Wrap logger methods to filter libsignal messages
  const wrappedLogger: MiawLogger = {
    info: (...args: any[]) => {
      if (!shouldSuppressLog(args)) {
        (baseLogger.info as any)(...args);
      }
    },
    error: (...args: any[]) => {
      if (!shouldSuppressLog(args)) {
        (baseLogger.error as any)(...args);
      }
    },
    warn: (...args: any[]) => {
      if (!shouldSuppressLog(args)) {
        (baseLogger.warn as any)(...args);
      }
    },
    debug: (...args: any[]) => {
      if (!shouldSuppressLog(args)) {
        (baseLogger.debug as any)(...args);
      }
    },
    fatal: (...args: any[]) => {
      if (!shouldSuppressLog(args)) {
        (baseLogger.fatal as any)(...args);
      }
    },
    trace: (...args: any[]) => {
      if (!shouldSuppressLog(args)) {
        (baseLogger.trace as any)(...args);
      }
    },
    child: (bindings: object) => baseLogger.child(bindings) as MiawLogger,
    level: baseLogger.level,
  };

  return wrappedLogger;
}
