/**
 * Console Filter Utility
 *
 * Suppresses verbose libsignal session logs by intercepting console.info/warn calls.
 *
 * IMPORTANT: This is a workaround for libsignal's hardcoded console.* calls.
 * The libsignal library (used by Baileys) logs directly to console instead of
 * using the logger interface, making it impossible to suppress these logs through
 * Pino's logging levels.
 *
 * Source: node_modules/libsignal/src/session_record.js (lines 273, 281, 301)
 *
 * SIDE EFFECTS: This overrides global console.info and console.warn methods.
 * Uses reference counting to safely handle multiple MiawClient instances.
 */

/**
 * Patterns that identify libsignal session management logs
 */
const LIBSIGNAL_PATTERNS = [
  "Closing session",
  "Opening session",
  "SessionEntry",
  "Removing old closed session",
  "Session already closed",
  "Session already open",
] as const;

/**
 * Global state for console filter management
 */
let originalConsoleInfo: typeof console.info | null = null;
let originalConsoleWarn: typeof console.warn | null = null;
let filterReferenceCount = 0;
let isFilterActive = false;

/**
 * Check if a console message matches libsignal session log patterns
 */
function isLibsignalLog(args: unknown[]): boolean {
  const message = args.map((arg) => String(arg)).join(" ");
  return LIBSIGNAL_PATTERNS.some((pattern) => message.includes(pattern));
}

/**
 * Enable console filtering to suppress libsignal session logs
 *
 * Uses reference counting to safely handle multiple MiawClient instances.
 * The filter is only activated on the first call and persists until all
 * callers have called disableConsoleFilter().
 *
 * @example
 * ```typescript
 * enableConsoleFilter();  // Filter activated
 * enableConsoleFilter();  // Reference count = 2
 * disableConsoleFilter(); // Reference count = 1, filter still active
 * disableConsoleFilter(); // Reference count = 0, filter deactivated
 * ```
 */
export function enableConsoleFilter(): void {
  filterReferenceCount++;

  // Only install filter on first call
  if (filterReferenceCount === 1 && !isFilterActive) {
    // Store original methods
    originalConsoleInfo = console.info;
    originalConsoleWarn = console.warn;

    // Override console.info to filter libsignal logs
    console.info = function (...args: unknown[]): void {
      if (!isLibsignalLog(args) && originalConsoleInfo) {
        originalConsoleInfo.apply(console, args);
      }
    };

    // Override console.warn to filter libsignal warnings
    console.warn = function (...args: unknown[]): void {
      if (!isLibsignalLog(args) && originalConsoleWarn) {
        originalConsoleWarn.apply(console, args);
      }
    };

    isFilterActive = true;
  }
}

/**
 * Disable console filtering
 *
 * Decrements the reference counter. Only restores original console methods
 * when the counter reaches 0 (all callers have disabled filtering).
 *
 * @example
 * ```typescript
 * enableConsoleFilter();  // refCount = 1
 * enableConsoleFilter();  // refCount = 2
 * disableConsoleFilter(); // refCount = 1, still filtered
 * disableConsoleFilter(); // refCount = 0, filter removed
 * ```
 */
export function disableConsoleFilter(): void {
  if (filterReferenceCount > 0) {
    filterReferenceCount--;
  }

  // Only restore original methods when all references are gone
  if (filterReferenceCount === 0 && isFilterActive) {
    if (originalConsoleInfo) {
      console.info = originalConsoleInfo;
      originalConsoleInfo = null;
    }

    if (originalConsoleWarn) {
      console.warn = originalConsoleWarn;
      originalConsoleWarn = null;
    }

    isFilterActive = false;
  }
}

/**
 * Check if console filter is currently active
 */
export function isConsoleFilterActive(): boolean {
  return isFilterActive;
}

/**
 * Get current reference count (for debugging)
 */
export function getFilterReferenceCount(): number {
  return filterReferenceCount;
}

/**
 * Force reset the console filter (for testing/emergency cleanup)
 *
 * WARNING: This immediately restores original console methods regardless
 * of reference count. Use only in tests or error recovery scenarios.
 */
export function resetConsoleFilter(): void {
  if (originalConsoleInfo) {
    console.info = originalConsoleInfo;
    originalConsoleInfo = null;
  }

  if (originalConsoleWarn) {
    console.warn = originalConsoleWarn;
    originalConsoleWarn = null;
  }

  filterReferenceCount = 0;
  isFilterActive = false;
}
