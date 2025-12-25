/**
 * Integration Tests: Message Receiving
 *
 * IMPORTANT: These tests require manual interaction!
 * Before running:
 * 1. Make sure bot is connected (run connection tests first)
 * 2. Send test messages from your test contacts when prompted
 *
 * Tests for:
 * - Receiving various message types
 * - Fetch chat messages (v0.9.0)
 */
import { createTestClient, waitForMessage, TEST_CONFIG } from '../setup';
import { MiawClient } from '../../src';

describe('Message Receiving', () => {
  let client: MiawClient;

  beforeAll(async () => {
    client = createTestClient();
    await client.connect();

    // Wait for ready
    await new Promise<void>((resolve) => {
      client.once('ready', () => {
        console.log('\n=== BOT READY ===');
        console.log('Bot is ready to receive messages');
        console.log('==================\n');
        resolve();
      });
    });
  }, TEST_CONFIG.connectTimeout);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  test('test_receive_text_standard', async () => {
    console.log('\n📱 Please send a text message from a STANDARD contact (@s.whatsapp.net)');
    console.log(`   Suggested contact: ${TEST_CONFIG.contactPhoneA}`);
    console.log('   Waiting for message...\n');

    const message = await waitForMessage(
      client,
      (msg) => !msg.fromMe && msg.type === 'text' && msg.from.includes('@s.whatsapp.net'),
      60000 // 60 second timeout for manual action
    );

    expect(message).toBeDefined();
    expect(message.type).toBe('text');
    expect(message.from).toContain('@s.whatsapp.net');
    expect(message.text).toBeDefined();
    expect(message.senderName).toBeDefined();

    console.log('✅ Received:', {
      from: message.from,
      phone: message.senderPhone,
      name: message.senderName,
      text: message.text,
    });
  }, 70000);

  test('test_receive_text_lid', async () => {
    console.log('\n📱 Please send a text message from a @lid contact (privacy mode)');
    console.log('   This should be a contact with hidden phone number');
    console.log('   Waiting for message...\n');

    const message = await waitForMessage(
      client,
      (msg) => !msg.fromMe && msg.type === 'text' && msg.from.includes('@lid'),
      60000
    );

    expect(message).toBeDefined();
    expect(message.type).toBe('text');
    expect(message.from).toContain('@lid');
    expect(message.text).toBeDefined();

    console.log('✅ Received:', {
      from: message.from,
      phone: message.senderPhone,
      name: message.senderName,
      text: message.text,
    });
  }, 70000);

  test('test_extract_sender_phone_standard', async () => {
    console.log('\n📱 Send another text from STANDARD contact');
    console.log('   Waiting for message...\n');

    const message = await waitForMessage(
      client,
      (msg) => !msg.fromMe && msg.from.includes('@s.whatsapp.net'),
      60000
    );

    // Standard contacts should have senderPhone matching the JID
    expect(message.senderPhone).toBeDefined();
    const phoneFromJid = message.from.split('@')[0];
    expect(message.senderPhone).toBe(phoneFromJid);

    console.log('✅ Phone extracted:', message.senderPhone);
  }, 70000);

  test('test_extract_sender_phone_lid', async () => {
    console.log('\n📱 Send another text from @lid contact');
    console.log('   Waiting for message...\n');

    const message = await waitForMessage(
      client,
      (msg) => !msg.fromMe && msg.from.includes('@lid'),
      60000
    );

    // @lid contacts should still have senderPhone from senderPn field
    expect(message.senderPhone).toBeDefined();
    expect(message.senderPhone).not.toBe(message.from.split('@')[0]);

    console.log('✅ Real phone extracted from @lid:', message.senderPhone);
  }, 70000);

  test('test_extract_sender_name', async () => {
    console.log('\n📱 Send a text from any contact');
    console.log('   Waiting for message...\n');

    const message = await waitForMessage(
      client,
      (msg) => !msg.fromMe && msg.text,
      60000
    );

    // Should have sender name (pushName)
    expect(message.senderName).toBeDefined();
    expect(typeof message.senderName).toBe('string');
    expect(message.senderName.length).toBeGreaterThan(0);

    console.log('✅ Sender name:', message.senderName);
  }, 70000);

  test('test_receive_group_message', async () => {
    if (!TEST_CONFIG.groupJid) {
      console.log('⏭️  Skipping: No test group configured');
      return;
    }

    console.log('\n📱 Send a text message in the test group');
    console.log(`   Group: ${TEST_CONFIG.groupJid}`);
    console.log('   Waiting for message...\n');

    const message = await waitForMessage(
      client,
      (msg) => !msg.fromMe && msg.isGroup && msg.from === TEST_CONFIG.groupJid,
      60000
    );

    expect(message.isGroup).toBe(true);
    expect(message.participant).toBeDefined();
    expect(message.from).toContain('@g.us');

    console.log('✅ Group message received:', {
      group: message.from,
      participant: message.participant,
      text: message.text,
    });
  }, 70000);

  test('test_ignore_own_messages', async () => {
    // Send a message to self
    const testText = `Test own message ${Date.now()}`;
    await client.sendText(TEST_CONFIG.contactPhoneA, testText);

    // Wait a bit
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Try to receive it (should timeout because fromMe=true is ignored)
    let receivedOwnMessage = false;
    try {
      await waitForMessage(
        client,
        (msg) => msg.text === testText,
        5000
      );
      receivedOwnMessage = true;
    } catch (error) {
      // Expected to timeout
    }

    expect(receivedOwnMessage).toBe(false);
    console.log('✅ Own messages correctly ignored');
  }, 15000);

  describe('Fetch Chat Messages (v0.9.0)', () => {
    test('test_fetch_chat_messages', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('⏭️  Skipping: No test contact configured');
        return;
      }

      // Try to fetch messages from a known contact
      const result = await client.getChatMessages(TEST_CONFIG.contactPhoneA);

      expect(result.success).toBe(true);
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);

      console.log('✅ Fetched chat messages');
      console.log('   Total messages:', result.messages?.length);

      if (result.messages && result.messages.length > 0) {
        const sample = result.messages[0];
        console.log('   Sample message:', {
          id: sample.id,
          from: sample.from,
          type: sample.type,
          timestamp: sample.timestamp,
          text: sample.text || '(no text)',
        });
      } else {
        console.log('   ⚠️  No messages found (might need to send a message first)');
      }
    });

    test('test_fetch_chat_messages_status_jid', async () => {
      // Try fetching messages from the status JID (WhatsApp official account)
      const result = await client.getChatMessages('status@whatsapp.net');

      expect(result.success).toBe(true);
      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);

      console.log('✅ Fetched chat messages for status@whatsapp.net');
      console.log('   Total messages:', result.messages?.length);
    });
  });
});
