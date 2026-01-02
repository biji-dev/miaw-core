import { MiawMessage, MediaInfo } from '../types/index.js';

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

      // Extract text content and type based on message type
      let text: string | undefined;
      let type: MiawMessage['type'] = 'unknown';
      let media: MediaInfo | undefined;

      // Check for view-once messages first
      const viewOnceMessage = message.message?.viewOnceMessage?.message ||
                              message.message?.viewOnceMessageV2?.message ||
                              message.message?.viewOnceMessageV2Extension?.message;
      const actualMessage = viewOnceMessage || message.message;
      const isViewOnce = !!viewOnceMessage;

      if (actualMessage?.conversation) {
        text = actualMessage.conversation;
        type = 'text';
      } else if (actualMessage?.extendedTextMessage?.text) {
        text = actualMessage.extendedTextMessage.text;
        type = 'text';
      } else if (actualMessage?.imageMessage) {
        const imgMsg = actualMessage.imageMessage;
        text = imgMsg.caption;
        type = 'image';
        media = this.extractImageMetadata(imgMsg, isViewOnce);
      } else if (actualMessage?.videoMessage) {
        const vidMsg = actualMessage.videoMessage;
        text = vidMsg.caption;
        type = 'video';
        media = this.extractVideoMetadata(vidMsg, isViewOnce);
      } else if (actualMessage?.documentMessage) {
        const docMsg = actualMessage.documentMessage;
        text = docMsg.caption;
        type = 'document';
        media = this.extractDocumentMetadata(docMsg);
      } else if (actualMessage?.audioMessage) {
        const audMsg = actualMessage.audioMessage;
        type = 'audio';
        media = this.extractAudioMetadata(audMsg);
      } else if (actualMessage?.stickerMessage) {
        const stkMsg = actualMessage.stickerMessage;
        type = 'sticker';
        media = this.extractStickerMetadata(stkMsg);
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
        media,
        raw: message,
      };

      return normalized;
    } catch (error) {
      console.error('Failed to normalize message:', error);
      return null;
    }
  }

  /**
   * Extract metadata from image message
   */
  private static extractImageMetadata(imgMsg: any, isViewOnce: boolean): MediaInfo {
    return {
      mimetype: imgMsg.mimetype,
      fileSize: imgMsg.fileLength ? Number(imgMsg.fileLength) : undefined,
      width: imgMsg.width,
      height: imgMsg.height,
      viewOnce: isViewOnce,
    };
  }

  /**
   * Extract metadata from video message
   */
  private static extractVideoMetadata(vidMsg: any, isViewOnce: boolean): MediaInfo {
    return {
      mimetype: vidMsg.mimetype,
      fileSize: vidMsg.fileLength ? Number(vidMsg.fileLength) : undefined,
      width: vidMsg.width,
      height: vidMsg.height,
      duration: vidMsg.seconds,
      gifPlayback: vidMsg.gifPlayback || false,
      viewOnce: isViewOnce,
    };
  }

  /**
   * Extract metadata from document message
   */
  private static extractDocumentMetadata(docMsg: any): MediaInfo {
    return {
      mimetype: docMsg.mimetype,
      fileSize: docMsg.fileLength ? Number(docMsg.fileLength) : undefined,
      fileName: docMsg.fileName,
    };
  }

  /**
   * Extract metadata from audio message
   */
  private static extractAudioMetadata(audMsg: any): MediaInfo {
    return {
      mimetype: audMsg.mimetype,
      fileSize: audMsg.fileLength ? Number(audMsg.fileLength) : undefined,
      duration: audMsg.seconds,
      ptt: audMsg.ptt || false,
    };
  }

  /**
   * Extract metadata from sticker message
   */
  private static extractStickerMetadata(stkMsg: any): MediaInfo {
    return {
      mimetype: stkMsg.mimetype,
      fileSize: stkMsg.fileLength ? Number(stkMsg.fileLength) : undefined,
      width: stkMsg.width,
      height: stkMsg.height,
    };
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
