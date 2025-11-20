import makeWASocket, {
  DisconnectReason,
  WASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
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
} from '../types';
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
   */
  async sendText(
    to: string,
    text: string,
    _options?: SendTextOptions
  ): Promise<SendMessageResult> {
    try {
      if (!this.socket) {
        throw new Error('Not connected. Call connect() first.');
      }

      if (this.connectionState !== 'connected') {
        throw new Error(`Cannot send message. Connection state: ${this.connectionState}`);
      }

      const jid = MessageHandler.formatPhoneToJid(to);

      const result = await this.socket.sendMessage(jid, {
        text,
      });

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
