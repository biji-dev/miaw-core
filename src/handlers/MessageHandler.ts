import { MiawMessage } from '../types';

/**
 * Handles message normalization and parsing
 */
export class MessageHandler {
  /**
   * Normalize a Baileys message into simplified MiawMessage format
   */
  static normalize(msg: any): MiawMessage | null {
    try {
      const message = msg.messages?.[0];
      if (!message) return null;

      const isGroup = message.key.remoteJid?.endsWith('@g.us') || false;

      // Extract text content based on message type
      let text: string | undefined;
      let type: MiawMessage['type'] = 'unknown';

      if (message.message?.conversation) {
        text = message.message.conversation;
        type = 'text';
      } else if (message.message?.extendedTextMessage?.text) {
        text = message.message.extendedTextMessage.text;
        type = 'text';
      } else if (message.message?.imageMessage?.caption) {
        text = message.message.imageMessage.caption;
        type = 'image';
      } else if (message.message?.videoMessage?.caption) {
        text = message.message.videoMessage.caption;
        type = 'video';
      } else if (message.message?.documentMessage) {
        text = message.message.documentMessage.caption;
        type = 'document';
      } else if (message.message?.audioMessage) {
        type = 'audio';
      } else if (message.message?.stickerMessage) {
        type = 'sticker';
      }

      const normalized: MiawMessage = {
        id: message.key.id || '',
        from: message.key.remoteJid || '',
        text,
        timestamp: message.messageTimestamp
          ? Number(message.messageTimestamp)
          : Math.floor(Date.now() / 1000),
        isGroup,
        participant: isGroup ? message.key.participant : undefined,
        fromMe: message.key.fromMe || false,
        type,
        raw: message,
      };

      return normalized;
    } catch (error) {
      console.error('Failed to normalize message:', error);
      return null;
    }
  }

  /**
   * Extract chat ID from message
   */
  static extractChatId(message: MiawMessage): string {
    return message.from;
  }

  /**
   * Format a phone number to WhatsApp JID format
   * @param phoneNumber - Phone number (can include country code)
   * @returns WhatsApp JID (e.g., '1234567890@s.whatsapp.net')
   */
  static formatPhoneToJid(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Check if it's a group
    if (phoneNumber.includes('@g.us')) {
      return phoneNumber;
    }

    // Return formatted JID
    return `${cleaned}@s.whatsapp.net`;
  }

  /**
   * Check if a JID is a group
   */
  static isGroupJid(jid: string): boolean {
    return jid.endsWith('@g.us');
  }
}
