/**
 * Integration Tests: Profile Management (v0.8.0)
 *
 * Tests for:
 * - Update profile picture
 * - Remove profile picture
 * - Update profile name
 * - Update profile status
 * - Get own profile (v0.9.0)
 *
 * NOTE: These tests modify your actual WhatsApp profile.
 * Use with caution and consider the original values.
 */
import { createTestClient, waitForEvent, TEST_CONFIG, sleep } from '../setup';
import { MiawClient } from '../../src';

describe('Profile Management', () => {
  let client: MiawClient;
  let originalName: string | undefined;

  beforeAll(async () => {
    client = createTestClient();
    await client.connect();
    await waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);
    console.log('\n=== BOT READY FOR PROFILE MANAGEMENT TESTS ===\n');
  }, TEST_CONFIG.connectTimeout);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('Profile Picture Operations', () => {
    test('test_update_profile_picture', async () => {
      // Skip by default - requires a valid image
      console.log('⏭️  Skipping: Profile picture test requires manual image setup');
      console.log('   To test manually:');
      console.log('   const result = await client.updateProfilePicture("./test-image.jpg");');
      console.log('   expect(result.success).toBe(true);');

      // Uncomment to test with an actual image:
      // const result = await client.updateProfilePicture('./test-image.jpg');
      // expect(result.success).toBe(true);
      // console.log('✅ Profile picture updated successfully');
    });

    test('test_update_profile_picture_with_buffer', async () => {
      // Skip by default - requires a valid image buffer
      console.log('⏭️  Skipping: Buffer test requires image data');
      console.log('   To test manually:');
      console.log('   const imageBuffer = fs.readFileSync("./test-image.jpg");');
      console.log('   const result = await client.updateProfilePicture(imageBuffer);');

      // Uncomment to test:
      // const fs = require('fs');
      // const imageBuffer = fs.readFileSync('./test-image.jpg');
      // const result = await client.updateProfilePicture(imageBuffer);
      // expect(result.success).toBe(true);
    });

    test('test_remove_profile_picture', async () => {
      // Skip by default - actually removes your profile picture
      console.log('⏭️  Skipping: Remove picture test modifies your profile');
      console.log('   To test manually:');
      console.log('   const result = await client.removeProfilePicture();');
      console.log('   expect(result.success).toBe(true);');

      // Uncomment to test:
      // const result = await client.removeProfilePicture();
      // expect(result.success).toBe(true);
      // console.log('✅ Profile picture removed successfully');
    });
  });

  describe('Profile Name Operations', () => {
    test('test_update_profile_name', async () => {
      await sleep(1000);

      // Save original name for restoration
      // Note: There's no direct API to get current name, so we skip restoration

      const testName = `Miaw Bot ${Date.now()}`;
      const result = await client.updateProfileName(testName);

      expect(result.success).toBe(true);
      console.log('✅ Profile name updated successfully');
      console.log('   New name:', testName);

      // Restore to a default name
      await sleep(1000);
      await client.updateProfileName('Miaw Bot');
    });

    test('test_update_profile_name_empty_rejected', async () => {
      await sleep(1000);

      const result = await client.updateProfileName('');

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
      console.log('✅ Correctly rejected empty profile name');
    });

    test('test_update_profile_name_whitespace_rejected', async () => {
      await sleep(1000);

      const result = await client.updateProfileName('   ');

      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
      console.log('✅ Correctly rejected whitespace-only profile name');
    });
  });

  describe('Profile Status Operations', () => {
    test('test_update_profile_status', async () => {
      await sleep(1000);

      const testStatus = `Testing at ${new Date().toISOString()}`;
      const result = await client.updateProfileStatus(testStatus);

      expect(result.success).toBe(true);
      console.log('✅ Profile status updated successfully');
      console.log('   New status:', testStatus);
    });

    test('test_update_profile_status_emoji', async () => {
      await sleep(1000);

      const testStatus = '🤖 Powered by Miaw Core';
      const result = await client.updateProfileStatus(testStatus);

      expect(result.success).toBe(true);
      console.log('✅ Profile status with emoji updated successfully');
    });

    test('test_clear_profile_status', async () => {
      await sleep(1000);

      const result = await client.updateProfileStatus('');

      expect(result.success).toBe(true);
      console.log('✅ Profile status cleared successfully');
    });
  });

  describe('Error Handling', () => {
    test('test_profile_operations_require_connection', async () => {
      // Create a new client without connecting
      const disconnectedClient = new MiawClient({
        instanceId: 'test-disconnected',
      });

      const pictureResult = await disconnectedClient.updateProfilePicture('./test.jpg');
      expect(pictureResult.success).toBe(false);
      expect(pictureResult.error).toContain('Not connected');

      const removeResult = await disconnectedClient.removeProfilePicture();
      expect(removeResult.success).toBe(false);
      expect(removeResult.error).toContain('Not connected');

      const nameResult = await disconnectedClient.updateProfileName('Test');
      expect(nameResult.success).toBe(false);
      expect(nameResult.error).toContain('Not connected');

      const statusResult = await disconnectedClient.updateProfileStatus('Test');
      expect(statusResult.success).toBe(false);
      expect(statusResult.error).toContain('Not connected');

      console.log('✅ All profile operations correctly require connection');
    });
  });

  describe('Get Own Profile (v0.9.0)', () => {
    test('test_get_own_profile', async () => {
      const profile = await client.getOwnProfile();

      expect(profile).not.toBeNull();
      expect(profile?.jid).toBeDefined();

      console.log('✅ Got own profile');
      console.log('   JID:', profile?.jid);
      console.log('   Phone:', profile?.phone || '(not available)');
      console.log('   Name:', profile?.name || '(not available)');
      console.log('   Status:', profile?.status || '(not available)');
      console.log('   Is Business:', profile?.isBusiness || false);
    });
  });
});
