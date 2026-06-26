/**
 * Type definitions for commonly used Baileys structures
 * These are simplified wrappers around Baileys types to avoid `any`
 * and provide better type safety throughout miaw-core.
 */

/**
 * Long type from Baileys (used for timestamps)
 */
export interface Long {
  low: number;
  high: number;
  unsigned: boolean;
}

/**
 * Baileys message key structure
 */
export interface BaileysMessageKey {
  remoteJid?: string | null;
  fromMe?: boolean | null;
  id?: string | null;
  participant?: string | null;
  // Baileys rc13 addressing: the alternate JID for the other format. When the
  // primary id is a privacy LID (@lid), the *Alt holds the phone JID
  // (@s.whatsapp.net) and vice versa. addressingMode is 'lid' | 'pn'.
  remoteJidAlt?: string | null;    // alternate JID for DMs
  participantAlt?: string | null;  // alternate JID for group participants
  addressingMode?: string | null;
  // Legacy fields kept for backward compatibility with older session data.
  participantPn?: string | null;
  senderPn?: string | null;
}

/**
 * Media message metadata
 */
export interface BaileysImageMessage {
  mimetype?: string;
  caption?: string;
  fileSize?: number;
  fileLength?: number;  // Alternative name used by Baileys
  width?: number;
  height?: number;
}

export interface BaileysVideoMessage {
  mimetype?: string;
  caption?: string;
  fileSize?: number;
  fileLength?: number;  // Alternative name used by Baileys
  duration?: number;
  seconds?: number;     // Alternative name used by Baileys
  width?: number;
  height?: number;
  gifPlayback?: boolean;
}

export interface BaileysDocumentMessage {
  mimetype?: string;
  caption?: string;
  fileName?: string;
  fileSize?: number;
  fileLength?: number;  // Alternative name used by Baileys
}

export interface BaileysAudioMessage {
  mimetype?: string;
  duration?: number;
  seconds?: number;     // Alternative name used by Baileys
  fileSize?: number;
  fileLength?: number;  // Alternative name used by Baileys
  ptt?: boolean;  // Push-to-talk (voice note)
}

export interface BaileyStickerMessage {
  mimetype?: string;
  fileSize?: number;
  fileLength?: number;  // Alternative name used by Baileys
  width?: number;
  height?: number;
}

/**
 * Message content types from Baileys
 */
export interface BaileysMessageContent {
  conversation?: string;
  extendedTextMessage?: {
    text?: string;
  };
  imageMessage?: BaileysImageMessage;
  videoMessage?: BaileysVideoMessage;
  documentMessage?: BaileysDocumentMessage;
  audioMessage?: BaileysAudioMessage;
  stickerMessage?: BaileyStickerMessage;
  viewOnceMessage?: { message?: BaileysMessageContent };
  viewOnceMessageV2?: { message?: BaileysMessageContent };
  viewOnceMessageV2Extension?: { message?: BaileysMessageContent };
}

/**
 * Baileys message structure (simplified)
 */
export interface BaileysMessage {
  key: BaileysMessageKey;
  messageTimestamp?: number | Long | null;
  pushName?: string | null;
  // Baileys may emit a null message (e.g. protocol/placeholder messages)
  message?: BaileysMessageContent | null;
}

/**
 * Baileys message upsert event
 */
export interface BaileysMessageUpsert {
  messages: BaileysMessage[];
  type: "notify" | "append";
}

/**
 * Baileys connection update event
 */
export interface BaileysConnectionUpdate {
  connection?: "open" | "connecting" | "close";
  lastDisconnect?: {
    error?: Error;
    date?: Date;
  };
  qr?: string;
  receivedPendingNotifications?: boolean;
}

/**
 * Baileys credentials update (for session saving)
 */
export interface BaileysCredentials {
  [key: string]: unknown;
}

/**
 * Type guard for Long (used by Baileys for timestamps)
 */
export function isLong(value: unknown): value is Long {
  return (
    typeof value === "object" &&
    value !== null &&
    "low" in value &&
    "high" in value &&
    "unsigned" in value
  );
}
