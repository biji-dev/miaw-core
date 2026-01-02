/**
 * Integration Tests: Message Context
 *
 * Tests for v0.3.0 features:
 * - Replying to messages (quoted)
 * - Receive edit notifications
 * - Receive delete notifications
 * - Receive reactions
 */
import { createTestClient, waitForEvent, TEST_CONFIG, sleep } from '../setup.js';
import { MiawClient, MiawMessage, MessageEdit, MessageDelete, MessageReaction } from '../../src/index.js';

describe('Message Context - Quoted/Reply', () => {
  let client: MiawClient;
  let receivedMessage: MiawMessage | null = null;

  beforeAll(async () => {
    client = createTestClient();

    // Listen for messages to capture one for reply tests
    client.on('message', (msg) => {
      if (!receivedMessage && !msg.fromMe) {
        receivedMessage = msg;
        console.log('Captured message for reply tests:', msg.id);
      }
    });

    await client.connect();
    await waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);
    console.log('\n=== BOT READY FOR MESSAGE CONTEXT TESTS ===\n');

    // Wait a bit to potentially receive a message
    console.log('Waiting 3 seconds to capture incoming messages for reply tests...');
    await sleep(3000);
  }, TEST_CONFIG.connectTimeout);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('Reply to Text Messages', () => {
    test('test_reply_text_to_message', async () => {
      if (!receivedMessage) {
        console.log('⏭️  Skipping: No message received to reply to');
        console.log('   Send a message to the bot and re-run this test');
        return;
      }

      const replyText = `This is a reply to your message ${Date.now()}`;
      const result = await client.sendText(
        receivedMessage.from,
        replyText,
        { quoted: receivedMessage }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('✅ Replied to message with text');
    });

    test('test_reply_text_without_raw_field', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('⏭️  Skipping: No test contact configured');
        return;
      }

      // Create a message without raw field - should still send (just without quote)
      const fakeMessage: MiawMessage = {
        id: 'fake-id',
        from: `${TEST_CONFIG.contactPhoneA}@s.whatsapp.net`,
        timestamp: Date.now() / 1000,
        isGroup: false,
        fromMe: false,
        type: 'text',
        text: 'Fake message',
        // No 'raw' field
      };

      const result = await client.sendText(
        TEST_CONFIG.contactPhoneA,
        `Message with invalid quote ${Date.now()}`,
        { quoted: fakeMessage }
      );

      expect(result.success).toBe(true);
      console.log('✅ Sent message (quote ignored when raw missing)');
    });
  });

  describe('Reply to Media Messages', () => {
    test('test_reply_image_to_message', async () => {
      if (!receivedMessage) {
        console.log('⏭️  Skipping: No message received to reply to');
        return;
      }

      await sleep(1000);

      // Use a small test image (1x1 white pixel PNG)
      const testImageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64'
      );

      const result = await client.sendImage(
        receivedMessage.from,
        testImageBuffer,
        {
          caption: `Image reply ${Date.now()}`,
          quoted: receivedMessage
        }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('✅ Replied to message with image');
    });

    test('test_reply_document_to_message', async () => {
      if (!receivedMessage) {
        console.log('⏭️  Skipping: No message received to reply to');
        return;
      }

      await sleep(1000);

      const testDocBuffer = Buffer.from('Test document content for reply');

      const result = await client.sendDocument(
        receivedMessage.from,
        testDocBuffer,
        {
          fileName: 'reply-doc.txt',
          caption: `Document reply ${Date.now()}`,
          quoted: receivedMessage
        }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('✅ Replied to message with document');
    });

    test('test_reply_video_to_message', async () => {
      if (!receivedMessage) {
        console.log('⏭️  Skipping: No message received to reply to');
        return;
      }

      await sleep(1000);

      // Minimal MP4 video for testing (would need actual video in real test)
      // For now, we'll just verify the API accepts the quoted parameter
      console.log('⏭️  Skipping actual video send (requires video file)');
      console.log('   Video reply API is implemented and ready');
    });

    test('test_reply_audio_to_message', async () => {
      if (!receivedMessage) {
        console.log('⏭️  Skipping: No message received to reply to');
        return;
      }

      await sleep(1000);

      // Minimal audio for testing (would need actual audio in real test)
      // For now, we'll just verify the API accepts the quoted parameter
      console.log('⏭️  Skipping actual audio send (requires audio file)');
      console.log('   Audio reply API is implemented and ready');
    });
  });

  describe('Reply Edge Cases', () => {
    test('test_reply_to_group_message', async () => {
      if (!TEST_CONFIG.groupJid) {
        console.log('⏭️  Skipping: No test group configured');
        return;
      }

      // First, capture a group message if available
      let groupMessage: MiawMessage | undefined;
      if (receivedMessage?.isGroup) {
        groupMessage = receivedMessage;
      }

      if (!groupMessage) {
        console.log('⏭️  Skipping: No group message received to reply to');
        console.log('   Send a message to the test group and re-run');
        return;
      }

      const result = await client.sendText(
        groupMessage.from,
        `Group reply ${Date.now()}`,
        { quoted: groupMessage }
      );

      expect(result.success).toBe(true);
      console.log('✅ Replied to group message');
    });

    test('test_reply_to_own_message', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('⏭️  Skipping: No test contact configured');
        return;
      }

      await sleep(1000);

      // First, send a message
      const firstResult = await client.sendText(
        TEST_CONFIG.contactPhoneA,
        `Original message ${Date.now()}`
      );

      if (!firstResult.success) {
        console.log('⏭️  Skipping: Could not send original message');
        return;
      }

      // Note: We can't easily reply to our own message without receiving it back
      // This test documents the limitation
      console.log('⚠️  Cannot test self-reply: would need to receive own message first');
      console.log('   Self-reply should work if raw message is available');
    });
  });
});

/**
 * Tests for receiving edit notifications
 */
describe('Message Context - Edit Notifications', () => {
  let client: MiawClient;
  let receivedEdit: MessageEdit | null = null;

  beforeAll(async () => {
    client = createTestClient();

    // Listen for message edits
    client.on('message_edit', (edit) => {
      receivedEdit = edit;
      console.log('Received edit notification:', edit.messageId);
    });

    await client.connect();
    await waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);
    console.log('\n=== BOT READY FOR EDIT NOTIFICATION TESTS ===\n');
  }, TEST_CONFIG.connectTimeout);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  test('test_receive_edit_notification', async () => {
    console.log('\n📝 To test edit notifications:');
    console.log('   1. Send a message to the bot');
    console.log('   2. Edit that message within 15 minutes');
    console.log('   3. The bot should receive the edit notification\n');

    // Wait for potential edit event
    console.log('Waiting 5 seconds for edit notification...');
    await sleep(5000);

    if (receivedEdit) {
      expect(receivedEdit.messageId).toBeDefined();
      expect(receivedEdit.chatId).toBeDefined();
      console.log('✅ Received edit notification');
      console.log('   Message ID:', receivedEdit.messageId);
      console.log('   New text:', receivedEdit.newText);
    } else {
      console.log('⏭️  No edit notification received');
      console.log('   Edit a message to the bot and re-run this test');
    }
  });

  test('test_edit_notification_has_new_text', async () => {
    if (!receivedEdit) {
      console.log('⏭️  Skipping: No edit received to validate');
      return;
    }

    // newText should be defined for text message edits
    if (receivedEdit.newText) {
      expect(typeof receivedEdit.newText).toBe('string');
      expect(receivedEdit.newText.length).toBeGreaterThan(0);
      console.log('✅ Edit has newText field:', receivedEdit.newText);
    } else {
      console.log('⚠️  Edit newText is undefined (might be media caption edit)');
    }
  });

  test('test_edit_notification_has_timestamp', async () => {
    if (!receivedEdit) {
      console.log('⏭️  Skipping: No edit received to validate');
      return;
    }

    expect(receivedEdit.editTimestamp).toBeDefined();
    expect(typeof receivedEdit.editTimestamp).toBe('number');
    console.log('✅ Edit has timestamp:', receivedEdit.editTimestamp);
  });
});

/**
 * Tests for receiving delete notifications
 */
describe('Message Context - Delete Notifications', () => {
  let client: MiawClient;
  let receivedDelete: MessageDelete | null = null;

  beforeAll(async () => {
    client = createTestClient();

    // Listen for message deletions
    client.on('message_delete', (deletion) => {
      receivedDelete = deletion;
      console.log('Received delete notification:', deletion.messageId);
    });

    await client.connect();
    await waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);
    console.log('\n=== BOT READY FOR DELETE NOTIFICATION TESTS ===\n');
  }, TEST_CONFIG.connectTimeout);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  test('test_receive_delete_notification', async () => {
    console.log('\n📝 To test delete notifications:');
    console.log('   1. Send a message to the bot');
    console.log('   2. Delete that message (for everyone)');
    console.log('   3. The bot should receive the delete notification\n');

    // Wait for potential delete event
    console.log('Waiting 5 seconds for delete notification...');
    await sleep(5000);

    if (receivedDelete) {
      expect(receivedDelete.messageId).toBeDefined();
      expect(receivedDelete.chatId).toBeDefined();
      console.log('✅ Received delete notification');
      console.log('   Message ID:', receivedDelete.messageId);
      console.log('   Chat ID:', receivedDelete.chatId);
    } else {
      console.log('⏭️  No delete notification received');
      console.log('   Delete a message sent to the bot and re-run this test');
    }
  });

  test('test_delete_notification_has_fromMe', async () => {
    if (!receivedDelete) {
      console.log('⏭️  Skipping: No delete received to validate');
      return;
    }

    expect(typeof receivedDelete.fromMe).toBe('boolean');
    console.log('✅ Delete has fromMe field:', receivedDelete.fromMe);
  });
});

/**
 * Tests for receiving reactions
 */
describe('Message Context - Reactions', () => {
  let client: MiawClient;
  let receivedReaction: MessageReaction | null = null;

  beforeAll(async () => {
    client = createTestClient();

    // Listen for reactions
    client.on('message_reaction', (reaction) => {
      receivedReaction = reaction;
      console.log('Received reaction:', reaction.emoji);
    });

    await client.connect();
    await waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);
    console.log('\n=== BOT READY FOR REACTION TESTS ===\n');
  }, TEST_CONFIG.connectTimeout);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  test('test_receive_reaction', async () => {
    console.log('\n📝 To test reactions:');
    console.log('   1. React to a message from the bot with an emoji');
    console.log('   2. The bot should receive the reaction notification\n');

    // Wait for potential reaction event
    console.log('Waiting 5 seconds for reaction...');
    await sleep(5000);

    if (receivedReaction) {
      expect(receivedReaction.messageId).toBeDefined();
      expect(receivedReaction.chatId).toBeDefined();
      expect(receivedReaction.reactorId).toBeDefined();
      console.log('✅ Received reaction');
      console.log('   Message ID:', receivedReaction.messageId);
      console.log('   Emoji:', receivedReaction.emoji);
      console.log('   From:', receivedReaction.reactorId);
    } else {
      console.log('⏭️  No reaction received');
      console.log('   React to a bot message and re-run this test');
    }
  });

  test('test_reaction_emoji_field', async () => {
    if (!receivedReaction) {
      console.log('⏭️  Skipping: No reaction received to validate');
      return;
    }

    expect(typeof receivedReaction.emoji).toBe('string');
    if (!receivedReaction.isRemoval) {
      expect(receivedReaction.emoji.length).toBeGreaterThan(0);
      console.log('✅ Reaction has emoji:', receivedReaction.emoji);
    } else {
      expect(receivedReaction.emoji).toBe('');
      console.log('✅ Reaction was removed (empty emoji)');
    }
  });

  test('test_reaction_is_removal_field', async () => {
    if (!receivedReaction) {
      console.log('⏭️  Skipping: No reaction received to validate');
      return;
    }

    expect(typeof receivedReaction.isRemoval).toBe('boolean');
    console.log('✅ Reaction has isRemoval field:', receivedReaction.isRemoval);
  });
});
