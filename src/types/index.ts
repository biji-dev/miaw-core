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
 * Media metadata extracted from media messages
 */
export interface MediaInfo {
  /** MIME type of the media (e.g., 'image/jpeg', 'video/mp4') */
  mimetype?: string;

  /** File size in bytes */
  fileSize?: number;

  /** Original filename (for documents) */
  fileName?: string;

  /** Width in pixels (for images/videos) */
  width?: number;

  /** Height in pixels (for images/videos) */
  height?: number;

  /** Duration in seconds (for audio/video) */
  duration?: number;

  /** Whether this is a voice note / PTT (for audio) */
  ptt?: boolean;

  /** Whether this is a GIF playback video */
  gifPlayback?: boolean;

  /** Whether this is a view-once message */
  viewOnce?: boolean;
}

/**
 * Normalized message structure - simplified from Baileys
 */
export interface MiawMessage {
  /** Unique message ID */
  id: string;

  /**
   * Sender's WhatsApp JID (Jabber ID)
   *
   * Possible formats:
   * - Standard: '1234567890@s.whatsapp.net' (traditional phone number)
   * - Link ID: '1234567890@lid' (privacy-enhanced, used when phone number is hidden)
   * - Group: '123456789@g.us' (group chats)
   *
   * Note: @lid format was introduced by WhatsApp for enhanced privacy.
   * You can send messages to @lid addresses directly - no conversion needed.
   */
  from: string;

  /** Sender's phone number (if available, extracted from Baileys message key) */
  senderPhone?: string;

  /** Sender's display name (pushName from WhatsApp) */
  senderName?: string;

  /** Message text content (text or caption for media) */
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

  /** Media metadata (only present for media messages: image, video, audio, document, sticker) */
  media?: MediaInfo;

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
 * Message edit notification
 */
export interface MessageEdit {
  /** The message ID that was edited */
  messageId: string;

  /** The chat/conversation JID where the message was edited */
  chatId: string;

  /** New text content after edit */
  newText?: string;

  /** Timestamp of the edit (Unix timestamp in milliseconds) */
  editTimestamp: number;

  /** Original raw Baileys message for advanced use */
  raw?: any;
}

/**
 * Message delete notification
 */
export interface MessageDelete {
  /** The message ID that was deleted */
  messageId: string;

  /** The chat/conversation JID where the message was deleted */
  chatId: string;

  /** Whether the message was deleted by the sender (true) or recipient (false) */
  fromMe: boolean;

  /** Participant who deleted (for group chats) */
  participant?: string;

  /** Original raw Baileys message for advanced use */
  raw?: any;
}

/**
 * Reaction to a message
 */
export interface MessageReaction {
  /** The message ID that received the reaction */
  messageId: string;

  /** The chat/conversation JID */
  chatId: string;

  /** The reactor's JID (who sent the reaction) */
  reactorId: string;

  /** Emoji reaction text (empty string means reaction was removed) */
  emoji: string;

  /** Whether the reaction was removed (emoji will be empty) */
  isRemoval: boolean;

  /** Original raw Baileys reaction for advanced use */
  raw?: any;
}

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

  /** Emitted when a message is edited */
  message_edit: (edit: MessageEdit) => void;

  /** Emitted when a message is deleted/revoked */
  message_delete: (deletion: MessageDelete) => void;

  /** Emitted when a message receives a reaction */
  message_reaction: (reaction: MessageReaction) => void;

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
  /** Quote/reply to a specific message (pass the MiawMessage to reply to) */
  quoted?: MiawMessage;
}

/**
 * Media source - can be a file path, URL, or Buffer
 */
export type MediaSource =
  | string // File path or URL
  | Buffer;

/**
 * Options for sending image messages
 */
export interface SendImageOptions {
  /** Image caption */
  caption?: string;

  /** Quote/reply to a specific message (pass the MiawMessage to reply to) */
  quoted?: MiawMessage;

  /** Send as view-once message (disappears after viewing) */
  viewOnce?: boolean;
}

/**
 * Options for sending document messages
 */
export interface SendDocumentOptions {
  /** Document caption */
  caption?: string;

  /** Custom filename to display (e.g., 'report.pdf') */
  fileName?: string;

  /** MIME type (e.g., 'application/pdf'). Auto-detected from fileName if not provided */
  mimetype?: string;

  /** Quote/reply to a specific message (pass the MiawMessage to reply to) */
  quoted?: MiawMessage;
}

/**
 * Options for sending video messages
 */
export interface SendVideoOptions {
  /** Video caption */
  caption?: string;

  /** Quote/reply to a specific message (pass the MiawMessage to reply to) */
  quoted?: MiawMessage;

  /** Send as view-once message (disappears after viewing) */
  viewOnce?: boolean;

  /** Play as GIF (loops, no audio) */
  gifPlayback?: boolean;

  /** Send as video note (circular video, like Telegram) */
  ptv?: boolean;
}

/**
 * Options for sending audio messages
 */
export interface SendAudioOptions {
  /** Quote/reply to a specific message (pass the MiawMessage to reply to) */
  quoted?: MiawMessage;

  /** Send as voice note (PTT - push to talk). Shows as voice message instead of audio file */
  ptt?: boolean;

  /** MIME type (e.g., 'audio/mp4', 'audio/ogg; codecs=opus'). Auto-detected if not provided */
  mimetype?: string;
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

/**
 * Result of checking if a phone number is on WhatsApp
 */
export interface CheckNumberResult {
  /** Whether the number exists on WhatsApp */
  exists: boolean;

  /** The JID if the number exists */
  jid?: string;

  /** Error message if check failed */
  error?: string;
}

/**
 * Contact information
 */
export interface ContactInfo {
  /** Contact's JID */
  jid: string;

  /** Contact's display name (if available) */
  name?: string;

  /** Contact's phone number */
  phone?: string;

  /** Contact's status/about text */
  status?: string;

  /** Whether this is a business account */
  isBusiness?: boolean;
}

/**
 * Business profile information
 */
export interface BusinessProfile {
  /** Business description */
  description?: string;

  /** Business category */
  category?: string;

  /** Business website */
  website?: string;

  /** Business email */
  email?: string;

  /** Business address */
  address?: string;
}

/**
 * Group participant information
 */
export interface GroupParticipant {
  /** Participant's JID */
  jid: string;

  /** Participant's role in the group */
  role: 'admin' | 'superadmin' | 'member';
}

/**
 * Group metadata information
 */
export interface GroupInfo {
  /** Group JID */
  jid: string;

  /** Group name/subject */
  name: string;

  /** Group description */
  description?: string;

  /** Group owner JID */
  owner?: string;

  /** Group creation timestamp */
  createdAt?: number;

  /** Number of participants */
  participantCount: number;

  /** List of participants */
  participants: GroupParticipant[];

  /** Whether only admins can send messages */
  announce?: boolean;

  /** Whether only admins can edit group info */
  restrict?: boolean;
}
