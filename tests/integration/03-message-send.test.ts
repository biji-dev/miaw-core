/**
 * Integration Tests: Message Sending
 */
import { createTestClient, waitForEvent, TEST_CONFIG, sleep } from '../setup.js';
import { MiawClient } from '../../src/index.js';

describe('Message Sending', () => {
  let client: MiawClient;

  beforeAll(async () => {
    client = createTestClient();
    await client.connect();
    await waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);
    console.log('\n=== BOT READY FOR SENDING TESTS ===\n');
  }, TEST_CONFIG.connectTimeout);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  test('test_send_to_phone_number', async () => {
    if (!TEST_CONFIG.contactPhoneA) {
      console.log('⏭️  Skipping: No test contact configured');
      return;
    }

    const testMessage = `Test message ${Date.now()}`;
    const result = await client.sendText(TEST_CONFIG.contactPhoneA, testMessage);

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    console.log('✅ Sent to phone number:', TEST_CONFIG.contactPhoneA);
  });

  test('test_send_to_standard_jid', async () => {
    if (!TEST_CONFIG.contactPhoneA) {
      console.log('⏭️  Skipping: No test contact configured');
      return;
    }

    await sleep(1000); // Rate limiting

    const jid = `${TEST_CONFIG.contactPhoneA}@s.whatsapp.net`;
    const testMessage = `Test JID message ${Date.now()}`;
    const result = await client.sendText(jid, testMessage);

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    console.log('✅ Sent to standard JID:', jid);
  });

  test('test_send_to_lid_jid', async () => {
    // This test requires you to manually provide a @lid JID
    console.log('\n📝 To test @lid sending:');
    console.log('   1. Receive a message from an @lid contact');
    console.log('   2. Note the JID (e.g., 123456789@lid)');
    console.log('   3. Update this test with that JID');
    console.log('   4. Re-run this test\n');

    // Example: Replace with actual @lid JID from received message
    const lidJid = ''; // e.g., '171073597345865@lid'

    if (!lidJid) {
      console.log('⏭️  Skipping: No @lid JID configured in test');
      return;
    }

    await sleep(1000);

    const testMessage = `Test @lid message ${Date.now()}`;
    const result = await client.sendText(lidJid, testMessage);

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    console.log('✅ Sent to @lid JID:', lidJid);
  });

  test('test_send_to_group', async () => {
    if (!TEST_CONFIG.groupJid) {
      console.log('⏭️  Skipping: No test group configured');
      return;
    }

    await sleep(1000);

    const testMessage = `Group test message ${Date.now()}`;
    const result = await client.sendText(TEST_CONFIG.groupJid, testMessage);

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    console.log('✅ Sent to group:', TEST_CONFIG.groupJid);
  });

  test('test_send_long_message', async () => {
    if (!TEST_CONFIG.contactPhoneA) {
      console.log('⏭️  Skipping: No test contact configured');
      return;
    }

    await sleep(1000);

    const longMessage = 'A'.repeat(1500) + ` ${Date.now()}`;
    const result = await client.sendText(TEST_CONFIG.contactPhoneA, longMessage);

    expect(result.success).toBe(true);
    console.log('✅ Sent long message (1500+ chars)');
  });

  test('test_send_special_characters', async () => {
    if (!TEST_CONFIG.contactPhoneA) {
      console.log('⏭️  Skipping: No test contact configured');
      return;
    }

    await sleep(1000);

    const specialMessage = `Test special chars: 😀🎉✅ UTF-8: 你好 العربية ${Date.now()}`;
    const result = await client.sendText(TEST_CONFIG.contactPhoneA, specialMessage);

    expect(result.success).toBe(true);
    console.log('✅ Sent message with emojis and unicode');
  });

  test('test_send_when_disconnected', async () => {
    // Temporarily disconnect
    await client.disconnect();
    await sleep(1000);

    const result = await client.sendText(TEST_CONFIG.contactPhoneA, 'This should fail');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    console.log('✅ Correctly failed when disconnected');

    // Reconnect for other tests
    await client.connect();
    await waitForEvent(client, 'ready');
  });

  test('test_send_invalid_jid', async () => {
    await sleep(1000);

    const invalidJid = 'invalid-jid-format';
    const result = await client.sendText(invalidJid, 'This should fail');

    // Should handle gracefully (might succeed if Baileys accepts it)
    if (!result.success) {
      expect(result.error).toBeDefined();
      console.log('✅ Invalid JID rejected:', result.error);
    } else {
      console.log('⚠️  Baileys accepted invalid JID');
    }
  });
});
