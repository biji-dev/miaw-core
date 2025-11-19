/**
 * Integration Tests: JID Format Handling
 */
import { MessageHandler } from '../../src/handlers/MessageHandler';

describe('JID Format Handling', () => {
  describe('formatPhoneToJid', () => {
    test('test_format_phone_to_jid', () => {
      const phone = '6281234567890';
      const result = MessageHandler.formatPhoneToJid(phone);

      expect(result).toBe('6281234567890@s.whatsapp.net');
    });

    test('test_preserve_lid_format', () => {
      const lidJid = '171073597345865@lid';
      const result = MessageHandler.formatPhoneToJid(lidJid);

      expect(result).toBe(lidJid);
    });

    test('test_preserve_group_format', () => {
      const groupJid = '123456789@g.us';
      const result = MessageHandler.formatPhoneToJid(groupJid);

      expect(result).toBe(groupJid);
    });

    test('test_preserve_broadcast_format', () => {
      const broadcastJid = 'status@broadcast';
      const result = MessageHandler.formatPhoneToJid(broadcastJid);

      expect(result).toBe(broadcastJid);
    });

    test('test_preserve_newsletter_format', () => {
      const newsletterJid = '123456789@newsletter';
      const result = MessageHandler.formatPhoneToJid(newsletterJid);

      expect(result).toBe(newsletterJid);
    });

    test('test_preserve_cus_format', () => {
      const cusJid = '16505361212@c.us';
      const result = MessageHandler.formatPhoneToJid(cusJid);

      expect(result).toBe(cusJid);
    });

    test('test_clean_phone_input', () => {
      const dirtyPhone = '+62 812-3456-7890';
      const result = MessageHandler.formatPhoneToJid(dirtyPhone);

      expect(result).toBe('6281234567890@s.whatsapp.net');
    });

    test('test_preserve_standard_jid', () => {
      const standardJid = '6281234567890@s.whatsapp.net';
      const result = MessageHandler.formatPhoneToJid(standardJid);

      expect(result).toBe(standardJid);
    });
  });

  describe('isGroupJid', () => {
    test('test_is_group_jid', () => {
      expect(MessageHandler.isGroupJid('123456789@g.us')).toBe(true);
      expect(MessageHandler.isGroupJid('6281234567890@s.whatsapp.net')).toBe(false);
      expect(MessageHandler.isGroupJid('171073597345865@lid')).toBe(false);
      expect(MessageHandler.isGroupJid('status@broadcast')).toBe(false);
    });
  });
});
