import type { Agent } from "node:https";
import type { MiawLogger } from "./logger.js";

/**
 * Proxy configuration for WhatsApp connections.
 * Supports HTTP, HTTPS, SOCKS4, and SOCKS5 proxies.
 */
export interface ProxyConfig {
  /**
   * Proxy URL
   * @example "http://proxy.example.com:8080"
   * @example "socks5://user:pass@proxy.example.com:1080"
   */
  url: string;

  /** Optional username for proxy authentication (can also be in URL) */
  username?: string;

  /** Optional password for proxy authentication (can also be in URL) */
  password?: string;
}

/**
 * A LID (Linked ID) ↔ phone-number mapping pair, as exposed by Baileys'
 * native LID store and the `messaging-history.set` `lidPnMappings` array.
 */
export interface LidMapping {
  /** Privacy-masked LID JID, e.g. `'42877077966917@lid'` */
  lid: string;
  /** Phone-number JID, e.g. `'6281234567890@s.whatsapp.net'` */
  pn: string;
}

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

  /** Custom logger instance (default: filtered pino) */
  logger?: MiawLogger;

  /** Auto-reconnect on connection loss (default: true) */
  autoReconnect?: boolean;

  /** Maximum reconnection attempts (default: Infinity) */
  maxReconnectAttempts?: number;

  /** Delay between reconnection attempts in ms (default: 3000) */
  reconnectDelay?: number;

  // Advanced timeout configurations
  /** Timeout for detecting stuck connection state in ms (default: 30000) */
  stuckStateTimeout?: number;

  /** QR code grace period in ms (default: 30000) */
  qrGracePeriod?: number;

  /** QR code scan timeout in ms (default: 60000) */
  qrScanTimeout?: number;

  /** Connection establishment timeout in ms (default: 120000) */
  connectionTimeout?: number;

  /** Enable full history sync on connect (default: true) */
  syncFullHistory?: boolean;

  /**
   * Browser identity tuple sent to WhatsApp: [os, browserName, version].
   * Default: Baileys' Browsers.macOS("Chrome").
   *
   * Do NOT use a "Desktop" browser name: since ~2026-06-29 WhatsApp rejects
   * the legacy Desktop identity (webSubPlatform DARWIN/WIN32) with a 428
   * before issuing a QR. Browser identities ("Chrome", etc.) still pair.
   * Note: the linked device is labeled with this tuple on the phone (e.g.
   * "Chrome (Mac OS)"), and browser identities may receive shallower history
   * sync than the old Desktop identity.
   * @see https://github.com/WhiskeySockets/Baileys/issues/2671
   */
  browser?: [string, string, string];

  /**
   * Proxy configuration for this instance.
   * Each instance can have its own proxy for IP rotation.
   * Pass a string for quick proxy URL, or ProxyConfig object for auth options.
   * @example "socks5://proxy.example.com:1080"
   * @example { url: "http://proxy:8080", username: "user", password: "pass" }
   */
  proxy?: ProxyConfig | string;

  /**
   * Custom agent for WebSocket connections (advanced).
   * Takes priority over proxy config. Must be a Node.js http.Agent.
   */
  agent?: Agent;

  /**
   * Custom agent for HTTP fetch requests - media upload/download (advanced).
   * Takes priority over proxy config. Must be an undici-compatible Dispatcher.
   */
  fetchAgent?: unknown;

  /**
   * Authenticate with a pairing code instead of a QR code (headless/server
   * friendly). Requires `phoneNumber`. On a fresh session the `pairing_code`
   * event is emitted with an 8-character code to enter in WhatsApp
   * (Linked Devices → Link with phone number). Default: false.
   */
  usePairingCode?: boolean;

  /**
   * Phone number in international format without '+' (e.g. '6281234567890'),
   * used when `usePairingCode` is true.
   */
  phoneNumber?: string;
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
  type:
    | "text"
    | "image"
    | "video"
    | "audio"
    | "document"
    | "sticker"
    | "unknown";

  /** Media metadata (only present for media messages: image, video, audio, document, sticker) */
  media?: MediaInfo;

  /** Original raw message from Baileys (for advanced use) */
  raw?: any;
}

/**
 * Connection states
 */
export type ConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "qr_required";

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

  /** Emitted when someone votes on a poll (carries the aggregated tally) */
  poll_vote: (vote: PollVoteUpdate) => void;

  /** Emitted when a pairing code is generated (pairing-code auth) */
  pairing_code: (code: string) => void;

  /** Emitted when a contact's presence changes (online/offline/typing) */
  presence: (update: PresenceUpdate) => void;

  /** Emitted when connection state changes */
  connection: (state: ConnectionState) => void;

  /** Emitted when client is disconnected (statusCode is the Baileys DisconnectReason code, if any) */
  disconnected: (reason?: string, statusCode?: number) => void;

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

  /**
   * Phone numbers / JIDs to @mention. Only meaningful in groups. The mentioned
   * users must also be referenced as `@<number>` in the text to render.
   * @example ["6281234567890"]
   */
  mentions?: string[];
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

  /** Phone numbers / JIDs to @mention in the caption (groups only) */
  mentions?: string[];
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

  /** Phone numbers / JIDs to @mention in the caption (groups only) */
  mentions?: string[];
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
 * A contact to share, rendered as a WhatsApp contact card (vCard).
 */
export interface ContactCard {
  /** Full display name shown on the card */
  fullName: string;

  /** Phone number in international format without '+' (e.g. '6281234567890') */
  phone: string;

  /** Optional organization / company name */
  organization?: string;
}

/**
 * Options for sending a location message
 */
export interface SendLocationOptions {
  /** Optional location name/title */
  name?: string;

  /** Optional street address */
  address?: string;

  /** Quote/reply to a specific message */
  quoted?: MiawMessage;
}

/**
 * Options for sending a contact card
 */
export interface SendContactOptions {
  /** Quote/reply to a specific message */
  quoted?: MiawMessage;
}

/**
 * Options for sending a sticker (WebP)
 */
export interface SendStickerOptions {
  /** Quote/reply to a specific message */
  quoted?: MiawMessage;
}

/**
 * Options for sending a poll
 */
export interface SendPollOptions {
  /** How many options a voter may select (default: 1) */
  selectableCount?: number;

  /** Quote/reply to a specific message */
  quoted?: MiawMessage;
}

/**
 * A poll vote update, emitted via the `poll_vote` event when someone votes.
 * Carries the current aggregated tally for the poll.
 */
export interface PollVoteUpdate {
  /** ID of the poll-creation message */
  pollMessageId: string;

  /** Chat JID the poll lives in */
  chatId: string;

  /** Aggregated tally: each option with the voter JIDs that selected it */
  results: Array<{ option: string; voters: string[] }>;
}

/**
 * Options for posting a status / story (v1.8.0)
 */
export interface PostStatusOptions {
  /** Caption for image/video status */
  caption?: string;

  /** Background color for a text status (e.g. '#0a7cff' or an ARGB int as string) */
  backgroundColor?: string;

  /** Font type for a text status (numeric font id) */
  font?: number;
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
 * Full contact profile information (extends ContactInfo with additional data)
 */
export interface ContactProfile extends ContactInfo {
  /** Profile picture URL */
  pictureUrl?: string;

  /** Business profile details (if business account) */
  business?: BusinessProfile;
}

/**
 * Group participant information
 */
export interface GroupParticipant {
  /** Participant's JID */
  jid: string;

  /** Participant's role in the group */
  role: "admin" | "superadmin" | "member";
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

/**
 * Presence status types
 */
export type PresenceStatus = "available" | "unavailable";

/**
 * Presence update from a contact
 */
export interface PresenceUpdate {
  /** Contact's JID */
  jid: string;

  /** Last known presence status */
  status: "available" | "unavailable" | "composing" | "recording" | "paused";

  /** Last seen timestamp (if available) */
  lastSeen?: number;
}

// ============================================
// Group Management Types (v0.7.0)
// ============================================

/**
 * Result of a group participant operation (add, remove, promote, demote)
 */
export interface ParticipantOperationResult {
  /** Participant JID */
  jid: string;

  /**
   * Operation status code:
   * - '200' = Success
   * - '403' = Not authorized (not admin)
   * - '408' = User left group / doesn't exist
   * - '409' = Already in group (add) / Not in group (remove)
   */
  status: string;

  /** Whether the operation was successful */
  success: boolean;
}

/**
 * Result of creating a group
 */
export interface CreateGroupResult {
  /** Whether the group was created successfully */
  success: boolean;

  /** Group JID if successful */
  groupJid?: string;

  /** Group info if successful */
  groupInfo?: GroupInfo;

  /** Error message if failed */
  error?: string;
}

/**
 * Result of a group operation (generic)
 */
export interface GroupOperationResult {
  /** Whether the operation was successful */
  success: boolean;

  /** Error message if failed */
  error?: string;
}

/**
 * Group invite information (preview before joining)
 */
export interface GroupInviteInfo {
  /** Group JID */
  jid: string;

  /** Group name */
  name: string;

  /** Group description */
  description?: string;

  /** Number of participants */
  participantCount: number;

  /** Group creation timestamp */
  createdAt?: number;
}

// ============================================
// Profile Management Types (v0.8.0)
// ============================================

/**
 * Result of a profile operation (update picture, name, status)
 */
export interface ProfileOperationResult {
  /** Whether the operation was successful */
  success: boolean;

  /** Error message if failed */
  error?: string;
}

// ============================================
// Label Types (v0.9.0) - WhatsApp Business only
// ============================================

/**
 * WhatsApp predefined label IDs
 */
export enum PredefinedLabelId {
  NewCustomer = 1,
  NewOrder = 2,
  PendingPayment = 3,
  Paid = 4,
  Shipped = 5,
}

/**
 * Label color options (WhatsApp has 20 predefined colors)
 */
export enum LabelColor {
  Color1 = 0,
  Color2,
  Color3,
  Color4,
  Color5,
  Color6,
  Color7,
  Color8,
  Color9,
  Color10,
  Color11,
  Color12,
  Color13,
  Color14,
  Color15,
  Color16,
  Color17,
  Color18,
  Color19,
  Color20,
}

/**
 * Label information
 */
export interface Label {
  /** Unique label ID (optional for create, required for edit) */
  id?: string;
  /** Label name */
  name: string;
  /** Label color (0-19) */
  color: LabelColor;
  /** Whether this label is deleted */
  deleted?: boolean;
  /** Predefined label ID (if applicable) */
  predefinedId?: PredefinedLabelId;
}

/**
 * Result of a label operation
 */
export interface LabelOperationResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Label ID if successful (for create operations) */
  labelId?: string;
}

// ============================================
// Catalog/Product Types (v0.9.0) - WhatsApp Business only
// ============================================

/**
 * Product image URL
 */
export interface ProductImage {
  /** Image URL */
  url: string;
  /** Optional image caption */
  caption?: string;
}

/**
 * Product information (matches Baileys v7 format)
 */
export interface Product {
  /** Unique product ID (from WhatsApp) */
  id?: string;
  /** Product name */
  name?: string;
  /** Product description */
  description?: string;
  /** Product price */
  price?: number;
  /** Currency code (e.g., "USD") */
  currency?: string;
  /** Product retailer ID (your internal SKU) */
  retailerId?: string | null;
  /** Product URL */
  url?: string | null;
  /** Whether product is hidden */
  isHidden?: boolean;
  /** Product image URLs from Baileys */
  imageUrls?: { [key: string]: string };
  /** Product availability */
  availability?: string;
  /** Review status */
  reviewStatus?: { [key: string]: string };
}

/**
 * Product collection
 */
export interface ProductCollection {
  /** Collection ID */
  id: string;
  /** Collection name */
  name: string;
  /** Products in collection */
  products?: Product[];
}

/**
 * Product catalog result
 */
export interface ProductCatalog {
  /** Whether the request was successful */
  success: boolean;
  /** Products in the catalog */
  products?: Product[];
  /** Pagination cursor */
  nextCursor?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Product operation result (create, update, delete)
 */
export interface ProductOperationResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Product ID if successful */
  productId?: string;
  /** Number of products deleted (for delete operations) */
  deletedCount?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Options for creating/updating a product (matches Baileys v7 format)
 */
export interface ProductOptions {
  /** Product name */
  name: string;
  /** Product description */
  description: string;
  /** Product price (numeric value) */
  price: number;
  /** Currency code (e.g., "USD", "BRL", "IDR") */
  currency: string;
  /** Product image URLs (must be publicly accessible for WhatsApp to fetch) */
  imageUrls?: string[];
  /** Product images as buffers (alternative to imageUrls, recommended for reliability) */
  imageBuffers?: Buffer[];
  /** Whether product is hidden from catalog */
  isHidden?: boolean;
  /** Your internal product ID/SKU */
  retailerId?: string;
  /** Product landing page URL */
  url?: string;
  /** ISO country code for product origin (for compliance) */
  originCountryCode?: string;
}

// ============================================
// Newsletter/Channel Types (v0.9.0)
// ============================================

/**
 * Newsletter metadata
 */
export interface NewsletterMetadata {
  /** Newsletter JID */
  id: string;
  /** Newsletter name */
  name: string;
  /** Newsletter description */
  description?: string;
  /** Newsletter picture URL */
  pictureUrl?: string;
  /** Subscriber count */
  subscribers?: number;
  /** Whether this is a newsletter you created */
  isCreator?: boolean;
  /** Whether you're subscribed to this newsletter */
  isFollowing?: boolean;
  /** Whether newsletter is muted */
  isMuted?: boolean;
  /** Newsletter creation timestamp */
  createdAt?: number;
  /** Newsletter update timestamp */
  updatedAt?: number;
}

/**
 * Newsletter message
 */
export interface NewsletterMessage {
  /** Message ID */
  id: string;
  /** Newsletter JID */
  newsletterId: string;
  /** Message content (text or media) */
  content?: string;
  /** Message timestamp */
  timestamp: number;
  /** Media URL (if applicable) */
  mediaUrl?: string;
  /** Media type */
  mediaType?: string;
}

/**
 * Newsletter messages result
 */
export interface NewsletterMessagesResult {
  /** Whether the request was successful */
  success: boolean;
  /** Messages fetched */
  messages?: NewsletterMessage[];
  /** Next pagination cursor */
  nextCursor?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Newsletter operation result
 */
export interface NewsletterOperationResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Newsletter ID if created */
  newsletterId?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Newsletter subscription info
 */
export interface NewsletterSubscriptionInfo {
  /** Subscriber count */
  subscribers?: number;
  /** Admin count */
  adminCount?: number;
}

// ============================================
// Contact Management Types (v0.9.0)
// ============================================

/**
 * Contact information for adding/editing
 */
export interface ContactData {
  /** Contact's phone number (with country code) */
  phone: string;
  /** Contact's display name */
  name: string;
  /** Additional contact info (for advanced use) */
  firstName?: string;
  lastName?: string;
}

/**
 * Contact operation result
 */
export interface ContactOperationResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Own profile information
 */
export interface OwnProfile {
  /** User's JID */
  jid: string;
  /** User's phone number */
  phone?: string;
  /** User's profile name (display name) */
  name?: string;
  /** User's status/about text */
  status?: string;
  /** Profile picture URL */
  pictureUrl?: string;
  /** Whether this is a business account */
  isBusiness?: boolean;
}

/**
 * Result of fetching all contacts
 */
export interface FetchAllContactsResult {
  /** Whether the operation was successful */
  success: boolean;
  /** List of contacts */
  contacts?: ContactInfo[];
  /** Error message if failed */
  error?: string;
}

/**
 * Result of fetching all groups
 */
export interface FetchAllGroupsResult {
  /** Whether the operation was successful */
  success: boolean;
  /** List of groups */
  groups?: GroupInfo[];
  /** Error message if failed */
  error?: string;
}

/**
 * Result of fetching all labels
 */
export interface FetchAllLabelsResult {
  /** Whether the operation was successful */
  success: boolean;
  /** List of labels */
  labels?: Label[];
  /** Error message if failed */
  error?: string;
}

/**
 * Result of fetching chat messages
 */
export interface FetchChatMessagesResult {
  /** Whether the operation was successful */
  success: boolean;
  /** List of messages from the chat */
  messages?: MiawMessage[];
  /** Error message if failed */
  error?: string;
}

/**
 * Chat information
 */
export interface ChatInfo {
  /** Chat JID */
  jid: string;
  /** Chat name (if available) */
  name?: string;
  /** Phone number (for individual chats) */
  phone?: string;
  /** Whether this is a group chat */
  isGroup?: boolean;
  /** Last message timestamp */
  lastMessageTimestamp?: number;
  /** Unread message count */
  unreadCount?: number;
  /** Whether chat is archived */
  isArchived?: boolean;
  /** Whether chat is pinned */
  isPinned?: boolean;
  /** Whether chat is muted */
  isMuted?: boolean;
}

/**
 * Result of a chat-management operation (archive, pin, mute, etc.)
 */
export interface ChatOperationResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Error message if it failed */
  error?: string;
}

/**
 * Result of fetching all chats
 */
export interface FetchAllChatsResult {
  /** Whether the operation was successful */
  success: boolean;
  /** List of chats */
  chats?: ChatInfo[];
  /** Error message if failed */
  error?: string;
}
