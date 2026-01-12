/**
 * Timeout constants for miaw-core
 * All values in milliseconds
 */

export const TIMEOUTS = {
  /** Stuck connection state timeout (30 seconds) */
  STUCK_STATE: 30_000,

  /** Default reconnection delay (3 seconds) */
  RECONNECT_DELAY: 3_000,

  /** Socket initialization wait (500 milliseconds) */
  SOCKET_INIT_WAIT: 500,

  /** Reconnect wait state timeout (5 seconds) */
  RECONNECT_WAIT_STATE: 5_000,

  /** Default waitForState timeout (10 seconds) */
  WAIT_FOR_STATE: 10_000,

  /** QR code grace period before timeout (30 seconds) */
  QR_GRACE_PERIOD: 30_000,

  /** QR code scan timeout (60 seconds) */
  QR_SCAN_TIMEOUT: 60_000,

  /** Connection establishment timeout (120 seconds) */
  CONNECTION_TIMEOUT: 120_000,

  /** Client cache grace period (60 seconds) */
  CACHE_GRACE_PERIOD: 60_000,

  /** Poll interval for connection state checks (1 second) */
  POLL_INTERVAL: 1_000,

  /** Logout message delay (100 milliseconds) */
  LOGOUT_MESSAGE_DELAY: 100,

  /** Final message pause (50 milliseconds) */
  FINAL_MESSAGE_PAUSE: 50,
} as const;

/**
 * Count thresholds
 */
export const THRESHOLDS = {
  /** Stuck state count threshold (30 polling intervals) */
  STUCK_STATE_COUNT: 30,
} as const;
