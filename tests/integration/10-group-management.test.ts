/**
 * Integration Tests: Group Management (v0.7.0)
 *
 * Tests for:
 * - Create group
 * - Add/Remove participants
 * - Promote/Demote admins
 * - Update group name/description/picture
 * - Group invite operations
 * - Leave group
 * - Fetch all groups (v0.9.0)
 *
 * NOTE: These tests require:
 * - TEST_GROUP_JID: A test group where the bot is an admin
 * - TEST_CONTACT_PHONE_A: A phone number to test add/remove operations
 * - The bot must be an admin in the test group to perform admin operations
 */
import { createTestClient, waitForEvent, TEST_CONFIG, sleep } from '../setup';
import { MiawClient } from '../../src';

describe('Group Management', () => {
  let client: MiawClient;

  beforeAll(async () => {
    client = createTestClient();
    await client.connect();
    await waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);
    console.log('\n=== BOT READY FOR GROUP MANAGEMENT TESTS ===\n');
  }, TEST_CONFIG.connectTimeout);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('Group Creation', () => {
    let createdGroupJid: string | undefined;

    test('test_create_group', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('⏭️  Skipping: No test contact configured');
        return;
      }

      const groupName = `Miaw Test Group ${Date.now()}`;
      const result = await client.createGroup(groupName, [TEST_CONFIG.contactPhoneA]);

      expect(result.success).toBe(true);
      expect(result.groupJid).toBeDefined();
      expect(result.groupInfo).toBeDefined();
      expect(result.groupInfo?.name).toBe(groupName);

      createdGroupJid = result.groupJid;
      console.log('✅ Group created successfully');
      console.log('   Group JID:', result.groupJid);
      console.log('   Participants:', result.groupInfo?.participantCount);
    });

    test('test_leave_created_group', async () => {
      if (!createdGroupJid) {
        console.log('⏭️  Skipping: No created group to leave');
        return;
      }

      await sleep(2000);

      const result = await client.leaveGroup(createdGroupJid);

      expect(result.success).toBe(true);
      console.log('✅ Left created group successfully');
    });
  });

  describe('Participant Operations', () => {
    test('test_add_participant', async () => {
      if (!TEST_CONFIG.groupJid || !TEST_CONFIG.contactPhoneA) {
        console.log('⏭️  Skipping: No test group or contact configured');
        return;
      }

      await sleep(1000);

      const results = await client.addParticipants(TEST_CONFIG.groupJid, [
        TEST_CONFIG.contactPhoneA,
      ]);

      expect(results.length).toBe(1);
      // Status might be '200' (success) or '409' (already in group)
      expect(['200', '409']).toContain(results[0].status);
      console.log('✅ Add participant operation completed');
      console.log('   Status:', results[0].status);
    });

    test('test_remove_participant', async () => {
      if (!TEST_CONFIG.groupJid || !TEST_CONFIG.contactPhoneA) {
        console.log('⏭️  Skipping: No test group or contact configured');
        return;
      }

      await sleep(1000);

      const results = await client.removeParticipants(TEST_CONFIG.groupJid, [
        TEST_CONFIG.contactPhoneA,
      ]);

      expect(results.length).toBe(1);
      // Status might be '200' (success) or '409' (not in group)
      expect(['200', '409']).toContain(results[0].status);
      console.log('✅ Remove participant operation completed');
      console.log('   Status:', results[0].status);
    });
  });

  describe('Admin Operations', () => {
    test('test_promote_to_admin', async () => {
      if (!TEST_CONFIG.groupJid || !TEST_CONFIG.contactPhoneA) {
        console.log('⏭️  Skipping: No test group or contact configured');
        return;
      }

      await sleep(1000);

      // First add the participant
      await client.addParticipants(TEST_CONFIG.groupJid, [TEST_CONFIG.contactPhoneA]);
      await sleep(1000);

      const results = await client.promoteToAdmin(TEST_CONFIG.groupJid, [
        TEST_CONFIG.contactPhoneA,
      ]);

      expect(results.length).toBe(1);
      console.log('✅ Promote to admin operation completed');
      console.log('   Status:', results[0].status);
    });

    test('test_demote_from_admin', async () => {
      if (!TEST_CONFIG.groupJid || !TEST_CONFIG.contactPhoneA) {
        console.log('⏭️  Skipping: No test group or contact configured');
        return;
      }

      await sleep(1000);

      const results = await client.demoteFromAdmin(TEST_CONFIG.groupJid, [
        TEST_CONFIG.contactPhoneA,
      ]);

      expect(results.length).toBe(1);
      console.log('✅ Demote from admin operation completed');
      console.log('   Status:', results[0].status);
    });
  });

  describe('Group Settings', () => {
    test('test_update_group_name', async () => {
      if (!TEST_CONFIG.groupJid) {
        console.log('⏭️  Skipping: No test group configured');
        return;
      }

      await sleep(1000);

      const newName = `Miaw Test ${Date.now()}`;
      const result = await client.updateGroupName(TEST_CONFIG.groupJid, newName);

      expect(result.success).toBe(true);
      console.log('✅ Group name updated successfully');
      console.log('   New name:', newName);
    });

    test('test_update_group_description', async () => {
      if (!TEST_CONFIG.groupJid) {
        console.log('⏭️  Skipping: No test group configured');
        return;
      }

      await sleep(1000);

      const newDescription = `Test description updated at ${new Date().toISOString()}`;
      const result = await client.updateGroupDescription(
        TEST_CONFIG.groupJid,
        newDescription
      );

      expect(result.success).toBe(true);
      console.log('✅ Group description updated successfully');
    });

    test('test_clear_group_description', async () => {
      if (!TEST_CONFIG.groupJid) {
        console.log('⏭️  Skipping: No test group configured');
        return;
      }

      await sleep(1000);

      const result = await client.updateGroupDescription(TEST_CONFIG.groupJid);

      expect(result.success).toBe(true);
      console.log('✅ Group description cleared successfully');
    });

    test('test_update_group_picture', async () => {
      if (!TEST_CONFIG.groupJid) {
        console.log('⏭️  Skipping: No test group configured');
        return;
      }

      // Skip if no test image available
      console.log('⏭️  Skipping: Group picture test requires manual image setup');
      // To test manually, provide a valid image path or URL:
      // const result = await client.updateGroupPicture(TEST_CONFIG.groupJid, './test-image.jpg');
      // expect(result.success).toBe(true);
    });
  });

  describe('Group Invites', () => {
    test('test_get_invite_link', async () => {
      if (!TEST_CONFIG.groupJid) {
        console.log('⏭️  Skipping: No test group configured');
        return;
      }

      await sleep(1000);

      const link = await client.getGroupInviteLink(TEST_CONFIG.groupJid);

      expect(link).not.toBeNull();
      expect(link).toContain('https://chat.whatsapp.com/');
      console.log('✅ Got group invite link successfully');
      console.log('   Link:', link);
    });

    test('test_revoke_invite', async () => {
      if (!TEST_CONFIG.groupJid) {
        console.log('⏭️  Skipping: No test group configured');
        return;
      }

      await sleep(1000);

      const oldLink = await client.getGroupInviteLink(TEST_CONFIG.groupJid);
      await sleep(1000);

      const newLink = await client.revokeGroupInvite(TEST_CONFIG.groupJid);

      expect(newLink).not.toBeNull();
      expect(newLink).toContain('https://chat.whatsapp.com/');
      expect(newLink).not.toBe(oldLink);
      console.log('✅ Revoked and got new invite link');
      console.log('   New link:', newLink);
    });

    test('test_get_invite_info', async () => {
      if (!TEST_CONFIG.groupJid) {
        console.log('⏭️  Skipping: No test group configured');
        return;
      }

      await sleep(1000);

      // Get invite code from link
      const link = await client.getGroupInviteLink(TEST_CONFIG.groupJid);
      if (!link) {
        console.log('⏭️  Skipping: Could not get invite link');
        return;
      }

      await sleep(1000);

      const info = await client.getGroupInviteInfo(link);

      expect(info).not.toBeNull();
      expect(info?.jid).toBeDefined();
      expect(info?.name).toBeDefined();
      expect(info?.participantCount).toBeGreaterThan(0);
      console.log('✅ Got group info from invite');
      console.log('   Name:', info?.name);
      console.log('   Participants:', info?.participantCount);
    });

    test('test_accept_invite_with_url', async () => {
      // This test requires a valid invite URL for a group we're not in
      // Skipping by default as it would add bot to a new group
      console.log('⏭️  Skipping: Accept invite test requires manual setup');
      // To test manually:
      // const groupJid = await client.acceptGroupInvite('https://chat.whatsapp.com/xxxxx');
      // expect(groupJid).not.toBeNull();
      // await client.leaveGroup(groupJid!);
    });
  });

  describe('Leave Group', () => {
    test('test_leave_group_invalid_jid', async () => {
      const result = await client.leaveGroup('invalid-jid');

      expect(result.success).toBe(false);
      expect(result.error).toContain('@g.us');
      console.log('✅ Correctly rejected invalid group JID');
    });
  });

  describe('Error Handling', () => {
    test('test_operations_with_invalid_group', async () => {
      const fakeGroupJid = '123456789@g.us';

      // These should fail gracefully without crashing
      const addResult = await client.addParticipants(fakeGroupJid, ['1234567890']);
      expect(addResult[0].success).toBe(false);

      const promoteResult = await client.promoteToAdmin(fakeGroupJid, ['1234567890']);
      expect(promoteResult[0].success).toBe(false);

      console.log('✅ Gracefully handled operations on invalid group');
    });
  });

  describe('Fetch All Groups (v0.9.0)', () => {
    test('test_fetch_all_groups', async () => {
      const result = await client.fetchAllGroups();

      expect(result.success).toBe(true);
      expect(result.groups).toBeDefined();
      expect(Array.isArray(result.groups)).toBe(true);

      console.log('✅ Fetched all groups');
      console.log('   Total groups:', result.groups?.length);

      if (result.groups && result.groups.length > 0) {
        const sample = result.groups[0];
        console.log('   Sample group:', {
          jid: sample.jid,
          name: sample.name,
          participantCount: sample.participantCount,
        });
      } else {
        console.log('   ⚠️  No groups found (bot might not be in any groups)');
      }
    });
  });
});
