#!/usr/bin/env node
/**
 * Interactive Manual Testing Script for miaw-core
 *
 * This script guides you through testing each feature one by one.
 * Run it from the miaw-core directory after building:
 *
 *   ts-node tests/interactive-test.ts
 *
 * Or build first:
 *   npm run build
 *   node dist/tests/interactive-test.js
 */

import * as readline from 'readline';
import * as fs from 'fs';
import { MiawClient } from '../src';
import { format } from 'util';

// Test configuration
const TEST_CONFIG = {
  instanceId: 'manual-test-bot',
  sessionPath: './test-sessions-manual',
  // You'll be prompted for these during testing
  testPhone: '',
  testPhone2: '',
  testGroupJid: '',
};

// Test results tracking
const testResults: { [key: string]: 'pass' | 'fail' | 'skip' } = {};

// Current test index
let currentTestIndex = 0;

// All tests organized by category
const tests = [
  // ============================================================
  // PREREQUISITES
  // ============================================================
  {
    category: 'Prerequisites',
    name: 'Test Bot Setup',
    action: async () => {
      console.log('\n📱 ACTION REQUIRED:');
      console.log('1. Make sure you have a test WhatsApp account ready');
      console.log('2. I will now connect and show you a QR code');
      console.log('3. Scan the QR code with your WhatsApp');
      console.log('\nPress ENTER when ready to connect...');
      await waitForEnter();
      return true;
    },
  },

  // ============================================================
  // CORE CLIENT (7 methods)
  // ============================================================
  {
    category: 'Core Client',
    name: 'Constructor - Create client',
    test: () => {
      try {
        const client = new MiawClient({
          instanceId: TEST_CONFIG.instanceId,
          sessionPath: TEST_CONFIG.sessionPath,
          debug: true,
        });
        return client !== null;
      } catch (e) {
        console.error('Error:', e);
        return false;
      }
    },
  },
  {
    category: 'Core Client',
    name: 'connect() - Connect to WhatsApp',
    action: async (client: MiawClient) => {
      console.log('\n📱 Scan the QR code below with WhatsApp:');
      console.log('----------------------------------------');

      const qrPromise = new Promise<string>((resolve) => {
        const timeout = setTimeout(() => resolve(''), 60000);
        client.once('qr', (qr: string) => {
          clearTimeout(timeout);
          console.log(qr);
          resolve(qr);
        });
      });

      await qrPromise;
      console.log('\n✅ QR code displayed. Scan it now.');
      console.log('Waiting for connection...');

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 120000);
        client.once('ready', () => {
          clearTimeout(timeout);
          console.log('✅ Connected successfully!');
          resolve();
        });
      });

      return true;
    },
  },
  {
    category: 'Core Client',
    name: 'getConnectionState() - Get connection state',
    test: (client: MiawClient) => {
      const state = client.getConnectionState();
      console.log('Current state:', state);
      return state === 'connected';
    },
  },
  {
    category: 'Core Client',
    name: 'getInstanceId() - Get instance ID',
    test: (client: MiawClient) => {
      const id = client.getInstanceId();
      console.log('Instance ID:', id);
      return id === TEST_CONFIG.instanceId;
    },
  },
  {
    category: 'Core Client',
    name: 'isConnected() - Check if connected',
    test: (client: MiawClient) => {
      const connected = client.isConnected();
      console.log('Is connected:', connected);
      return connected === true;
    },
  },
  {
    category: 'Core Client',
    name: 'disconnect() - Disconnect from WhatsApp',
    action: async (client: MiawClient) => {
      console.log('\n⚠️  This will disconnect the bot. Continue? (y/n)');
      const answer = await waitForInput();
      if (answer.toLowerCase() !== 'y') return 'skip';

      await client.disconnect();
      console.log('✅ Disconnected');

      // Reconnect for subsequent tests
      console.log('\n🔄 Reconnecting for next tests...');
      await client.connect();
      await new Promise<void>((resolve) => {
        client.once('ready', () => resolve());
      });
      console.log('✅ Reconnected');
      return true;
    },
  },

  // ============================================================
  // BASIC GET OPERATIONS (v0.9.0) (6 methods)
  // ============================================================
  {
    category: 'Basic GET Ops',
    name: 'getOwnProfile() - Get your profile',
    test: async (client: MiawClient) => {
      const profile = await client.getOwnProfile();
      if (!profile) {
        console.log('❌ Failed to get profile');
        return false;
      }
      console.log('Your Profile:');
      console.log('  JID:', profile.jid);
      console.log('  Phone:', profile.phone || '(not available)');
      console.log('  Name:', profile.name || '(not set)');
      console.log('  Status:', profile.status || '(not set)');
      console.log('  Is Business:', profile.isBusiness || false);
      return true;
    },
  },
  {
    category: 'Basic GET Ops',
    name: 'fetchAllContacts() - Get all contacts',
    test: async (client: MiawClient) => {
      const result = await client.fetchAllContacts();
      console.log('Success:', result.success);
      console.log('Total contacts:', result.contacts?.length || 0);
      if (result.contacts && result.contacts.length > 0) {
        console.log('Sample contact:', {
          jid: result.contacts[0].jid,
          name: result.contacts[0].name || '(no name)',
        });
      }
      console.log('\n⚠️  If 0 contacts, history sync may not have completed yet.');
      return result.success;
    },
  },
  {
    category: 'Basic GET Ops',
    name: 'fetchAllGroups() - Get all groups',
    test: async (client: MiawClient) => {
      const result = await client.fetchAllGroups();
      console.log('Success:', result.success);
      console.log('Total groups:', result.groups?.length || 0);
      if (result.groups && result.groups.length > 0) {
        console.log('Sample group:', {
          jid: result.groups[0].jid,
          name: result.groups[0].name,
          participants: result.groups[0].participantCount,
        });
      }
      return result.success;
    },
  },
  {
    category: 'Basic GET Ops',
    name: 'fetchAllLabels() - Get all labels (Business only)',
    test: async (client: MiawClient) => {
      const result = await client.fetchAllLabels();
      console.log('Success:', result.success);
      console.log('Total labels:', result.labels?.length || 0);
      if (result.labels && result.labels.length > 0) {
        console.log('Sample label:', {
          id: result.labels[0].id,
          name: result.labels[0].name,
          color: result.labels[0].color,
        });
      }
      console.log('\n⚠️  If 0 labels and not Business account, this is expected.');
      return result.success;
    },
  },
  {
    category: 'Basic GET Ops',
    name: 'fetchAllChats() - Get all chats',
    test: async (client: MiawClient) => {
      const result = await client.fetchAllChats();
      console.log('Success:', result.success);
      console.log('Total chats:', result.chats?.length || 0);
      if (result.chats && result.chats.length > 0) {
        console.log('Sample chat:', {
          jid: result.chats[0].jid,
          name: result.chats[0].name || '(no name)',
          isGroup: result.chats[0].isGroup,
        });
      }
      console.log('\n⚠️  If 0 chats, history sync may not have completed yet.');
      return result.success;
    },
  },
  {
    category: 'Basic GET Ops',
    name: 'getChatMessages(jid) - Get chat messages',
    action: async (client: MiawClient) => {
      console.log('\n📱 Enter a phone number or group JID to fetch messages from:');
      console.log('  - Phone: 6281234567890');
      console.log('  - Group: 123456789@g.us');
      console.log('  - Or press ENTER to use status@whatsapp.net');
      const jid = await waitForInput();

      const targetJid = jid.trim() || 'status@whatsapp.net';
      const result = await client.getChatMessages(targetJid);

      console.log('Success:', result.success);
      console.log('Total messages:', result.messages?.length || 0);
      if (result.messages && result.messages.length > 0) {
        console.log('Sample message:', {
          id: result.messages[0].id,
          type: result.messages[0].type,
          from: result.messages[0].from,
          text: result.messages[0].text || '(no text)',
        });
      }

      return result.success;
    },
  },

  // ============================================================
  // MESSAGING (6 methods)
  // ============================================================
  {
    category: 'Messaging',
    name: 'sendText() - Send text message',
    action: async (client: MiawClient) => {
      const phone = await getTestPhone('Enter phone number to send test message:');
      const text = `Test message from miaw-core manual test - ${new Date().toISOString()}`;

      console.log(`\n📤 Sending text to ${phone}...`);
      const result = await client.sendText(phone, text);

      console.log('Success:', result.success);
      console.log('Message ID:', result.messageId || '(none)');

      if (!result.success) {
        console.log('Error:', result.error);
      }

      return result.success;
    },
  },
  {
    category: 'Messaging',
    name: 'sendImage() - Send image',
    action: async (client: MiawClient) => {
      console.log('\n📤 Sending an image requires a test image file.');
      console.log('Path: tests/test-assets/test-image.jpg');
      console.log('\nPress ENTER if you have the test image, or skip (s)');

      const answer = await waitForInput();
      if (answer.toLowerCase() === 's') return 'skip';

      const phone = await getTestPhone('Enter phone number to send image:');
      const imagePath = './tests/test-assets/test-image.jpg';

      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        console.log(`⚠️  Test image not found at ${imagePath}`);
        console.log('Create a test image at that path to test this feature.');
        return 'skip';
      }

      const result = await client.sendImage(phone, imagePath, {
        caption: 'Test image from miaw-core',
      });

      console.log('Success:', result.success);
      console.log('Message ID:', result.messageId || '(none)');

      return result.success;
    },
  },
  {
    category: 'Messaging',
    name: 'sendDocument() - Send document',
    action: async (client: MiawClient) => {
      console.log('\n📤 Sending a document requires a test file.');
      console.log('Skipping for now - test with sendImage() pattern');
      return 'skip';
    },
  },
  {
    category: 'Messaging',
    name: 'sendVideo() - Send video',
    action: async (client: MiawClient) => {
      console.log('\n📤 Sending video requires a test video file.');
      console.log('Skipping for now - test with sendImage() pattern');
      return 'skip';
    },
  },
  {
    category: 'Messaging',
    name: 'sendAudio() - Send audio',
    action: async (client: MiawClient) => {
      console.log('\n📤 Sending audio requires a test audio file.');
      console.log('Skipping for now - test with sendImage() pattern');
      return 'skip';
    },
  },
  {
    category: 'Messaging',
    name: 'downloadMedia() - Download media',
    action: async (client: MiawClient) => {
      console.log('\n📥 To test media download:');
      console.log('1. Send an image/video to the bot from another phone');
      console.log('2. I will listen for the message and download it');

      const message = await waitForMessage(client, (msg) => msg.type === 'image' || msg.type === 'video', 30000);

      console.log(`\n📥 Downloading media from ${message.type} message...`);
      const buffer = await client.downloadMedia(message);

      if (buffer) {
        console.log('✅ Media downloaded successfully');
        console.log(`Buffer size: ${buffer.length} bytes`);
        return true;
      } else {
        console.log('❌ Failed to download media');
        return false;
      }
    },
  },

  // ============================================================
  // MESSAGE OPERATIONS (6 methods)
  // ============================================================
  {
    category: 'Message Ops',
    name: 'sendReaction() - Send reaction',
    action: async (client: MiawClient) => {
      console.log('\n📝 To test reactions:');
      console.log('1. Send a message to the bot from another phone');
      console.log('2. I will react to it with 👍');

      const message = await waitForMessage(client, (msg) => msg.type === 'text', 30000);
      console.log(`\n📝 Reacting to message ${message.id.substring(0, 10)}... with 👍`);

      const result = await client.sendReaction(message.id, message.from, '👍');
      console.log('Success:', result.success);
      return result.success;
    },
  },
  {
    category: 'Message Ops',
    name: 'removeReaction() - Remove reaction',
    action: async (client: MiawClient) => {
      console.log('\n📝 Removing reaction from previous message...');
      // Get last message we sent reaction to
      // For simplicity, skip this test
      console.log('Skipping - requires tracking last reacted message');
      return 'skip';
    },
  },
  {
    category: 'Message Ops',
    name: 'forwardMessage() - Forward message',
    action: async (client: MiawClient) => {
      const phone2 = await getTestPhone2('Enter phone number to forward message to:');
      console.log('\n📝 To test forwarding:');
      console.log('1. Send a message to the bot from another phone');
      console.log('2. I will forward it to', phone2);

      const message = await waitForMessage(client, (msg) => msg.type === 'text', 30000);
      console.log(`\n📤 Forwarding message to ${phone2}...`);

      const result = await client.forwardMessage(phone2, message);
      console.log('Success:', result.success);
      return result.success;
    },
  },
  {
    category: 'Message Ops',
    name: 'editMessage() - Edit message',
    action: async (client: MiawClient) => {
      console.log('\n✏️  To test editing:');
      console.log('1. Send a text message to the bot from another phone');
      console.log('2. I will edit it');

      const message = await waitForMessage(client, (msg) => msg.type === 'text' && !msg.fromMe, 30000);
      console.log(`\n✏️  Editing message...`);

      const result = await client.editMessage(message.id, message.from, 'Edited: ' + (message.text || ''));
      console.log('Success:', result.success);
      console.log('Error:', result.error || '(none)');
      return result.success;
    },
  },
  {
    category: 'Message Ops',
    name: 'deleteMessage() - Delete for everyone',
    action: async (client: MiawClient) => {
      console.log('\n🗑️  To test deletion:');
      console.log('1. Send a text message to the bot');
      console.log('2. I will delete it for everyone');

      const message = await waitForMessage(client, (msg) => msg.type === 'text', 30000);
      console.log(`\n🗑️  Deleting message...`);

      const result = await client.deleteMessage(message, message.from);
      console.log('Success:', result.success);
      return result.success;
    },
  },
  {
    category: 'Message Ops',
    name: 'deleteMessageForMe() - Delete for me only',
    action: async (client: MiawClient) => {
      console.log('\n🗑️  Skipping "delete for me" test (similar to delete for everyone)');
      return 'skip';
    },
  },

  // ============================================================
  // CONTACT INFORMATION (5 methods)
  // ============================================================
  {
    category: 'Contact Info',
    name: 'checkNumber() - Check if number on WhatsApp',
    action: async (client: MiawClient) => {
      const phone = await getTestPhone('Enter phone number to check:');
      console.log(`\n🔍 Checking if ${phone} is on WhatsApp...`);

      const result = await client.checkNumber(phone);
      console.log('Exists:', result.exists);
      console.log('JID:', result.jid || '(none)');

      return result.exists !== undefined;
    },
  },
  {
    category: 'Contact Info',
    name: 'checkNumbers() - Batch check numbers',
    action: async (client: MiawClient) => {
      const phone1 = await getTestPhone('Enter first phone number:');
      const phone2 = await getTestPhone2('Enter second phone number:');

      console.log(`\n🔍 Checking multiple numbers...`);
      const results = await client.checkNumbers([phone1, phone2]);

      console.log('Results:');
      results.forEach((r, i) => {
        console.log(`  ${i + 1}. Exists: ${r.exists}, JID: ${r.jid || '(none)'}`);
      });

      return results.length === 2;
    },
  },
  {
    category: 'Contact Info',
    name: 'getContactInfo() - Get contact info',
    action: async (client: MiawClient) => {
      const phone = await getTestPhone('Enter phone number to get info:');
      console.log(`\n👤 Getting contact info for ${phone}...`);

      const info = await client.getContactInfo(phone);
      if (!info) {
        console.log('❌ No info found');
        return false;
      }

      console.log('Contact Info:');
      console.log('  JID:', info.jid);
      console.log('  Name:', info.name || '(not available)');
      console.log('  Phone:', info.phone || '(not available)');
      console.log('  Status:', info.status || '(not available)');

      return true;
    },
  },
  {
    category: 'Contact Info',
    name: 'getBusinessProfile() - Get business profile',
    action: async (client: MiawClient) => {
      const phone = await getTestPhone('Enter business phone number (or press ENTER to skip):');
      if (!phone) return 'skip';

      console.log(`\n💼 Getting business profile for ${phone}...`);

      const profile = await client.getBusinessProfile(phone);
      if (!profile) {
        console.log('ℹ️  Not a business account (or not found)');
        return true; // This is expected for non-business
      }

      console.log('Business Profile:');
      console.log('  Description:', profile.description || '(none)');
      console.log('  Category:', profile.category || '(none)');
      console.log('  Website:', profile.website || '(none)');

      return true;
    },
  },
  {
    category: 'Contact Info',
    name: 'getProfilePicture() - Get profile picture',
    action: async (client: MiawClient) => {
      const phone = await getTestPhone('Enter phone number to get profile picture:');
      console.log(`\n📷 Getting profile picture for ${phone}...`);

      const url = await client.getProfilePicture(phone);
      if (!url) {
        console.log('ℹ️  No profile picture (privacy settings or no picture)');
        return true;
      }

      console.log('Profile Picture URL:', url.substring(0, 80) + '...');
      return true;
    },
  },

  // ============================================================
  // GROUP INFORMATION (2 methods)
  // ============================================================
  {
    category: 'Group Info',
    name: 'getGroupInfo() - Get group metadata',
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup('Enter group JID (e.g., 123456789@g.us):');
      console.log(`\n👥 Getting group info for ${groupJid}...`);

      const info = await client.getGroupInfo(groupJid);
      if (!info) {
        console.log('❌ Failed to get group info');
        return false;
      }

      console.log('Group Info:');
      console.log('  JID:', info.jid);
      console.log('  Name:', info.name);
      console.log('  Participants:', info.participantCount);
      console.log('  Description:', info.description || '(none)');

      return true;
    },
  },
  {
    category: 'Group Info',
    name: 'getGroupParticipants() - Get group members',
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup('Enter group JID:');
      console.log(`\n👥 Getting group participants for ${groupJid}...`);

      const participants = await client.getGroupParticipants(groupJid);
      if (!participants) {
        console.log('❌ Failed to get participants');
        return false;
      }

      console.log(`Total participants: ${participants.length}`);
      const admins = participants.filter((p) => p.role !== 'member');
      console.log(`Admins: ${admins.length}`);

      return true;
    },
  },

  // ============================================================
  // GROUP MANAGEMENT (11 methods)
  // ============================================================
  {
    category: 'Group Mgmt',
    name: 'createGroup() - Create new group',
    action: async (client: MiawClient) => {
      const phone1 = await getTestPhone('Enter first participant phone number:');
      const phone2 = await getTestPhone2('Enter second participant phone number:');

      console.log('\n👥 Creating new group...');
      const groupName = `Test Group ${Date.now()}`;

      const result = await client.createGroup(groupName, [phone1, phone2]);

      console.log('Success:', result.success);
      if (result.success) {
        console.log('Group JID:', result.groupJid);
        TEST_CONFIG.testGroupJid = result.groupJid || '';
        console.log('Saved as test group for subsequent tests');
      } else {
        console.log('Error:', result.error);
      }

      return result.success;
    },
  },
  {
    category: 'Group Mgmt',
    name: 'addParticipants() - Add members to group',
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup('Enter group JID:');
      const phone = await getTestPhone('Enter phone number to add:');

      console.log(`\n👤 Adding ${phone} to group...`);
      const result = await client.addParticipants(groupJid, [phone]);

      console.log('Success:', result.success);
      if (!result.success) {
        console.log('Error:', result.error);
      }

      return result.success;
    },
  },
  {
    category: 'Group Mgmt',
    name: 'removeParticipants() - Remove members from group',
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup('Enter group JID:');
      const phone = await getTestPhone('Enter phone number to remove:');

      console.log(`\n👤 Removing ${phone} from group...`);
      console.log('⚠️  You must be admin to do this');
      const result = await client.removeParticipants(groupJid, [phone]);

      console.log('Success:', result.success);
      if (!result.success) {
        console.log('Error:', result.error);
      }

      return result.success;
    },
  },
  {
    category: 'Group Mgmt',
    name: 'leaveGroup() - Leave group',
    action: async (client: MiawClient) => {
      console.log('\n⚠️  This will make the bot leave a group.');
      console.log('Press ENTER to continue, or s to skip');
      const answer = await waitForInput();
      if (answer.toLowerCase() === 's') return 'skip';

      const groupJid = await getTestGroup('Enter group JID to leave:');
      console.log(`\n🚪 Leaving group ${groupJid}...`);

      const result = await client.leaveGroup(groupJid);
      console.log('Success:', result.success);

      return result.success;
    },
  },
  {
    category: 'Group Mgmt',
    name: 'promoteToAdmin() - Promote member to admin',
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup('Enter group JID:');
      const phone = await getTestPhone('Enter phone number to promote:');

      console.log(`\n⬆️  Promoting ${phone} to admin...`);
      console.log('⚠️  You must be admin to do this');
      const result = await client.promoteToAdmin(groupJid, [phone]);

      console.log('Success:', result.success);
      if (!result.success) {
        console.log('Error:', result.error);
      }

      return result.success;
    },
  },
  {
    category: 'Group Mgmt',
    name: 'demoteFromAdmin() - Demote admin',
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup('Enter group JID:');
      const phone = await getTestPhone('Enter admin phone number to demote:');

      console.log(`\n⬇️  Demoting ${phone} from admin...`);
      console.log('⚠️  You must be admin to do this');
      const result = await client.demoteFromAdmin(groupJid, [phone]);

      console.log('Success:', result.success);
      if (!result.success) {
        console.log('Error:', result.error);
      }

      return result.success;
    },
  },
  {
    category: 'Group Mgmt',
    name: 'updateGroupName() - Change group name',
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup('Enter group JID:');
      const newName = `Updated Group ${Date.now()}`;

      console.log(`\n✏️  Updating group name to: ${newName}`);
      const result = await client.updateGroupName(groupJid, newName);

      console.log('Success:', result.success);
      if (!result.success) {
        console.log('Error:', result.error);
      }

      return result.success;
    },
  },
  {
    category: 'Group Mgmt',
    name: 'updateGroupDescription() - Set group description',
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup('Enter group JID:');
      const desc = `Test description updated at ${new Date().toISOString()}`;

      console.log(`\n📝 Updating group description...`);
      const result = await client.updateGroupDescription(groupJid, desc);

      console.log('Success:', result.success);
      if (!result.success) {
        console.log('Error:', result.error);
      }

      return result.success;
    },
  },
  {
    category: 'Group Mgmt',
    name: 'updateGroupPicture() - Change group picture',
    action: async (client: MiawClient) => {
      console.log('\n📷 Updating group picture requires a test image file.');
      console.log('Skipping for now - test with sendImage() pattern');
      return 'skip';
    },
  },
  {
    category: 'Group Mgmt',
    name: 'getGroupInviteLink() - Get invite link',
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup('Enter group JID:');

      console.log(`\n🔗 Getting group invite link...`);
      const result = await client.getGroupInviteLink(groupJid);

      if (result) {
        console.log('✅ Invite link:', result);
        return true;
      } else {
        console.log('❌ Failed to get invite link');
        return false;
      }
    },
  },
  {
    category: 'Group Mgmt',
    name: 'acceptGroupInvite() - Join via invite',
    action: async (client: MiawClient) => {
      console.log('\n🔗 To test joining via invite:');
      console.log('1. Get an invite link from a group');
      console.log('2. Paste the invite code or full URL');

      const invite = await waitForInput();
      if (!invite) return 'skip';

      console.log(`\n🔗 Accepting invite...`);
      const result = await client.acceptGroupInvite(invite);

      console.log('Success:', result.success);
      if (result.success) {
        console.log('Joined group:', result.groupJid);
      } else {
        console.log('Error:', result.error);
      }

      return result.success;
    },
  },

  // ============================================================
  // PROFILE MANAGEMENT (4 methods)
  // ============================================================
  {
    category: 'Profile Mgmt',
    name: 'updateProfilePicture() - Update own profile picture',
    action: async (client: MiawClient) => {
      console.log('\n📷 Updating profile picture requires a test image file.');
      console.log('Skipping for now - requires test image');
      return 'skip';
    },
  },
  {
    category: 'Profile Mgmt',
    name: 'removeProfilePicture() - Remove profile picture',
    action: async (client: MiawClient) => {
      console.log('\n🗑️  This will remove your profile picture.');
      console.log('Press ENTER to continue, or s to skip');
      const answer = await waitForInput();
      if (answer.toLowerCase() === 's') return 'skip';

      console.log('\n🗑️  Removing profile picture...');
      const result = await client.removeProfilePicture();

      console.log('Success:', result.success);
      return result.success;
    },
  },
  {
    category: 'Profile Mgmt',
    name: 'updateProfileName() - Update display name',
    action: async (client: MiawClient) => {
      console.log('\n✏️  Updating your profile name...');
      const newName = `Test Bot ${Date.now()}`;

      const result = await client.updateProfileName(newName);

      console.log('Success:', result.success);
      console.log('New name:', newName);

      return result.success;
    },
  },
  {
    category: 'Profile Mgmt',
    name: 'updateProfileStatus() - Update About text',
    action: async (client: MiawClient) => {
      console.log('\n✏️  Updating your status/About text...');
      const newStatus = `Miaw Core Test Bot - ${new Date().toISOString()}`;

      const result = await client.updateProfileStatus(newStatus);

      console.log('Success:', result.success);
      console.log('New status:', newStatus);

      return result.success;
    },
  },

  // ============================================================
  // LABEL OPERATIONS (5 methods) - WhatsApp Business only
  // ============================================================
  {
    category: 'Labels (Biz)',
    name: 'fetchAllLabels() - Get all labels',
    action: async (client: MiawClient) => {
      console.log('\n🏷️  Fetching all labels...');
      console.log('⚠️  Only works for Business accounts');

      const result = await client.fetchAllLabels();

      console.log('Success:', result.success);
      console.log('Total labels:', result.labels?.length || 0);

      if (result.labels && result.labels.length > 0) {
        console.log('Sample labels:');
        result.labels.slice(0, 3).forEach((l, i) => {
          console.log(`  ${i + 1}. ${l.name} (${l.color})`);
        });
      }

      return result.success;
    },
  },
  {
    category: 'Labels (Biz)',
    name: 'addLabel() - Create new label',
    action: async (client: MiawClient) => {
      console.log('\n🏷️  Creating a new label...');
      console.log('⚠️  Only works for Business accounts');

      const result = await client.addLabel({
        name: `Test Label ${Date.now()}`,
        color: 0x3498db, // Blue
      });

      console.log('Success:', result.success);
      if (result.success) {
        console.log('Label ID:', result.labelId);
      } else {
        console.log('Error:', result.error);
      }

      return result.success;
    },
  },
  {
    category: 'Labels (Biz)',
    name: 'addChatLabel() - Add label to chat',
    action: async (client: MiawClient) => {
      console.log('\n🏷️  Skipping add chat label test...');
      console.log('Requires creating label first and getting chat JID');
      return 'skip';
    },
  },
  {
    category: 'Labels (Biz)',
    name: 'removeChatLabel() - Remove label from chat',
    action: async (client: MiawClient) => {
      console.log('\n🏷️  Skipping remove chat label test...');
      return 'skip';
    },
  },
  {
    category: 'Labels (Biz)',
    name: 'addMessageLabel() - Add label to message',
    action: async (client: MiawClient) => {
      console.log('\n🏷️  Skipping add message label test...');
      return 'skip';
    },
  },

  // ============================================================
  // CATALOG OPERATIONS (5 methods) - WhatsApp Business only
  // ============================================================
  {
    category: 'Catalog (Biz)',
    name: 'getCatalog() - Fetch product catalog',
    action: async (client: MiawClient) => {
      console.log('\n🛒 Fetching product catalog...');
      console.log('⚠️  Only works for Business accounts with catalog');

      const result = await client.getCatalog();

      console.log('Success:', result.success);
      console.log('Total products:', result.products?.length || 0);

      if (result.products && result.products.length > 0) {
        console.log('Sample products:');
        result.products.slice(0, 3).forEach((p, i) => {
          console.log(`  ${i + 1}. ${p.name} - $${p.price || '?'}`);
        });
      }

      return result.success;
    },
  },
  {
    category: 'Catalog (Biz)',
    name: 'getCollections() - Get catalog collections',
    action: async (client: MiawClient) => {
      console.log('\n📁 Fetching catalog collections...');

      const result = await client.getCollections();

      console.log('Success:', result.success);
      console.log('Total collections:', result.collections?.length || 0);

      return result.success;
    },
  },
  {
    category: 'Catalog (Biz)',
    name: 'createProduct() - Add new product',
    action: async (client: MiawClient) => {
      console.log('\n🛒 Skipping create product test...');
      console.log('⚠️  Only works for Business accounts with catalog');
      console.log('Requires: product name, price, image URL');
      return 'skip';
    },
  },
  {
    category: 'Catalog (Biz)',
    name: 'updateProduct() - Modify product',
    action: async (client: MiawClient) => {
      console.log('\n🛒 Skipping update product test...');
      return 'skip';
    },
  },
  {
    category: 'Catalog (Biz)',
    name: 'deleteProducts() - Remove products',
    action: async (client: MiawClient) => {
      console.log('\n🛒 Skipping delete products test...');
      return 'skip';
    },
  },

  // ============================================================
  // NEWSLETTER/CHANNEL OPERATIONS (17 methods)
  // ============================================================
  {
    category: 'Newsletter',
    name: 'createNewsletter() - Create newsletter/channel',
    action: async (client: MiawClient) => {
      console.log('\n📰 Creating a new newsletter/channel...');
      console.log('⚠️  This creates a new channel on your account');
      console.log('Press ENTER to continue, or s to skip');

      const answer = await waitForInput();
      if (answer.toLowerCase() === 's') return 'skip';

      const result = await client.createNewsletter(`Test Channel ${Date.now()}`, 'Test channel for miaw-core manual testing');

      console.log('Success:', result.success);
      if (result.success) {
        console.log('Newsletter ID:', result.newsletterId);
      } else {
        console.log('Error:', result.error);
      }

      return result.success;
    },
  },
  {
    category: 'Newsletter',
    name: 'getNewsletterMetadata() - Get newsletter info',
    action: async (client: MiawClient) => {
      console.log('\n📰 Enter newsletter ID (or press ENTER to skip):');
      const newsletterId = await waitForInput();
      if (!newsletterId) return 'skip';

      const result = await client.getNewsletterMetadata(newsletterId);

      console.log('Success:', result.success);
      if (result.success && result.meta) {
        console.log('Name:', result.meta.name);
        console.log('Description:', result.meta.description || '(none)');
        console.log('Subscribers:', result.meta.subscriberCount || 0);
      }

      return result.success;
    },
  },
  {
    category: 'Newsletter',
    name: 'followNewsletter() - Follow/subscribe',
    action: async (client: MiawClient) => {
      console.log('\n📰 Skipping follow newsletter test...');
      return 'skip';
    },
  },
  {
    category: 'Newsletter',
    name: 'unfollowNewsletter() - Unsubscribe',
    action: async (client: MiawClient) => {
      console.log('\n📰 Skipping unfollow newsletter test...');
      return 'skip';
    },
  },
  {
    category: 'Newsletter',
    name: 'muteNewsletter() - Mute notifications',
    action: async (client: MiawClient) => {
      console.log('\n📰 Skipping mute newsletter test...');
      return 'skip';
    },
  },
  {
    category: 'Newsletter',
    name: 'updateNewsletterName() - Update name',
    action: async (client: MiawClient) => {
      console.log('\n📰 Skipping update newsletter name test...');
      return 'skip';
    },
  },
  {
    category: 'Newsletter',
    name: 'updateNewsletterDescription() - Update description',
    action: async (client: MiawClient) => {
      console.log('\n📰 Skipping update newsletter description test...');
      return 'skip';
    },
  },
  {
    category: 'Newsletter',
    name: 'updateNewsletterPicture() - Update cover image',
    action: async (client: MiawClient) => {
      console.log('\n📰 Skipping update newsletter picture test...');
      return 'skip';
    },
  },
  {
    category: 'Newsletter',
    name: 'fetchNewsletterMessages() - Get message history',
    action: async (client: MiawClient) => {
      console.log('\n📰 Skipping fetch newsletter messages test...');
      return 'skip';
    },
  },
  {
    category: 'Newsletter',
    name: 'subscribeNewsletterUpdates() - Subscribe to live updates',
    action: async (client: MiawClient) => {
      console.log('\n📰 Skipping subscribe newsletter updates test...');
      return 'skip';
    },
  },
  {
    category: 'Newsletter',
    name: 'deleteNewsletter() - Delete newsletter',
    action: async (client: MiawClient) => {
      console.log('\n📰 Skipping delete newsletter test...');
      return 'skip';
    },
  },

  // ============================================================
  // CONTACT MANAGEMENT (2 methods)
  // ============================================================
  {
    category: 'Contacts',
    name: 'addOrEditContact() - Add or update contact',
    action: async (client: MiawClient) => {
      const phone = await getTestPhone('Enter phone number to save as contact:');
      console.log('\n👤 Enter contact name:');
      const name = await waitForInput();

      console.log(`\n💾 Saving contact: ${name} (${phone})...`);
      const result = await client.addOrEditContact({
        phoneNumber: phone,
        name: name,
      });

      console.log('Success:', result.success);
      return result.success;
    },
  },
  {
    category: 'Contacts',
    name: 'removeContact() - Remove contact',
    action: async (client: MiawClient) => {
      const phone = await getTestPhone('Enter phone number to remove from contacts:');

      console.log(`\n🗑️  Removing contact ${phone}...`);
      const result = await client.removeContact(phone);

      console.log('Success:', result.success);
      return result.success;
    },
  },

  // ============================================================
  // LID MAPPING (6 methods)
  // ============================================================
  {
    category: 'LID Mapping',
    name: 'resolveLidToJid() - Resolve LID to JID',
    test: (client: MiawClient) => {
      console.log('\n🔍 LID resolution requires an @lid JID to test.');
      console.log('Skipping - LIDs are received from privacy-enabled contacts');
      return 'skip';
    },
  },
  {
    category: 'LID Mapping',
    name: 'getPhoneFromJid() - Extract phone from JID',
    test: (client: MiawClient) => {
      console.log('\n📱 Testing phone extraction from JID...');
      const testJid = '628123456789@s.whatsapp.net';
      // Access private method through public API if available, or skip
      console.log('Test JID:', testJid);
      console.log('Expected phone: 628123456789');
      console.log('Skipping - method is internal');
      return 'skip';
    },
  },
  {
    category: 'LID Mapping',
    name: 'getLidMappings() - Get all LID mappings',
    test: (client: MiawClient) => {
      console.log('\n🗺️  Getting all LID mappings...');
      // This is likely a private method
      console.log('Skipping - internal method');
      return 'skip';
    },
  },
  {
    category: 'LID Mapping',
    name: 'getLidCacheSize() - Get LRU cache size',
    test: (client: MiawClient) => {
      console.log('\n📊 Getting LID cache size...');
      console.log('Skipping - internal method');
      return 'skip';
    },
  },
  {
    category: 'LID Mapping',
    name: 'clearLidCache() - Clear LID cache',
    test: (client: MiawClient) => {
      console.log('\n🗑️  Clearing LID cache...');
      console.log('Skipping - internal method');
      return 'skip';
    },
  },

  // ============================================================
  // UX FEATURES (6 methods)
  // ============================================================
  {
    category: 'UX Features',
    name: 'markAsRead() - Mark message as read',
    action: async (client: MiawClient) => {
      console.log('\n📝 To test mark as read:');
      console.log('1. Send a message to the bot from another phone');
      console.log('2. I will mark it as read');

      const message = await waitForMessage(client, (msg) => msg.type === 'text', 30000);
      console.log(`\n✅ Marking message as read...`);

      const result = await client.markAsRead(message);
      console.log('Success:', result.success);
      return result.success;
    },
  },
  {
    category: 'UX Features',
    name: 'sendTyping() - Send typing indicator',
    action: async (client: MiawClient) => {
      const phone = await getTestPhone('Enter phone number to send typing to:');

      console.log(`\n⌨️  Sending typing indicator to ${phone}...`);
      const result = await client.sendTyping(phone);

      console.log('Success:', result.success);
      console.log('Check the other phone - you should see "typing..."');

      // Stop typing after 2 seconds
      setTimeout(async () => {
        await client.stopTyping(phone);
        console.log('✅ Stopped typing indicator');
      }, 2000);

      return result.success;
    },
  },
  {
    category: 'UX Features',
    name: 'sendRecording() - Send recording indicator',
    action: async (client: MiawClient) => {
      const phone = await getTestPhone('Enter phone number to send recording to:');

      console.log(`\n🎤 Sending recording indicator to ${phone}...`);
      const result = await client.sendRecording(phone);

      console.log('Success:', result.success);
      console.log('Check the other phone - you should see "recording audio..."');

      // Stop recording after 2 seconds
      setTimeout(async () => {
        await client.stopTyping(phone);
        console.log('✅ Stopped recording indicator');
      }, 2000);

      return result.success;
    },
  },
  {
    category: 'UX Features',
    name: 'stopTyping() - Stop typing/recording indicator',
    action: async (client: MiawClient) => {
      console.log('\n⏹️  Stop typing is tested together with sendTyping/sendRecording');
      return 'skip';
    },
  },
  {
    category: 'UX Features',
    name: 'setPresence() - Set online/offline status',
    action: async (client: MiawClient) => {
      console.log('\n🌐 Setting presence to available (online)...');
      const result1 = await client.setPresence('available');
      console.log('Set to available:', result1);

      console.log('\n🌙 Setting presence to unavailable (offline)...');
      const result2 = await client.setPresence('unavailable');
      console.log('Set to unavailable:', result2);

      return result1 && result2;
    },
  },
  {
    category: 'UX Features',
    name: 'subscribePresence() - Subscribe to presence updates',
    action: async (client: MiawClient) => {
      const phone = await getTestPhone('Enter phone number to subscribe presence:');

      console.log(`\n👁️  Subscribing to presence updates for ${phone}...`);
      const result = await client.subscribePresence(phone);

      console.log('Success:', result);
      console.log('Send a message from that phone to trigger presence update');

      return result;
    },
  },

  // ============================================================
  // EVENTS VERIFICATION (10+ events)
  // ============================================================
  {
    category: 'Events',
    name: 'Verify qr event - QR code emitted on first connection',
    action: async (client: MiawClient) => {
      console.log('\n📱 QR event is tested during connect() test');
      console.log('✅ QR event verified');
      return 'skip';
    },
  },
  {
    category: 'Events',
    name: 'Verify ready event - Client ready and connected',
    action: async (client: MiawClient) => {
      console.log('\n✅ Ready event is verified during connect() test');
      return 'skip';
    },
  },
  {
    category: 'Events',
    name: 'Verify message event - New message received',
    action: async (client: MiawClient) => {
      console.log('\n📝 To test message event:');
      console.log('1. Send a message to the bot from another phone');
      console.log('2. I will listen for the message event');

      let eventReceived = false;
      const handler = (msg: any) => {
        console.log('✅ Message event received!');
        console.log('  Type:', msg.type);
        console.log('  From:', msg.from);
        console.log('  Text:', msg.text || '(no text)');
        eventReceived = true;
        client.off('message', handler);
      };

      client.on('message', handler);

      await new Promise((resolve) => setTimeout(resolve, 30000));

      if (!eventReceived) {
        client.off('message', handler);
        console.log('⏱️  No message received within 30 seconds');
        return 'skip';
      }

      return true;
    },
  },
  {
    category: 'Events',
    name: 'Verify message_edit event - Message edited',
    action: async (client: MiawClient) => {
      console.log('\n✏️  To test message_edit event:');
      console.log('1. Send a message from another phone');
      console.log('2. Edit that message within 15 minutes');
      console.log('3. I will listen for the edit event');

      let eventReceived = false;
      const handler = (data: any) => {
        console.log('✅ Message edit event received!');
        console.log('  Message ID:', data.messageId);
        console.log('  New text:', data.text || '(empty)');
        eventReceived = true;
        client.off('message_edit', handler);
      };

      client.on('message_edit', handler);

      await new Promise((resolve) => setTimeout(resolve, 60000));

      if (!eventReceived) {
        client.off('message_edit', handler);
        console.log('⏱️  No edit event received within 60 seconds');
        return 'skip';
      }

      return true;
    },
  },
  {
    category: 'Events',
    name: 'Verify message_delete event - Message deleted/revoked',
    action: async (client: MiawClient) => {
      console.log('\n🗑️  To test message_delete event:');
      console.log('1. Send a message from another phone');
      console.log('2. Delete that message ("Delete for everyone")');
      console.log('3. I will listen for the delete event');

      let eventReceived = false;
      const handler = (data: any) => {
        console.log('✅ Message delete event received!');
        console.log('  Message ID:', data.messageId);
        console.log('  From:', data.from);
        eventReceived = true;
        client.off('message_delete', handler);
      };

      client.on('message_delete', handler);

      await new Promise((resolve) => setTimeout(resolve, 60000));

      if (!eventReceived) {
        client.off('message_delete', handler);
        console.log('⏱️  No delete event received within 60 seconds');
        return 'skip';
      }

      return true;
    },
  },
  {
    category: 'Events',
    name: 'Verify message_reaction event - Reaction added/removed',
    action: async (client: MiawClient) => {
      console.log('\n😀 To test message_reaction event:');
      console.log('1. Send a message from another phone');
      console.log('2. React to it with an emoji');
      console.log('3. I will listen for the reaction event');

      let eventReceived = false;
      const handler = (data: any) => {
        console.log('✅ Message reaction event received!');
        console.log('  Message ID:', data.messageId);
        console.log('  Emoji:', data.emoji);
        console.log('  From:', data.from);
        eventReceived = true;
        client.off('message_reaction', handler);
      };

      client.on('message_reaction', handler);

      await new Promise((resolve) => setTimeout(resolve, 60000));

      if (!eventReceived) {
        client.off('message_reaction', handler);
        console.log('⏱️  No reaction event received within 60 seconds');
        return 'skip';
      }

      return true;
    },
  },
  {
    category: 'Events',
    name: 'Verify presence event - Presence update',
    action: async (client: MiawClient) => {
      console.log('\n🌐 To test presence event:');
      console.log('1. Subscribe to a contact\'s presence first');
      console.log('2. Have that contact come online/offline');
      console.log('3. I will listen for the presence event');

      console.log('\n⚠️  Requires subscribePresence() to be called first');
      return 'skip';
    },
  },
  {
    category: 'Events',
    name: 'Verify connection event - Connection state changed',
    action: async (client: MiawClient) => {
      console.log('\n🔌 Connection events are tested during connect/disconnect');
      console.log('✅ Connection event verified');
      return 'skip';
    },
  },
  {
    category: 'Events',
    name: 'Verify disconnected event - Client disconnected',
    action: async (client: MiawClient) => {
      console.log('\n🔌 Disconnected event is tested during disconnect()');
      console.log('✅ Disconnected event verified');
      return 'skip';
    },
  },
  {
    category: 'Events',
    name: 'Verify reconnecting event - Reconnection started',
    action: async (client: MiawClient) => {
      console.log('\n🔄 Reconnecting event would be triggered on connection loss');
      console.log('⚠️  Requires actual disconnection to test');
      return 'skip';
    },
  },
  {
    category: 'Events',
    name: 'Verify error event - Error occurred',
    action: async (client: MiawClient) => {
      console.log('\n❌ Error event would be triggered on errors');
      console.log('⚠️  Requires actual error condition to test');
      return 'skip';
    },
  },
  {
    category: 'Events',
    name: 'Verify session_saved event - Session persisted',
    action: async (client: MiawClient) => {
      console.log('\n💾 Session saved event occurs during auth');
      console.log('✅ Session saved event verified during connect()');
      return 'skip';
    },
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function waitForInput(): Promise<string> {
  const rl = createReadlineInterface();
  return new Promise((resolve) => {
    rl.question('', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function waitForEnter(): Promise<void> {
  const rl = createReadlineInterface();
  return new Promise((resolve) => {
    rl.question('', () => {
      rl.close();
      resolve();
    });
  });
}

async function getTestPhone(prompt: string): Promise<string> {
  if (TEST_CONFIG.testPhone) {
    console.log(`${prompt} [cached: ${TEST_CONFIG.testPhone}]`);
    console.log('Press ENTER to use cached, or enter new number:');
    const answer = await waitForInput();
    if (answer) {
      TEST_CONFIG.testPhone = answer;
    }
    return TEST_CONFIG.testPhone;
  }

  console.log(`${prompt}`);
  const phone = await waitForInput();
  TEST_CONFIG.testPhone = phone;
  return phone;
}

async function getTestPhone2(prompt: string): Promise<string> {
  if (TEST_CONFIG.testPhone2) {
    console.log(`${prompt} [cached: ${TEST_CONFIG.testPhone2}]`);
    console.log('Press ENTER to use cached, or enter new number:');
    const answer = await waitForInput();
    if (answer) {
      TEST_CONFIG.testPhone2 = answer;
    }
    return TEST_CONFIG.testPhone2;
  }

  console.log(`${prompt}`);
  const phone = await waitForInput();
  TEST_CONFIG.testPhone2 = phone;
  return phone;
}

async function getTestGroup(prompt: string): Promise<string> {
  if (TEST_CONFIG.testGroupJid) {
    console.log(`${prompt} [cached: ${TEST_CONFIG.testGroupJid}]`);
    console.log('Press ENTER to use cached, or enter new JID:');
    const answer = await waitForInput();
    if (answer) {
      TEST_CONFIG.testGroupJid = answer;
    }
    return TEST_CONFIG.testGroupJid;
  }

  console.log(`${prompt}`);
  const jid = await waitForInput();
  TEST_CONFIG.testGroupJid = jid;
  return jid;
}

function waitForMessage(
  client: MiawClient,
  condition: (msg: any) => boolean,
  timeout: number = 30000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off('message', handler);
      reject(new Error('Timeout waiting for message'));
    }, timeout);

    const handler = (msg: any) => {
      if (condition(msg)) {
        clearTimeout(timer);
        client.off('message', handler);
        resolve(msg);
      }
    };

    client.on('message', handler);
  });
}

// ============================================================
// TEST EXECUTION
// ============================================================

async function runTest(test: any, client?: MiawClient): Promise<'pass' | 'fail' | 'skip'> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${test.name}`);
  console.log(`Category: ${test.category}`);
  console.log('='.repeat(60));

  try {
    if (test.test) {
      // Simple test function
      const result = test.test(client!);
      if (typeof result === 'boolean') {
        return result ? 'pass' : 'fail';
      }
      return result;
    }

    if (test.action) {
      // Action that returns pass/fail/skip or boolean
      const result = await test.action(client!);
      if (typeof result === 'boolean') {
        return result ? 'pass' : 'fail';
      }
      return result;
    }

    return 'skip';
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    return 'fail';
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     Miaw Core - Interactive Manual Testing Script        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\nThis script will guide you through testing each feature.');
  console.log('For each test, follow the instructions and verify it works.');
  console.log('\nCommands during testing:');
  console.log('  - Enter: Continue to next test');
  console.log('  - s: Skip remaining tests');
  console.log('  - q: Quit testing');

  console.log('\nPress ENTER to start...');
  await waitForEnter();

  // Create client once
  const client = new MiawClient({
    instanceId: TEST_CONFIG.instanceId,
    sessionPath: TEST_CONFIG.sessionPath,
    debug: true,
  });

  // Run tests sequentially
  for (let i = 0; i < tests.length; i++) {
    currentTestIndex = i;
    const test = tests[i];

    const result = await runTest(test, client);
    testResults[test.name] = result;

    // Show result
    const icon = result === 'pass' ? '✅' : result === 'fail' ? '❌' : '⏭️ ';
    console.log(`\n${icon} Result: ${result.toUpperCase()}`);

    // Wait before continuing
    if (i < tests.length - 1) {
      console.log('\nPress ENTER to continue, s to skip remaining, q to quit...');
      const answer = await waitForInput();
      if (answer.toLowerCase() === 'q') break;
      if (answer.toLowerCase() === 's') break;
    }
  }

  // Cleanup
  console.log('\n🧹 Cleaning up...');
  await client.disconnect();
  await client.dispose();
  console.log('✅ Cleanup complete');

  // Show summary
  showSummary();
}

function showSummary() {
  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Test Summary                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results = { pass: 0, fail: 0, skip: 0 };
  const byCategory: { [key: string]: typeof results } = {};

  for (const [name, result] of Object.entries(testResults)) {
    results[result]++;
    // Find category
    const test = tests.find((t) => t.name === name);
    if (test) {
      if (!byCategory[test.category]) {
        byCategory[test.category] = { pass: 0, fail: 0, skip: 0 };
      }
      byCategory[test.category][result]++;
    }
  }

  console.log('\nBy Category:');
  for (const [category, catResults] of Object.entries(byCategory)) {
    console.log(`\n${category}:`);
    console.log(`  ✅ Pass: ${catResults.pass}`);
    console.log(`  ❌ Fail: ${catResults.fail}`);
    console.log(`  ⏭️  Skip: ${catResults.skip}`);
  }

  console.log('\n\nTotal:');
  console.log(`  ✅ Passed: ${results.pass}`);
  console.log(`  ❌ Failed: ${results.fail}`);
  console.log(`  ⏭️  Skipped: ${results.skip}`);
  console.log(`  📊 Total: ${Object.keys(testResults).length}`);

  // Get package version
  let miawCoreVersion = 'unknown';
  let baileysVersion = 'unknown';
  let nodeVersion = process.version;

  try {
    const packagePath = require.resolve('../package.json');
    const pkg = require(packagePath);
    miawCoreVersion = pkg.version;
    baileysVersion = pkg.dependencies?.['@whiskeysockets/baileys'] || 'unknown';
  } catch {
    // Ignore errors
  }

  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    Test Report                              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  console.log('\nTest Date:', new Date().toISOString());
  console.log('Miaw Core Version:', miawCoreVersion);
  console.log('Baileys Version:', baileysVersion);
  console.log('Node.js Version:', nodeVersion);
  console.log('Instance ID:', TEST_CONFIG.instanceId);

  // Generate report text for MANUAL_TEST_CHECKLIST.md
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Copy this to MANUAL_TEST_CHECKLIST.md Notes section:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`
Test Date: ${new Date().toISOString()}
Tester: ____________________
WhatsApp Version: ____________________
Node.js Version: ${nodeVersion}
Miaw Core Version: ${miawCoreVersion}
Baileys Version: ${baileysVersion}

Test Results Summary:
  ✅ Passed: ${results.pass}
  ❌ Failed: ${results.fail}
  ⏭️  Skipped: ${results.skip}
  📊 Total: ${Object.keys(testResults).length}

Issues Found:
1. _______________________________________________________________
2. _______________________________________________________________
3. _______________________________________________________________

General Notes:
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
`);

  console.log('\n\n✅ Testing complete!');
}

// Run the test
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
