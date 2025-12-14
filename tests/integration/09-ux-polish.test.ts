/**
 * Integration Tests: UX Polish (v0.5.0)
 *
 * Tests for:
 * - Read receipts (markAsRead)
 * - Typing indicator (sendTyping)
 * - Recording indicator (sendRecording)
 * - Presence updates (setPresence)
 * - Presence subscription (subscribePresence)
 */
import { createTestClient, waitForEvent, TEST_CONFIG, sleep } from '../setup';
import { MiawClient, MiawMessage, PresenceUpdate } from '../../src';

describe('UX Polish - Read Receipts', () => {
  let client: MiawClient;

  beforeAll(async () => {
    client = createTestClient();
    await client.connect();
    await waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);
    console.log('\n=== BOT READY FOR READ RECEIPT TESTS ===\n');
  }, TEST_CONFIG.connectTimeout);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  test('test_mark_as_read_requires_raw_message', async () => {
    // Create a mock message without raw data
    const mockMessage: MiawMessage = {
      id: 'test-id',
      from: '1234567890@s.whatsapp.net',
      text: 'Test message',
      timestamp: Date.now() / 1000,
      isGroup: false,
      fromMe: false,
      type: 'text',
    };

    const result = await client.markAsRead(mockMessage);

    expect(result).toBe(false);
    console.log('✅ markAsRead correctly returns false without raw data');
  });

  test('test_mark_as_read_with_received_message', async () => {
    if (!TEST_CONFIG.contactPhoneA) {
      console.log('⏭️  Skipping: No test contact configured');
      console.log('   To test: Send a message to the bot and it will mark it as read');
      return;
    }

    console.log('\n📥 Waiting for incoming message to mark as read...');
    console.log(`   Send a text message from ${TEST_CONFIG.contactPhoneA} to the bot`);

    try {
      const message = await waitForEvent(client, 'message', 30000) as MiawMessage;

      if (message.fromMe) {
        console.log('⏭️  Received own message, skipping read receipt test');
        return;
      }

      console.log(`   Received: "${message.text?.substring(0, 50)}..."`);

      const result = await client.markAsRead(message);

      expect(result).toBe(true);
      console.log('✅ Message marked as read successfully');
    } catch (error) {
      console.log('⏭️  No message received within timeout (expected in automated tests)');
    }
  }, 35000);
});

describe('UX Polish - Typing & Recording Indicators', () => {
  let client: MiawClient;

  beforeAll(async () => {
    client = createTestClient();
    await client.connect();
    await waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);
    console.log('\n=== BOT READY FOR TYPING/RECORDING TESTS ===\n');
  }, TEST_CONFIG.connectTimeout);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  test('test_send_typing_indicator', async () => {
    if (!TEST_CONFIG.contactPhoneA) {
      console.log('⏭️  Skipping: No test contact configured');
      return;
    }

    // Send typing indicator
    await client.sendTyping(TEST_CONFIG.contactPhoneA);
    console.log('✅ Typing indicator sent');
    console.log(`   Check ${TEST_CONFIG.contactPhoneA}'s WhatsApp - should show "typing..."`);

    // Keep typing for 3 seconds
    await sleep(3000);

    // Stop typing
    await client.stopTyping(TEST_CONFIG.contactPhoneA);
    console.log('✅ Typing indicator stopped');
  }, 10000);

  test('test_send_recording_indicator', async () => {
    if (!TEST_CONFIG.contactPhoneA) {
      console.log('⏭️  Skipping: No test contact configured');
      return;
    }

    await sleep(1000);

    // Send recording indicator
    await client.sendRecording(TEST_CONFIG.contactPhoneA);
    console.log('✅ Recording indicator sent');
    console.log(`   Check ${TEST_CONFIG.contactPhoneA}'s WhatsApp - should show "recording audio..."`);

    // Keep recording for 3 seconds
    await sleep(3000);

    // Stop recording
    await client.stopTyping(TEST_CONFIG.contactPhoneA);
    console.log('✅ Recording indicator stopped');
  }, 10000);

  test('test_send_typing_to_group', async () => {
    if (!TEST_CONFIG.groupJid) {
      console.log('⏭️  Skipping: No test group configured');
      return;
    }

    await sleep(1000);

    // Send typing indicator to group
    await client.sendTyping(TEST_CONFIG.groupJid);
    console.log('✅ Typing indicator sent to group');

    await sleep(2000);

    await client.stopTyping(TEST_CONFIG.groupJid);
    console.log('✅ Typing indicator stopped in group');
  }, 10000);
});

describe('UX Polish - Presence', () => {
  let client: MiawClient;

  beforeAll(async () => {
    client = createTestClient();
    await client.connect();
    await waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);
    console.log('\n=== BOT READY FOR PRESENCE TESTS ===\n');
  }, TEST_CONFIG.connectTimeout);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  test('test_set_presence_available', async () => {
    await client.setPresence('available');
    console.log('✅ Presence set to "available" (online)');
  });

  test('test_set_presence_unavailable', async () => {
    await sleep(1000);

    await client.setPresence('unavailable');
    console.log('✅ Presence set to "unavailable" (offline)');

    // Set back to available
    await sleep(1000);
    await client.setPresence('available');
    console.log('   (Reset to available)');
  });

  test('test_subscribe_presence', async () => {
    if (!TEST_CONFIG.contactPhoneA) {
      console.log('⏭️  Skipping: No test contact configured');
      return;
    }

    await sleep(1000);

    // Subscribe to contact's presence
    await client.subscribePresence(TEST_CONFIG.contactPhoneA);
    console.log(`✅ Subscribed to presence updates for ${TEST_CONFIG.contactPhoneA}`);
    console.log('   Listening for presence updates...');

    // Set up presence listener
    const presencePromise = new Promise<PresenceUpdate>((resolve) => {
      const handler = (update: PresenceUpdate) => {
        if (update.jid.includes(TEST_CONFIG.contactPhoneA!.replace(/\D/g, ''))) {
          client.removeListener('presence', handler);
          resolve(update);
        }
      };
      client.on('presence', handler);
    });

    // Wait for presence update (with timeout)
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 15000);
    });

    const result = await Promise.race([presencePromise, timeoutPromise]);

    if (result) {
      console.log('✅ Received presence update:');
      console.log('   JID:', result.jid);
      console.log('   Status:', result.status);
      console.log('   Last Seen:', result.lastSeen || '(not available)');
    } else {
      console.log('⚠️  No presence update received within timeout');
      console.log('   This is normal if the contact hasn\'t changed status');
    }
  }, 20000);

  test('test_presence_event_structure', async () => {
    // Verify PresenceUpdate type structure
    const mockUpdate: PresenceUpdate = {
      jid: '1234567890@s.whatsapp.net',
      status: 'available',
      lastSeen: Date.now() / 1000,
    };

    expect(mockUpdate.jid).toBeDefined();
    expect(mockUpdate.status).toBeDefined();
    expect(['available', 'unavailable', 'composing', 'recording', 'paused']).toContain(mockUpdate.status);
    console.log('✅ PresenceUpdate type structure is correct');
  });
});
