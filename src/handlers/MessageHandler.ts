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

      // Extract phone number and name from message key
      // For groups: use participant info, for DM: use sender info
      const senderPhone = isGroup
        ? message.key.participantPn
        : message.key.senderPn;
      const senderName = message.pushName;

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
        senderPhone,
        senderName,
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
   * @param phoneNumber - Phone number (can include country code) or existing JID
   * @returns WhatsApp JID (e.g., '1234567890@s.whatsapp.net', 'xxxxx@lid', 'xxxxx@g.us')
   */
  static formatPhoneToJid(phoneNumber: string): string {
    // If already has a valid WhatsApp suffix, return as-is
    // Supports: @s.whatsapp.net, @lid, @g.us, @c.us, @broadcast, @newsletter
    if (
      phoneNumber.includes('@s.whatsapp.net') ||
      phoneNumber.includes('@lid') ||
      phoneNumber.includes('@g.us') ||
      phoneNumber.includes('@c.us') ||
      phoneNumber.includes('@broadcast') ||
      phoneNumber.includes('@newsletter')
    ) {
      return phoneNumber;
    }

    // Remove all non-digit characters for phone numbers
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Return formatted JID with standard suffix
    return `${cleaned}@s.whatsapp.net`;
  }

  /**
   * Check if a JID is a group
   */
  static isGroupJid(jid: string): boolean {
    return jid.endsWith('@g.us');
  }
}
