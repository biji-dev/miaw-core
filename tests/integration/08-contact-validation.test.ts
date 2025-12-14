/**
 * Integration Tests: Contact Validation & Group Info (v0.4.0)
 *
 * Tests for:
 * - Check phone number on WhatsApp
 * - Get contact info
 * - Get profile picture
 * - Get group info
 * - Get group participants
 */
import { createTestClient, waitForEvent, TEST_CONFIG, sleep } from '../setup';
import { MiawClient } from '../../src';

describe('Contact Validation', () => {
  let client: MiawClient;

  beforeAll(async () => {
    client = createTestClient();
    await client.connect();
    await waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);
    console.log('\n=== BOT READY FOR CONTACT VALIDATION TESTS ===\n');
  }, TEST_CONFIG.connectTimeout);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('Check Number', () => {
    test('test_check_valid_number', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('⏭️  Skipping: No test contact configured');
        return;
      }

      const result = await client.checkNumber(TEST_CONFIG.contactPhoneA);

      expect(result.exists).toBe(true);
      expect(result.jid).toBeDefined();
      expect(result.jid).toContain('@');
      console.log('✅ Valid number check passed');
      console.log('   JID:', result.jid);
    });

    test('test_check_invalid_number', async () => {
      // Use an obviously invalid number
      const result = await client.checkNumber('1234');

      expect(result.exists).toBe(false);
      console.log('✅ Invalid number correctly identified as not on WhatsApp');
    });

    test('test_check_number_with_formatting', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('⏭️  Skipping: No test contact configured');
        return;
      }

      await sleep(1000);

      // Test with various formatting
      const formattedPhone = `+${TEST_CONFIG.contactPhoneA.slice(0, 2)}-${TEST_CONFIG.contactPhoneA.slice(2)}`;
      const result = await client.checkNumber(formattedPhone);

      expect(result.exists).toBe(true);
      console.log('✅ Number with formatting check passed');
    });

    test('test_check_multiple_numbers', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('⏭️  Skipping: No test contact configured');
        return;
      }

      await sleep(1000);

      const phones = [TEST_CONFIG.contactPhoneA, '1234'];
      const results = await client.checkNumbers(phones);

      expect(results.length).toBe(2);
      expect(results[0].exists).toBe(true);
      expect(results[1].exists).toBe(false);
      console.log('✅ Batch number check passed');
    });
  });

  describe('Contact Info', () => {
    test('test_get_contact_info', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('⏭️  Skipping: No test contact configured');
        return;
      }

      await sleep(1000);

      const info = await client.getContactInfo(TEST_CONFIG.contactPhoneA);

      expect(info).not.toBeNull();
      expect(info?.jid).toBeDefined();
      expect(info?.phone).toBeDefined();
      console.log('✅ Got contact info');
      console.log('   JID:', info?.jid);
      console.log('   Status:', info?.status || '(not available)');
      console.log('   Is Business:', info?.isBusiness);
    });

    test('test_get_business_profile', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('⏭️  Skipping: No test contact configured');
        return;
      }

      await sleep(1000);

      const profile = await client.getBusinessProfile(TEST_CONFIG.contactPhoneA);

      if (profile) {
        console.log('✅ Got business profile');
        console.log('   Description:', profile.description || '(none)');
        console.log('   Category:', profile.category || '(none)');
      } else {
        console.log('⚠️  Contact is not a business account (expected for regular contacts)');
      }
    });
  });

  describe('Profile Picture', () => {
    test('test_get_profile_picture_low_res', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('⏭️  Skipping: No test contact configured');
        return;
      }

      await sleep(1000);

      const url = await client.getProfilePicture(TEST_CONFIG.contactPhoneA);

      if (url) {
        expect(url).toContain('http');
        console.log('✅ Got profile picture URL (low res)');
        console.log('   URL:', url.substring(0, 80) + '...');
      } else {
        console.log('⚠️  Profile picture not available (privacy settings)');
      }
    });

    test('test_get_profile_picture_high_res', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('⏭️  Skipping: No test contact configured');
        return;
      }

      await sleep(1000);

      const url = await client.getProfilePicture(TEST_CONFIG.contactPhoneA, true);

      if (url) {
        expect(url).toContain('http');
        console.log('✅ Got profile picture URL (high res)');
      } else {
        console.log('⚠️  High-res profile picture not available');
      }
    });
  });
});

describe('Group Info', () => {
  let client: MiawClient;

  beforeAll(async () => {
    client = createTestClient();
    await client.connect();
    await waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);
    console.log('\n=== BOT READY FOR GROUP INFO TESTS ===\n');
  }, TEST_CONFIG.connectTimeout);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  test('test_get_group_info', async () => {
    if (!TEST_CONFIG.groupJid) {
      console.log('⏭️  Skipping: No test group configured');
      return;
    }

    const info = await client.getGroupInfo(TEST_CONFIG.groupJid);

    expect(info).not.toBeNull();
    expect(info?.jid).toBe(TEST_CONFIG.groupJid);
    expect(info?.name).toBeDefined();
    expect(info?.participantCount).toBeGreaterThan(0);
    expect(info?.participants).toBeDefined();
    expect(info?.participants.length).toBeGreaterThan(0);

    console.log('✅ Got group info');
    console.log('   Name:', info?.name);
    console.log('   Participants:', info?.participantCount);
    console.log('   Description:', info?.description || '(none)');
  });

  test('test_get_group_participants', async () => {
    if (!TEST_CONFIG.groupJid) {
      console.log('⏭️  Skipping: No test group configured');
      return;
    }

    await sleep(1000);

    const participants = await client.getGroupParticipants(TEST_CONFIG.groupJid);

    expect(participants).not.toBeNull();
    expect(participants?.length).toBeGreaterThan(0);

    const admins = participants?.filter((p) => p.role !== 'member') || [];
    const members = participants?.filter((p) => p.role === 'member') || [];

    console.log('✅ Got group participants');
    console.log('   Total:', participants?.length);
    console.log('   Admins:', admins.length);
    console.log('   Members:', members.length);
  });

  test('test_get_group_info_invalid_jid', async () => {
    const info = await client.getGroupInfo('invalid-jid');

    expect(info).toBeNull();
    console.log('✅ Invalid group JID correctly returned null');
  });

  test('test_get_group_profile_picture', async () => {
    if (!TEST_CONFIG.groupJid) {
      console.log('⏭️  Skipping: No test group configured');
      return;
    }

    await sleep(1000);

    const url = await client.getProfilePicture(TEST_CONFIG.groupJid);

    if (url) {
      expect(url).toContain('http');
      console.log('✅ Got group profile picture');
    } else {
      console.log('⚠️  Group has no profile picture');
    }
  });
});
