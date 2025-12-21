import makeWASocket, {
  DisconnectReason,
  WASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  AnyMessageContent,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { EventEmitter } from 'events';
import pino from 'pino';
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
} from '../types';
import * as path from 'path';
import { AuthHandler } from '../handlers/AuthHandler';
import { MessageHandler } from '../handlers/MessageHandler';

/**
 * Main client class for interacting with WhatsApp
 */
export class MiawClient extends EventEmitter {
  private options: Required<MiawClientOptions>;
  private socket: WASocket | null = null;
  private authHandler: AuthHandler;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private logger: any;
  private lidToJidMap: Map<string, string> = new Map();

  constructor(options: MiawClientOptions) {
    super();

    // Set default options
    this.options = {
      instanceId: options.instanceId,
      sessionPath: options.sessionPath || './sessions',
      debug: options.debug || false,
      logger: options.logger,
      autoReconnect: options.autoReconnect !== false,
      maxReconnectAttempts: options.maxReconnectAttempts || Infinity,
      reconnectDelay: options.reconnectDelay || 3000,
    };

    // Initialize logger
    this.logger = this.options.logger || pino({
      level: this.options.debug ? 'debug' : 'silent'
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
      this.updateConnectionState('connecting');

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
        browser: ['Miaw', 'Chrome', '1.0.0'],
        generateHighQualityLinkPreview: true,
      });

      // Register event handlers
      this.registerSocketEvents(saveCreds);

      this.logger.info('Connection initiated');
    } catch (error) {
      this.logger.error('Failed to connect:', error);
      this.emit('error', error as Error);

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
    this.socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      // Handle QR code
      if (qr) {
        this.updateConnectionState('qr_required');
        this.emit('qr', qr);
      }

      // Handle connection state
      if (connection === 'close') {
        const shouldReconnect = this.handleDisconnect(lastDisconnect);

        if (shouldReconnect && this.options.autoReconnect) {
          this.scheduleReconnect();
        }
      } else if (connection === 'open') {
        this.reconnectAttempts = 0;
        this.updateConnectionState('connected');
        this.emit('ready');
        this.logger.info('Connected to WhatsApp');
      }
    });

    // Credentials update
    this.socket.ev.on('creds.update', async () => {
      await saveCreds();
      this.emit('session_saved');
    });

    // Contact updates - build LID to JID mapping
    this.socket.ev.on('contacts.upsert', (contacts) => {
      this.updateLidToJidMapping(contacts);
    });

    this.socket.ev.on('contacts.update', (contacts) => {
      this.updateLidToJidMapping(contacts);
    });

    // Chat updates - extract LID mappings from chat data
    this.socket.ev.on('chats.upsert', (chats) => {
      this.updateLidFromChats(chats);
    });

    this.socket.ev.on('chats.update', (chats) => {
      this.updateLidFromChats(chats);
    });

    // Messages
    this.socket.ev.on('messages.upsert', async (m) => {
      if (m.type !== 'notify') return;

      for (const msg of m.messages) {
        // Debug: Log raw Baileys message structure
        if (this.options.debug) {
          console.log('\n========== RAW BAILEYS MESSAGE ==========');
          console.log(JSON.stringify(msg, null, 2));
          console.log('=========================================\n');
        }

        // Check for protocol messages (edits and deletes)
        const protocolMessage = msg.message?.protocolMessage;
        if (protocolMessage) {
          this.handleProtocolMessage(msg, protocolMessage);
          continue; // Don't process as regular message
        }

        // Build LID to JID mapping from incoming messages
        // Incoming messages have remoteJid (phone) and senderLid (LID)
        if (!msg.key.fromMe && msg.key.senderLid && msg.key.remoteJid) {
          const lid = msg.key.senderLid.endsWith('@lid')
            ? msg.key.senderLid
            : `${msg.key.senderLid}@lid`;
          this.lidToJidMap.set(lid, msg.key.remoteJid);

          if (this.options.debug) {
            console.log(`[LID Mapping] ${lid} -> ${msg.key.remoteJid}`);
          }
        }

        const normalized = MessageHandler.normalize({ messages: [msg] });
        if (normalized) {
          this.emit('message', normalized);
        }
      }
    });

    // Reactions
    this.socket.ev.on('messages.reaction', (reactions) => {
      for (const { key, reaction } of reactions) {
        const reactionData: MessageReaction = {
          messageId: key.id || '',
          chatId: key.remoteJid || '',
          reactorId: reaction.key?.participant || reaction.key?.remoteJid || '',
          emoji: reaction.text || '',
          isRemoval: !reaction.text,
          raw: { key, reaction },
        };

        if (this.options.debug) {
          console.log('\n========== REACTION ==========');
          console.log(JSON.stringify(reactionData, null, 2));
          console.log('==============================\n');
        }

        this.emit('message_reaction', reactionData);
      }
    });

    // Presence updates
    this.socket.ev.on('presence.update', (presence) => {
      const jid = presence.id;
      const presences = presence.presences;

      for (const [participantJid, presenceData] of Object.entries(presences)) {
        const update: PresenceUpdate = {
          jid: participantJid || jid,
          status: presenceData.lastKnownPresence as PresenceUpdate['status'],
          lastSeen: presenceData.lastSeen,
        };

        if (this.options.debug) {
          console.log('\n========== PRESENCE UPDATE ==========');
          console.log(JSON.stringify(update, null, 2));
          console.log('=====================================\n');
        }

        this.emit('presence', update);
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
        messageId: key.id || '',
        chatId: key.remoteJid || msg.key.remoteJid || '',
        fromMe: key.fromMe || false,
        participant: key.participant,
        raw: msg,
      };

      if (this.options.debug) {
        console.log('\n========== MESSAGE DELETED ==========');
        console.log(JSON.stringify(deletion, null, 2));
        console.log('=====================================\n');
      }

      this.emit('message_delete', deletion);
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
        messageId: key?.id || '',
        chatId: key?.remoteJid || msg.key.remoteJid || '',
        newText,
        editTimestamp: protocolMessage.timestampMs
          ? Number(protocolMessage.timestampMs)
          : Date.now(),
        raw: msg,
      };

      if (this.options.debug) {
        console.log('\n========== MESSAGE EDITED ==========');
        console.log(JSON.stringify(edit, null, 2));
        console.log('====================================\n');
      }

      this.emit('message_edit', edit);
    }
  }

  /**
   * Update LID to JID mapping from contacts
   */
  private updateLidToJidMapping(contacts: any[]): void {
    for (const contact of contacts) {
      // Contact has both lid and jid - create mapping
      if (contact.lid && contact.id && !contact.id.endsWith('@lid')) {
        this.lidToJidMap.set(contact.lid, contact.id);
        if (this.options.debug) {
          console.log(`[Contact LID Mapping] ${contact.lid} -> ${contact.id}`);
        }
      }
      // Also check if id is the LID and jid field exists
      if (contact.id?.endsWith('@lid') && contact.jid) {
        this.lidToJidMap.set(contact.id, contact.jid);
        if (this.options.debug) {
          console.log(`[Contact LID Mapping] ${contact.id} -> ${contact.jid}`);
        }
      }
    }
  }

  /**
   * Update LID to JID mapping from chat data
   */
  private updateLidFromChats(chats: any[]): void {
    for (const chat of chats) {
      // Chat may have both id (could be phone or LID) and lidJid
      if (chat.lidJid && chat.id && !chat.id.endsWith('@lid')) {
        const lid = chat.lidJid.endsWith('@lid')
          ? chat.lidJid
          : `${chat.lidJid}@lid`;
        this.lidToJidMap.set(lid, chat.id);
        if (this.options.debug) {
          console.log(`[Chat LID Mapping] ${lid} -> ${chat.id}`);
        }
      }
      // Reverse: if id is LID and we have a phone JID
      if (chat.id?.endsWith('@lid') && chat.jid) {
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
    if (!lid?.endsWith('@lid')) {
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
    if (resolved.endsWith('@s.whatsapp.net')) {
      return resolved.replace('@s.whatsapp.net', '');
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
    const normalizedLid = lid.includes('@') ? lid : `${lid}@lid`;
    const normalizedJid = phoneJid.includes('@')
      ? phoneJid
      : `${phoneJid}@s.whatsapp.net`;
    this.lidToJidMap.set(normalizedLid, normalizedJid);
  }

  /**
   * Get all registered LID mappings
   * Useful for persisting mappings to storage
   */
  getLidMappings(): Map<string, string> {
    return new Map(this.lidToJidMap);
  }

  /**
   * Handle disconnection
   * @returns true if should reconnect
   */
  private handleDisconnect(lastDisconnect: any): boolean {
    const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
    const reason = DisconnectReason[statusCode] || 'unknown';

    this.logger.info('Disconnected:', reason, 'Code:', statusCode);
    this.updateConnectionState('disconnected');
    this.emit('disconnected', reason);

    // Don't reconnect if logged out
    if (statusCode === DisconnectReason.loggedOut) {
      this.logger.info('Logged out, not reconnecting');
      return false;
    }

    return true;
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached');
      this.emit('error', new Error('Max reconnection attempts reached'));
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    this.updateConnectionState('reconnecting');
    this.emit('reconnecting', this.reconnectAttempts);

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
    this.emit('connection', state);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot send message. Connection state: ${this.connectionState}`);
      }

      const jid = MessageHandler.formatPhoneToJid(to);

      // Build send options (for quoting/replying)
      const sendOptions = options?.quoted?.raw ? { quoted: options.quoted.raw } : undefined;

      const result = await this.socket.sendMessage(jid, { text }, sendOptions);

      return {
        success: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      this.logger.error('Failed to send message:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot send message. Connection state: ${this.connectionState}`);
      }

      const jid = MessageHandler.formatPhoneToJid(to);

      // Build image message payload
      const imageContent: AnyMessageContent = {
        image: Buffer.isBuffer(image) ? image : { url: image },
        caption: options?.caption,
        viewOnce: options?.viewOnce,
      };

      // Build send options (for quoting/replying)
      const sendOptions = options?.quoted?.raw ? { quoted: options.quoted.raw } : undefined;

      const result = await this.socket.sendMessage(jid, imageContent, sendOptions);

      return {
        success: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      this.logger.error('Failed to send image:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot send message. Connection state: ${this.connectionState}`);
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
        fileName: fileName || 'document',
        mimetype: mimetype || 'application/octet-stream',
        caption: options?.caption,
      };

      // Build send options (for quoting/replying)
      const sendOptions = options?.quoted?.raw ? { quoted: options.quoted.raw } : undefined;

      const result = await this.socket.sendMessage(jid, documentContent, sendOptions);

      return {
        success: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      this.logger.error('Failed to send document:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot send message. Connection state: ${this.connectionState}`);
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
      const sendOptions = options?.quoted?.raw ? { quoted: options.quoted.raw } : undefined;

      const result = await this.socket.sendMessage(jid, videoContent, sendOptions);

      return {
        success: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      this.logger.error('Failed to send video:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot send message. Connection state: ${this.connectionState}`);
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
        mimetype: mimetype || 'audio/mp4',
        ptt: options?.ptt,
      };

      // Build send options (for quoting/replying)
      const sendOptions = options?.quoted?.raw ? { quoted: options.quoted.raw } : undefined;

      const result = await this.socket.sendMessage(jid, audioContent, sendOptions);

      return {
        success: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      this.logger.error('Failed to send audio:', error);
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
        throw new Error('Message does not contain raw Baileys data. Cannot download media.');
      }

      // Check if this is a media message
      const mediaTypes = ['image', 'video', 'audio', 'document', 'sticker'];
      if (!mediaTypes.includes(message.type)) {
        throw new Error(`Message type '${message.type}' is not a downloadable media type.`);
      }

      const buffer = await downloadMediaMessage(
        message.raw,
        'buffer',
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
      this.logger.error('Failed to download media:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot check number. Connection state: ${this.connectionState}`);
      }

      // Clean phone number - remove non-digits
      const cleanPhone = phone.replace(/\D/g, '');

      const results = await this.socket.onWhatsApp(cleanPhone);
      const result = results?.[0];

      return {
        exists: !!result?.exists,
        jid: result?.jid,
      };
    } catch (error) {
      this.logger.error('Failed to check number:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot check numbers. Connection state: ${this.connectionState}`);
      }

      // Clean all phone numbers
      const cleanPhones = phones.map((p) => p.replace(/\D/g, ''));

      const results = await this.socket.onWhatsApp(...cleanPhones);

      return (results || []).map((result) => ({
        exists: !!result?.exists,
        jid: result?.jid,
      }));
    } catch (error) {
      this.logger.error('Failed to check numbers:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot get contact info. Connection state: ${this.connectionState}`);
      }

      const jid = MessageHandler.formatPhoneToJid(jidOrPhone);

      // Fetch status
      let status: string | undefined;
      try {
        const statusResult = await this.socket.fetchStatus(jid);
        // fetchStatus returns an array, get first result
        const firstResult = Array.isArray(statusResult) ? statusResult[0] : statusResult;
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
      const phone = jid.endsWith('@s.whatsapp.net')
        ? jid.replace('@s.whatsapp.net', '')
        : undefined;

      return {
        jid,
        phone,
        status,
        isBusiness,
      };
    } catch (error) {
      this.logger.error('Failed to get contact info:', error);
      return null;
    }
  }

  /**
   * Get business profile information
   * @param jidOrPhone - Contact's JID or phone number
   * @returns BusinessProfile or null if not a business account
   */
  async getBusinessProfile(jidOrPhone: string): Promise<BusinessProfile | null> {
    try {
      if (!this.socket) {
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot get business profile. Connection state: ${this.connectionState}`);
      }

      const jid = MessageHandler.formatPhoneToJid(jidOrPhone);
      const profile = await this.socket.getBusinessProfile(jid);

      if (!profile) {
        return null;
      }

      return {
        description: profile.description || undefined,
        category: profile.category || undefined,
        website: Array.isArray(profile.website) ? profile.website[0] : profile.website,
        email: profile.email || undefined,
        address: profile.address || undefined,
      };
    } catch (error) {
      this.logger.error('Failed to get business profile:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot get profile picture. Connection state: ${this.connectionState}`);
      }

      const jid = MessageHandler.formatPhoneToJid(jidOrPhone);
      const url = await this.socket.profilePictureUrl(jid, highRes ? 'image' : 'preview');

      return url || null;
    } catch (error) {
      // Profile picture might not be available (privacy settings)
      this.logger.debug('Profile picture not available:', error);
      return null;
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot get group info. Connection state: ${this.connectionState}`);
      }

      // Ensure it's a group JID
      if (!groupJid.endsWith('@g.us')) {
        throw new Error('Invalid group JID. Must end with @g.us');
      }

      const metadata = await this.socket.groupMetadata(groupJid);

      const participants: GroupParticipant[] = metadata.participants.map((p) => ({
        jid: p.id,
        role: p.admin === 'superadmin' ? 'superadmin' : p.admin === 'admin' ? 'admin' : 'member',
      }));

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
      this.logger.error('Failed to get group info:', error);
      return null;
    }
  }

  /**
   * Get list of participants in a group
   * @param groupJid - Group JID (e.g., '123456789@g.us')
   * @returns Array of GroupParticipant or null if group not found
   */
  async getGroupParticipants(groupJid: string): Promise<GroupParticipant[] | null> {
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot send reaction. Connection state: ${this.connectionState}`);
      }

      if (!message.raw?.key) {
        throw new Error('Message does not contain raw Baileys key data. Cannot send reaction.');
      }

      const jid = message.raw.key.remoteJid;
      if (!jid) {
        throw new Error('Message does not have a valid chat JID.');
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
      this.logger.error('Failed to send reaction:', error);
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
    return this.sendReaction(message, '');
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot forward message. Connection state: ${this.connectionState}`);
      }

      if (!message.raw) {
        throw new Error('Message does not contain raw Baileys data. Cannot forward.');
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
      this.logger.error('Failed to forward message:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot edit message. Connection state: ${this.connectionState}`);
      }

      if (!message.raw?.key) {
        throw new Error('Message does not contain raw Baileys key data. Cannot edit.');
      }

      if (!message.fromMe) {
        throw new Error('Can only edit your own messages.');
      }

      const jid = message.raw.key.remoteJid;
      if (!jid) {
        throw new Error('Message does not have a valid chat JID.');
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
      this.logger.error('Failed to edit message:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot delete message. Connection state: ${this.connectionState}`);
      }

      if (!message.raw?.key) {
        throw new Error('Message does not contain raw Baileys key data. Cannot delete.');
      }

      const jid = message.raw.key.remoteJid;
      if (!jid) {
        throw new Error('Message does not have a valid chat JID.');
      }

      const result = await this.socket.sendMessage(jid, {
        delete: message.raw.key,
      });

      return {
        success: true,
        messageId: result?.key?.id || undefined,
      };
    } catch (error) {
      this.logger.error('Failed to delete message:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot delete message. Connection state: ${this.connectionState}`);
      }

      if (!message.raw?.key) {
        throw new Error('Message does not contain raw Baileys key data. Cannot delete.');
      }

      const jid = message.raw.key.remoteJid;
      if (!jid) {
        throw new Error('Message does not have a valid chat JID.');
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
      this.logger.error('Failed to delete message for me:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot mark as read. Connection state: ${this.connectionState}`);
      }

      if (!message.raw?.key) {
        throw new Error('Message does not contain raw Baileys key data.');
      }

      await this.socket.readMessages([message.raw.key]);
      return true;
    } catch (error) {
      this.logger.error('Failed to mark as read:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot send typing. Connection state: ${this.connectionState}`);
      }

      const jid = MessageHandler.formatPhoneToJid(to);
      await this.socket.sendPresenceUpdate('composing', jid);
    } catch (error) {
      this.logger.error('Failed to send typing indicator:', error);
    }
  }

  /**
   * Send recording indicator to a chat (shows "recording audio...")
   * @param to - Recipient phone number, JID, or group JID
   */
  async sendRecording(to: string): Promise<void> {
    try {
      if (!this.socket) {
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot send recording. Connection state: ${this.connectionState}`);
      }

      const jid = MessageHandler.formatPhoneToJid(to);
      await this.socket.sendPresenceUpdate('recording', jid);
    } catch (error) {
      this.logger.error('Failed to send recording indicator:', error);
    }
  }

  /**
   * Stop typing/recording indicator (send paused state)
   * @param to - Recipient phone number, JID, or group JID
   */
  async stopTyping(to: string): Promise<void> {
    try {
      if (!this.socket) {
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot stop typing. Connection state: ${this.connectionState}`);
      }

      const jid = MessageHandler.formatPhoneToJid(to);
      await this.socket.sendPresenceUpdate('paused', jid);
    } catch (error) {
      this.logger.error('Failed to stop typing indicator:', error);
    }
  }

  /**
   * Set bot's presence status (online/offline)
   * @param status - 'available' (online) or 'unavailable' (offline)
   */
  async setPresence(status: PresenceStatus): Promise<void> {
    try {
      if (!this.socket) {
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot set presence. Connection state: ${this.connectionState}`);
      }

      await this.socket.sendPresenceUpdate(status);
    } catch (error) {
      this.logger.error('Failed to set presence:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot subscribe to presence. Connection state: ${this.connectionState}`);
      }

      const jid = MessageHandler.formatPhoneToJid(jidOrPhone);
      await this.socket.presenceSubscribe(jid);
    } catch (error) {
      this.logger.error('Failed to subscribe to presence:', error);
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
    action: 'add' | 'remove' | 'promote' | 'demote'
  ): Promise<ParticipantOperationResult[]> {
    if (!this.socket) {
      throw new Error('Not connected. Call connect() first.');
    }

    if (this.connectionState !== 'connected') {
      throw new Error(`Cannot perform group operation. Connection state: ${this.connectionState}`);
    }

    if (!groupJid.endsWith('@g.us')) {
      throw new Error('Invalid group JID. Must end with @g.us');
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
      jid: result.jid || '',
      status: result.status,
      success: result.status === '200',
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot create group. Connection state: ${this.connectionState}`);
      }

      // Format participant JIDs
      const formattedParticipants = participants.map((p) =>
        MessageHandler.formatPhoneToJid(p)
      );

      const metadata = await this.socket.groupCreate(name, formattedParticipants);

      const groupParticipants: GroupParticipant[] = metadata.participants.map((p) => ({
        jid: p.id,
        role: p.admin === 'superadmin' ? 'superadmin' : p.admin === 'admin' ? 'admin' : 'member',
      }));

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
      this.logger.error('Failed to create group:', error);
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
      return await this.groupParticipantsOperation(groupJid, participants, 'add');
    } catch (error) {
      this.logger.error('Failed to add participants:', error);
      return participants.map((p) => ({
        jid: MessageHandler.formatPhoneToJid(p),
        status: 'error',
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
      return await this.groupParticipantsOperation(groupJid, participants, 'remove');
    } catch (error) {
      this.logger.error('Failed to remove participants:', error);
      return participants.map((p) => ({
        jid: MessageHandler.formatPhoneToJid(p),
        status: 'error',
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot leave group. Connection state: ${this.connectionState}`);
      }

      if (!groupJid.endsWith('@g.us')) {
        throw new Error('Invalid group JID. Must end with @g.us');
      }

      await this.socket.groupLeave(groupJid);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to leave group:', error);
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
      return await this.groupParticipantsOperation(groupJid, participants, 'promote');
    } catch (error) {
      this.logger.error('Failed to promote participants:', error);
      return participants.map((p) => ({
        jid: MessageHandler.formatPhoneToJid(p),
        status: 'error',
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
      return await this.groupParticipantsOperation(groupJid, participants, 'demote');
    } catch (error) {
      this.logger.error('Failed to demote participants:', error);
      return participants.map((p) => ({
        jid: MessageHandler.formatPhoneToJid(p),
        status: 'error',
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot update group name. Connection state: ${this.connectionState}`);
      }

      if (!groupJid.endsWith('@g.us')) {
        throw new Error('Invalid group JID. Must end with @g.us');
      }

      await this.socket.groupUpdateSubject(groupJid, name);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to update group name:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot update group description. Connection state: ${this.connectionState}`);
      }

      if (!groupJid.endsWith('@g.us')) {
        throw new Error('Invalid group JID. Must end with @g.us');
      }

      await this.socket.groupUpdateDescription(groupJid, description);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to update group description:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot update group picture. Connection state: ${this.connectionState}`);
      }

      if (!groupJid.endsWith('@g.us')) {
        throw new Error('Invalid group JID. Must end with @g.us');
      }

      const imageContent = Buffer.isBuffer(image) ? image : { url: image };
      await this.socket.updateProfilePicture(groupJid, imageContent);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to update group picture:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot get invite link. Connection state: ${this.connectionState}`);
      }

      if (!groupJid.endsWith('@g.us')) {
        throw new Error('Invalid group JID. Must end with @g.us');
      }

      const code = await this.socket.groupInviteCode(groupJid);
      return code ? `https://chat.whatsapp.com/${code}` : null;
    } catch (error) {
      this.logger.error('Failed to get group invite link:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot revoke invite. Connection state: ${this.connectionState}`);
      }

      if (!groupJid.endsWith('@g.us')) {
        throw new Error('Invalid group JID. Must end with @g.us');
      }

      const code = await this.socket.groupRevokeInvite(groupJid);
      return code ? `https://chat.whatsapp.com/${code}` : null;
    } catch (error) {
      this.logger.error('Failed to revoke group invite:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot accept invite. Connection state: ${this.connectionState}`);
      }

      // Extract code from URL if full URL was provided
      let code = inviteCode;
      if (inviteCode.includes('chat.whatsapp.com/')) {
        code = inviteCode.split('chat.whatsapp.com/')[1];
      }

      const groupJid = await this.socket.groupAcceptInvite(code);
      return groupJid || null;
    } catch (error) {
      this.logger.error('Failed to accept group invite:', error);
      return null;
    }
  }

  /**
   * Get group information from invite code without joining
   * @param inviteCode - Invite code (just the code, or full URL)
   * @returns GroupInviteInfo if successful, null if failed
   */
  async getGroupInviteInfo(inviteCode: string): Promise<GroupInviteInfo | null> {
    try {
      if (!this.socket) {
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot get invite info. Connection state: ${this.connectionState}`);
      }

      // Extract code from URL if full URL was provided
      let code = inviteCode;
      if (inviteCode.includes('chat.whatsapp.com/')) {
        code = inviteCode.split('chat.whatsapp.com/')[1];
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
      this.logger.error('Failed to get group invite info:', error);
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
  async updateProfilePicture(image: MediaSource): Promise<ProfileOperationResult> {
    try {
      if (!this.socket) {
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot update profile picture. Connection state: ${this.connectionState}`);
      }

      const userJid = this.socket.user?.id;
      if (!userJid) {
        throw new Error('User JID not available');
      }

      const imageContent = Buffer.isBuffer(image) ? image : { url: image };
      await this.socket.updateProfilePicture(userJid, imageContent);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to update profile picture:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot remove profile picture. Connection state: ${this.connectionState}`);
      }

      const userJid = this.socket.user?.id;
      if (!userJid) {
        throw new Error('User JID not available');
      }

      await this.socket.removeProfilePicture(userJid);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to remove profile picture:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot update profile name. Connection state: ${this.connectionState}`);
      }

      if (!name || name.trim().length === 0) {
        throw new Error('Profile name cannot be empty');
      }

      await this.socket.updateProfileName(name);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to update profile name:', error);
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
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot update profile status. Connection state: ${this.connectionState}`);
      }

      await this.socket.updateProfileStatus(status);

      return { success: true };
    } catch (error) {
      this.logger.error('Failed to update profile status:', error);
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
      '.mp3': 'audio/mpeg',
      '.mp4': 'audio/mp4',
      '.m4a': 'audio/mp4',
      '.ogg': 'audio/ogg; codecs=opus',
      '.opus': 'audio/ogg; codecs=opus',
      '.wav': 'audio/wav',
      '.aac': 'audio/aac',
      '.flac': 'audio/flac',
    };
    return mimeTypes[ext] || 'audio/mp4';
  }

  /**
   * Get MIME type from file extension
   */
  private getMimetypeFromFileName(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.7z': 'application/x-7z-compressed',
      '.tar': 'application/x-tar',
      '.gz': 'application/gzip',
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Disconnect from WhatsApp
   */
  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      await this.socket.logout();
      this.socket = null;
    }

    this.updateConnectionState('disconnected');
    this.logger.info('Disconnected');
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
    return this.connectionState === 'connected';
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
