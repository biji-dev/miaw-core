/**
 * Logger interface compatible with Pino and Baileys' ILogger
 * This provides a type-safe contract for logging throughout miaw-core
 */
export interface MiawLogger {
  /** Log informational message */
  info: (...msg: any[]) => void;

  /** Log error message */
  error: (...msg: any[]) => void;

  /** Log debug message (verbose output) */
  debug: (...msg: any[]) => void;

  /** Log warning message */
  warn: (...msg: any[]) => void;

  /** Log fatal error message */
  fatal: (...msg: any[]) => void;

  /** Log trace message (most verbose) */
  trace: (...msg: any[]) => void;

  /** Create child logger with bindings */
  child: (bindings: object) => MiawLogger;

  /** Current logging level (required by Baileys) */
  level: string;
}
