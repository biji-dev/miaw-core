import makeWASocket, {
  DisconnectReason,
  WASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers,
  AnyMessageContent,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { EventEmitter } from "node:events";
import { MiawLogger } from "../types/logger.js";
import { createFilteredLogger } from "../utils/filtered-logger.js";
import {
  enableConsoleFilter,
  disableConsoleFilter,
} from "../utils/console-filter.js";
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
  ContactProfile,
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
import * as fs from "node:fs";
import { AuthHandler } from "../handlers/AuthHandler.js";
import { MessageHandler } from "../handlers/MessageHandler.js";
import { TIMEOUTS } from "../constants/timeouts.js";
import { CACHE_CONFIG } from "../constants/cache.js";
import {
  validatePhoneNumber,
  validateJID,
  validateMessageText,
  validateGroupName,
  validatePhoneNumbers,
} from "../utils/validation.js";

/**
 * LRU Cache for LID to JID mappings
 * Prevents unbounded memory growth while maintaining frequently used mappings
 */
class LruCache {
  private cache: Map<string, string>;
  private maxSize: number;

  constructor(maxSize = CACHE_CONFIG.LID_MAP_MAX_SIZE) {
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

  /**
   * Get an iterator for all entries in the cache
   * @returns Iterator of [key, value] tuples
   */
  entries(): IterableIterator<[string, string]> {
    return this.cache.entries();
  }

  /**
   * Get an iterator for all keys in the cache
   * @returns Iterator of keys
   */
  keys(): IterableIterator<string> {
    return this.cache.keys();
  }

  /**
   * Get an iterator for all values in the cache
   * @returns Iterator of values
   */
  values(): IterableIterator<string> {
    return this.cache.values();
  }

  /**
   * Execute a callback for each entry in the cache
   * @param callback - Function to call for each entry
   */
  forEach(callback: (value: string, key: string) => void): void {
    this.cache.forEach(callback);
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
  private connectionStateTimestamp: number = 0;
  private connectionWatchdogTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private loggingOut = false;
  private logger: MiawLogger;
  private lidToJidMap: LruCache = new LruCache();
  // Custom stores for contacts, chats, messages (Baileys v7 removed makeInMemoryStore)
  private contactsStore: Map<string, ContactInfo> = new Map();
  private chatsStore: Map<string, ChatInfo> = new Map();
  private messagesStore: Map<string, MiawMessage[]> = new Map();
  private labelsStore: Map<string, Label> = new Map();
  // Track pending history fetch requests for loadMoreMessages
  private pendingHistoryRequests: Map<string, {
    jid: string;
    resolve: (result: { success: boolean; messagesLoaded: number; hasMore: boolean }) => void;
    initialCount: number;
  }> = new Map();
  private labelEventCount = 0;
  private lastLabelSyncTime?: Date;
  // Track initial label sync to ensure fetchAllLabels waits for it
  private initialLabelSyncPromise: Promise<void> | null = null;
  private initialLabelSyncComplete = false;
  // Store auth state for logout access (needed when disconnected)
  private authState: { creds: any } | null = null;

  constructor(options: MiawClientOptions) {
    super();

    // Initialize logger first (needed for options)
    const logger = options.logger || createFilteredLogger(options.debug || false);

    // Set default options
    this.options = {
      instanceId: options.instanceId,
      sessionPath: options.sessionPath || "./sessions",
      debug: options.debug || false,
      logger: logger,
      autoReconnect: options.autoReconnect !== false,
      maxReconnectAttempts: options.maxReconnectAttempts || Infinity,
      reconnectDelay: options.reconnectDelay || TIMEOUTS.RECONNECT_DELAY,
      stuckStateTimeout: options.stuckStateTimeout || TIMEOUTS.STUCK_STATE,
      qrGracePeriod: options.qrGracePeriod || TIMEOUTS.QR_GRACE_PERIOD,
      qrScanTimeout: options.qrScanTimeout || TIMEOUTS.QR_SCAN_TIMEOUT,
      connectionTimeout: options.connectionTimeout || TIMEOUTS.CONNECTION_TIMEOUT,
    };

    // Use the initialized logger
    this.logger = logger;

    // Enable console filter to suppress libsignal logs when debug is off
    // libsignal logs directly to console.info/warn, bypassing our logger
    if (!this.options.debug) {
      enableConsoleFilter();
    }

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
    // Check for stale "connecting" state (stuck for more than configured timeout)
    if (this.connectionState === "connecting") {
      const elapsed = Date.now() - this.connectionStateTimestamp;
      if (elapsed < this.options.stuckStateTimeout) {
        this.logger.info(`Already connecting (${elapsed}ms), skipping connect() call`);
        return;
      } else {
        this.logger.warn(`Stuck in "connecting" state for ${elapsed}ms, forcing reconnect`);
        this.updateConnectionState("disconnected");
      }
    }

    // Don't reconnect if already connected
    if (this.connectionState === "connected") {
      this.logger.info("Already connected, skipping connect() call");
      return;
    }

    try {
      this.updateConnectionState("connecting");

      // Load persisted stores from disk before connecting
      // This ensures data is available even if Baileys history sync doesn't fire
      // (Known Baileys v7 issue: history sync notification may be received but never processed)
      this.loadLabelsFromFile();
      this.loadContactsFromFile();
      this.loadChatsFromFile();
      this.loadMessagesFromFile();

      // Load auth state
      const { state, saveCreds } = await this.authHandler.initialize();

      // Store auth state for logout access (needed when disconnected)
      this.authState = { creds: state.creds };

      // Get latest Baileys version
      const { version } = await fetchLatestBaileysVersion();

      // Create socket
      const debugMode = this.options.debug;
      const logger = this.logger;
      this.socket = makeWASocket({
        version,
        logger: this.logger,
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, this.logger),
        },
        browser: Browsers.macOS("Desktop"),  // Desktop for more history
        generateHighQualityLinkPreview: true,
        // Enable full history sync to populate stores
        syncFullHistory: true,
        fireInitQueries: true,
        // Debug callback to see if history sync notifications are received
        shouldSyncHistoryMessage: (msg: any) => {
          if (debugMode) {
            logger.debug(`[shouldSyncHistoryMessage] syncType: ${msg.syncType}`);
          }
          return true; // Always sync
        },
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

        // Log store sizes after connection
        if (this.options.debug) {
          this.logger.debug(`[ready] Stores: contacts=${this.contactsStore.size}, chats=${this.chatsStore.size}, messages=${this.messagesStore.size}`);
          // Also log after a delay to catch async updates
          setTimeout(() => {
            this.logger.debug(`[ready+5s] Stores: contacts=${this.contactsStore.size}, chats=${this.chatsStore.size}, messages=${this.messagesStore.size}`);
          }, 5000);
        }

        // Track the initial sync promise so fetchAllLabels can await it
        // This ensures CLI commands that run immediately after connection
        // will wait for the sync to complete before returning empty results
        this.initialLabelSyncPromise = this.syncLabelsFromAppState()
          .then(() => {
            this.initialLabelSyncComplete = true;
            this.logger.debug("Initial label sync completed");
          })
          .catch((error) => {
            this.logger.warn("Failed to sync labels from app state:", error);
            this.initialLabelSyncComplete = true; // Mark complete even on error
          });
      }
    });

    // Credentials update
    this.socket.ev.on("creds.update", async () => {
      await saveCreds();
      this.emit("session_saved");
    });

    // LID mapping update - captures LID to PN (phone number) mappings
    // This event is part of Baileys v7 LID privacy feature
    // Note: This event is WIP and may not always fire
    this.socket.ev.on("lid-mapping.update", (mapping: { lid: string; pn: string }) => {
      this.addLidMapping(mapping.lid, mapping.pn, "BaileysEvent");
    });

    // Contact updates - build LID to JID mapping and update store
    this.socket.ev.on("contacts.upsert", (contacts) => {
      if (this.options.debug) {
        this.logger.debug(`[contacts.upsert] Received ${contacts.length} contacts`);
        if (contacts.length > 0) {
          this.logger.debug(`[contacts.upsert] Sample: ${JSON.stringify(contacts[0])}`);
        }
      }
      this.updateLidToJidMapping(contacts);
      this.updateContactsStore(contacts);
    });

    this.socket.ev.on("contacts.update", (contacts) => {
      if (this.options.debug) {
        this.logger.debug(`[contacts.update] Received ${contacts.length} contact updates`);
        if (contacts.length > 0) {
          this.logger.debug(`[contacts.update] Sample: ${JSON.stringify(contacts[0])}`);
        }
      }
      this.updateLidToJidMapping(contacts);
      this.updateContactsStore(contacts);
    });

    // Chat updates - extract LID mappings and update store
    this.socket.ev.on("chats.upsert", (chats) => {
      if (this.options.debug) {
        this.logger.debug(`[chats.upsert] Received ${chats.length} chats`);
        if (chats.length > 0) {
          this.logger.debug(`[chats.upsert] Sample: ${JSON.stringify(chats[0])}`);
        }
      }
      this.updateLidFromChats(chats);
      this.updateChatsStore(chats);
    });

    this.socket.ev.on("chats.update", (chats) => {
      if (this.options.debug) {
        this.logger.debug(`[chats.update] Received ${chats.length} chat updates`);
      }
      this.updateLidFromChats(chats);
      this.updateChatsStore(chats);
    });

    // History sync - populates contacts, chats, and messages from history
    this.socket.ev.on("messaging-history.set", ({ chats, contacts, messages, isLatest, peerDataRequestSessionId }) => {
      if (this.options.debug) {
        this.logger.debug("\n========== MESSAGING HISTORY SYNC ==========");
        this.logger.debug(`Contacts: ${contacts.length}, Chats: ${chats.length}, Messages: ${messages.length}`);
        this.logger.debug(`Is Latest: ${isLatest}, SessionId: ${peerDataRequestSessionId || 'none'}`);
        this.logger.debug("============================================\n");
      }

      // Build LID mappings FIRST (before store population)
      this.updateLidToJidMapping(contacts);
      this.updateLidFromChats(chats);

      // Update contacts from history
      this.updateContactsStore(contacts);

      // Update chats from history
      this.updateChatsStore(chats);

      // Update messages from history
      // Baileys v7: messages is a flat WAMessage[] array (not nested)
      for (const msg of messages) {
        this.addMessageToStore(msg);
      }

      // Check for pending loadMoreMessages requests
      if (peerDataRequestSessionId && this.pendingHistoryRequests.has(peerDataRequestSessionId)) {
        const request = this.pendingHistoryRequests.get(peerDataRequestSessionId)!;
        const newCount = (this.messagesStore.get(request.jid) || []).length;
        const messagesLoaded = newCount - request.initialCount;

        this.pendingHistoryRequests.delete(peerDataRequestSessionId);
        request.resolve({
          success: true,
          messagesLoaded,
          hasMore: !isLatest,
        });

        this.logger.debug(`History request ${peerDataRequestSessionId} completed: ${messagesLoaded} messages loaded`);
      }

      if (this.options.debug && isLatest) {
        this.logger.debug(`✅ History sync complete. Stores: ${this.contactsStore.size} contacts, ${this.chatsStore.size} chats`);
      }
    });

    // Messages
    this.socket.ev.on("messages.upsert", async (m) => {
      if (m.type !== "notify") return;

      for (const msg of m.messages) {
        // Debug: Log raw Baileys message structure
        if (this.options.debug) {
          this.logger.debug("\n========== RAW BAILEYS MESSAGE ==========");
          this.logger.debug(JSON.stringify(msg, null, 2));
          this.logger.debug("=========================================\n");
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
          this.addLidMapping(msgKey.senderLid, msgKey.remoteJid, "Message");
        }

        const normalized = MessageHandler.normalize({ messages: [msg as any], type: "notify" }, this.logger);
        if (normalized) {
          // Store message in messagesStore
          const chatJid = normalized.from;
          if (!this.messagesStore.has(chatJid)) {
            this.messagesStore.set(chatJid, []);
          }
          this.messagesStore.get(chatJid)!.push(normalized);
          this.saveMessagesToFile();

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
          this.logger.debug("\n========== REACTION ==========");
          this.logger.debug(JSON.stringify(reactionData, null, 2));
          this.logger.debug("==============================\n");
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
          this.logger.debug("\n========== PRESENCE UPDATE ==========");
          this.logger.debug(JSON.stringify(update, null, 2));
          this.logger.debug("=====================================\n");
        }

        this.emit("presence", update);
      }
    });

    // Label updates (WhatsApp Business)
    this.socket.ev.on("labels.edit", (label: any) => {
      this.labelEventCount++;

      if (this.options.debug) {
        this.logger.debug("\n========== LABEL UPDATE ==========");
        this.logger.debug(JSON.stringify(label, null, 2));
        this.logger.debug("==================================\n");
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
        // Persist labels to disk after every update
        // This ensures labels survive reconnections where resyncAppState returns only patches
        this.saveLabelsToFile();
      }
    });

    // Debug listener for labels.association (chat/message label associations)
    this.socket.ev.on("labels.association", (association: any) => {
      if (this.options.debug) {
        this.logger.debug("\n========== LABEL ASSOCIATION ==========");
        this.logger.debug(JSON.stringify(association, null, 2));
        this.logger.debug("=======================================\n");
      }
    });
  }

  /**
   * Remove all socket event listeners
   * Call this before closing socket to prevent stale event handlers
   */
  private removeSocketEvents(): void {
    if (!this.socket) return;

    this.logger.debug("Removing socket event listeners");

    // Remove all event listeners
    this.socket.ev.removeAllListeners("connection.update");
    this.socket.ev.removeAllListeners("creds.update");
    this.socket.ev.removeAllListeners("lid-mapping.update");
    this.socket.ev.removeAllListeners("contacts.upsert");
    this.socket.ev.removeAllListeners("contacts.update");
    this.socket.ev.removeAllListeners("chats.upsert");
    this.socket.ev.removeAllListeners("chats.update");
    this.socket.ev.removeAllListeners("messaging-history.set");
    this.socket.ev.removeAllListeners("messages.upsert");
    this.socket.ev.removeAllListeners("messages.reaction");
    this.socket.ev.removeAllListeners("presence.update");
    this.socket.ev.removeAllListeners("labels.edit");
    this.socket.ev.removeAllListeners("labels.association");
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
        this.logger.debug("\n========== MESSAGE DELETED ==========");
        this.logger.debug(JSON.stringify(deletion, null, 2));
        this.logger.debug("=====================================\n");
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
        this.logger.debug("\n========== MESSAGE EDITED ==========");
        this.logger.debug(JSON.stringify(edit, null, 2));
        this.logger.debug("====================================\n");
      }

      this.emit("message_edit", edit);
    }
  }

  /**
   * Add LID to JID mapping with normalized format and debug logging
   * Centralized helper for all LID mapping operations
   * @param lid - The LID (with or without @lid suffix)
   * @param jid - The JID to map to (phone number)
   * @param source - Source of the mapping for debug logs
   */
  private addLidMapping(lid: string, jid: string, source: "BaileysEvent" | "Contact" | "Chat" | "Message"): void {
    if (!lid || !jid) {
      return;
    }

    // Normalize LID format (ensure it ends with @lid)
    const normalizedLid = lid.endsWith("@lid") ? lid : `${lid}@lid`;

    // Store in our LRU cache
    this.lidToJidMap.set(normalizedLid, jid);

    if (this.options.debug) {
      this.logger.debug(`[LID Mapping: ${source}] ${normalizedLid} -> ${jid}`);
      this.logger.debug(`Total LID mappings: ${this.lidToJidMap.size}`);
    }
  }

  /**
   * Update LID to JID mapping from contacts
   */
  private updateLidToJidMapping(contacts: any[]): void {
    for (const contact of contacts) {
      // Contact has both lid and jid - create mapping
      if (contact.lid && contact.id && !contact.id.endsWith("@lid")) {
        this.addLidMapping(contact.lid, contact.id, "Contact");
      }
      // Also check if id is the LID and jid field exists
      if (contact.id?.endsWith("@lid") && contact.jid) {
        this.addLidMapping(contact.id, contact.jid, "Contact");
      }
    }
  }

  /**
   * Update LID to JID mapping from chat data
   */
  private updateLidFromChats(chats: any[]): void {
    for (const chat of chats) {
      // Chat may have both id (could be phone or LID) and lidJid
      if (chat.lidJid && chat.id && !chat.id.endsWith("@lid")) {
        this.addLidMapping(chat.lidJid, chat.id, "Chat");
      }
      // Reverse: if id is LID and we have a phone JID
      if (chat.id?.endsWith("@lid") && chat.jid) {
        this.addLidMapping(chat.id, chat.jid, "Chat");
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
  /**
   * Get all LID to JID mappings (for debugging/monitoring)
   * @returns Record of LID to JID mappings
   */
  getLidMappings(): Record<string, string> {
    const result: Record<string, string> = {};
    // Use proper encapsulated iteration method
    this.lidToJidMap.forEach((value, key) => {
      result[key] = value;
    });
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
   * Update in-memory contacts store
   * @param contacts - Array of contact objects from Baileys
   *
   * Baileys v7 Contact structure:
   * - id: primary identifier (could be @lid or @s.whatsapp.net)
   * - phoneNumber: phone JID (@s.whatsapp.net) when available
   * - lid: LID JID (@lid) when available
   * - name: contact name saved by user
   * - notify: contact's own display name (push name)
   * - verifiedName: verified business name
   */
  private updateContactsStore(contacts: any[]): void {
    for (const contact of contacts) {
      let jid = contact.id;
      let phone: string | undefined;

      // Baileys v7: Use phoneNumber when id is LID
      if (jid?.endsWith("@lid") && contact.phoneNumber) {
        // Register LID mapping for future resolution
        this.addLidMapping(contact.id, contact.phoneNumber, "Contact");
        jid = contact.phoneNumber;
      }

      if (!jid) continue;

      // Extract phone number from JID
      phone = jid.endsWith("@s.whatsapp.net")
        ? jid.replace("@s.whatsapp.net", "")
        : undefined;

      // Build contact info
      const contactInfo: ContactInfo = {
        jid,
        phone,
        name: contact.name || contact.notify || contact.verifiedName || undefined,
      };

      // Update store with phone JID as primary key
      this.contactsStore.set(jid, contactInfo);

      // Also store by LID for lookup if available
      if (contact.lid && contact.lid !== jid) {
        this.contactsStore.set(contact.lid, contactInfo);
      }
      // Also store by original id if different (for LID contacts)
      if (contact.id && contact.id !== jid) {
        this.contactsStore.set(contact.id, contactInfo);
      }
    }

    // Persist contacts to disk after every update
    // This ensures contacts survive reconnections where history sync may not fire
    if (contacts.length > 0) {
      this.saveContactsToFile();
    }
  }

  /**
   * Update in-memory chats store
   * @param chats - Array of chat objects from Baileys
   *
   * Baileys v7 Chat structure (proto.IConversation):
   * - id: chat JID (can be @lid or @s.whatsapp.net or @g.us)
   * - pnJid: phone number JID when id is LID
   * - lidJid: LID JID when id is phone
   * - name/displayName: chat display name
   * - conversationTimestamp: last message timestamp
   * - unreadCount, archived, pinned: chat state
   */
  private updateChatsStore(chats: any[]): void {
    for (const chat of chats) {
      let jid = chat.id;
      if (!jid) continue;

      const originalId = jid;

      // Handle LID chats - use pnJid (phone JID) when available
      if (jid.endsWith("@lid") && chat.pnJid) {
        this.addLidMapping(jid, chat.pnJid, "Chat");
        jid = chat.pnJid;
      }

      // Extract phone number from JID
      const phone = jid.endsWith("@s.whatsapp.net")
        ? jid.replace("@s.whatsapp.net", "")
        : undefined;

      // Build chat info with proper field mapping for proto.IConversation
      const chatInfo: ChatInfo = {
        jid,
        phone,
        name: chat.name || chat.displayName || undefined,
        isGroup: jid.endsWith("@g.us"),
        lastMessageTimestamp: chat.conversationTimestamp
          ? Number(chat.conversationTimestamp)
          : (chat.timestamp ? Number(chat.timestamp) : undefined),
        unreadCount: chat.unreadCount || undefined,
        isArchived: chat.archived || false,
        isPinned: !!chat.pinned,
      };

      // Update store with resolved JID as primary key
      this.chatsStore.set(jid, chatInfo);

      // Also store by original LID if different (for lookup)
      if (originalId !== jid) {
        this.chatsStore.set(originalId, chatInfo);
      }
    }

    // Persist chats to disk after every update
    // This ensures chats survive reconnections where history sync may not fire
    if (chats.length > 0) {
      this.saveChatsToFile();
    }
  }

  /**
   * Add a message to the store
   * @param msg - Baileys message object
   */
  private addMessageToStore(msg: any): void {
    const normalized = MessageHandler.normalize({ messages: [msg], type: "notify" }, this.logger);
    if (!normalized) return;

    const chatJid = normalized.from;
    if (!this.messagesStore.has(chatJid)) {
      this.messagesStore.set(chatJid, []);
    }
    this.messagesStore.get(chatJid)!.push(normalized);
    this.saveMessagesToFile();
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

    // Reset logout flag
    this.loggingOut = false;

    // Clear LID cache
    this.lidToJidMap.clear();

    // Remove all event listeners
    this.removeAllListeners();

    // Close socket if connected
    if (this.socket) {
      this.removeSocketEvents();
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

    // Reset label sync state so next connection will trigger fresh sync
    this.initialLabelSyncPromise = null;
    this.initialLabelSyncComplete = false;

    // Don't reconnect if logging out
    if (this.loggingOut) {
      this.logger.info("Logout in progress, skipping auto-reconnect");
      this.loggingOut = false;  // Reset flag
      return false;
    }

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
    // Emit event but don't set state - let connect() handle the state transition
    this.emit("reconnecting", this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      this.logger.info(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      this.connect();  // This will set state to "connecting"
    }, this.options.reconnectDelay);
  }

  /**
   * Update connection state and emit event
   */
  private updateConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.connectionStateTimestamp = Date.now();
    this.emit("connection", state);

    // Start watchdog for potentially stuck states
    if (state === "connecting" || state === "reconnecting") {
      this.startConnectionWatchdog();
    } else {
      // Clear watchdog if we're no longer in a potentially stuck state
      if (this.connectionWatchdogTimer) {
        clearTimeout(this.connectionWatchdogTimer);
        this.connectionWatchdogTimer = null;
      }
    }
  }

  /**
   * Start watchdog timer to detect stuck connection states
   */
  private startConnectionWatchdog(): void {
    // Clear any existing watchdog
    if (this.connectionWatchdogTimer) {
      clearTimeout(this.connectionWatchdogTimer);
    }

    this.connectionWatchdogTimer = setTimeout(() => {
      const currentState = this.connectionState;
      const elapsed = Date.now() - this.connectionStateTimestamp;

      // If stuck in connecting/reconnecting for too long, reset to disconnected
      if (
        (currentState === "connecting" || currentState === "reconnecting") &&
        elapsed >= this.options.stuckStateTimeout
      ) {
        this.logger.warn(
          `Connection stuck in "${currentState}" state for ${elapsed}ms, resetting`
        );
        this.updateConnectionState("disconnected");
      }
    }, this.options.stuckStateTimeout);
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

      // Validate recipient (phone or JID)
      const isJID = to.includes("@");
      if (isJID) {
        const jidValidation = validateJID(to);
        if (!jidValidation.valid) {
          return { success: false, error: jidValidation.error };
        }
      } else {
        const phoneValidation = validatePhoneNumber(to);
        if (!phoneValidation.valid) {
          return { success: false, error: phoneValidation.error };
        }
      }

      // Validate message text
      const textValidation = validateMessageText(text);
      if (!textValidation.valid) {
        return { success: false, error: textValidation.error };
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
   * Get full contact profile including name, status, picture, and business info
   * @param jidOrPhone - Contact's JID or phone number
   * @returns ContactProfile or null if not found
   */
  async getContactProfile(jidOrPhone: string): Promise<ContactProfile | null> {
    try {
      if (!this.socket) {
        throw new Error("Not connected. Call connect() first.");
      }

      if (this.connectionState !== "connected") {
        throw new Error(
          `Cannot get contact profile. Connection state: ${this.connectionState}`
        );
      }

      const jid = MessageHandler.formatPhoneToJid(jidOrPhone);

      // Extract phone from JID
      const phone = jid.endsWith("@s.whatsapp.net")
        ? jid.replace("@s.whatsapp.net", "")
        : undefined;

      // Get name from contactsStore
      let name: string | undefined;
      const storedContact = this.contactsStore.get(jid);
      if (storedContact?.name) {
        name = storedContact.name;
      }

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
        // Profile picture might not be available (privacy settings)
      }

      // Check if business account and get business profile
      let isBusiness = false;
      let business: BusinessProfile | undefined;
      try {
        const businessProfile = await this.socket.getBusinessProfile(jid);
        if (businessProfile) {
          isBusiness = true;
          business = {
            description: businessProfile.description || undefined,
            category: businessProfile.category || undefined,
            website: Array.isArray(businessProfile.website)
              ? businessProfile.website[0]
              : businessProfile.website,
            email: businessProfile.email || undefined,
            address: businessProfile.address || undefined,
          };
        }
      } catch {
        // Not a business account or not available
      }

      return {
        jid,
        phone,
        name,
        status,
        pictureUrl,
        isBusiness,
        business,
      };
    } catch (error) {
      this.logger.error("Failed to get contact profile:", error);
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
   * Note: Contacts are populated via Baileys store history sync
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

      // Get display name from socket user
      const name = this.socket.user?.name;

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
        name,
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
   * This triggers a resync of ALL app state collections to ensure labels are synced
   * Labels will be emitted via labels.edit events and stored in labelsStore
   */
  private async syncLabelsFromAppState(): Promise<void> {
    if (!this.socket) {
      return;
    }

    try {
      // resyncAppState is provided by Baileys to sync app state collections
      // Sync ALL collections like Baileys does during initial sync
      // Labels could be in any of: critical_block, critical_unblock_low, regular_high, regular_low, regular
      // The second parameter (false) means this is not an initial sync
      await this.socket.resyncAppState(
        ["critical_block", "critical_unblock_low", "regular_high", "regular_low", "regular"],
        false
      );
      this.lastLabelSyncTime = new Date();
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
  async fetchAllLabels(
    forceSync = false,
    syncTimeout = 2000
  ): Promise<FetchAllLabelsResult> {
    try {
      // If initial sync is still in progress, wait for it first
      // This handles the case where fetchAllLabels is called immediately after connection
      // (e.g., CLI "get labels" right after connect)
      if (this.initialLabelSyncPromise && !this.initialLabelSyncComplete) {
        this.logger.debug("Waiting for initial label sync to complete...");
        try {
          await Promise.race([
            this.initialLabelSyncPromise,
            new Promise((_, reject) =>
              setTimeout(
                () => reject(new Error("Initial sync timeout")),
                10000
              )
            ),
          ]);
        } catch (error) {
          this.logger.debug("Initial sync wait timed out or failed:", error);
        }
      }

      // Force resync if explicitly requested OR if store is empty (first call)
      // This ensures labels are always available even if automatic sync hasn't completed
      if (forceSync || this.labelsStore.size === 0) {
        await this.syncLabelsFromAppState();
        // Wait for buffered events to process
        // Baileys uses ev.createBufferedFunction which processes events async
        await new Promise((resolve) => setTimeout(resolve, syncTimeout));
      }

      // If store is still empty after sync, try loading from disk as fallback
      // This handles reconnection scenarios where resyncAppState returns only patches
      if (this.labelsStore.size === 0) {
        this.logger.debug(
          "Labels store still empty after sync, attempting to load from disk"
        );
        this.loadLabelsFromFile();
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
   * Get the count of label events received
   * Useful for debugging label sync issues
   * @returns Number of labels.edit events received since connection
   */
  public getLabelEventCount(): number {
    return this.labelEventCount;
  }

  /**
   * Get detailed information about the labels store
   * Useful for debugging label sync issues
   * @returns Object with store size, event count, and last sync time
   */
  public getLabelsStoreInfo(): {
    size: number;
    eventCount: number;
    lastSyncTime?: Date;
  } {
    return {
      size: this.labelsStore.size,
      eventCount: this.labelEventCount,
      lastSyncTime: this.lastLabelSyncTime,
    };
  }

  // =============================================================================
  // Persistent Label Storage
  // =============================================================================

  /**
   * Get the path to the labels storage file
   */
  private getLabelsFilePath(): string {
    return path.join(
      this.options.sessionPath,
      this.options.instanceId,
      "labels.json"
    );
  }

  /**
   * Save labels to disk for persistence across reconnections
   * WhatsApp's resyncAppState only returns patches (not full snapshot) when version > 0,
   * so we need to persist labels locally to survive reconnections
   */
  private saveLabelsToFile(): void {
    try {
      const labelsPath = this.getLabelsFilePath();
      const labelsDir = path.dirname(labelsPath);

      // Ensure directory exists
      if (!fs.existsSync(labelsDir)) {
        fs.mkdirSync(labelsDir, { recursive: true });
      }

      // Convert Map to array for JSON serialization
      const labelsData = Array.from(this.labelsStore.values());

      fs.writeFileSync(labelsPath, JSON.stringify(labelsData, null, 2), "utf8");
      this.logger.debug(`Saved ${labelsData.length} labels to ${labelsPath}`);
    } catch (error) {
      this.logger.warn("Failed to save labels to file:", error);
    }
  }

  /**
   * Load labels from disk
   * Called on connection to restore labels from previous session
   */
  private loadLabelsFromFile(): void {
    try {
      const labelsPath = this.getLabelsFilePath();

      if (!fs.existsSync(labelsPath)) {
        this.logger.debug("No labels file found, starting with empty store");
        return;
      }

      const labelsData = JSON.parse(fs.readFileSync(labelsPath, "utf8"));

      if (Array.isArray(labelsData)) {
        // Clear existing store and populate from file
        this.labelsStore.clear();
        for (const label of labelsData) {
          if (label.id) {
            this.labelsStore.set(label.id, label as Label);
          }
        }
        this.logger.info(`Loaded ${this.labelsStore.size} labels from disk`);
      }
    } catch (error) {
      this.logger.warn("Failed to load labels from file:", error);
    }
  }

  // ============================================
  // CONTACTS PERSISTENCE
  // ============================================

  private getContactsFilePath(): string {
    return path.join(
      this.options.sessionPath,
      this.options.instanceId,
      "contacts.json"
    );
  }

  /**
   * Save contacts to disk for persistence across reconnections
   * Baileys v7 history sync doesn't always fire, so we persist contacts locally
   */
  private saveContactsToFile(): void {
    try {
      const contactsPath = this.getContactsFilePath();
      const contactsDir = path.dirname(contactsPath);

      // Ensure directory exists
      if (!fs.existsSync(contactsDir)) {
        fs.mkdirSync(contactsDir, { recursive: true });
      }

      // Convert Map to array for JSON serialization
      // Deduplicate by jid (Map may have same contact under multiple keys)
      const uniqueContacts = new Map<string, ContactInfo>();
      for (const contact of this.contactsStore.values()) {
        if (contact.jid && !uniqueContacts.has(contact.jid)) {
          uniqueContacts.set(contact.jid, contact);
        }
      }
      const contactsData = Array.from(uniqueContacts.values());

      fs.writeFileSync(contactsPath, JSON.stringify(contactsData, null, 2), "utf8");
      this.logger.debug(`Saved ${contactsData.length} contacts to ${contactsPath}`);
    } catch (error) {
      this.logger.warn("Failed to save contacts to file:", error);
    }
  }

  /**
   * Load contacts from disk
   * Called on connection to restore contacts from previous session
   */
  private loadContactsFromFile(): void {
    try {
      const contactsPath = this.getContactsFilePath();

      if (!fs.existsSync(contactsPath)) {
        this.logger.debug("No contacts file found, starting with empty store");
        return;
      }

      const contactsData = JSON.parse(fs.readFileSync(contactsPath, "utf8"));

      if (Array.isArray(contactsData)) {
        // Clear existing store and populate from file
        this.contactsStore.clear();
        for (const contact of contactsData) {
          if (contact.jid) {
            this.contactsStore.set(contact.jid, contact as ContactInfo);
          }
        }
        this.logger.info(`Loaded ${this.contactsStore.size} contacts from disk`);
      }
    } catch (error) {
      this.logger.warn("Failed to load contacts from file:", error);
    }
  }

  // ============================================
  // CHATS PERSISTENCE
  // ============================================

  private getChatsFilePath(): string {
    return path.join(
      this.options.sessionPath,
      this.options.instanceId,
      "chats.json"
    );
  }

  /**
   * Save chats to disk for persistence across reconnections
   * Baileys v7 history sync doesn't always fire, so we persist chats locally
   */
  private saveChatsToFile(): void {
    try {
      const chatsPath = this.getChatsFilePath();
      const chatsDir = path.dirname(chatsPath);

      // Ensure directory exists
      if (!fs.existsSync(chatsDir)) {
        fs.mkdirSync(chatsDir, { recursive: true });
      }

      // Convert Map to array for JSON serialization
      // Deduplicate by jid (Map may have same chat under multiple keys)
      const uniqueChats = new Map<string, ChatInfo>();
      for (const chat of this.chatsStore.values()) {
        if (chat.jid && !uniqueChats.has(chat.jid)) {
          uniqueChats.set(chat.jid, chat);
        }
      }
      const chatsData = Array.from(uniqueChats.values());

      fs.writeFileSync(chatsPath, JSON.stringify(chatsData, null, 2), "utf8");
      this.logger.debug(`Saved ${chatsData.length} chats to ${chatsPath}`);
    } catch (error) {
      this.logger.warn("Failed to save chats to file:", error);
    }
  }

  /**
   * Load chats from disk
   * Called on connection to restore chats from previous session
   */
  private loadChatsFromFile(): void {
    try {
      const chatsPath = this.getChatsFilePath();

      if (!fs.existsSync(chatsPath)) {
        this.logger.debug("No chats file found, starting with empty store");
        return;
      }

      const chatsData = JSON.parse(fs.readFileSync(chatsPath, "utf8"));

      if (Array.isArray(chatsData)) {
        // Clear existing store and populate from file
        this.chatsStore.clear();
        for (const chat of chatsData) {
          if (chat.jid) {
            this.chatsStore.set(chat.jid, chat as ChatInfo);
          }
        }
        this.logger.info(`Loaded ${this.chatsStore.size} chats from disk`);
      }
    } catch (error) {
      this.logger.warn("Failed to load chats from file:", error);
    }
  }

  // ============================================
  // MESSAGES PERSISTENCE
  // ============================================

  private getMessagesFilePath(): string {
    return path.join(
      this.options.sessionPath,
      this.options.instanceId,
      "messages.json"
    );
  }

  /**
   * Save messages to disk for persistence across reconnections
   * Baileys v7 history sync doesn't always fire, so we persist messages locally
   */
  private saveMessagesToFile(): void {
    try {
      const messagesPath = this.getMessagesFilePath();
      const messagesDir = path.dirname(messagesPath);

      // Ensure directory exists
      if (!fs.existsSync(messagesDir)) {
        fs.mkdirSync(messagesDir, { recursive: true });
      }

      // Convert Map to object for JSON serialization
      // Structure: { "jid1": [msg1, msg2], "jid2": [msg3] }
      const messagesData: Record<string, MiawMessage[]> = {};
      for (const [jid, messages] of this.messagesStore.entries()) {
        messagesData[jid] = messages;
      }

      // Count total messages
      const totalMessages = Array.from(this.messagesStore.values()).reduce(
        (sum, msgs) => sum + msgs.length,
        0
      );

      fs.writeFileSync(messagesPath, JSON.stringify(messagesData, null, 2), "utf8");
      this.logger.debug(`Saved ${totalMessages} messages across ${this.messagesStore.size} chats to ${messagesPath}`);
    } catch (error) {
      this.logger.warn("Failed to save messages to file:", error);
    }
  }

  /**
   * Load messages from disk
   * Called on connection to restore messages from previous session
   */
  private loadMessagesFromFile(): void {
    try {
      const messagesPath = this.getMessagesFilePath();

      if (!fs.existsSync(messagesPath)) {
        this.logger.debug("No messages file found, starting with empty store");
        return;
      }

      const messagesData = JSON.parse(fs.readFileSync(messagesPath, "utf8"));

      if (messagesData && typeof messagesData === "object") {
        // Clear existing store and populate from file
        this.messagesStore.clear();
        let totalMessages = 0;
        for (const [jid, messages] of Object.entries(messagesData)) {
          if (Array.isArray(messages)) {
            this.messagesStore.set(jid, messages as MiawMessage[]);
            totalMessages += messages.length;
          }
        }
        this.logger.info(`Loaded ${totalMessages} messages across ${this.messagesStore.size} chats from disk`);
      }
    } catch (error) {
      this.logger.warn("Failed to load messages from file:", error);
    }
  }

  /**
   * Get message counts for all chats
   * @returns Map of JID to message count
   */
  getMessageCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const [jid, messages] of this.messagesStore.entries()) {
      counts.set(jid, messages.length);
    }
    return counts;
  }

  /**
   * Get chat messages from the in-memory store
   * Note: Messages are populated via Baileys store history sync
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
   * Load more (older) messages for a specific chat
   * Uses Baileys fetchMessageHistory to fetch earlier messages
   * @param jidOrPhone - Chat JID or phone number
   * @param count - Number of messages to fetch (max 50)
   * @param timeoutMs - Timeout in milliseconds (default 30000)
   * @returns Result with number of messages loaded and whether more are available
   */
  async loadMoreMessages(
    jidOrPhone: string,
    count: number = 50,
    timeoutMs: number = 30000
  ): Promise<{ success: boolean; messagesLoaded?: number; hasMore?: boolean; error?: string }> {
    try {
      if (!this.socket) {
        return { success: false, error: "Not connected. Call connect() first." };
      }

      if (this.connectionState !== "connected") {
        return { success: false, error: `Cannot load messages. Connection state: ${this.connectionState}` };
      }

      const jid = MessageHandler.formatPhoneToJid(jidOrPhone);
      const messages = this.messagesStore.get(jid) || [];

      if (messages.length === 0) {
        return { success: false, error: "No messages in store to paginate from. Send or receive a message first." };
      }

      // Find the oldest message (messages are stored newest first after history sync)
      // We need the raw Baileys message for the key and timestamp
      let oldestMessage: MiawMessage | null = null;
      let oldestTimestamp = Infinity;

      for (const msg of messages) {
        if (msg.timestamp < oldestTimestamp) {
          oldestTimestamp = msg.timestamp;
          oldestMessage = msg;
        }
      }

      if (!oldestMessage || !oldestMessage.raw) {
        return { success: false, error: "Cannot find message with raw data for pagination cursor." };
      }

      const rawMsg = oldestMessage.raw;
      const msgKey = rawMsg.key;
      const msgTimestamp = rawMsg.messageTimestamp;

      if (!msgKey || !msgTimestamp) {
        return { success: false, error: "Message missing key or timestamp for pagination." };
      }

      // Clamp count to max 50
      const fetchCount = Math.min(count, 50);
      const initialCount = messages.length;

      this.logger.debug(`Fetching ${fetchCount} older messages for ${jid} (current: ${initialCount})`);

      // Call Baileys fetchMessageHistory
      const sessionId = await this.socket.fetchMessageHistory(
        fetchCount,
        msgKey,
        typeof msgTimestamp === 'number' ? msgTimestamp * 1000 : Number(msgTimestamp) * 1000
      );

      this.logger.debug(`History fetch initiated with sessionId: ${sessionId}`);

      // Create a Promise that will be resolved when the history arrives
      return new Promise((resolve) => {
        // Set up timeout
        const timeout = setTimeout(() => {
          this.pendingHistoryRequests.delete(sessionId);
          resolve({
            success: false,
            error: `Timeout waiting for history (${timeoutMs}ms)`,
          });
        }, timeoutMs);

        // Store the pending request
        this.pendingHistoryRequests.set(sessionId, {
          jid,
          initialCount,
          resolve: (result) => {
            clearTimeout(timeout);
            resolve(result);
          },
        });
      });
    } catch (error) {
      this.logger.error("Failed to load more messages:", error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Fetch all chats from the in-memory store
   * Note: Chats are populated via Baileys store history sync
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

      // Validate group name
      const nameValidation = validateGroupName(name);
      if (!nameValidation.valid) {
        return { success: false, error: nameValidation.error };
      }

      // Validate participant phone numbers
      const phonesValidation = validatePhoneNumbers(participants);
      if (!phonesValidation.valid) {
        return { success: false, error: phonesValidation.error };
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

    // Cleanup console filter if it was enabled (reference counted)
    if (!this.options.debug) {
      disableConsoleFilter();
    }

    this.updateConnectionState("disconnected");
    this.logger.info("Disconnected (session preserved)");
  }

  /**
   * Logout from WhatsApp and clear session.
   * After calling this, the next connect() will require scanning a new QR code.
   *
   * This method:
   * 1. Attempts to reconnect if disconnected (max 10 seconds)
   * 2. Sends a logout request to WhatsApp servers using socket.query() to wait for acknowledgment
   * 3. Clears local session files
   * 4. Closes the connection
   *
   * Note: The socket.query() method waits for WhatsApp's acknowledgment before proceeding.
   * This is more reliable than Baileys' native socket.logout() which uses sendNode() (fire-and-forget).
   */
  async logout(): Promise<void> {
    // Set flag to prevent auto-reconnect during logout
    this.loggingOut = true;

    // Clear any pending reconnection
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Get JID from auth state (if connected) or load from session file
    let jid = this.authState?.creds?.me?.id;

    // If not in memory, try loading from session file
    if (!jid && this.authState) {
      jid = this.authState.creds.me?.id;
      this.logger.info(`Retrieved JID from auth state: ${jid ? 'JID found' : 'no JID'}`);
    }

    // If still not found, try initializing auth handler
    if (!jid) {
      try {
        const { state } = await this.authHandler.initialize();
        jid = state.creds.me?.id;
        this.logger.info(`Loaded credentials from session file: ${jid ? 'JID found' : 'no JID'}`);
      } catch (error) {
        this.logger.warn(`Failed to load credentials from session file: ${error}`);
      }
    }

    if (!jid) {
      this.logger.warn("No credentials found - cannot send logout request to server");
      this.updateConnectionState("disconnected");
      return;
    }

    // If disconnected, try to reconnect temporarily (only if we have credentials)
    if ((!this.socket || this.connectionState !== "connected") && jid) {
      this.logger.info("Not connected - attempting quick reconnect for logout");
      try {
        // Race between connect+wait and timeout to prevent hanging
        await Promise.race([
          (async () => {
            await this.connect();
            await this.waitForState("connected", 5000);
          })(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Reconnect timeout")), 5000)
          )
        ]);
        this.logger.info("Reconnected successfully for logout");
      } catch (error) {
        this.logger.warn(`Quick reconnect failed: ${error instanceof Error ? error.message : error}`);
        // Continue with local cleanup even if reconnect fails
      }
    }

    // Send logout request using query() to wait for response
    if (this.socket && this.connectionState === "connected") {
      try {
        this.logger.info("Sending logout request to WhatsApp server...");
        // Use query() instead of sendNode() to wait for response
        // This works around Baileys' socket.logout() using sendNode() which
        // closes the connection before WhatsApp can process the request
        // Note: socket.query() auto-generates the 'id' attribute if not provided
        await this.socket.query({
          tag: 'iq',
          attrs: {
            to: "s.whatsapp.net",
            type: 'set',
            xmlns: 'md'
          },
          content: [{
            tag: 'remove-companion-device',
            attrs: {
              jid,
              reason: 'user_initiated'
            }
          }]
        });
        this.logger.info("Logout request acknowledged by WhatsApp server");
      } catch (error) {
        this.logger.warn(`Logout request failed: ${error}`);
        // Continue with cleanup even if logout request fails
      }
    }

    // Clean up socket
    if (this.socket) {
      this.removeSocketEvents();
      this.socket.end(undefined);
      this.socket = null;
    }

    // Clear session files
    this.authHandler.clearSession();

    // Reset logout flag
    this.loggingOut = false;

    // Cleanup console filter if it was enabled (reference counted)
    if (!this.options.debug) {
      disableConsoleFilter();
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
   * Wait for connection state to change to desired state
   * @param desiredState - The state to wait for
   * @param timeoutMs - Maximum time to wait in milliseconds
   */
  private async waitForState(
    desiredState: ConnectionState,
    timeoutMs: number = 10000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already in desired state
      if (this.connectionState === desiredState) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        this.off("connection", handler);
        reject(new Error(`Timeout waiting for connection state: ${desiredState}`));
      }, timeoutMs);

      const handler = (state: ConnectionState) => {
        if (state === desiredState) {
          clearTimeout(timer);
          this.off("connection", handler);
          resolve();
        }
      };

      this.on("connection", handler);
    });
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

  /**
   * Enable debug mode at runtime
   * Enables verbose logging for debugging (includes libsignal session logs)
   */
  enableDebug(): void {
    this.options.debug = true;
    // Recreate logger with debug enabled
    this.logger = createFilteredLogger(true);
    this.options.logger = this.logger;

    // Update socket logger if connected
    if (this.socket) {
      (this.socket as any).logger = this.logger;
    }

    // Disable console filter to show libsignal logs in debug mode
    disableConsoleFilter();

    this.logger.info("Debug mode enabled");
  }

  /**
   * Disable debug mode at runtime
   * Disables verbose logging and suppresses libsignal session logs
   */
  disableDebug(): void {
    this.logger.info("Debug mode disabled");
    this.options.debug = false;

    // Recreate logger with debug disabled
    this.logger = createFilteredLogger(false);
    this.options.logger = this.logger;

    // Update socket logger if connected
    if (this.socket) {
      (this.socket as any).logger = this.logger;
    }

    // Enable console filter to suppress libsignal session logs
    enableConsoleFilter();
  }

  /**
   * Check if debug mode is enabled
   */
  isDebugEnabled(): boolean {
    return this.options.debug;
  }

  /**
   * Set debug mode
   * @param enabled - Whether to enable debug mode
   */
  setDebug(enabled: boolean): void {
    if (enabled) {
      this.enableDebug();
    } else {
      this.disableDebug();
    }
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
