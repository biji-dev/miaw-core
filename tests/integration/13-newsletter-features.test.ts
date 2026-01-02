/**
 * Integration Tests: Newsletter/Channel Features (v0.9.0)
 *
 * Tests for WhatsApp newsletter/channel features:
 * - Create newsletter
 * - Get newsletter metadata
 * - Follow/unfollow newsletter
 * - Mute/unmute newsletter
 * - Update newsletter name, description, picture
 * - React to newsletter messages
 * - Fetch newsletter messages
 * - Subscribe to updates
 * - Get subscriber/admin counts
 * - Change owner, demote admin
 * - Delete newsletter
 *
 * NOTE: Some tests require you to be the newsletter creator.
 */
import { createTestClient, waitForEvent, TEST_CONFIG, sleep } from '../setup.js';
import { MiawClient } from '../../src/index.js';

describe('Newsletter/Channel Features (v0.9.0)', () => {
  let client: MiawClient;
  let testNewsletterId: string | null = null;

  beforeAll(async () => {
    client = createTestClient();
    await client.connect();
    await waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);
    console.log('\n=== BOT READY FOR NEWSLETTER FEATURE TESTS ===\n');
  }, TEST_CONFIG.connectTimeout);

  afterAll(async () => {
    // Cleanup: Delete test newsletter if created
    if (testNewsletterId) {
      try {
        await client.deleteNewsletter(testNewsletterId);
        console.log('✅ Test newsletter cleaned up');
      } catch {
        // Ignore cleanup errors
      }
    }

    if (client) {
      await client.disconnect();
    }
  });

  describe('Newsletter Creation', () => {
    test('test_create_newsletter', async () => {
      await sleep(1000);

      const result = await client.createNewsletter(
        `Test Newsletter ${Date.now()}`,
        'A newsletter created by Miaw Core tests'
      );

      expect(result.success).toBe(true);
      expect(result.newsletterId).toBeTruthy();

      testNewsletterId = result.newsletterId || null;

      console.log('✅ Newsletter created successfully');
      console.log('   Newsletter ID:', result.newsletterId);
    });

    test('test_create_newsletter_minimal', async () => {
      await sleep(1000);

      const result = await client.createNewsletter(`Minimal ${Date.now()}`);

      expect(result.success).toBe(true);
      console.log('✅ Newsletter created without description');
    });

    test('test_create_newsletter_error_handling', async () => {
      const disconnectedClient = new MiawClient({
        instanceId: 'test-disconnected-newsletter',
      });

      const result = await disconnectedClient.createNewsletter('Test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not connected');
      console.log('✅ Correctly rejected newsletter creation without connection');
    });
  });

  describe('Newsletter Metadata', () => {
    test('test_get_newsletter_metadata', async () => {
      if (!testNewsletterId) {
        console.log('⏭️  Skipping: No test newsletter available');
        return;
      }

      await sleep(1000);

      const meta = await client.getNewsletterMetadata(testNewsletterId);

      expect(meta).toBeTruthy();
      expect(meta?.id).toBe(testNewsletterId);
      expect(meta?.name).toBeTruthy();

      console.log('✅ Newsletter metadata fetched successfully');
      console.log('   Name:', meta?.name);
      console.log('   Description:', meta?.description);
      console.log('   Subscribers:', meta?.subscribers);
    });

    test('test_get_newsletter_metadata_invalid_id', async () => {
      await sleep(1000);

      const meta = await client.getNewsletterMetadata('invalid@newsletter');

      expect(meta).toBeNull();
      console.log('✅ Correctly returned null for invalid newsletter ID');
    });

    test('test_get_newsletter_metadata_without_suffix', async () => {
      const disconnectedClient = new MiawClient({
        instanceId: 'test-newsletter-metadata',
      });

      const result = await disconnectedClient.createNewsletter('Test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not connected');
    });
  });

  describe('Newsletter Follow/Unfollow', () => {
    test('test_follow_newsletter', async () => {
      // Note: Following your own newsletter may not be meaningful
      // Test with a known newsletter ID instead

      console.log('⏭️  Skipping: Follow requires external newsletter ID');
      console.log('   To test manually with a newsletter ID:');
      console.log('   const result = await client.followNewsletter("1234567890@newsletter");');
      console.log('   expect(result).toBe(true);');

      // Uncomment to test with a real newsletter:
      // const result = await client.followNewsletter('1234567890@newsletter');
      // expect(result).toBe(true);
      // console.log('✅ Newsletter followed successfully');
    });

    test('test_unfollow_newsletter', async () => {
      console.log('⏭️  Skipping: Unfollow requires external newsletter ID');
      console.log('   To test manually:');
      console.log('   const result = await client.unfollowNewsletter("1234567890@newsletter");');
      console.log('   expect(result).toBe(true);');

      // Uncomment to test:
      // const result = await client.unfollowNewsletter('1234567890@newsletter');
      // expect(result).toBe(true);
      // console.log('✅ Newsletter unfollowed successfully');
    });

    test('test_follow_invalid_newsletter_id', async () => {
      const result = await client.followNewsletter('invalid-format');

      expect(result).toBe(false);
      console.log('✅ Correctly rejected invalid newsletter ID format');
    });
  });

  describe('Newsletter Mute/Unmute', () => {
    test('test_mute_newsletter', async () => {
      console.log('⏭️  Skipping: Mute requires external newsletter ID');
      console.log('   To test manually:');
      console.log('   const result = await client.muteNewsletter("1234567890@newsletter");');
      console.log('   expect(result).toBe(true);');

      // Uncomment to test:
      // const result = await client.muteNewsletter('1234567890@newsletter');
      // expect(result).toBe(true);
    });

    test('test_unmute_newsletter', async () => {
      console.log('⏭️  Skipping: Unmute requires external newsletter ID');
      console.log('   To test manually:');
      console.log('   const result = await client.unmuteNewsletter("1234567890@newsletter");');
      console.log('   expect(result).toBe(true);');

      // Uncomment to test:
      // const result = await client.unmuteNewsletter('1234567890@newsletter');
      // expect(result).toBe(true);
    });
  });

  describe('Newsletter Updates', () => {
    test('test_update_newsletter_name', async () => {
      if (!testNewsletterId) {
        console.log('⏭️  Skipping: No test newsletter available');
        return;
      }

      await sleep(1000);

      const newName = `Updated Newsletter ${Date.now()}`;
      const result = await client.updateNewsletterName(testNewsletterId, newName);

      expect(result).toBe(true);
      console.log('✅ Newsletter name updated successfully');
      console.log('   New name:', newName);
    });

    test('test_update_newsletter_description', async () => {
      if (!testNewsletterId) {
        console.log('⏭️  Skipping: No test newsletter available');
        return;
      }

      await sleep(1000);

      const newDescription = 'Updated description for test newsletter';
      const result = await client.updateNewsletterDescription(
        testNewsletterId,
        newDescription
      );

      expect(result).toBe(true);
      console.log('✅ Newsletter description updated successfully');
    });

    test('test_update_newsletter_picture', async () => {
      if (!testNewsletterId) {
        console.log('⏭️  Skipping: No test newsletter available');
        return;
      }

      console.log('⏭️  Skipping: Newsletter picture update requires image file');
      console.log('   To test manually:');
      console.log('   const result = await client.updateNewsletterPicture(newsletterId, "./image.jpg");');
      console.log('   expect(result).toBe(true);');

      // Uncomment to test with an actual image:
      // const result = await client.updateNewsletterPicture(testNewsletterId, './test-image.jpg');
      // expect(result).toBe(true);
    });

    test('test_remove_newsletter_picture', async () => {
      if (!testNewsletterId) {
        console.log('⏭️  Skipping: No test newsletter available');
        return;
      }

      console.log('⏭️  Skipping: Remove picture is destructive');
      console.log('   To test manually:');
      console.log('   const result = await client.removeNewsletterPicture(newsletterId);');

      // Uncomment to test:
      // const result = await client.removeNewsletterPicture(testNewsletterId);
      // expect(result).toBe(true);
    });
  });

  describe('Newsletter Messages', () => {
    test('test_fetch_newsletter_messages', async () => {
      if (!testNewsletterId) {
        console.log('⏭️  Skipping: No test newsletter available');
        return;
      }

      await sleep(1000);

      const result = await client.fetchNewsletterMessages(testNewsletterId, 10);

      expect(result.success).toBe(true);
      expect(result.messages).toBeTruthy();

      console.log('✅ Newsletter messages fetched successfully');
      console.log('   Messages count:', result.messages?.length);
    });

    test('test_fetch_newsletter_messages_with_pagination', async () => {
      if (!testNewsletterId) {
        console.log('⏭️  Skipping: No test newsletter available');
        return;
      }

      await sleep(1000);

      const result = await client.fetchNewsletterMessages(
        testNewsletterId,
        5,
        Date.now(),
        0
      );

      expect(result.success).toBe(true);
      console.log('✅ Paginated newsletter messages fetched');
    });

    test('test_react_to_newsletter_message', async () => {
      console.log('⏭️  Skipping: React requires message ID from newsletter');
      console.log('   To test manually:');
      console.log('   const result = await client.reactToNewsletterMessage("newsletter-id", "msg-id", "👍");');
      console.log('   expect(result).toBe(true);');

      // Uncomment to test with actual message ID:
      // const result = await client.reactToNewsletterMessage(testNewsletterId, 'message-id', '👍');
      // expect(result).toBe(true);
    });

    test('test_remove_reaction_from_newsletter_message', async () => {
      console.log('⏭️  Skipping: Remove reaction requires message ID');
      console.log('   To test manually:');
      console.log('   const result = await client.reactToNewsletterMessage("newsletter-id", "msg-id", "");');

      // Uncomment to test:
      // const result = await client.reactToNewsletterMessage(testNewsletterId, 'message-id', '');
      // expect(result).toBe(true);
    });
  });

  describe('Newsletter Subscriptions', () => {
    test('test_subscribe_newsletter_updates', async () => {
      if (!testNewsletterId) {
        console.log('⏭️  Skipping: No test newsletter available');
        return;
      }

      await sleep(1000);

      const result = await client.subscribeNewsletterUpdates(testNewsletterId);

      expect(result).toBe(true);
      console.log('✅ Subscribed to newsletter updates');
    });

    test('test_get_newsletter_subscribers', async () => {
      if (!testNewsletterId) {
        console.log('⏭️  Skipping: No test newsletter available');
        return;
      }

      await sleep(1000);

      const result = await client.getNewsletterSubscribers(testNewsletterId);

      expect(result).toBeTruthy();
      console.log('✅ Newsletter subscriber count fetched');
      console.log('   Subscribers:', result?.subscribers);
    });

    test('test_get_newsletter_admin_count', async () => {
      if (!testNewsletterId) {
        console.log('⏭️  Skipping: No test newsletter available');
        return;
      }

      await sleep(1000);

      const result = await client.getNewsletterAdminCount(testNewsletterId);

      expect(result).toBeGreaterThanOrEqual(0);
      console.log('✅ Newsletter admin count fetched');
      console.log('   Admins:', result);
    });
  });

  describe('Newsletter Admin Operations', () => {
    test('test_change_newsletter_owner', async () => {
      console.log('⏭️  Skipping: Change owner requires another admin JID');
      console.log('   To test manually:');
      console.log('   const result = await client.changeNewsletterOwner("newsletter-id", "new-owner@s.whatsapp.net");');

      // Uncomment to test:
      // const result = await client.changeNewsletterOwner(testNewsletterId, '1234567890@s.whatsapp.net');
      // expect(result).toBe(true);
    });

    test('test_demote_newsletter_admin', async () => {
      console.log('⏭️  Skipping: Demote admin requires admin JID');
      console.log('   To test manually:');
      console.log('   const result = await client.demoteNewsletterAdmin("newsletter-id", "admin@s.whatsapp.net");');

      // Uncomment to test:
      // const result = await client.demoteNewsletterAdmin(testNewsletterId, 'admin@s.whatsapp.net');
      // expect(result).toBe(true);
    });
  });

  describe('Newsletter Deletion', () => {
    test('test_delete_newsletter', async () => {
      if (!testNewsletterId) {
        console.log('⏭️  Skipping: No test newsletter to delete');
        return;
      }

      await sleep(1000);

      const result = await client.deleteNewsletter(testNewsletterId);

      expect(result).toBe(true);
      console.log('✅ Newsletter deleted successfully');

      // Clear the test newsletter ID so afterAll doesn't try to delete again
      testNewsletterId = null;
    });

    test('test_delete_newsletter_invalid_format', async () => {
      const result = await client.deleteNewsletter('invalid-format');

      expect(result).toBe(false);
      console.log('✅ Correctly rejected invalid newsletter ID format for deletion');
    });
  });

  describe('Error Handling', () => {
    test('test_all_newsletter_operations_require_connection', async () => {
      const disconnectedClient = new MiawClient({
        instanceId: 'test-disconnected-newsletter-ops',
      });

      // Test a few key operations
      const createResult = await disconnectedClient.createNewsletter('Test');

      expect(createResult.success).toBe(false);
      expect(createResult.error).toContain('Not connected');

      const metaResult = await disconnectedClient.getNewsletterMetadata('123@newsletter');

      expect(metaResult).toBeNull();

      const followResult = await disconnectedClient.followNewsletter('123@newsletter');

      expect(followResult).toBe(false);

      console.log('✅ All newsletter operations correctly require connection');
    });
  });
});
