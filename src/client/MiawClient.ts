import makeWASocket, {
  DisconnectReason,
  WASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  AnyMessageContent,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { EventEmitter } from "node:events";
import pino from "pino";
import {
  MiawClientOptions,
  ConnectionState,
  SendTextOptions,
  SendMessageResult,
  MiawClientEvents,
  MediaSource,
  SendImageOptions,
  SendDocumentOptions,
  SendVideoOptions,
  SendAudioOptions,
  MiawMessage,
  MessageEdit,
  MessageDelete,
  MessageReaction,
  CheckNumberResult,
  ContactInfo,
  BusinessProfile,
  GroupParticipant,
  GroupInfo,
  PresenceStatus,
  PresenceUpdate,
  // v0.7.0 Group Management
  ParticipantOperationResult,
  CreateGroupResult,
  GroupOperationResult,
  GroupInviteInfo,
  // v0.8.0 Profile Management
  ProfileOperationResult,
  // v0.9.0 Labels
  Label,
  LabelOperationResult,
  // v0.9.0 Catalog/Product
  Product,
  ProductCatalog,
  ProductOperationResult,
  ProductOptions,
  ProductCollection,
  // v0.9.0 Newsletter/Channel
  NewsletterMetadata,
  NewsletterMessagesResult,
  NewsletterOperationResult,
  NewsletterSubscriptionInfo,
  // v0.9.0 Contact Management
  ContactData,
  ContactOperationResult,
  // v0.9.0 Basic GET Operations
  OwnProfile,
  FetchAllContactsResult,
  FetchAllGroupsResult,
  FetchAllLabelsResult,
  FetchChatMessagesResult,
  FetchAllChatsResult,
  ChatInfo,
} from "../types/index.js";
import * as path from "node:path";
import { AuthHandler } from "../handlers/AuthHandler.js";
import { MessageHandler } from "../handlers/MessageHandler.js";

/**
 * LRU Cache for LID to JID mappings
 * Prevents unbounded memory growth while maintaining frequently used mappings
 */
class LruCache {
  private cache: Map<string, string>;
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): string | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: string): void {
    // Remove existing if present (will be re-added at end)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Add to end (most recently used)
    this.cache.set(key, value);

    // Evict oldest if at capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Main client class for interacting with WhatsApp
 */
export class MiawClient extends EventEmitter {
  private options: Required<MiawClientOptions>;
  private socket: WASocket | null = null;
  private authHandler: AuthHandler;
  private connectionState: ConnectionState = "disconnected";
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private logger: any;
  private lidToJidMap: LruCache = new LruCache(1000);
  // In-memory stores for v0.9.0
  private contactsStore: Map<string, ContactInfo> = new Map();
  private labelsStore: Map<string, Label> = new Map();
  private messagesStore: Map<string, MiawMessage[]> = new Map(); // JID -> messages
  private chatsStore: Map<string, ChatInfo> = new Map(); // JID -> chat info

  constructor(options: MiawClientOptions) {
    super();

    // Set default options
    this.options = {
      instanceId: options.instanceId,
      sessionPath: options.sessionPath || "./sessions",
      debug: options.debug || false,
      logger: options.logger,
      autoReconnect: options.autoReconnect !== false,
      maxReconnectAttempts: options.maxReconnectAttempts || Infinity,
      reconnectDelay: options.reconnectDelay || 3000,
    };

    // Suppress console logs from libsignal when debug is off
    // Libsignal uses console.log directly for session management logs
    if (!this.options.debug) {
      const _originalLog = console.log;
      const _originalError = console.error;
      const _originalWarn = console.warn;
      const _originalInfo = console.info;

      const shouldSuppress = (args: any[]): boolean => {
        const msg = args.map(String).join(" ");
        return (
          msg.includes("Closing session") ||
          msg.includes("SessionEntry {") ||
          (msg.includes("_chains:") && msg.includes("registrationId:"))
        );
      };

      console.log = (...args: any[]) => {
        if (!shouldSuppress(args)) _originalLog.apply(console, args);
      };
      console.error = (...args: any[]) => {
        if (!shouldSuppress(args)) _originalError.apply(console, args);
      };
      console.warn = (...args: any[]) => {
        if (!shouldSuppress(args)) _originalWarn.apply(console, args);
      };
      console.info = (...args: any[]) => {
        if (!shouldSuppress(args)) _originalInfo.apply(console, args);
      };
    }

    // Initialize logger
    this.logger =
      this.options.logger ||
      pino({
        level: this.options.debug ? "debug" : "silent",
      });

    // Initialize handlers
    this.authHandler = new AuthHandler(
      this.options.sessionPath,
      this.options.instanceId
    );
  }

  /**
   * Connect to WhatsApp
   */
  async connect(): Promise<void> {
    try {
      this.updateConnectionState("connecting");

      // Load auth state
      const { state, saveCreds } = await this.authHandler.initialize();

      // Get latest Baileys version
      const { version } = await fetchLatestBaileysVersion();

      // Create socket
      this.socket = makeWASocket({
        version,
        logger: this.logger,
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, this.logger),
        },
        browser: ["Miaw", "Chrome", "1.0.0"],
        generateHighQualityLinkPreview: true,
        // Enable app state sync for labels and other features
        syncFullHistory: false,
        fireInitQueries: true,
      });

      // Register event handlers
      this.registerSocketEvents(saveCreds);

      this.logger.info("Connection initiated");
    } catch (error) {
      this.logger.error("Failed to connect:", error);
      this.emit("error", error as Error);

      if (this.options.autoReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  /**
   * Register socket event handlers
   */
  private registerSocketEvents(saveCreds: () => Promise<void>): void {
    if (!this.socket) return;

    // Connection updates
    this.socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Handle QR code
      if (qr) {
        this.updateConnectionState("qr_required");
        this.emit("qr", qr);
      }

      // Handle connection state
      if (connection === "close") {
        const shouldReconnect = this.handleDisconnect(lastDisconnect);

        if (shouldReconnect && this.options.autoReconnect) {
          this.scheduleReconnect();
        }
      } else if (connection === "open") {
        this.reconnectAttempts = 0;
        this.updateConnectionState("connected");
        this.emit("ready");
        this.logger.info("Connected to WhatsApp");

        // Sync app state to populate labels (WhatsApp Business)
        // Labels are stored in the 'regular' app state collection
        this.syncLabelsFromAppState().catch((error) => {
          this.logger.warn("Failed to sync labels from app state:", error);
        });
      }
    });

    // Credentials update
    this.socket.ev.on("creds.update", async () => {
      await saveCreds();
      this.emit("session_saved");
    });

    // Contact updates - build LID to JID mapping and populate contacts store
    this.socket.ev.on("contacts.upsert", (contacts) => {
      this.updateLidToJidMapping(contacts);
      this.updateContactsStore(contacts);
    });

    this.socket.ev.on("contacts.update", (contacts) => {
      this.updateLidToJidMapping(contacts);
      this.updateContactsStore(contacts);
    });

    // Chat updates - extract LID mappings from chat data and populate chats store
    this.socket.ev.on("chats.upsert", (chats) => {
      this.updateLidFromChats(chats);
      this.updateChatsStore(chats);
    });

    this.socket.ev.on("chats.update", (chats) => {
      this.updateLidFromChats(chats);
      this.updateChatsStore(chats);
    });

    // Messages
    this.socket.ev.on("messages.upsert", async (m) => {
      if (m.type !== "notify") return;

      for (const msg of m.messages) {
        // Debug: Log raw Baileys message structure
        if (this.options.debug) {
          console.log("\n========== RAW BAILEYS MESSAGE ==========");
          console.log(JSON.stringify(msg, null, 2));
          console.log("=========================================\n");
        }

        // Check for protocol messages (edits and deletes)
        const protocolMessage = msg.message?.protocolMessage;
        if (protocolMessage) {
          this.handleProtocolMessage(msg, protocolMessage);
          continue; // Don't process as regular message
        }

        // Build LID to JID mapping from incoming messages
        // Incoming messages have remoteJid (phone) and senderLid (LID)
        // Note: senderLid may exist at runtime but isn't in Baileys v7 types
        const msgKey = msg.key as {
          senderLid?: string;
          fromMe?: boolean;
          remoteJid?: string | null;
        };
        if (!msgKey.fromMe && msgKey.senderLid && msgKey.remoteJid) {
          const lid = msgKey.senderLid.endsWith("@lid")
            ? msgKey.senderLid
            : `${msgKey.senderLid}@lid`;
          this.lidToJidMap.set(lid, msgKey.remoteJid);

          if (this.options.debug) {
            console.log(`[LID Mapping] ${lid} -> ${msg.key.remoteJid}`);
          }
        }

        const normalized = MessageHandler.normalize({ messages: [msg] });
        if (normalized) {
          // Store message in messagesStore (v0.9.0)
          const chatJid = normalized.from;
          if (!this.messagesStore.has(chatJid)) {
            this.messagesStore.set(chatJid, []);
          }
          this.messagesStore.get(chatJid)!.push(normalized);

          this.emit("message", normalized);
        }
      }
    });

    // Reactions
    this.socket.ev.on("messages.reaction", (reactions) => {
      for (const { key, reaction } of reactions) {
        const reactionData: MessageReaction = {
          messageId: key.id || "",
          chatId: key.remoteJid || "",
          reactorId: reaction.key?.participant || reaction.key?.remoteJid || "",
          emoji: reaction.text || "",
          isRemoval: !reaction.text,
          raw: { key, reaction },
        };

        if (this.options.debug) {
          console.log("\n========== REACTION ==========");
          console.log(JSON.stringify(reactionData, null, 2));
          console.log("==============================\n");
        }

        this.emit("message_reaction", reactionData);
      }
    });

    // Presence updates
    this.socket.ev.on("presence.update", (presence) => {
      const jid = presence.id;
      const presences = presence.presences;

      for (const [participantJid, presenceData] of Object.entries(presences)) {
        const update: PresenceUpdate = {
          jid: participantJid || jid,
          status: presenceData.lastKnownPresence as PresenceUpdate["status"],
          lastSeen: presenceData.lastSeen,
        };

        if (this.options.debug) {
          console.log("\n========== PRESENCE UPDATE ==========");
          console.log(JSON.stringify(update, null, 2));
          console.log("=====================================\n");
        }

        this.emit("presence", update);
      }
    });

    // Label updates (WhatsApp Business)
    this.socket.ev.on("labels.edit", (label: any) => {
      if (this.options.debug) {
        console.log("\n========== LABEL UPDATE ==========");
        console.log(JSON.stringify(label, null, 2));
        console.log("==================================\n");
      }

      // Update label in store
      if (label.id) {
        if (label.deleted) {
          this.labelsStore.delete(label.id);
        } else {
          const labelData: Label = {
            id: label.id,
            name: label.name || "",
            color: label.color ?? 0,
            predefinedId: label.predefinedId,
            deleted: label.deleted,
          };
          this.labelsStore.set(label.id, labelData);
        }
      }
    });
  }

  /**
   * Handle protocol messages (edits, deletes)
   */
  private handleProtocolMessage(msg: any, protocolMessage: any): void {
    const type = protocolMessage.type;
    const key = protocolMessage.key;

    // Type 0 = REVOKE (delete)
    if (type === 0 && key) {
      const deletion: MessageDelete = {
        messageId: key.id || "",
        chatId: key.remoteJid || msg.key.remoteJid || "",
        fromMe: key.fromMe || false,
        participant: key.participant,
        raw: msg,
      };

      if (this.options.debug) {
        console.log("\n========== MESSAGE DELETED ==========");
        console.log(JSON.stringify(deletion, null, 2));
        console.log("=====================================\n");
      }

      this.emit("message_delete", deletion);
    }

    // Type 14 = MESSAGE_EDIT
    if (type === 14 && protocolMessage.editedMessage) {
      const editedMessage = protocolMessage.editedMessage;
      const newText =
        editedMessage.conversation ||
        editedMessage.extendedTextMessage?.text ||
        editedMessage.imageMessage?.caption ||
        editedMessage.videoMessage?.caption;

      const edit: MessageEdit = {
        messageId: key?.id || "",
        chatId: key?.remoteJid || msg.key.remoteJid || "",
        newText,
        editTimestamp: protocolMessage.timestampMs
          ? Number(protocolMessage.timestampMs)
          : Date.now(),
        raw: msg,
      };

      if (this.options.debug) {
        console.log("\n========== MESSAGE EDITED ==========");
        console.log(JSON.stringify(edit, null, 2));
        console.log("====================================\n");
      }

      this.emit("message_edit", edit);
    }
  }

  /**
   * Update LID to JID mapping from contacts
   */
  private updateLidToJidMapping(contacts: any[]): void {
    for (const contact of contacts) {
      // Contact has both lid and jid - create mapping
      if (contact.lid && contact.id && !contact.id.endsWith("@lid")) {
        this.lidToJidMap.set(contact.lid, contact.id);
        if (this.options.debug) {
          console.log(`[Contact LID Mapping] ${contact.lid} -> ${contact.id}`);
        }
      }
      // Also check if id is the LID and jid field exists
      if (contact.id?.endsWith("@lid") && contact.jid) {
        this.lidToJidMap.set(contact.id, contact.jid);
        if (this.options.debug) {
          console.log(`[Contact LID Mapping] ${contact.id} -> ${contact.jid}`);
        }
      }
    }
  }

  /**
   * Update in-memory contacts store (v0.9.0)
   * @param contacts - Array of contact objects from Baileys
   */
  private updateContactsStore(contacts: any[]): void {
    for (const contact of contacts) {
      // Extract the JID (prefer non-lid IDs)
      const jid = contact.id?.endsWith("@lid")
        ? contact.jid || contact.id
        : contact.id;
      if (!jid) continue;

      // Extract phone number from JID
      const phone = jid.endsWith("@s.whatsapp.net")
        ? jid.replace("@s.whatsapp.net", "")
        : undefined;

      // Build contact info
      const contactInfo: ContactInfo = {
        jid,
        phone,
        name: contact.name || contact.notify || undefined,
      };

      // Update store
      this.contactsStore.set(jid, contactInfo);
    }
  }

  /**
   * Update in-memory chats store (v0.9.0)
   * @param chats - Array of chat objects from Baileys
   */
  private updateChatsStore(chats: any[]): void {
    for (const chat of chats) {
      const jid = chat.id;
      if (!jid) continue;

      // Extract phone number from JID
      const phone = jid.endsWith("@s.whatsapp.net")
        ? jid.replace("@s.whatsapp.net", "")
        : undefined;

      // Build chat info
      const chatInfo: ChatInfo = {
        jid,
        phone,
        name: chat.name || undefined,
        isGroup: jid.endsWith("@g.us"),
        lastMessageTimestamp: chat.timestamp || undefined,
        unreadCount: chat.unreadCount || undefined,
        isArchived: chat.archived || false,
        isPinned: chat.pinned || false,
      };

      // Update store
      this.chatsStore.set(jid, chatInfo);
    }
  }

  /**
   * Update LID to JID mapping from chat data
   */
  private updateLidFromChats(chats: any[]): void {
    for (const chat of chats) {
      // Chat may have both id (could be phone or LID) and lidJid
      if (chat.lidJid && chat.id && !chat.id.endsWith("@lid")) {
        const lid = chat.lidJid.endsWith("@lid")
          ? chat.lidJid
          : `${chat.lidJid}@lid`;
        this.lidToJidMap.set(lid, chat.id);
        if (this.options.debug) {
          console.log(`[Chat LID Mapping] ${lid} -> ${chat.id}`);
        }
      }
      // Reverse: if id is LID and we have a phone JID
      if (chat.id?.endsWith("@lid") && chat.jid) {
        this.lidToJidMap.set(chat.id, chat.jid);
        if (this.options.debug) {
          console.log(`[Chat LID Mapping] ${chat.id} -> ${chat.jid}`);
        }
      }
    }
  }

  /**
   * Resolve LID to phone number JID
   * @param lid - The LID format JID (e.g., '12345@lid')
   * @returns The phone number JID if found, or the original LID
   */
  resolveLidToJid(lid: string): string {
    if (!lid?.endsWith("@lid")) {
      return lid;
    }
    return this.lidToJidMap.get(lid) || lid;
  }

  /**
   * Get phone number from LID or JID
   * @param jid - Any JID format
   * @returns Phone number string or undefined
   */
  getPhoneFromJid(jid: string): string | undefined {
    const resolved = this.resolveLidToJid(jid);
    if (resolved.endsWith("@s.whatsapp.net")) {
      return resolved.replace("@s.whatsapp.net", "");
    }
    return undefined;
  }

  /**
   * Manually register a LID to phone number mapping
   * Useful for persisting mappings across sessions
   * @param lid - The LID (e.g., '12345@lid' or just '12345')
   * @param phoneJid - The phone JID (e.g., '6281234567890@s.whatsapp.net' or just '6281234567890')
   */
  registerLidMapping(lid: string, phoneJid: string): void {
    const normalizedLid = lid.includes("@") ? lid : `${lid}@lid`;
    const normalizedJid = phoneJid.includes("@")
      ? phoneJid
      : `${phoneJid}@s.whatsapp.net`;
    this.lidToJidMap.set(normalizedLid, normalizedJid);
  }

  /**
   * Get all registered LID mappings
   * Useful for persisting mappings to storage
   */
  getLidMappings(): Record<string, string> {
    const result: Record<string, string> = {};
    // Iterate through the cache
    for (const [key, value] of (this.lidToJidMap as any).cache) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Get LID cache size
   */
  getLidCacheSize(): number {
    return this.lidToJidMap.size;
  }

  /**
   * Clear LID cache
   */
  clearLidCache(): void {
    this.lidToJidMap.clear();
  }

  /**
   * Clear session data for this instance.
   * This will delete all stored authentication credentials.
   * After calling this, the next connect() will require scanning a new QR code.
   * @returns true if session was cleared, false if no session existed
   */
  clearSession(): boolean {
    return this.authHandler.clearSession();
  }

  /**
   * Dispose client and clean up resources
   */
  async dispose(): Promise<void> {
    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Clear LID cache
    this.lidToJidMap.clear();

    // Remove all event listeners
    this.removeAllListeners();

    // Close socket if connected
    if (this.socket) {
      this.socket.end(undefined);
      this.socket = null;
    }

    this.updateConnectionState("disconnected");
  }

  /**
   * Handle disconnection
   * @returns true if should reconnect
   */
  private handleDisconnect(lastDisconnect: any): boolean {
    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
    const reason = DisconnectReason[statusCode] || "unknown";

    this.logger.info("Disconnected:", reason, "Code:", statusCode);
    this.updateConnectionState("disconnected");
    this.emit("disconnected", reason);

    // Don't reconnect if logged out - clear session for fresh QR code on next connect
    if (statusCode === DisconnectReason.loggedOut) {
      this.logger.info("Logged out, clearing session for fresh authentication");
      this.authHandler.clearSession();
      return false;
    }

    return true;
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.logger.error("Max reconnection attempts reached");
      this.emit("error", new Error("Max reconnection attempts reached"));
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    this.updateConnectionState("reconnecting");
    this.emit("reconnecting", this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.logger.info(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      this.connect();
    }, this.options.reconnectDelay);
  }

  /**
   * Update connection state and emit event
   */
  private updateConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.emit("connection", state);
  }

  /**
   * Send a text message
   * @param to - Recipient phone number or JID
   * @param text - Text content to send
   * @param options - Optional settings (quoted for reply)
   */
  async sendText(
    to: string,
    text: string,
    options?: SendTextOptions
  ): Promise<SendMessageResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot send message. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(to);

      // Build send options (for quoting/replying)
      const sendOptions = options?.quoted?.raw
        ? { quoted: options.quoted.raw }
        : undefined;

      const result = await this.socket.sendMessage(jid, { text }, sendOptions);

      return {
        success: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      this.logger.error("Failed to send message:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Send an image message
   * @param to - Recipient phone number or JID
   * @param image - Image source (file path, URL, or Buffer)
   * @param options - Optional settings (caption, viewOnce)
   */
  async sendImage(
    to: string,
    image: MediaSource,
    options?: SendImageOptions
  ): Promise<SendMessageResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot send message. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(to);

      // Build image message payload
      const imageContent: AnyMessageContent = {
        image: Buffer.isBuffer(image) ? image : { url: image },
        caption: options?.caption,
        viewOnce: options?.viewOnce,
      };

      // Build send options (for quoting/replying)
      const sendOptions = options?.quoted?.raw
        ? { quoted: options.quoted.raw }
        : undefined;

      const result = await this.socket.sendMessage(
        jid,
        imageContent,
        sendOptions
      );

      return {
        success: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      this.logger.error("Failed to send image:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Send a document message
   * @param to - Recipient phone number or JID
   * @param document - Document source (file path, URL, or Buffer)
   * @param options - Optional settings (fileName, mimetype, caption)
   */
  async sendDocument(
    to: string,
    document: MediaSource,
    options?: SendDocumentOptions
  ): Promise<SendMessageResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot send message. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(to);

      // Determine filename and mimetype
      let fileName = options?.fileName;
      let mimetype = options?.mimetype;

      // If document is a file path string and no fileName provided, extract from path
      if (!Buffer.isBuffer(document) && !fileName) {
        fileName = path.basename(document);
      }

      // Auto-detect mimetype from fileName if not provided
      if (!mimetype && fileName) {
        mimetype = this.getMimetypeFromFileName(fileName);
      }

      // Build document message payload
      const documentContent: AnyMessageContent = {
        document: Buffer.isBuffer(document) ? document : { url: document },
        fileName: fileName || "document",
        mimetype: mimetype || "application/octet-stream",
        caption: options?.caption,
      };

      // Build send options (for quoting/replying)
      const sendOptions = options?.quoted?.raw
        ? { quoted: options.quoted.raw }
        : undefined;

      const result = await this.socket.sendMessage(
        jid,
        documentContent,
        sendOptions
      );

      return {
        success: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      this.logger.error("Failed to send document:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Send a video message
   * @param to - Recipient phone number or JID
   * @param video - Video source (file path, URL, or Buffer)
   * @param options - Optional settings (caption, viewOnce, gifPlayback, ptv)
   */
  async sendVideo(
    to: string,
    video: MediaSource,
    options?: SendVideoOptions
  ): Promise<SendMessageResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot send message. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(to);

      // Build video message payload
      const videoContent: AnyMessageContent = {
        video: Buffer.isBuffer(video) ? video : { url: video },
        caption: options?.caption,
        viewOnce: options?.viewOnce,
        gifPlayback: options?.gifPlayback,
        ptv: options?.ptv,
      };

      // Build send options (for quoting/replying)
      const sendOptions = options?.quoted?.raw
        ? { quoted: options.quoted.raw }
        : undefined;

      const result = await this.socket.sendMessage(
        jid,
        videoContent,
        sendOptions
      );

      return {
        success: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      this.logger.error("Failed to send video:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Send an audio message
   * @param to - Recipient phone number or JID
   * @param audio - Audio source (file path, URL, or Buffer)
   * @param options - Optional settings (ptt for voice note, mimetype)
   */
  async sendAudio(
    to: string,
    audio: MediaSource,
    options?: SendAudioOptions
  ): Promise<SendMessageResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot send message. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(to);

      // Determine mimetype
      let mimetype = options?.mimetype;
      if (!mimetype && !Buffer.isBuffer(audio)) {
        mimetype = this.getAudioMimetypeFromFileName(audio);
      }

      // Build audio message payload
      const audioContent: AnyMessageContent = {
        audio: Buffer.isBuffer(audio) ? audio : { url: audio },
        mimetype: mimetype || "audio/mp4",
        ptt: options?.ptt,
      };

      // Build send options (for quoting/replying)
      const sendOptions = options?.quoted?.raw
        ? { quoted: options.quoted.raw }
        : undefined;

      const result = await this.socket.sendMessage(
        jid,
        audioContent,
        sendOptions
      );

      return {
        success: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      this.logger.error("Failed to send audio:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Download media from a received message
   * @param message - The MiawMessage containing media (must have raw field with original Baileys message)
   * @returns Buffer containing the media data, or null if download fails
   */
  async downloadMedia(message: MiawMessage): Promise<Buffer | null> {
    try {
      if (!message.raw) {
        throw new Error(
          "Message does not contain raw Baileys data. Cannot download media."
        );
      }

      // Check if this is a media message
      const mediaTypes = ["image", "video", "audio", "document", "sticker"];
      if (!mediaTypes.includes(message.type)) {
        throw new Error(
          `Message type '${message.type}' is not a downloadable media type.`
        );
      }

      const buffer = await downloadMediaMessage(
        message.raw,
        "buffer",
        {},
        {
          logger: this.logger,
          // reuploadRequest allows re-uploading expired media
          reuploadRequest: this.socket
            ? this.socket.updateMediaMessage
            : async (msg) => msg,
        }
      );

      return buffer as Buffer;
    } catch (error) {
      this.logger.error("Failed to download media:", error);
      return null;
    }
  }

  // ============================================
  // Contact & Validation Methods (v0.4.0)
  // ============================================

  /**
   * Check if a phone number is registered on WhatsApp
   * @param phone - Phone number to check (with country code, e.g., '6281234567890')
   * @returns CheckNumberResult with exists flag and JID if found
   */
  async checkNumber(phone: string): Promise<CheckNumberResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot check number. Connection state: ${this.connectionState}`
        );
      }

      // Clean phone number - remove non-digits
      const cleanPhone = phone.replace(/\D/g, "");

      const results = await this.socket.onWhatsApp(cleanPhone);
      const result = results?.[0];

      return {
        exists: !!result?.exists,
        jid: result?.jid,
      };
    } catch (error) {
      this.logger.error("Failed to check number:", error);
      return {
        exists: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Check multiple phone numbers on WhatsApp (batch check)
   * @param phones - Array of phone numbers to check
   * @returns Array of CheckNumberResult
   */
  async checkNumbers(phones: string[]): Promise<CheckNumberResult[]> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot check numbers. Connection state: ${this.connectionState}`
        );
      }

      // Clean all phone numbers
      const cleanPhones = phones.map((p) => p.replace(/\D/g, ""));

      const results = await this.socket.onWhatsApp(...cleanPhones);

      return (results || []).map((result) => ({
        exists: !!result?.exists,
        jid: result?.jid,
      }));
    } catch (error) {
      this.logger.error("Failed to check numbers:", error);
      return phones.map(() => ({
        exists: false,
        error: (error as Error).message,
      }));
    }
  }

  /**
   * Get contact information including status
   * @param jidOrPhone - Contact's JID or phone number
   * @returns ContactInfo or null if not found
   */
  async getContactInfo(jidOrPhone: string): Promise<ContactInfo | null> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot get contact info. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(jidOrPhone);

      // Fetch status
      let status: string | undefined;
      try {
        const statusResult = await this.socket.fetchStatus(jid);
        // fetchStatus returns an array, get first result
        const firstResult = Array.isArray(statusResult)
          ? statusResult[0]
          : statusResult;
        status = (firstResult as any)?.status?.status || undefined;
      } catch {
        // Status might not be available
      }

      // Check if business account
      let isBusiness = false;
      try {
        const businessProfile = await this.socket.getBusinessProfile(jid);
        isBusiness = !!businessProfile;
      } catch {
        // Not a business account or not available
      }

      // Extract phone from JID
      const phone = jid.endsWith("@s.whatsapp.net")
        ? jid.replace("@s.whatsapp.net", "")
        : undefined;

      return {
        jid,
        phone,
        status,
        isBusiness,
      };
    } catch (error) {
      this.logger.error("Failed to get contact info:", error);
      return null;
    }
  }

  /**
   * Get business profile information
   * @param jidOrPhone - Contact's JID or phone number
   * @returns BusinessProfile or null if not a business account
   */
  async getBusinessProfile(
    jidOrPhone: string
  ): Promise<BusinessProfile | null> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot get business profile. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(jidOrPhone);
      const profile = await this.socket.getBusinessProfile(jid);

      if (!profile) {
        return null;
      }

      return {
        description: profile.description || undefined,
        category: profile.category || undefined,
        website: Array.isArray(profile.website)
          ? profile.website[0]
          : profile.website,
        email: profile.email || undefined,
        address: profile.address || undefined,
      };
    } catch (error) {
      this.logger.error("Failed to get business profile:", error);
      return null;
    }
  }

  /**
   * Get profile picture URL for a contact or group
   * @param jidOrPhone - Contact's JID, phone number, or group JID
   * @param highRes - Whether to get high resolution image (default: false)
   * @returns Profile picture URL or null if not available
   */
  async getProfilePicture(
    jidOrPhone: string,
    highRes: boolean = false
  ): Promise<string | null> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot get profile picture. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(jidOrPhone);
      const url = await this.socket.profilePictureUrl(
        jid,
        highRes ? "image" : "preview"
      );

      return url || null;
    } catch (error) {
      // Profile picture might not be available (privacy settings)
      this.logger.debug("Profile picture not available:", error);
      return null;
    }
  }

  // ============================================
  // Basic GET Operations (v0.9.0)
  // ============================================

  /**
   * Fetch all contacts from the in-memory store
   * Note: Contacts are populated via history sync and contact events
   * @returns FetchAllContactsResult with list of contacts
   */
  async fetchAllContacts(): Promise<FetchAllContactsResult> {
    try {
      const contacts = Array.from(this.contactsStore.values());

      return {
        success: true,
        contacts,
      };
    } catch (error) {
      this.logger.error("Failed to fetch contacts:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Fetch all groups the user is participating in
   * @returns FetchAllGroupsResult with list of groups
   */
  async fetchAllGroups(): Promise<FetchAllGroupsResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot fetch groups. Connection state: ${this.connectionState}`
        );
      }

      const groups = await this.socket.groupFetchAllParticipating();

      const groupList: GroupInfo[] = Object.values(groups).map((g: any) => ({
        jid: g.id,
        name: g.subject,
        description: g.desc || undefined,
        owner: g.owner || undefined,
        createdAt: g.creation,
        participantCount: g.participants?.length || 0,
        participants:
          g.participants?.map((p: any) => ({
            jid: p.id,
            role:
              p.admin === "superadmin"
                ? "superadmin"
                : p.admin === "admin"
                ? "admin"
                : "member",
          })) || [],
        announce: g.announce,
        restrict: g.restrict,
      }));

      return {
        success: true,
        groups: groupList,
      };
    } catch (error) {
      this.logger.error("Failed to fetch groups:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get own profile information
   * @returns OwnProfile or null if not available
   */
  async getOwnProfile(): Promise<OwnProfile | null> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot get own profile. Connection state: ${this.connectionState}`
        );
      }

      const jid = this.socket.user?.id;
      if (!jid) {
        throw new Error("User ID not available");
      }

      // Extract phone number from JID
      const phone = jid.endsWith("@s.whatsapp.net")
        ? jid.replace("@s.whatsapp.net", "")
        : undefined;

      // Fetch status
      let status: string | undefined;
      try {
        const statusResult = await this.socket.fetchStatus(jid);
        const firstResult = Array.isArray(statusResult)
          ? statusResult[0]
          : statusResult;
        status = (firstResult as any)?.status?.status || undefined;
      } catch {
        // Status might not be available
      }

      // Fetch profile picture URL
      let pictureUrl: string | undefined;
      try {
        pictureUrl = (await this.socket.profilePictureUrl(jid)) || undefined;
      } catch {
        // Profile picture might not be available
      }

      // Check if business account
      let isBusiness = false;
      try {
        const businessProfile = await this.socket.getBusinessProfile(jid);
        isBusiness = !!businessProfile;
      } catch {
        // Not a business account
      }

      return {
        jid,
        phone,
        status,
        pictureUrl,
        isBusiness,
      };
    } catch (error) {
      this.logger.error("Failed to get own profile:", error);
      return null;
    }
  }

  /**
   * Sync labels from WhatsApp app state
   * This triggers a resync of the 'regular' collection which contains labels
   * Labels will be emitted via labels.edit events and stored in labelsStore
   */
  private async syncLabelsFromAppState(): Promise<void> {
    if (!this.socket) {
      return;
    }

    try {
      // resyncAppState is provided by Baileys to sync app state collections
      // The 'regular' collection contains labels
      // The second parameter (false) means this is not an initial sync
      await this.socket.resyncAppState(["regular"], false);
      this.logger.info(
        "App state sync completed, labels should be populated via labels.edit events"
      );
    } catch (error) {
      // This is non-fatal - labels may already be synced or unavailable
      this.logger.debug("App state sync error (non-fatal):", error);
    }
  }

  /**
   * Fetch all labels from the in-memory store
   * Note: Labels are populated via history sync and label events
   * @param forceSync - If true, force a resync from WhatsApp before returning labels
   * @returns FetchAllLabelsResult with list of labels
   */
  async fetchAllLabels(forceSync = false): Promise<FetchAllLabelsResult> {
    try {
      // Force resync if requested or if store is empty (first call)
      if (forceSync || this.labelsStore.size === 0) {
        await this.syncLabelsFromAppState();
        // Give a brief moment for labels.edit events to be processed
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      const labels = Array.from(this.labelsStore.values());

      return {
        success: true,
        labels,
      };
    } catch (error) {
      this.logger.error("Failed to fetch labels:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get chat messages from the in-memory store
   * Note: Messages are populated via messages.upsert events
   * @param jidOrPhone - Chat JID or phone number
   * @returns FetchChatMessagesResult with list of messages
   */
  async getChatMessages(jidOrPhone: string): Promise<FetchChatMessagesResult> {
    try {
      const jid = MessageHandler.formatPhoneToJid(jidOrPhone);
      const messages = this.messagesStore.get(jid) || [];

      return {
        success: true,
        messages,
      };
    } catch (error) {
      this.logger.error("Failed to get chat messages:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Fetch all chats from the in-memory store
   * Note: Chats are populated via history sync and chat events
   * @returns FetchAllChatsResult with list of chats
   */
  async fetchAllChats(): Promise<FetchAllChatsResult> {
    try {
      const chats = Array.from(this.chatsStore.values());

      return {
        success: true,
        chats,
      };
    } catch (error) {
      this.logger.error("Failed to fetch chats:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // ============================================
  // Group Methods (v0.4.0)
  // ============================================

  /**
   * Get group metadata/information
   * @param groupJid - Group JID (e.g., '123456789@g.us')
   * @returns GroupInfo or null if not found
   */
  async getGroupInfo(groupJid: string): Promise<GroupInfo | null> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot get group info. Connection state: ${this.connectionState}`
        );
      }

      // Ensure it's a group JID
      if (!groupJid.endsWith("@g.us")) {
        throw new Error("Invalid group JID. Must end with @g.us");
      }

      const metadata = await this.socket.groupMetadata(groupJid);

      const participants: GroupParticipant[] = metadata.participants.map(
        (p) => ({
          jid: p.id,
          role:
            p.admin === "superadmin"
              ? "superadmin"
              : p.admin === "admin"
              ? "admin"
              : "member",
        })
      );

      return {
        jid: metadata.id,
        name: metadata.subject,
        description: metadata.desc || undefined,
        owner: metadata.owner || undefined,
        createdAt: metadata.creation,
        participantCount: metadata.participants.length,
        participants,
        announce: metadata.announce,
        restrict: metadata.restrict,
      };
    } catch (error) {
      this.logger.error("Failed to get group info:", error);
      return null;
    }
  }

  /**
   * Get list of participants in a group
   * @param groupJid - Group JID (e.g., '123456789@g.us')
   * @returns Array of GroupParticipant or null if group not found
   */
  async getGroupParticipants(
    groupJid: string
  ): Promise<GroupParticipant[] | null> {
    const groupInfo = await this.getGroupInfo(groupJid);
    return groupInfo?.participants || null;
  }

  // ============================================
  // Advanced Messaging Methods (v0.6.0)
  // ============================================

  /**
   * Send a reaction to a message
   * @param message - The MiawMessage to react to (must have raw field)
   * @param emoji - Emoji to react with (e.g., '❤️', '👍'). Empty string removes reaction.
   * @returns SendMessageResult
   */
  async sendReaction(
    message: MiawMessage,
    emoji: string
  ): Promise<SendMessageResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot send reaction. Connection state: ${this.connectionState}`
        );
      }

      if (!message.raw?.key) {
        throw new Error(
          "Message does not contain raw Baileys key data. Cannot send reaction."
        );
      }

      const jid = message.raw.key.remoteJid;
      if (!jid) {
        throw new Error("Message does not have a valid chat JID.");
      }

      const result = await this.socket.sendMessage(jid, {
        react: {
          text: emoji,
          key: message.raw.key,
        },
      });

      return {
        success: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      this.logger.error("Failed to send reaction:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Remove a reaction from a message (alias for sendReaction with empty string)
   * @param message - The MiawMessage to remove reaction from
   * @returns SendMessageResult
   */
  async removeReaction(message: MiawMessage): Promise<SendMessageResult> {
    return this.sendReaction(message, "");
  }

  /**
   * Forward a message to another chat
   * @param message - The MiawMessage to forward (must have raw field)
   * @param to - Recipient phone number, JID, or group JID
   * @returns SendMessageResult
   */
  async forwardMessage(
    message: MiawMessage,
    to: string
  ): Promise<SendMessageResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot forward message. Connection state: ${this.connectionState}`
        );
      }

      if (!message.raw) {
        throw new Error(
          "Message does not contain raw Baileys data. Cannot forward."
        );
      }

      const jid = MessageHandler.formatPhoneToJid(to);

      const result = await this.socket.sendMessage(jid, {
        forward: message.raw,
      });

      return {
        success: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      this.logger.error("Failed to forward message:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Edit a previously sent message (must be your own message, within 15 minutes)
   * @param message - The MiawMessage to edit (must be fromMe and have raw field)
   * @param newText - New text content for the message
   * @returns SendMessageResult
   */
  async editMessage(
    message: MiawMessage,
    newText: string
  ): Promise<SendMessageResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot edit message. Connection state: ${this.connectionState}`
        );
      }

      if (!message.raw?.key) {
        throw new Error(
          "Message does not contain raw Baileys key data. Cannot edit."
        );
      }

      if (!message.fromMe) {
        throw new Error("Can only edit your own messages.");
      }

      const jid = message.raw.key.remoteJid;
      if (!jid) {
        throw new Error("Message does not have a valid chat JID.");
      }

      const result = await this.socket.sendMessage(jid, {
        text: newText,
        edit: message.raw.key,
      });

      return {
        success: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      this.logger.error("Failed to edit message:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Delete a message for everyone (must be your own message or admin in group)
   * @param message - The MiawMessage to delete (must have raw field)
   * @returns SendMessageResult
   */
  async deleteMessage(message: MiawMessage): Promise<SendMessageResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot delete message. Connection state: ${this.connectionState}`
        );
      }

      if (!message.raw?.key) {
        throw new Error(
          "Message does not contain raw Baileys key data. Cannot delete."
        );
      }

      const jid = message.raw.key.remoteJid;
      if (!jid) {
        throw new Error("Message does not have a valid chat JID.");
      }

      const result = await this.socket.sendMessage(jid, {
        delete: message.raw.key,
      });

      return {
        success: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      this.logger.error("Failed to delete message:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Delete a message for yourself only (does not affect other participants)
   * @param message - The MiawMessage to delete locally (must have raw field)
   * @param deleteMedia - Whether to also delete associated media files (default: true)
   * @returns boolean indicating success
   */
  async deleteMessageForMe(
    message: MiawMessage,
    deleteMedia: boolean = true
  ): Promise<boolean> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot delete message. Connection state: ${this.connectionState}`
        );
      }

      if (!message.raw?.key) {
        throw new Error(
          "Message does not contain raw Baileys key data. Cannot delete."
        );
      }

      const jid = message.raw.key.remoteJid;
      if (!jid) {
        throw new Error("Message does not have a valid chat JID.");
      }

      await this.socket.chatModify(
        {
          deleteForMe: {
            deleteMedia,
            key: message.raw.key,
            timestamp: message.timestamp,
          },
        },
        jid
      );

      return true;
    } catch (error) {
      this.logger.error("Failed to delete message for me:", error);
      return false;
    }
  }

  // ============================================
  // UX Methods (v0.5.0)
  // ============================================

  /**
   * Mark a message as read (send read receipt)
   * @param message - The MiawMessage to mark as read
   * @returns true if successful, false otherwise
   */
  async markAsRead(message: MiawMessage): Promise<boolean> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot mark as read. Connection state: ${this.connectionState}`
        );
      }

      if (!message.raw?.key) {
        throw new Error("Message does not contain raw Baileys key data.");
      }

      await this.socket.readMessages([message.raw.key]);
      return true;
    } catch (error) {
      this.logger.error("Failed to mark as read:", error);
      return false;
    }
  }

  /**
   * Send typing indicator to a chat
   * @param to - Recipient phone number, JID, or group JID
   */
  async sendTyping(to: string): Promise<void> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot send typing. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(to);
      await this.socket.sendPresenceUpdate("composing", jid);
    } catch (error) {
      this.logger.error("Failed to send typing indicator:", error);
    }
  }

  /**
   * Send recording indicator to a chat (shows "recording audio...")
   * @param to - Recipient phone number, JID, or group JID
   */
  async sendRecording(to: string): Promise<void> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot send recording. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(to);
      await this.socket.sendPresenceUpdate("recording", jid);
    } catch (error) {
      this.logger.error("Failed to send recording indicator:", error);
    }
  }

  /**
   * Stop typing/recording indicator (send paused state)
   * @param to - Recipient phone number, JID, or group JID
   */
  async stopTyping(to: string): Promise<void> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot stop typing. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(to);
      await this.socket.sendPresenceUpdate("paused", jid);
    } catch (error) {
      this.logger.error("Failed to stop typing indicator:", error);
    }
  }

  /**
   * Set bot's presence status (online/offline)
   * @param status - 'available' (online) or 'unavailable' (offline)
   */
  async setPresence(status: PresenceStatus): Promise<void> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot set presence. Connection state: ${this.connectionState}`
        );
      }

      await this.socket.sendPresenceUpdate(status);
    } catch (error) {
      this.logger.error("Failed to set presence:", error);
    }
  }

  /**
   * Subscribe to presence updates for a contact
   * After subscribing, you'll receive 'presence' events when the contact's status changes
   * @param jidOrPhone - Contact's JID or phone number to monitor
   */
  async subscribePresence(jidOrPhone: string): Promise<void> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot subscribe to presence. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(jidOrPhone);
      await this.socket.presenceSubscribe(jid);
    } catch (error) {
      this.logger.error("Failed to subscribe to presence:", error);
    }
  }

  // ============================================
  // Group Management Methods (v0.7.0)
  // ============================================

  /**
   * Helper method for group participant operations
   */
  private async groupParticipantsOperation(
    groupJid: string,
    participants: string[],
    action: "add" | "remove" | "promote" | "demote"
  ): Promise<ParticipantOperationResult[]> {
    if (!this.socket) {
      throw new Error("Not connected. Call connect() first.");
    }

    if (this.connectionState !== "connected") {
      throw new Error(
        `Cannot perform group operation. Connection state: ${this.connectionState}`
      );
    }

    if (!groupJid.endsWith("@g.us")) {
      throw new Error("Invalid group JID. Must end with @g.us");
    }

    // Format participant JIDs
    const formattedParticipants = participants.map((p) =>
      MessageHandler.formatPhoneToJid(p)
    );

    const results = await this.socket.groupParticipantsUpdate(
      groupJid,
      formattedParticipants,
      action
    );

    return results.map((result) => ({
      jid: result.jid || "",
      status: result.status,
      success: result.status === "200",
    }));
  }

  /**
   * Create a new WhatsApp group
   * @param name - Group name/subject
   * @param participants - Array of phone numbers or JIDs to add as initial members
   * @returns CreateGroupResult with group info if successful
   */
  async createGroup(
    name: string,
    participants: string[]
  ): Promise<CreateGroupResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot create group. Connection state: ${this.connectionState}`
        );
      }

      // Format participant JIDs
      const formattedParticipants = participants.map((p) =>
        MessageHandler.formatPhoneToJid(p)
      );

      const metadata = await this.socket.groupCreate(
        name,
        formattedParticipants
      );

      const groupParticipants: GroupParticipant[] = metadata.participants.map(
        (p) => ({
          jid: p.id,
          role:
            p.admin === "superadmin"
              ? "superadmin"
              : p.admin === "admin"
              ? "admin"
              : "member",
        })
      );

      return {
        success: true,
        groupJid: metadata.id,
        groupInfo: {
          jid: metadata.id,
          name: metadata.subject,
          description: metadata.desc || undefined,
          owner: metadata.owner || undefined,
          createdAt: metadata.creation,
          participantCount: metadata.participants.length,
          participants: groupParticipants,
          announce: metadata.announce,
          restrict: metadata.restrict,
        },
      };
    } catch (error) {
      this.logger.error("Failed to create group:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Add participants to a group
   * @param groupJid - Group JID (e.g., '123456789@g.us')
   * @param participants - Array of phone numbers or JIDs to add
   * @returns Array of ParticipantOperationResult for each participant
   */
  async addParticipants(
    groupJid: string,
    participants: string[]
  ): Promise<ParticipantOperationResult[]> {
    try {
      return await this.groupParticipantsOperation(
        groupJid,
        participants,
        "add"
      );
    } catch (error) {
      this.logger.error("Failed to add participants:", error);
      return participants.map((p) => ({
        jid: MessageHandler.formatPhoneToJid(p),
        status: "error",
        success: false,
      }));
    }
  }

  /**
   * Remove participants from a group
   * @param groupJid - Group JID (e.g., '123456789@g.us')
   * @param participants - Array of phone numbers or JIDs to remove
   * @returns Array of ParticipantOperationResult for each participant
   */
  async removeParticipants(
    groupJid: string,
    participants: string[]
  ): Promise<ParticipantOperationResult[]> {
    try {
      return await this.groupParticipantsOperation(
        groupJid,
        participants,
        "remove"
      );
    } catch (error) {
      this.logger.error("Failed to remove participants:", error);
      return participants.map((p) => ({
        jid: MessageHandler.formatPhoneToJid(p),
        status: "error",
        success: false,
      }));
    }
  }

  /**
   * Leave a group
   * @param groupJid - Group JID (e.g., '123456789@g.us')
   * @returns GroupOperationResult
   */
  async leaveGroup(groupJid: string): Promise<GroupOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot leave group. Connection state: ${this.connectionState}`
        );
      }

      if (!groupJid.endsWith("@g.us")) {
        throw new Error("Invalid group JID. Must end with @g.us");
      }

      await this.socket.groupLeave(groupJid);

      return { success: true };
    } catch (error) {
      this.logger.error("Failed to leave group:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Promote participants to group admin
   * @param groupJid - Group JID (e.g., '123456789@g.us')
   * @param participants - Array of phone numbers or JIDs to promote
   * @returns Array of ParticipantOperationResult for each participant
   */
  async promoteToAdmin(
    groupJid: string,
    participants: string[]
  ): Promise<ParticipantOperationResult[]> {
    try {
      return await this.groupParticipantsOperation(
        groupJid,
        participants,
        "promote"
      );
    } catch (error) {
      this.logger.error("Failed to promote participants:", error);
      return participants.map((p) => ({
        jid: MessageHandler.formatPhoneToJid(p),
        status: "error",
        success: false,
      }));
    }
  }

  /**
   * Demote admins to regular members
   * @param groupJid - Group JID (e.g., '123456789@g.us')
   * @param participants - Array of phone numbers or JIDs to demote
   * @returns Array of ParticipantOperationResult for each participant
   */
  async demoteFromAdmin(
    groupJid: string,
    participants: string[]
  ): Promise<ParticipantOperationResult[]> {
    try {
      return await this.groupParticipantsOperation(
        groupJid,
        participants,
        "demote"
      );
    } catch (error) {
      this.logger.error("Failed to demote participants:", error);
      return participants.map((p) => ({
        jid: MessageHandler.formatPhoneToJid(p),
        status: "error",
        success: false,
      }));
    }
  }

  /**
   * Update group name/subject
   * @param groupJid - Group JID (e.g., '123456789@g.us')
   * @param name - New group name
   * @returns GroupOperationResult
   */
  async updateGroupName(
    groupJid: string,
    name: string
  ): Promise<GroupOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot update group name. Connection state: ${this.connectionState}`
        );
      }

      if (!groupJid.endsWith("@g.us")) {
        throw new Error("Invalid group JID. Must end with @g.us");
      }

      await this.socket.groupUpdateSubject(groupJid, name);

      return { success: true };
    } catch (error) {
      this.logger.error("Failed to update group name:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Update group description
   * @param groupJid - Group JID (e.g., '123456789@g.us')
   * @param description - New description (undefined to remove)
   * @returns GroupOperationResult
   */
  async updateGroupDescription(
    groupJid: string,
    description?: string
  ): Promise<GroupOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot update group description. Connection state: ${this.connectionState}`
        );
      }

      if (!groupJid.endsWith("@g.us")) {
        throw new Error("Invalid group JID. Must end with @g.us");
      }

      await this.socket.groupUpdateDescription(groupJid, description);

      return { success: true };
    } catch (error) {
      this.logger.error("Failed to update group description:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Update group profile picture
   * @param groupJid - Group JID (e.g., '123456789@g.us')
   * @param image - Image source (file path, URL, or Buffer)
   * @returns GroupOperationResult
   */
  async updateGroupPicture(
    groupJid: string,
    image: MediaSource
  ): Promise<GroupOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot update group picture. Connection state: ${this.connectionState}`
        );
      }

      if (!groupJid.endsWith("@g.us")) {
        throw new Error("Invalid group JID. Must end with @g.us");
      }

      const imageContent = Buffer.isBuffer(image) ? image : { url: image };
      await this.socket.updateProfilePicture(groupJid, imageContent);

      return { success: true };
    } catch (error) {
      this.logger.error("Failed to update group picture:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get group invite link
   * @param groupJid - Group JID (e.g., '123456789@g.us')
   * @returns Full invite link (https://chat.whatsapp.com/...) or null if failed
   */
  async getGroupInviteLink(groupJid: string): Promise<string | null> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot get invite link. Connection state: ${this.connectionState}`
        );
      }

      if (!groupJid.endsWith("@g.us")) {
        throw new Error("Invalid group JID. Must end with @g.us");
      }

      const code = await this.socket.groupInviteCode(groupJid);
      return code ? `https://chat.whatsapp.com/${code}` : null;
    } catch (error) {
      this.logger.error("Failed to get group invite link:", error);
      return null;
    }
  }

  /**
   * Revoke current group invite link and generate a new one
   * @param groupJid - Group JID (e.g., '123456789@g.us')
   * @returns New invite link (https://chat.whatsapp.com/...) or null if failed
   */
  async revokeGroupInvite(groupJid: string): Promise<string | null> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot revoke invite. Connection state: ${this.connectionState}`
        );
      }

      if (!groupJid.endsWith("@g.us")) {
        throw new Error("Invalid group JID. Must end with @g.us");
      }

      const code = await this.socket.groupRevokeInvite(groupJid);
      return code ? `https://chat.whatsapp.com/${code}` : null;
    } catch (error) {
      this.logger.error("Failed to revoke group invite:", error);
      return null;
    }
  }

  /**
   * Accept a group invite and join the group
   * @param inviteCode - Invite code (just the code, or full URL)
   * @returns Group JID if successful, null if failed
   */
  async acceptGroupInvite(inviteCode: string): Promise<string | null> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot accept invite. Connection state: ${this.connectionState}`
        );
      }

      // Extract code from URL if full URL was provided
      let code = inviteCode;
      if (inviteCode.includes("chat.whatsapp.com/")) {
        code = inviteCode.split("chat.whatsapp.com/")[1];
      }

      const groupJid = await this.socket.groupAcceptInvite(code);
      return groupJid || null;
    } catch (error) {
      this.logger.error("Failed to accept group invite:", error);
      return null;
    }
  }

  /**
   * Get group information from invite code without joining
   * @param inviteCode - Invite code (just the code, or full URL)
   * @returns GroupInviteInfo if successful, null if failed
   */
  async getGroupInviteInfo(
    inviteCode: string
  ): Promise<GroupInviteInfo | null> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot get invite info. Connection state: ${this.connectionState}`
        );
      }

      // Extract code from URL if full URL was provided
      let code = inviteCode;
      if (inviteCode.includes("chat.whatsapp.com/")) {
        code = inviteCode.split("chat.whatsapp.com/")[1];
      }

      const metadata = await this.socket.groupGetInviteInfo(code);

      return {
        jid: metadata.id,
        name: metadata.subject,
        description: metadata.desc || undefined,
        participantCount: metadata.size || metadata.participants?.length || 0,
        createdAt: metadata.creation,
      };
    } catch (error) {
      this.logger.error("Failed to get group invite info:", error);
      return null;
    }
  }

  // ============================================
  // Profile Management Methods (v0.8.0)
  // ============================================

  /**
   * Update your own profile picture
   * @param image - Image source (file path, URL, or Buffer)
   * @returns ProfileOperationResult indicating success or failure
   */
  async updateProfilePicture(
    image: MediaSource
  ): Promise<ProfileOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot update profile picture. Connection state: ${this.connectionState}`
        );
      }

      const userJid = this.socket.user?.id;
      if (!userJid) {
        throw new Error("User JID not available");
      }

      const imageContent = Buffer.isBuffer(image) ? image : { url: image };
      await this.socket.updateProfilePicture(userJid, imageContent);

      return { success: true };
    } catch (error) {
      this.logger.error("Failed to update profile picture:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Remove your own profile picture
   * @returns ProfileOperationResult indicating success or failure
   */
  async removeProfilePicture(): Promise<ProfileOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot remove profile picture. Connection state: ${this.connectionState}`
        );
      }

      const userJid = this.socket.user?.id;
      if (!userJid) {
        throw new Error("User JID not available");
      }

      await this.socket.removeProfilePicture(userJid);

      return { success: true };
    } catch (error) {
      this.logger.error("Failed to remove profile picture:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Update your profile display name (push name)
   * @param name - New display name
   * @returns ProfileOperationResult indicating success or failure
   */
  async updateProfileName(name: string): Promise<ProfileOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot update profile name. Connection state: ${this.connectionState}`
        );
      }

      if (!name || name.trim().length === 0) {
        throw new Error("Profile name cannot be empty");
      }

      await this.socket.updateProfileName(name);

      return { success: true };
    } catch (error) {
      this.logger.error("Failed to update profile name:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Update your profile status (About text)
   * @param status - New status/about text
   * @returns ProfileOperationResult indicating success or failure
   */
  async updateProfileStatus(status: string): Promise<ProfileOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot update profile status. Connection state: ${this.connectionState}`
        );
      }

      await this.socket.updateProfileStatus(status);

      return { success: true };
    } catch (error) {
      this.logger.error("Failed to update profile status:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // ============================================
  // Label Methods (v0.9.0) - WhatsApp Business only
  // ============================================

  /**
   * Create or edit a label
   * @param label - Label data (for edit, include the label ID)
   * @returns LabelOperationResult
   * @note Requires WhatsApp Business account
   */
  async addLabel(label: Label): Promise<LabelOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot add label. Connection state: ${this.connectionState}`
        );
      }

      // Generate a unique label ID if not provided
      // WhatsApp Business labels use numeric string IDs starting from 6 (1-5 are predefined)
      // We use timestamp + random suffix to ensure uniqueness
      const labelId =
        label.id ||
        `${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000)}`;

      // Build label action body
      const labelAction: any = {
        id: labelId,
        name: label.name,
        color: label.color,
        deleted: label.deleted ?? false,
      };

      if (label.predefinedId !== undefined) {
        labelAction.predefinedId = label.predefinedId;
      }

      // Use empty string JID for label creation (affects account, not a specific chat)
      await this.socket.addLabel("", labelAction);

      // Store label in labelsStore immediately (don't wait for event)
      const labelData: Label = {
        id: labelId,
        name: label.name,
        color: label.color,
        predefinedId: label.predefinedId,
        deleted: false,
      };
      this.labelsStore.set(labelId, labelData);

      return {
        success: true,
        labelId: labelId,
      };
    } catch (error) {
      this.logger.error("Failed to add label:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Add a label to a chat
   * @param chatJidOrPhone - Chat JID or phone number
   * @param labelId - Label ID to add
   * @returns LabelOperationResult
   * @note Requires WhatsApp Business account
   */
  async addChatLabel(
    chatJidOrPhone: string,
    labelId: string
  ): Promise<LabelOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot add chat label. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(chatJidOrPhone);
      await this.socket.addChatLabel(jid, labelId);

      return { success: true };
    } catch (error) {
      this.logger.error("Failed to add chat label:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Remove a label from a chat
   * @param chatJidOrPhone - Chat JID or phone number
   * @param labelId - Label ID to remove
   * @returns LabelOperationResult
   * @note Requires WhatsApp Business account
   */
  async removeChatLabel(
    chatJidOrPhone: string,
    labelId: string
  ): Promise<LabelOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot remove chat label. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(chatJidOrPhone);
      await this.socket.removeChatLabel(jid, labelId);

      return { success: true };
    } catch (error) {
      this.logger.error("Failed to remove chat label:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Add a label to a message
   * @param chatJidOrPhone - Chat JID or phone number where the message is
   * @param messageId - Message ID to label
   * @param labelId - Label ID to add
   * @returns LabelOperationResult
   * @note Requires WhatsApp Business account
   */
  async addMessageLabel(
    chatJidOrPhone: string,
    messageId: string,
    labelId: string
  ): Promise<LabelOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot add message label. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(chatJidOrPhone);
      await this.socket.addMessageLabel(jid, messageId, labelId);

      return { success: true };
    } catch (error) {
      this.logger.error("Failed to add message label:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Remove a label from a message
   * @param chatJidOrPhone - Chat JID or phone number where the message is
   * @param messageId - Message ID to unlabel
   * @param labelId - Label ID to remove
   * @returns LabelOperationResult
   * @note Requires WhatsApp Business account
   */
  async removeMessageLabel(
    chatJidOrPhone: string,
    messageId: string,
    labelId: string
  ): Promise<LabelOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot remove message label. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(chatJidOrPhone);
      await this.socket.removeMessageLabel(jid, messageId, labelId);

      return { success: true };
    } catch (error) {
      this.logger.error("Failed to remove message label:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // ============================================
  // Catalog/Product Methods (v0.9.0) - WhatsApp Business only
  // ============================================

  /**
   * Get product catalog from a WhatsApp Business account
   * @param businessJidOrPhone - Business JID or phone number (default: your own catalog)
   * @param limit - Maximum number of products to fetch (default: 10)
   * @param cursor - Pagination cursor for fetching next page
   * @returns ProductCatalog
   * @note Requires WhatsApp Business account with catalog configured
   */
  async getCatalog(
    businessJidOrPhone?: string,
    limit: number = 10,
    cursor?: string
  ): Promise<ProductCatalog> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot get catalog. Connection state: ${this.connectionState}`
        );
      }

      const jid = businessJidOrPhone
        ? MessageHandler.formatPhoneToJid(businessJidOrPhone)
        : undefined;
      const result = await this.socket.getCatalog({ jid, limit, cursor });

      // Map Baileys product format to our Product type
      // Baileys returns: id, name, description, price, currency, retailerId, url, isHidden, imageUrls
      const products: Product[] = (result.products || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        currency: p.currency,
        retailerId: p.retailerId,
        url: p.url,
        isHidden: p.isHidden,
        imageUrls: p.imageUrls || {},
      }));

      return {
        success: true,
        products,
        nextCursor: result.nextPageCursor,
      };
    } catch (error) {
      this.logger.error("Failed to get catalog:", error);
      // Provide more helpful error message
      const errorMsg = (error as Error).message;
      const helpfulError = errorMsg.includes("biz:catalog")
        ? "Catalog not available. Ensure this is a WhatsApp Business account with catalog enabled."
        : errorMsg;
      return {
        success: false,
        error: helpfulError,
      };
    }
  }

  /**
   * Get product collections from a WhatsApp Business account
   * @param businessJidOrPhone - Business JID or phone number (default: your own collections)
   * @param limit - Maximum number of collections to fetch (default: 51)
   * @returns Array of ProductCollection
   * @note Requires WhatsApp Business account with collections created via the catalog API.
   *       Collections created in the WhatsApp Business app may not appear here.
   */
  async getCollections(
    businessJidOrPhone?: string,
    limit: number = 51
  ): Promise<ProductCollection[]> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot get collections. Connection state: ${this.connectionState}`
        );
      }

      const jid = businessJidOrPhone
        ? MessageHandler.formatPhoneToJid(businessJidOrPhone)
        : undefined;

      const result = await this.socket.getCollections(jid, limit);

      return (result.collections || []).map((col: any) => ({
        id: col.id,
        name: col.name,
        products: col.products?.map((p: any) => ({
          id: p.id,
          name: p.name,
          priceAmount1000: p.priceAmount1000,
          retailerId: p.retailerId,
          images:
            p.images?.map((img: any) => ({
              url: img.url,
              caption: img.caption,
            })) || [],
        })),
      }));
    } catch (error) {
      this.logger.error("Failed to get collections:", error);
      return [];
    }
  }

  /**
   * Create a new product in the catalog
   * @param options - Product options (name, price, currency, images, etc.)
   * @returns ProductOperationResult with product ID
   * @note Requires WhatsApp Business account with catalog enabled
   */
  async createProduct(
    options: ProductOptions
  ): Promise<ProductOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot create product. Connection state: ${this.connectionState}`
        );
      }

      // Build images array from either buffers or URLs
      // Buffers are recommended for reliability (URLs require WhatsApp servers to fetch)
      const images: Array<{ url: URL } | Buffer> = [];

      // Prefer buffers if provided (more reliable)
      if (options.imageBuffers && options.imageBuffers.length > 0) {
        images.push(...options.imageBuffers);
      } else if (options.imageUrls && options.imageUrls.length > 0) {
        // Fall back to URLs (must be publicly accessible)
        images.push(...options.imageUrls.map((url) => ({ url: new URL(url) })));
      }

      // Build product data matching Baileys' ProductCreate format
      const productData: any = {
        name: options.name,
        description: options.description,
        price: options.price,
        currency: options.currency,
        isHidden: options.isHidden ?? false,
        originCountryCode: options.originCountryCode,
        images,
      };

      if (options.retailerId) {
        productData.retailerId = options.retailerId;
      }

      if (options.url) {
        productData.url = options.url;
      }

      const result = await this.socket.productCreate(productData);

      return {
        success: true,
        productId: result?.id,
      };
    } catch (error) {
      this.logger.error("Failed to create product:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Update an existing product in the catalog
   * @param productId - Product ID to update
   * @param options - Product options (name, price, currency, images, etc.)
   * @returns ProductOperationResult
   * @note Requires WhatsApp Business account with catalog enabled
   */
  async updateProduct(
    productId: string,
    options: ProductOptions
  ): Promise<ProductOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot update product. Connection state: ${this.connectionState}`
        );
      }

      // Build images array from either buffers or URLs
      // Buffers are recommended for reliability (URLs require WhatsApp servers to fetch)
      const images: Array<{ url: URL } | Buffer> = [];

      // Prefer buffers if provided (more reliable)
      if (options.imageBuffers && options.imageBuffers.length > 0) {
        images.push(...options.imageBuffers);
      } else if (options.imageUrls && options.imageUrls.length > 0) {
        // Fall back to URLs (must be publicly accessible)
        images.push(...options.imageUrls.map((url) => ({ url: new URL(url) })));
      }

      // Build product data matching Baileys' ProductUpdate format
      const productData: any = {
        name: options.name,
        description: options.description,
        price: options.price,
        currency: options.currency,
        isHidden: options.isHidden,
        images,
      };

      if (options.retailerId) {
        productData.retailerId = options.retailerId;
      }

      if (options.url) {
        productData.url = options.url;
      }

      const result = await this.socket.productUpdate(productId, productData);

      return {
        success: true,
        productId: result?.id,
      };
    } catch (error) {
      this.logger.error("Failed to update product:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Delete products from the catalog
   * @param productIds - Array of product IDs to delete
   * @returns ProductOperationResult with deleted count
   * @note Requires WhatsApp Business account
   */
  async deleteProducts(productIds: string[]): Promise<ProductOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot delete products. Connection state: ${this.connectionState}`
        );
      }

      if (productIds.length === 0) {
        throw new Error("At least one product ID is required");
      }

      const result = await this.socket.productDelete(productIds);

      return {
        success: true,
        deletedCount: result.deleted,
      };
    } catch (error) {
      this.logger.error("Failed to delete products:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  // ============================================
  // Newsletter/Channel Methods (v0.9.0)
  // ============================================

  /**
   * Send a text message to a newsletter/channel
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @param text - Message text content
   * @returns SendMessageResult
   * @note You must be an admin/owner of the newsletter to send messages
   */
  async sendNewsletterMessage(
    newsletterId: string,
    text: string
  ): Promise<SendMessageResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot send newsletter message. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      // Baileys sendMessage handles newsletter JIDs automatically
      const result = await this.socket.sendMessage(newsletterId, { text });

      return {
        success: true,
        messageId: result?.key?.id ?? undefined,
      };
    } catch (error) {
      this.logger.error("Failed to send newsletter message:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Send an image to a newsletter/channel
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @param image - Image source (file path, URL, or Buffer)
   * @param caption - Optional caption
   * @returns SendMessageResult
   * @note You must be an admin/owner of the newsletter to send messages
   */
  async sendNewsletterImage(
    newsletterId: string,
    image: MediaSource,
    caption?: string
  ): Promise<SendMessageResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot send newsletter image. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      const imageContent = Buffer.isBuffer(image) ? image : { url: image };
      const result = await this.socket.sendMessage(newsletterId, {
        image: imageContent,
        caption,
      });

      return {
        success: true,
        messageId: result?.key?.id ?? undefined,
      };
    } catch (error) {
      this.logger.error("Failed to send newsletter image:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Send a video to a newsletter/channel
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @param video - Video source (file path, URL, or Buffer)
   * @param caption - Optional caption
   * @returns SendMessageResult
   * @note You must be an admin/owner of the newsletter to send messages
   */
  async sendNewsletterVideo(
    newsletterId: string,
    video: MediaSource,
    caption?: string
  ): Promise<SendMessageResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot send newsletter video. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      const videoContent = Buffer.isBuffer(video) ? video : { url: video };
      const result = await this.socket.sendMessage(newsletterId, {
        video: videoContent,
        caption,
      });

      return {
        success: true,
        messageId: result?.key?.id ?? undefined,
      };
    } catch (error) {
      this.logger.error("Failed to send newsletter video:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Create a new newsletter/channel
   * @param name - Newsletter name
   * @param description - Newsletter description
   * @returns NewsletterOperationResult with newsletter ID
   */
  async createNewsletter(
    name: string,
    description?: string
  ): Promise<NewsletterOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot create newsletter. Connection state: ${this.connectionState}`
        );
      }

      // Baileys newsletterCreate returns NewsletterMetadata with id property
      const result = await this.socket.newsletterCreate(
        name,
        description || ""
      );

      // Debug log the result structure
      this.logger.debug("Newsletter create result:", result);

      // Baileys returns NewsletterMetadata from parseNewsletterCreateResponse
      // The id is directly on the result object
      if (result && typeof result === "object" && "id" in result) {
        const newsletterId = result.id;
        if (newsletterId) {
          return {
            success: true,
            newsletterId,
          };
        }
      }

      // Handle unexpected response format
      // The newsletter may have been created but response parsing failed
      this.logger.warn(
        "Newsletter creation returned unexpected format:",
        JSON.stringify(result, null, 2)
      );
      return {
        success: true,
        newsletterId: undefined,
      };
    } catch (error) {
      const errorMessage = (error as Error).message;
      const errorStack = (error as Error).stack;

      // Log full error for debugging
      this.logger.debug("Newsletter creation error details:", {
        message: errorMessage,
        stack: errorStack,
      });

      // Check if this is a response parsing error (newsletter may have been created)
      // Baileys throws "Cannot read properties of null" when response format is unexpected
      if (
        errorMessage.includes("Cannot read properties of null") ||
        errorMessage.includes("Cannot read properties of undefined")
      ) {
        this.logger.warn(
          "Newsletter may have been created but response parsing failed:",
          errorMessage
        );
        return {
          success: true,
          newsletterId: undefined,
        };
      }

      this.logger.error("Failed to create newsletter:", error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get newsletter metadata
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @returns NewsletterMetadata or null if not found
   */
  async getNewsletterMetadata(
    newsletterId: string
  ): Promise<NewsletterMetadata | null> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot get newsletter metadata. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      const meta = await this.socket.newsletterMetadata("jid", newsletterId);

      if (!meta) {
        return null;
      }

      // Extract picture URL from the picture object if available
      const pictureUrl =
        typeof meta.picture === "string" ? meta.picture : meta.picture?.url;

      return {
        id: meta.id || newsletterId,
        name: meta.name || "",
        description: meta.description,
        pictureUrl,
        subscribers: meta.subscribers,
        isCreator: false, // Baileys doesn't provide this
        isFollowing: false, // Baileys doesn't provide this
        isMuted: false, // Baileys doesn't provide this
        createdAt: meta.creation_time,
        updatedAt: undefined,
      };
    } catch (error) {
      this.logger.error("Failed to get newsletter metadata:", error);
      return null;
    }
  }

  /**
   * Follow a newsletter/channel
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @returns boolean indicating success
   */
  async followNewsletter(newsletterId: string): Promise<boolean> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot follow newsletter. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      await this.socket.newsletterFollow(newsletterId);
      return true;
    } catch (error) {
      this.logger.error("Failed to follow newsletter:", error);
      return false;
    }
  }

  /**
   * Unfollow a newsletter/channel
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @returns boolean indicating success
   */
  async unfollowNewsletter(newsletterId: string): Promise<boolean> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot unfollow newsletter. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      await this.socket.newsletterUnfollow(newsletterId);
      return true;
    } catch (error) {
      this.logger.error("Failed to unfollow newsletter:", error);
      return false;
    }
  }

  /**
   * Mute a newsletter/channel
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @returns boolean indicating success
   */
  async muteNewsletter(newsletterId: string): Promise<boolean> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot mute newsletter. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      await this.socket.newsletterMute(newsletterId);
      return true;
    } catch (error) {
      this.logger.error("Failed to mute newsletter:", error);
      return false;
    }
  }

  /**
   * Unmute a newsletter/channel
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @returns boolean indicating success
   */
  async unmuteNewsletter(newsletterId: string): Promise<boolean> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot unmute newsletter. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      await this.socket.newsletterUnmute(newsletterId);
      return true;
    } catch (error) {
      this.logger.error("Failed to unmute newsletter:", error);
      return false;
    }
  }

  /**
   * Update newsletter name
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @param name - New newsletter name
   * @returns boolean indicating success
   */
  async updateNewsletterName(
    newsletterId: string,
    name: string
  ): Promise<boolean> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot update newsletter name. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      await this.socket.newsletterUpdateName(newsletterId, name);
      return true;
    } catch (error) {
      this.logger.error("Failed to update newsletter name:", error);
      return false;
    }
  }

  /**
   * Update newsletter description
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @param description - New newsletter description
   * @returns boolean indicating success
   */
  async updateNewsletterDescription(
    newsletterId: string,
    description: string
  ): Promise<boolean> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot update newsletter description. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      await this.socket.newsletterUpdateDescription(newsletterId, description);
      return true;
    } catch (error) {
      this.logger.error("Failed to update newsletter description:", error);
      return false;
    }
  }

  /**
   * Update newsletter picture
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @param image - Image source (file path, URL, or Buffer)
   * @returns boolean indicating success
   */
  async updateNewsletterPicture(
    newsletterId: string,
    image: MediaSource
  ): Promise<boolean> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot update newsletter picture. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      const imageContent = Buffer.isBuffer(image) ? image : { url: image };
      await this.socket.newsletterUpdatePicture(newsletterId, imageContent);
      return true;
    } catch (error) {
      this.logger.error("Failed to update newsletter picture:", error);
      return false;
    }
  }

  /**
   * Remove newsletter picture
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @returns boolean indicating success
   */
  async removeNewsletterPicture(newsletterId: string): Promise<boolean> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot remove newsletter picture. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      await this.socket.newsletterRemovePicture(newsletterId);
      return true;
    } catch (error) {
      this.logger.error("Failed to remove newsletter picture:", error);
      return false;
    }
  }

  /**
   * React to a newsletter message
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @param messageId - Server message ID to react to
   * @param emoji - Emoji to react with (empty string removes reaction)
   * @returns boolean indicating success
   */
  async reactToNewsletterMessage(
    newsletterId: string,
    messageId: string,
    emoji: string
  ): Promise<boolean> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot react to newsletter message. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      await this.socket.newsletterReactMessage(newsletterId, messageId, emoji);
      return true;
    } catch (error) {
      this.logger.error("Failed to react to newsletter message:", error);
      return false;
    }
  }

  /**
   * Fetch messages from a newsletter
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @param count - Number of messages to fetch (default: 50)
   * @param since - Timestamp to fetch messages since (default: now, backward)
   * @param after - Cursor for pagination (default: 0)
   * @returns NewsletterMessagesResult
   */
  async fetchNewsletterMessages(
    newsletterId: string,
    count: number = 50,
    since?: number,
    after: number = 0
  ): Promise<NewsletterMessagesResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot fetch newsletter messages. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      const messages = await this.socket.newsletterFetchMessages(
        newsletterId,
        count,
        since || Date.now(),
        after
      );

      const normalizedMessages = (messages || []).map((msg: any) => ({
        id: msg.key?.id || "",
        newsletterId,
        content:
          msg.message?.conversation || msg.message?.extendedTextMessage?.text,
        timestamp: msg.messageTimestamp || 0,
        mediaUrl:
          msg.message?.imageMessage?.url || msg.message?.videoMessage?.url,
        mediaType: msg.message?.imageMessage
          ? "image"
          : msg.message?.videoMessage
          ? "video"
          : undefined,
      }));

      return {
        success: true,
        messages: normalizedMessages,
      };
    } catch (error) {
      this.logger.error("Failed to fetch newsletter messages:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Subscribe to live newsletter updates
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @returns boolean indicating success
   */
  async subscribeNewsletterUpdates(newsletterId: string): Promise<boolean> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot subscribe to newsletter updates. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      await this.socket.subscribeNewsletterUpdates(newsletterId);
      return true;
    } catch (error) {
      this.logger.error("Failed to subscribe to newsletter updates:", error);
      return false;
    }
  }

  /**
   * Get newsletter subscriber and admin count
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @returns NewsletterSubscriptionInfo or null if failed
   */
  async getNewsletterSubscribers(
    newsletterId: string
  ): Promise<NewsletterSubscriptionInfo | null> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot get newsletter subscribers. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      const result = await this.socket.newsletterSubscribers(newsletterId);

      return {
        subscribers: result?.subscribers,
        adminCount: undefined,
      };
    } catch (error) {
      this.logger.error("Failed to get newsletter subscribers:", error);
      return null;
    }
  }

  /**
   * Get newsletter admin count
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @returns Admin count or null if failed
   */
  async getNewsletterAdminCount(newsletterId: string): Promise<number | null> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot get newsletter admin count. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      const count = await this.socket.newsletterAdminCount(newsletterId);
      return count || 0;
    } catch (error) {
      this.logger.error("Failed to get newsletter admin count:", error);
      return null;
    }
  }

  /**
   * Change newsletter owner (transfer ownership)
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @param newOwnerJid - New owner's JID
   * @returns boolean indicating success
   */
  async changeNewsletterOwner(
    newsletterId: string,
    newOwnerJid: string
  ): Promise<boolean> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot change newsletter owner. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      const jid = MessageHandler.formatPhoneToJid(newOwnerJid);
      await this.socket.newsletterChangeOwner(newsletterId, jid);
      return true;
    } catch (error) {
      this.logger.error("Failed to change newsletter owner:", error);
      return false;
    }
  }

  /**
   * Demote a newsletter admin
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @param adminJid - Admin's JID to demote
   * @returns boolean indicating success
   */
  async demoteNewsletterAdmin(
    newsletterId: string,
    adminJid: string
  ): Promise<boolean> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot demote newsletter admin. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      const jid = MessageHandler.formatPhoneToJid(adminJid);
      await this.socket.newsletterDemote(newsletterId, jid);
      return true;
    } catch (error) {
      this.logger.error("Failed to demote newsletter admin:", error);
      return false;
    }
  }

  /**
   * Delete a newsletter/channel
   * @param newsletterId - Newsletter JID (e.g., '1234567890@newsletter')
   * @returns boolean indicating success
   */
  async deleteNewsletter(newsletterId: string): Promise<boolean> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot delete newsletter. Connection state: ${this.connectionState}`
        );
      }

      if (!newsletterId.endsWith("@newsletter")) {
        throw new Error("Invalid newsletter ID. Must end with @newsletter");
      }

      await this.socket.newsletterDelete(newsletterId);
      return true;
    } catch (error) {
      this.logger.error("Failed to delete newsletter:", error);
      return false;
    }
  }

  // ============================================
  // Contact Management Methods (v0.9.0)
  // ============================================

  /**
   * Add or edit a contact
   * @param contact - Contact data (phone, name, etc.)
   * @returns ContactOperationResult
   */
  async addOrEditContact(
    contact: ContactData
  ): Promise<ContactOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot add/edit contact. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(contact.phone);

      // Build contact action for Baileys
      const contactAction: any = {
        displayName: contact.name,
      };

      if (contact.firstName) {
        contactAction.givenName = contact.firstName;
      }

      if (contact.lastName) {
        contactAction.familyName = contact.lastName;
      }

      await this.socket.addOrEditContact(jid, contactAction);

      return { success: true };
    } catch (error) {
      this.logger.error("Failed to add/edit contact:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Remove a contact
   * @param phone - Contact's phone number (with country code)
   * @returns ContactOperationResult
   */
  async removeContact(phone: string): Promise<ContactOperationResult> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot remove contact. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(phone);
      await this.socket.removeContact(jid);

      return { success: true };
    } catch (error) {
      this.logger.error("Failed to remove contact:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get audio MIME type from file extension
   */
  private getAudioMimetypeFromFileName(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".mp3": "audio/mpeg",
      ".mp4": "audio/mp4",
      ".m4a": "audio/mp4",
      ".ogg": "audio/ogg; codecs=opus",
      ".opus": "audio/ogg; codecs=opus",
      ".wav": "audio/wav",
      ".aac": "audio/aac",
      ".flac": "audio/flac",
    };
    return mimeTypes[ext] || "audio/mp4";
  }

  /**
   * Get MIME type from file extension
   */
  private getMimetypeFromFileName(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".xls": "application/vnd.ms-excel",
      ".xlsx":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".ppt": "application/vnd.ms-powerpoint",
      ".pptx":
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ".txt": "text/plain",
      ".csv": "text/csv",
      ".json": "application/json",
      ".xml": "application/xml",
      ".zip": "application/zip",
      ".rar": "application/x-rar-compressed",
      ".7z": "application/x-7z-compressed",
      ".tar": "application/x-tar",
      ".gz": "application/gzip",
    };
    return mimeTypes[ext] || "application/octet-stream";
  }

  /**
   * Disconnect from WhatsApp without logging out.
   * The session is preserved and can be used to reconnect later without scanning QR again.
   * Use logout() if you want to fully log out and require a new QR code.
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      // Use end() instead of logout() to preserve session
      // logout() would clear credentials and require new QR scan
      this.socket.end(undefined);
      this.socket = null;
    }

    this.updateConnectionState("disconnected");
    this.logger.info("Disconnected (session preserved)");
  }

  /**
   * Logout from WhatsApp and clear session.
   * After calling this, the next connect() will require scanning a new QR code.
   */
  async logout(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      await this.socket.logout();
      this.socket = null;
    }

    this.updateConnectionState("disconnected");
    this.logger.info("Logged out (session cleared)");
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get instance ID
   */
  getInstanceId(): string {
    return this.options.instanceId;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === "connected";
  }

  // TypeScript event emitter type safety
  on<K extends keyof MiawClientEvents>(
    event: K,
    listener: MiawClientEvents[K]
  ): this {
    return super.on(event, listener);
  }

  emit<K extends keyof MiawClientEvents>(
    event: K,
    ...args: Parameters<MiawClientEvents[K]>
  ): boolean {
    return super.emit(event, ...args);
  }
}
