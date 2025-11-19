/**
 * Configuration options for MiawClient
 */
export interface MiawClientOptions {
  /** Unique identifier for this WhatsApp instance */
  instanceId: string;

  /** Directory path where session data will be stored (default: './sessions') */
  sessionPath?: string;

  /** Enable verbose logging (default: false) */
  debug?: boolean;

  /** Custom logger instance (default: pino) */
  logger?: any;

  /** Auto-reconnect on connection loss (default: true) */
  autoReconnect?: boolean;

  /** Maximum reconnection attempts (default: Infinity) */
  maxReconnectAttempts?: number;

  /** Delay between reconnection attempts in ms (default: 3000) */
  reconnectDelay?: number;
}

/**
 * Normalized message structure - simplified from Baileys
 */
export interface MiawMessage {
  /** Unique message ID */
  id: string;

  /** Sender's WhatsApp ID (e.g., '1234567890@s.whatsapp.net') */
  from: string;

  /** Message text content */
  text?: string;

  /** Timestamp when message was sent (Unix timestamp in seconds) */
  timestamp: number;

  /** Whether this message is from a group chat */
  isGroup: boolean;

  /** If isGroup is true, this contains the participant's ID who sent the message */
  participant?: string;

  /** Whether this message was sent by the bot itself */
  fromMe: boolean;

  /** Message type */
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'unknown';

  /** Original raw message from Baileys (for advanced use) */
  raw?: any;
}

/**
 * Connection states
 */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'qr_required';

/**
 * Events emitted by MiawClient
 */
export interface MiawClientEvents {
  /** Emitted when QR code needs to be scanned */
  qr: (qrCode: string) => void;

  /** Emitted when client is ready to send/receive messages */
  ready: () => void;

  /** Emitted when a new message is received */
  message: (message: MiawMessage) => void;

  /** Emitted when connection state changes */
  connection: (state: ConnectionState) => void;

  /** Emitted when client is disconnected */
  disconnected: (reason?: string) => void;

  /** Emitted when client is attempting to reconnect */
  reconnecting: (attempt: number) => void;

  /** Emitted on errors */
  error: (error: Error) => void;

  /** Emitted when session is saved */
  session_saved: () => void;
}

/**
 * Options for sending text messages
 */
export interface SendTextOptions {
  /** Quote/reply to a specific message ID */
  quoted?: string;
}

/**
 * Result of sending a message
 */
export interface SendMessageResult {
  /** Whether the message was sent successfully */
  success: boolean;

  /** Message ID if successful */
  messageId?: string;

  /** Error message if failed */
  error?: string;
}
