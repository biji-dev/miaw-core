#!/usr/bin/env node
/**
 * Interactive Manual Testing Script for miaw-core
 *
 * This script guides you through testing each feature one by one.
 * Run it from the miaw-core directory after building:
 *
 *   npm run test:manual [group]
 *
 * Arguments:
 *   (none)      - Show available test groups and help
 *   all         - Run all tests interactively
 *   core        - Run Core Client tests
 *   get         - Run Basic GET Operations tests
 *   messaging   - Run Messaging tests (send, react, forward, edit, delete)
 *   contacts    - Run Contact tests (check, info, add, remove)
 *   group       - Run Group Management tests
 *   profile     - Run Profile Management tests
 *   business    - Run Business tests (labels + catalog)
 *   newsletter  - Run Newsletter tests
 *   ux          - Run UX Features tests
 *
 * Environment variables (from .env file):
 *   DEBUG=true    - Enable verbose Baileys logging
 */

import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import qrcode from "qrcode-terminal";
import { MiawClient } from "../src";

// CLI argument mapping to category names
const CATEGORY_MAP: { [key: string]: string[] } = {
  core: ["Core Client"],
  get: ["Basic GET Ops"],
  messaging: ["Messaging"],
  contacts: ["Contacts"],
  group: ["Group Mgmt"],
  profile: ["Profile Mgmt"],
  business: ["Business"],
  newsletter: ["Newsletter"],
  ux: ["UX Features"],
};

// Get CLI argument
const cliArg = process.argv[2]?.toLowerCase() || "";

// Load environment variables from .env and .env.test files
dotenv.config(); // Load .env first
dotenv.config({ path: ".env.test" }); // Then load .env.test (won't override existing)

// Debug mode from environment (default: false for cleaner output)
const DEBUG_MODE = process.env.DEBUG === "true";

// Suppress console output from libsignal/Baileys internals when not in debug mode
if (!DEBUG_MODE) {
  const originalConsoleLog = console.log;
  const originalConsoleDebug = console.debug;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;

  // Filter out noisy internal logs (SessionEntry, signal protocol, etc.)
  const noisyStringPatterns = [
    /^Closing session/,
    /^SessionEntry/,
    /^_chains:/,
    /registrationId:/,
    /currentRatchet:/,
    /ephemeralKeyPair:/,
    /lastRemoteEphemeralKey:/,
    /previousCounter:/,
    /rootKey:/,
    /indexInfo:/,
    /baseKey:/,
    /baseKeyType:/,
    /remoteIdentityKey:/,
    /<Buffer/,
    /pendingPreKey:/,
    /signedKeyId:/,
    /preKeyId:/,
    /chainKey:/,
    /chainType:/,
    /messageKeys:/,
  ];

  // Check if an object looks like a SessionEntry or signal protocol internal
  const isNoisyObject = (obj: unknown): boolean => {
    if (typeof obj !== "object" || obj === null) return false;
    // SessionEntry objects
    if ("_chains" in obj || "registrationId" in obj || "currentRatchet" in obj)
      return true;
    if ("pendingPreKey" in obj || "indexInfo" in obj) return true;
    // Check constructor name
    if (obj.constructor?.name === "SessionEntry") return true;
    return false;
  };

  // Helper to check if any argument is noisy
  const hasNoisyArg = (args: unknown[]): boolean => {
    for (const arg of args) {
      // Check string arguments
      if (typeof arg === "string") {
        if (noisyStringPatterns.some((pattern) => pattern.test(arg))) {
          return true;
        }
      }
      // Check object arguments
      if (isNoisyObject(arg)) {
        return true;
      }
    }
    return false;
  };

  console.log = (...args: unknown[]) => {
    if (hasNoisyArg(args)) return;
    originalConsoleLog.apply(console, args);
  };

  console.warn = (...args: unknown[]) => {
    if (hasNoisyArg(args)) return;
    originalConsoleWarn.apply(console, args);
  };

  console.info = (...args: unknown[]) => {
    if (hasNoisyArg(args)) return;
    originalConsoleInfo.apply(console, args);
  };

  console.debug = (...args: unknown[]) => {
    // Suppress all debug logs when not in debug mode
    if (!DEBUG_MODE) return;
    originalConsoleDebug.apply(console, args);
  };
}

// Test configuration - load defaults from .env.test
const TEST_CONFIG = {
  instanceId: process.env.TEST_INSTANCE_ID || "manual-test-bot",
  sessionPath: process.env.TEST_SESSION_PATH || "./test-sessions-manual",
  // Pre-load from .env.test, user can override during testing
  testPhone: process.env.TEST_CONTACT_PHONE_A || "",
  testPhone2: process.env.TEST_CONTACT_PHONE_B || "",
  testGroupJid: process.env.TEST_GROUP_JID || "",
  // Detected account type
  isBusiness: false,
  accountPhone: "",
  // Last created label (for addChatLabel test)
  lastCreatedLabelId: "",
  // Last created product (for catalog tests)
  lastCreatedProductId: "",
};

// Test results tracking
const testResults: { [key: string]: "pass" | "fail" | "skip" } = {};

// Test interface with optional businessOnly flag
interface TestItem {
  category: string;
  name: string;
  test?: (client: MiawClient) => boolean | string | Promise<boolean | string>;
  action?: (client: MiawClient) => boolean | string | Promise<boolean | string>;
  businessOnly?: boolean; // Skip for personal accounts
}

// All tests organized by category
const tests: TestItem[] = [
  // ============================================================
  // PREREQUISITES
  // ============================================================
  {
    category: "Prerequisites",
    name: "Test Bot Setup",
    action: async () => {
      console.log("\n📱 ACTION REQUIRED:");
      console.log("1. Make sure you have a test WhatsApp account ready");
      console.log("2. I will now connect and show you a QR code");
      console.log("3. Scan the QR code with your WhatsApp");
      console.log("\nPress ENTER when ready to connect...");
      await waitForEnter();
      return true;
    },
  },

  // ============================================================
  // CORE CLIENT (6 methods)
  // ============================================================
  {
    category: "Core Client",
    name: "Constructor - Create client",
    test: () => {
      try {
        const client = new MiawClient({
          instanceId: TEST_CONFIG.instanceId,
          sessionPath: TEST_CONFIG.sessionPath,
          debug: DEBUG_MODE,
        });
        return client !== null;
      } catch (e) {
        console.error("Error:", e);
        return false;
      }
    },
  },
  {
    category: "Core Client",
    name: "connect() - Connect to WhatsApp",
    action: async (client: MiawClient) => {
      // Check if already connected
      if (client.isConnected()) {
        console.log("✅ Already connected! Skipping QR code scan.");
        // Detect account type
        await detectAccountType(client);
        return true;
      }

      console.log("\n📱 Connecting to WhatsApp...");
      console.log("----------------------------------------");

      // Start connection first
      client.connect();

      // Wait for either QR code or ready event (whichever comes first)
      const result = await new Promise<"qr" | "ready" | "timeout">(
        (resolve) => {
          const timeout = setTimeout(() => resolve("timeout"), 120000);

          client.once("qr", (qr: string) => {
            clearTimeout(timeout);
            console.log("\n📱 Scan the QR code below with WhatsApp:");
            qrcode.generate(qr, { small: true });
            resolve("qr");
          });

          client.once("ready", () => {
            clearTimeout(timeout);
            resolve("ready");
          });
        }
      );

      if (result === "ready") {
        console.log("✅ Connected successfully using existing session!");
        // Detect account type
        await detectAccountType(client);
        return true;
      }

      if (result === "timeout") {
        console.log("❌ Timeout waiting for connection");
        return false;
      }

      // QR was shown, now wait for ready
      console.log("\n✅ QR code displayed. Scan it now.");
      console.log("Waiting for connection...");

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => resolve(), 120000);
        client.once("ready", () => {
          clearTimeout(timeout);
          console.log("✅ Connected successfully!");
          resolve();
        });
      });

      // Detect account type after connection
      await detectAccountType(client);

      return true;
    },
  },
  {
    category: "Core Client",
    name: "getConnectionState() - Get connection state",
    test: (client: MiawClient) => {
      const state = client.getConnectionState();
      console.log("Current state:", state);
      return state === "connected";
    },
  },
  {
    category: "Core Client",
    name: "getInstanceId() - Get instance ID",
    test: (client: MiawClient) => {
      const id = client.getInstanceId();
      console.log("Instance ID:", id);
      return id === TEST_CONFIG.instanceId;
    },
  },
  {
    category: "Core Client",
    name: "isConnected() - Check if connected",
    test: (client: MiawClient) => {
      const connected = client.isConnected();
      console.log("Is connected:", connected);
      return connected === true;
    },
  },

  // ============================================================
  // BASIC GET OPERATIONS (v0.9.0) (6 methods)
  // ============================================================
  {
    category: "Basic GET Ops",
    name: "getOwnProfile() - Get your profile",
    test: async (client: MiawClient) => {
      const profile = await client.getOwnProfile();
      if (!profile) {
        console.log("❌ Failed to get profile");
        return false;
      }
      console.log("Your Profile:");
      console.log("  JID:", profile.jid);
      console.log("  Phone:", profile.phone || "(not available)");
      console.log("  Name:", profile.name || "(not set)");
      console.log("  Status:", profile.status || "(not set)");
      console.log("  Is Business:", profile.isBusiness || false);
      return true;
    },
  },
  {
    category: "Basic GET Ops",
    name: "fetchAllContacts() - Get all contacts",
    test: async (client: MiawClient) => {
      const result = await client.fetchAllContacts();
      console.log("Success:", result.success);
      console.log("Total contacts:", result.contacts?.length || 0);
      if (result.contacts && result.contacts.length > 0) {
        console.log("Sample contact:", {
          jid: result.contacts[0].jid,
          name: result.contacts[0].name || "(no name)",
        });
      }
      console.log(
        "\n⚠️  If 0 contacts, history sync may not have completed yet."
      );
      return result.success;
    },
  },
  {
    category: "Basic GET Ops",
    name: "fetchAllGroups() - Get all groups",
    test: async (client: MiawClient) => {
      const result = await client.fetchAllGroups();
      console.log("Success:", result.success);
      console.log("Total groups:", result.groups?.length || 0);
      if (result.groups && result.groups.length > 0) {
        console.log("Sample group:", {
          jid: result.groups[0].jid,
          name: result.groups[0].name,
          participants: result.groups[0].participantCount,
        });
      }
      return result.success;
    },
  },
  {
    category: "Basic GET Ops",
    name: "fetchAllChats() - Get all chats",
    test: async (client: MiawClient) => {
      const result = await client.fetchAllChats();
      console.log("Success:", result.success);
      console.log("Total chats:", result.chats?.length || 0);
      if (result.chats && result.chats.length > 0) {
        console.log("Sample chat:", {
          jid: result.chats[0].jid,
          name: result.chats[0].name || "(no name)",
          isGroup: result.chats[0].isGroup,
        });
      }
      console.log("\n⚠️  If 0 chats, history sync may not have completed yet.");
      return result.success;
    },
  },
  {
    category: "Basic GET Ops",
    name: "getChatMessages(jid) - Get chat messages",
    action: async (client: MiawClient) => {
      console.log(
        "\n📱 Enter a phone number or group JID to fetch messages from:"
      );
      console.log("  - Phone: 6281234567890");
      console.log("  - Group: 123456789@g.us");
      console.log("  - Or press ENTER to use status@whatsapp.net");
      const jid = await waitForInput();

      const targetJid = jid.trim() || "status@whatsapp.net";
      const result = await client.getChatMessages(targetJid);

      console.log("Success:", result.success);
      console.log("Total messages:", result.messages?.length || 0);
      if (result.messages && result.messages.length > 0) {
        console.log("Sample message:", {
          id: result.messages[0].id,
          type: result.messages[0].type,
          from: result.messages[0].from,
          text: result.messages[0].text || "(no text)",
        });
      }

      return result.success;
    },
  },

  // ============================================================
  // MESSAGING (6 methods)
  // ============================================================
  {
    category: "Messaging",
    name: "sendText() - Send text message",
    action: async (client: MiawClient) => {
      const phone = await getTestPhone(
        "Enter phone number to send test message:"
      );
      const text = `Test message from miaw-core manual test - ${new Date().toISOString()}`;

      console.log(`\n📤 Sending text to ${phone}...`);
      const result = await client.sendText(phone, text);

      console.log("Success:", result.success);
      console.log("Message ID:", result.messageId || "(none)");

      if (!result.success) {
        console.log("Error:", result.error);
      }

      return result.success;
    },
  },
  {
    category: "Messaging",
    name: "sendImage() - Send image",
    action: async (client: MiawClient) => {
      console.log("\n📤 Sending an image requires a test image file.");
      console.log("Path: tests/test-assets/test-image.jpg");
      console.log("\nPress ENTER if you have the test image, or skip (s)");

      const answer = await waitForInput();
      if (answer.toLowerCase() === "s") return "skip";

      const phone = await getTestPhone("Enter phone number to send image:");
      const imagePath = "./tests/test-assets/test-image.jpg";

      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        console.log(`⚠️  Test image not found at ${imagePath}`);
        console.log("Create a test image at that path to test this feature.");
        return "skip";
      }

      const result = await client.sendImage(phone, imagePath, {
        caption: "Test image from miaw-core",
      });

      console.log("Success:", result.success);
      console.log("Message ID:", result.messageId || "(none)");

      return result.success;
    },
  },
  {
    category: "Messaging",
    name: "sendDocument() - Send document",
    action: async () => {
      console.log("\n📤 Sending a document requires a test file.");
      console.log("Skipping for now - test with sendImage() pattern");
      return "skip";
    },
  },
  {
    category: "Messaging",
    name: "sendVideo() - Send video",
    action: async () => {
      console.log("\n📤 Sending video requires a test video file.");
      console.log("Skipping for now - test with sendImage() pattern");
      return "skip";
    },
  },
  {
    category: "Messaging",
    name: "sendAudio() - Send audio",
    action: async () => {
      console.log("\n📤 Sending audio requires a test audio file.");
      console.log("Skipping for now - test with sendImage() pattern");
      return "skip";
    },
  },
  {
    category: "Messaging",
    name: "downloadMedia() - Download media",
    action: async (client: MiawClient) => {
      console.log("\n📥 To test media download:");
      console.log("1. Send an image/video to the bot from another phone");
      console.log("2. I will listen for the message and download it");

      const message = await waitForMessage(
        client,
        (msg) => msg.type === "image" || msg.type === "video",
        30000
      );

      console.log(`\n📥 Downloading media from ${message.type} message...`);
      const buffer = await client.downloadMedia(message);

      if (buffer) {
        console.log("✅ Media downloaded successfully");
        console.log(`Buffer size: ${buffer.length} bytes`);
        return true;
      } else {
        console.log("❌ Failed to download media");
        return false;
      }
    },
  },

  // --- Message Operations ---
  {
    category: "Messaging",
    name: "sendReaction() - Send reaction",
    action: async (client: MiawClient) => {
      console.log("\n📝 To test reactions:");
      console.log("1. Send a message to the bot from another phone");
      console.log("2. I will react to it with 👍");

      const message = await waitForMessage(
        client,
        (msg) => msg.type === "text",
        30000
      );
      console.log(
        `\n📝 Reacting to message ${message.id.substring(0, 10)}... with 👍`
      );

      const result = await client.sendReaction(message, "👍");
      console.log("Success:", result.success);
      return result.success;
    },
  },
  {
    category: "Messaging",
    name: "removeReaction() - Remove reaction",
    action: async () => {
      console.log("\n📝 Removing reaction from previous message...");
      // Get last message we sent reaction to
      // For simplicity, skip this test
      console.log("Skipping - requires tracking last reacted message");
      return "skip";
    },
  },
  {
    category: "Messaging",
    name: "forwardMessage() - Forward message",
    action: async (client: MiawClient) => {
      const phone2 = await getTestPhone2(
        "Enter phone number to forward message to:"
      );
      console.log("\n📝 To test forwarding:");
      console.log("1. Send a message to the bot from another phone");
      console.log(`2. I will forward it to ${phone2}`);

      const message = await waitForMessage(
        client,
        (msg) => msg.type === "text",
        30000
      );
      console.log(`\n📤 Forwarding message to ${phone2}...`);

      const result = await client.forwardMessage(message, phone2);
      console.log("Success:", result.success);
      return result.success;
    },
  },
  {
    category: "Messaging",
    name: "editMessage() - Edit message",
    action: async (client: MiawClient) => {
      const phone = await getTestPhone(
        "Enter phone number to send and edit message:"
      );

      console.log("\n✏️  Sending a message to edit...");
      const originalText = `Original message - ${Date.now()}`;
      const sendResult = await client.sendText(phone, originalText);

      if (!sendResult.success || !sendResult.messageId) {
        console.log("❌ Failed to send message for editing");
        return false;
      }

      console.log("✅ Message sent:", sendResult.messageId);
      console.log("⏳ Waiting 2 seconds before editing...");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log("✏️  Editing message...");
      const editedText = `✏️ EDITED: ${originalText}`;

      // Create a MiawMessage-like object with raw.key for Baileys
      const chatJid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
      const messageToEdit = {
        id: sendResult.messageId,
        chatJid: chatJid,
        fromMe: true,
        raw: {
          key: {
            remoteJid: chatJid,
            fromMe: true,
            id: sendResult.messageId,
          },
        },
      };

      const result = await client.editMessage(messageToEdit as any, editedText);
      console.log("Success:", result.success);
      if (!result.success) {
        console.log("Error:", result.error || "(none)");
      }
      return result.success;
    },
  },
  {
    category: "Messaging",
    name: "deleteMessage() - Delete for everyone",
    action: async (client: MiawClient) => {
      const phone = await getTestPhone(
        "Enter phone number to send and delete message:"
      );

      console.log("\n🗑️  Sending a message to delete...");
      const sendResult = await client.sendText(
        phone,
        `This message will be deleted - ${Date.now()}`
      );

      if (!sendResult.success || !sendResult.messageId) {
        console.log("❌ Failed to send message for deletion");
        return false;
      }

      console.log("✅ Message sent:", sendResult.messageId);
      console.log("⏳ Waiting 2 seconds before deleting...");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log("🗑️  Deleting message for everyone...");

      // Create a MiawMessage-like object with raw.key for Baileys
      const chatJid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
      const messageToDelete = {
        id: sendResult.messageId,
        chatJid: chatJid,
        fromMe: true,
        raw: {
          key: {
            remoteJid: chatJid,
            fromMe: true,
            id: sendResult.messageId,
          },
        },
      };

      const result = await client.deleteMessage(messageToDelete as any);
      console.log("Success:", result.success);
      return result.success;
    },
  },

  // ============================================================
  // CONTACTS (7 methods)
  // ============================================================
  {
    category: "Contacts",
    name: "checkNumber() - Check if number on WhatsApp",
    action: async (client: MiawClient) => {
      const phone = await getTestPhone("Enter phone number to check:");
      console.log(`\n🔍 Checking if ${phone} is on WhatsApp...`);

      const result = await client.checkNumber(phone);
      console.log("Exists:", result.exists);
      console.log("JID:", result.jid || "(none)");

      return result.exists !== undefined;
    },
  },
  {
    category: "Contacts",
    name: "checkNumbers() - Batch check numbers",
    action: async (client: MiawClient) => {
      const phone1 = await getTestPhone("Enter first phone number:");
      const phone2 = await getTestPhone2("Enter second phone number:");

      console.log(`\n🔍 Checking multiple numbers...`);
      const results = await client.checkNumbers([phone1, phone2]);

      console.log("Results:");
      results.forEach((r, i) => {
        console.log(
          `  ${i + 1}. Exists: ${r.exists}, JID: ${r.jid || "(none)"}`
        );
      });

      return results.length === 2;
    },
  },
  {
    category: "Contacts",
    name: "getContactInfo() - Get contact info",
    action: async (client: MiawClient) => {
      const phone = await getTestPhone("Enter phone number to get info:");
      console.log(`\n👤 Getting contact info for ${phone}...`);

      const info = await client.getContactInfo(phone);
      if (!info) {
        console.log("❌ No info found");
        return false;
      }

      console.log("Contact Info:");
      console.log("  JID:", info.jid);
      console.log("  Name:", info.name || "(not available)");
      console.log("  Phone:", info.phone || "(not available)");
      console.log("  Status:", info.status || "(not available)");

      return true;
    },
  },
  {
    category: "Contacts",
    name: "getBusinessProfile() - Get business profile",
    action: async (client: MiawClient) => {
      const phone = await getTestPhone(
        "Enter business phone number (or press ENTER to skip):"
      );
      if (!phone) return "skip";

      console.log(`\n💼 Getting business profile for ${phone}...`);

      const profile = await client.getBusinessProfile(phone);
      if (!profile) {
        console.log("ℹ️  Not a business account (or not found)");
        return true; // This is expected for non-business
      }

      console.log("Business Profile:");
      console.log("  Description:", profile.description || "(none)");
      console.log("  Category:", profile.category || "(none)");
      console.log("  Website:", profile.website || "(none)");

      return true;
    },
  },
  {
    category: "Contacts",
    name: "getProfilePicture() - Get profile picture",
    action: async (client: MiawClient) => {
      const phone = await getTestPhone(
        "Enter phone number to get profile picture:"
      );
      console.log(`\n📷 Getting profile picture for ${phone}...`);

      const url = await client.getProfilePicture(phone);
      if (!url) {
        console.log("ℹ️  No profile picture (privacy settings or no picture)");
        return true;
      }

      console.log("Profile Picture URL:", url.substring(0, 80) + "...");
      return true;
    },
  },

  // ============================================================
  // GROUP MANAGEMENT (13 methods)
  // Flow: Create → Info → Update → Participants → Invite → Destructive
  // ============================================================

  // --- Group Creation ---
  {
    category: "Group Mgmt",
    name: "createGroup() - Create new group",
    action: async (client: MiawClient) => {
      const phone1 = await getTestPhone(
        "Enter first participant phone number:"
      );
      const phone2 = await getTestPhone2(
        "Enter second participant phone number:"
      );

      console.log("\n👥 Creating new group...");
      const groupName = `Test Group ${Date.now()}`;

      const result = await client.createGroup(groupName, [phone1, phone2]);

      console.log("Success:", result.success);
      if (result.success) {
        console.log("Group JID:", result.groupJid);
        TEST_CONFIG.testGroupJid = result.groupJid || "";
        console.log("Saved as test group for subsequent tests");
      } else {
        console.log("Error:", result.error);
      }

      return result.success;
    },
  },

  // --- Group Info (verify creation) ---
  {
    category: "Group Mgmt",
    name: "getGroupInfo() - Get group metadata",
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup(
        "Enter group JID (e.g., 123456789@g.us):"
      );
      console.log(`\n👥 Getting group info for ${groupJid}...`);

      const info = await client.getGroupInfo(groupJid);
      if (!info) {
        console.log("❌ Failed to get group info");
        return false;
      }

      console.log("Group Info:");
      console.log("  JID:", info.jid);
      console.log("  Name:", info.name);
      console.log("  Participants:", info.participantCount);
      console.log("  Description:", info.description || "(none)");

      return true;
    },
  },
  {
    category: "Group Mgmt",
    name: "getGroupParticipants() - Get group members",
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup("Enter group JID:");
      console.log(`\n👥 Getting group participants for ${groupJid}...`);

      const participants = await client.getGroupParticipants(groupJid);
      if (!participants) {
        console.log("❌ Failed to get participants");
        return false;
      }

      console.log(`Total participants: ${participants.length}`);
      const admins = participants.filter((p) => p.role !== "member");
      console.log(`Admins: ${admins.length}`);

      return true;
    },
  },

  // --- Group Updates ---
  {
    category: "Group Mgmt",
    name: "updateGroupName() - Change group name",
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup("Enter group JID:");
      const newName = `Updated Group ${Date.now()}`;

      console.log(`\n✏️  Updating group name to: ${newName}`);
      const result = await client.updateGroupName(groupJid, newName);

      console.log("Success:", result.success);
      if (!result.success) {
        console.log("Error:", result.error);
      }

      return result.success;
    },
  },
  {
    category: "Group Mgmt",
    name: "updateGroupDescription() - Set group description",
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup("Enter group JID:");
      const desc = `Test description updated at ${new Date().toISOString()}`;

      console.log(`\n📝 Updating group description...`);
      const result = await client.updateGroupDescription(groupJid, desc);

      console.log("Success:", result.success);
      if (!result.success) {
        console.log("Error:", result.error);
      }

      return result.success;
    },
  },
  {
    category: "Group Mgmt",
    name: "updateGroupPicture() - Change group picture",
    action: async () => {
      console.log("\n📷 Updating group picture requires a test image file.");
      console.log("Skipping for now - test with sendImage() pattern");
      return "skip";
    },
  },

  // --- Participant Management ---
  {
    category: "Group Mgmt",
    name: "addParticipants() - Add members to group",
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup("Enter group JID:");
      const phone = await getTestPhone("Enter phone number to add:");

      console.log(`\n👤 Adding ${phone} to group...`);
      const results = await client.addParticipants(groupJid, [phone]);

      console.log("Results:", results.length);
      const successCount = results.filter((r) => r.success).length;
      console.log(`Success: ${successCount}/${results.length}`);

      return successCount > 0;
    },
  },
  {
    category: "Group Mgmt",
    name: "promoteToAdmin() - Promote member to admin",
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup("Enter group JID:");
      const phone = await getTestPhone("Enter phone number to promote:");

      console.log(`\n⬆️  Promoting ${phone} to admin...`);
      console.log("⚠️  You must be admin to do this");
      const results = await client.promoteToAdmin(groupJid, [phone]);

      console.log("Results:", results.length);
      const successCount = results.filter((r) => r.success).length;
      console.log(`Success: ${successCount}/${results.length}`);

      return successCount > 0;
    },
  },
  {
    category: "Group Mgmt",
    name: "demoteFromAdmin() - Demote admin",
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup("Enter group JID:");
      const phone = await getTestPhone("Enter admin phone number to demote:");

      console.log(`\n⬇️  Demoting ${phone} from admin...`);
      console.log("⚠️  You must be admin to do this");
      const results = await client.demoteFromAdmin(groupJid, [phone]);

      console.log("Results:", results.length);
      const successCount = results.filter((r) => r.success).length;
      console.log(`Success: ${successCount}/${results.length}`);

      return successCount > 0;
    },
  },

  // --- Invite Operations ---
  {
    category: "Group Mgmt",
    name: "getGroupInviteLink() - Get invite link",
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup("Enter group JID:");

      console.log(`\n🔗 Getting group invite link...`);
      const result = await client.getGroupInviteLink(groupJid);

      if (result) {
        console.log("✅ Invite link:", result);
        return true;
      } else {
        console.log("❌ Failed to get invite link");
        return false;
      }
    },
  },
  {
    category: "Group Mgmt",
    name: "acceptGroupInvite() - Join via invite",
    action: async (client: MiawClient) => {
      console.log("\n🔗 To test joining via invite:");
      console.log("1. Get an invite link from a group");
      console.log("2. Paste the invite code or full URL");

      const invite = await waitForInput();
      if (!invite) return "skip";

      console.log(`\n🔗 Accepting invite...`);
      const groupJid = await client.acceptGroupInvite(invite);

      if (groupJid) {
        console.log("Joined group:", groupJid);
        return true;
      } else {
        console.log("Failed to join group");
        return false;
      }
    },
  },

  // --- Destructive Operations (at the end) ---
  {
    category: "Group Mgmt",
    name: "removeParticipants() - Remove members (DESTRUCTIVE)",
    action: async (client: MiawClient) => {
      const groupJid = await getTestGroup("Enter group JID:");
      const phone = await getTestPhone("Enter phone number to remove:");

      console.log(`\n👤 Removing ${phone} from group...`);
      console.log("⚠️  You must be admin to do this");
      const results = await client.removeParticipants(groupJid, [phone]);

      console.log("Results:", results.length);
      const successCount = results.filter((r) => r.success).length;
      console.log(`Success: ${successCount}/${results.length}`);

      return successCount > 0;
    },
  },
  {
    category: "Group Mgmt",
    name: "leaveGroup() - Leave group (DESTRUCTIVE)",
    action: async (client: MiawClient) => {
      console.log("\n⚠️  This will make the bot leave a group.");
      console.log("Press ENTER to continue, or s to skip");
      const answer = await waitForInput();
      if (answer.toLowerCase() === "s") return "skip";

      const groupJid = await getTestGroup("Enter group JID to leave:");
      console.log(`\n🚪 Leaving group ${groupJid}...`);

      const result = await client.leaveGroup(groupJid);
      console.log("Success:", result.success);

      return result.success;
    },
  },

  // ============================================================
  // PROFILE MANAGEMENT (4 methods)
  // ============================================================
  {
    category: "Profile Mgmt",
    name: "updateProfilePicture() - Update own profile picture",
    action: async () => {
      console.log("\n📷 Updating profile picture requires a test image file.");
      console.log("Skipping for now - requires test image");
      return "skip";
    },
  },
  {
    category: "Profile Mgmt",
    name: "updateProfileName() - Update display name",
    action: async (client: MiawClient) => {
      console.log("\n✏️  Updating your profile name...");
      const newName = `Test Bot ${Date.now()}`;

      const result = await client.updateProfileName(newName);

      console.log("Success:", result.success);
      console.log("New name:", newName);

      return result.success;
    },
  },
  {
    category: "Profile Mgmt",
    name: "updateProfileStatus() - Update About text",
    action: async (client: MiawClient) => {
      console.log("\n✏️  Updating your status/About text...");
      const newStatus = `Miaw Core Test Bot - ${new Date().toISOString()}`;

      const result = await client.updateProfileStatus(newStatus);

      console.log("Success:", result.success);
      console.log("New status:", newStatus);

      return result.success;
    },
  },
  // --- Destructive profile operations (at the end) ---
  {
    category: "Profile Mgmt",
    name: "removeProfilePicture() - Remove profile picture (DESTRUCTIVE)",
    action: async (client: MiawClient) => {
      console.log("\n🗑️  This will remove your profile picture.");
      console.log("Press ENTER to continue, or s to skip");
      const answer = await waitForInput();
      if (answer.toLowerCase() === "s") return "skip";

      console.log("\n🗑️  Removing profile picture...");
      const result = await client.removeProfilePicture();

      console.log("Success:", result.success);
      return result.success;
    },
  },

  // ============================================================
  // BUSINESS FEATURES - WhatsApp Business only
  // ============================================================

  // --- Labels ---
  {
    category: "Business",
    name: "fetchAllLabels() - Get all labels",
    businessOnly: true,
    action: async (client: MiawClient) => {
      console.log("\n🏷️  Fetching all labels...");

      // Force sync to get fresh labels from WhatsApp
      const result = await client.fetchAllLabels(true);

      console.log("Success:", result.success);
      console.log("Total labels:", result.labels?.length || 0);

      if (result.labels && result.labels.length > 0) {
        console.log("Sample labels:");
        result.labels.slice(0, 3).forEach((l, i) => {
          console.log(`  ${i + 1}. ${l.name} (${l.color})`);
        });
      }

      return result.success;
    },
  },
  {
    category: "Business",
    name: "addLabel() - Create new label",
    businessOnly: true,
    action: async (client: MiawClient) => {
      console.log("\n🏷️  Creating a new label...");

      const result = await client.addLabel({
        name: `Test Label ${Date.now()}`,
        color: 1, // LabelColor.Color2
      });

      console.log("Success:", result.success);
      if (result.success) {
        console.log("Label ID:", result.labelId);
        // Store for use in addChatLabel test
        TEST_CONFIG.lastCreatedLabelId = result.labelId || "";
      } else {
        console.log("Error:", result.error);
      }

      return result.success;
    },
  },
  {
    category: "Business",
    name: "addChatLabel() - Add label to chat",
    businessOnly: true,
    action: async (client: MiawClient) => {
      if (!TEST_CONFIG.lastCreatedLabelId) {
        console.log("\n🏷️  No label created yet. Run addLabel() first.");
        return "skip";
      }

      const phone = await getTestPhone("Enter phone number to add label to:");
      console.log(
        `\n🏷️  Adding label ${TEST_CONFIG.lastCreatedLabelId} to chat ${phone}...`
      );

      const result = await client.addChatLabel(
        phone,
        TEST_CONFIG.lastCreatedLabelId
      );

      console.log("Success:", result.success);
      if (!result.success) {
        console.log("Error:", result.error);
      }

      return result.success;
    },
  },
  {
    category: "Business",
    name: "removeChatLabel() - Remove label from chat",
    businessOnly: true,
    action: async () => {
      console.log("\n🏷️  Skipping remove chat label test...");
      return "skip";
    },
  },
  {
    category: "Business",
    name: "addMessageLabel() - Add label to message",
    businessOnly: true,
    action: async () => {
      console.log("\n🏷️  Skipping add message label test...");
      return "skip";
    },
  },

  // --- Catalog ---
  {
    category: "Business",
    name: "createProduct() - Add new product",
    businessOnly: true,
    action: async (client: MiawClient) => {
      console.log("\n🛠️  Creating a test product...");

      const productName = `Test Product ${Date.now()}`;
      const result = await client.createProduct({
        name: productName,
        description: "Test product created by miaw-core interactive test",
        price: 10000, // Price in smallest unit (e.g., cents)
        currency: "IDR",
        imageUrls: [
          "https://via.placeholder.com/500x500.png?text=Test+Product",
        ],
      });

      console.log("Success:", result.success);
      if (result.success) {
        console.log("Product ID:", result.productId);
        // Store for subsequent tests
        TEST_CONFIG.lastCreatedProductId = result.productId || "";
      } else {
        console.log("Error:", result.error);
        console.log(
          "💡 Tip: Catalog requires WhatsApp Business with catalog enabled"
        );
      }

      return result.success;
    },
  },
  {
    category: "Business",
    name: "getCatalog() - Fetch product catalog",
    businessOnly: true,
    action: async (client: MiawClient) => {
      console.log("\n🛒 Fetching product catalog...");

      const result = await client.getCatalog();

      console.log("Success:", result.success);
      if (result.success) {
        console.log("Total products:", result.products?.length || 0);
        if (result.products && result.products.length > 0) {
          console.log("Products:");
          result.products.slice(0, 5).forEach((p, i) => {
            console.log(
              `  ${i + 1}. [${p.id}] ${p.name || "Unnamed"} - ${p.price} ${
                p.currency || ""
              }`
            );
          });

          // If we created a product earlier but lost the ID, try to recover it
          if (!TEST_CONFIG.lastCreatedProductId && result.products.length > 0) {
            const testProduct = result.products.find((p) =>
              p.name?.startsWith("Test Product")
            );
            if (testProduct) {
              TEST_CONFIG.lastCreatedProductId = testProduct.id;
              console.log(`📌 Recovered test product ID: ${testProduct.id}`);
            }
          }
        }
      } else {
        console.log("Error:", result.error);
        console.log(
          "💡 Tip: Run createProduct() first to add products to catalog"
        );
      }

      return result.success;
    },
  },
  {
    category: "Business",
    name: "getCollections() - Get catalog collections",
    businessOnly: true,
    action: async (client: MiawClient) => {
      console.log("\n📁 Fetching catalog collections...");

      const result = await client.getCollections();

      console.log("Total collections:", result.length);
      if (result.length > 0) {
        console.log("Collections:");
        result.slice(0, 5).forEach((c, i) => {
          console.log(`  ${i + 1}. ${c.name} (${c.id})`);
        });
      } else {
        console.log("💡 Tip: Collections are created in WhatsApp Business app");
      }

      return true; // Collections may be empty, that's OK
    },
  },
  {
    category: "Business",
    name: "updateProduct() - Modify product",
    businessOnly: true,
    action: async (client: MiawClient) => {
      if (!TEST_CONFIG.lastCreatedProductId) {
        console.log("\n⚠️  No product created yet. Run createProduct() first.");
        return "skip";
      }

      console.log(
        `\n✏️  Updating product ${TEST_CONFIG.lastCreatedProductId}...`
      );

      const result = await client.updateProduct(
        TEST_CONFIG.lastCreatedProductId,
        {
          name: `Updated Test Product ${Date.now()}`,
          description: "Updated description by miaw-core test",
          price: 15000,
          currency: "IDR",
        }
      );

      console.log("Success:", result.success);
      if (!result.success) {
        console.log("Error:", result.error);
      }

      return result.success;
    },
  },
  {
    category: "Business",
    name: "deleteProducts() - Remove products (CLEANUP)",
    businessOnly: true,
    action: async (client: MiawClient) => {
      if (!TEST_CONFIG.lastCreatedProductId) {
        console.log("\n⚠️  No product to delete. Run createProduct() first.");
        return "skip";
      }

      console.log(
        `\n🗑️  Deleting test product ${TEST_CONFIG.lastCreatedProductId}...`
      );
      console.log("⚠️  This will permanently delete the test product!");

      const answer = await waitForInput(
        "Type 'yes' to confirm deletion, or press ENTER to skip: "
      );
      if (answer.toLowerCase() !== "yes") {
        console.log("Skipped deletion.");
        return "skip";
      }

      const result = await client.deleteProducts([
        TEST_CONFIG.lastCreatedProductId,
      ]);

      console.log("Success:", result.success);
      if (result.success) {
        console.log("Deleted count:", result.deletedCount);
        TEST_CONFIG.lastCreatedProductId = ""; // Clear after deletion
      } else {
        console.log("Error:", result.error);
      }

      return result.success;
    },
  },

  // ============================================================
  // NEWSLETTER/CHANNEL OPERATIONS (subset of 17 methods)
  // ============================================================
  {
    category: "Newsletter",
    name: "createNewsletter() - Create newsletter/channel",
    action: async (client: MiawClient) => {
      console.log("\n📰 Creating a new newsletter/channel...");
      console.log("⚠️  This creates a new channel on your account");
      console.log("Press ENTER to continue, or s to skip");

      const answer = await waitForInput();
      if (answer.toLowerCase() === "s") return "skip";

      const result = await client.createNewsletter(
        `Test Channel ${Date.now()}`,
        "Test channel for miaw-core manual testing"
      );

      console.log("Success:", result.success);
      if (result.success) {
        console.log("Newsletter ID:", result.newsletterId);
      } else {
        console.log("Error:", result.error);
      }

      return result.success;
    },
  },
  {
    category: "Newsletter",
    name: "getNewsletterMetadata() - Get newsletter info",
    action: async (client: MiawClient) => {
      console.log("\n📰 Enter newsletter ID (or press ENTER to skip):");
      const newsletterId = await waitForInput();
      if (!newsletterId) return "skip";

      const meta = await client.getNewsletterMetadata(newsletterId);

      if (meta) {
        console.log("Name:", meta.name);
        console.log("Description:", meta.description || "(none)");
        console.log("Subscribers:", meta.subscribers || 0);
        return true;
      } else {
        console.log("Failed to get newsletter metadata");
        return false;
      }
    },
  },
  {
    category: "Newsletter",
    name: "followNewsletter() - Follow/subscribe",
    action: async () => {
      console.log("\n📰 Skipping follow newsletter test...");
      return "skip";
    },
  },
  {
    category: "Newsletter",
    name: "deleteNewsletter() - Delete newsletter",
    action: async () => {
      console.log("\n📰 Skipping delete newsletter test...");
      return "skip";
    },
  },

  // --- Contact Management ---
  {
    category: "Contacts",
    name: "addOrEditContact() - Add or update contact",
    action: async (client: MiawClient) => {
      const phone = await getTestPhone(
        "Enter phone number to save as contact:"
      );
      console.log("\n👤 Enter contact name:");
      const name = await waitForInput();

      console.log(`\n💾 Saving contact: ${name} (${phone})...`);
      const result = await client.addOrEditContact({
        phone: phone,
        name: name,
      });

      console.log("Success:", result.success);
      return result.success;
    },
  },
  {
    category: "Contacts",
    name: "removeContact() - Remove contact",
    action: async (client: MiawClient) => {
      const phone = await getTestPhone(
        "Enter phone number to remove from contacts:"
      );

      console.log(`\n🗑️  Removing contact ${phone}...`);
      const result = await client.removeContact(phone);

      console.log("Success:", result.success);
      return result.success;
    },
  },

  // ============================================================
  // UX FEATURES (5 methods)
  // ============================================================
  {
    category: "UX Features",
    name: "markAsRead() - Mark message as read",
    action: async (client: MiawClient) => {
      console.log("\n📝 To test mark as read:");
      console.log("1. Send a message to the bot from another phone");
      console.log("2. I will mark it as read");

      const message = await waitForMessage(
        client,
        (msg) => msg.type === "text",
        30000
      );
      console.log(`\n✅ Marking message as read...`);

      const result = await client.markAsRead(message);
      console.log("Success:", result);
      return result;
    },
  },
  {
    category: "UX Features",
    name: "sendTyping() - Send typing indicator",
    action: async (client: MiawClient) => {
      const phone = await getTestPhone("Enter phone number to send typing to:");

      console.log(`\n⌨️  Sending typing indicator to ${phone}...`);
      await client.sendTyping(phone);

      console.log("✅ Typing indicator sent");
      console.log('Check the other phone - you should see "typing..."');

      // Stop typing after 2 seconds
      setTimeout(async () => {
        await client.stopTyping(phone);
        console.log("✅ Stopped typing indicator");
      }, 2000);

      return true;
    },
  },
  {
    category: "UX Features",
    name: "sendRecording() - Send recording indicator",
    action: async (client: MiawClient) => {
      const phone = await getTestPhone(
        "Enter phone number to send recording to:"
      );

      console.log(`\n🎤 Sending recording indicator to ${phone}...`);
      await client.sendRecording(phone);

      console.log("✅ Recording indicator sent");
      console.log(
        'Check the other phone - you should see "recording audio..."'
      );

      // Stop recording after 2 seconds
      setTimeout(async () => {
        await client.stopTyping(phone);
        console.log("✅ Stopped recording indicator");
      }, 2000);

      return true;
    },
  },
  {
    category: "UX Features",
    name: "setPresence() - Set online/offline status",
    action: async (client: MiawClient) => {
      console.log("\n🌐 Setting presence to available (online)...");
      await client.setPresence("available");
      console.log("Set to available");

      console.log("\n🌙 Setting presence to unavailable (offline)...");
      await client.setPresence("unavailable");
      console.log("Set to unavailable");

      return true;
    },
  },
  {
    category: "UX Features",
    name: "subscribePresence() - Subscribe to presence updates",
    action: async (client: MiawClient) => {
      const phone = await getTestPhone(
        "Enter phone number to subscribe presence:"
      );

      console.log(`\n👁️  Subscribing to presence updates for ${phone}...`);
      await client.subscribePresence(phone);

      console.log("✅ Subscribed to presence updates");
      console.log("Send a message from that phone to trigger presence update");

      return true;
    },
  },

  // ============================================================
  // FINAL CLEANUP
  // ============================================================
  {
    category: "Final",
    name: "disconnect() - Disconnect from WhatsApp",
    action: async (client: MiawClient) => {
      console.log("\n🔌 Session complete!");
      console.log("   [d] Disconnect from WhatsApp");
      console.log("   [c] Keep connected (for further testing)");
      const answer = await waitForInput("> [d/c]: ");
      
      if (answer.toLowerCase() === "c") {
        console.log("✅ Keeping connection alive. You can continue testing.");
        console.log("   Run the script again to test more features.");
        return "skip";
      }
      
      console.log("\n🔌 Disconnecting from WhatsApp...");
      await client.disconnect();
      console.log("✅ Disconnected");
      return true;
    },
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function detectAccountType(client: MiawClient): Promise<void> {
  console.log("\n🔍 Detecting account type...");
  try {
    const profile = await client.getOwnProfile();
    if (profile) {
      TEST_CONFIG.isBusiness = profile.isBusiness || false;
      TEST_CONFIG.accountPhone = profile.phone || "";
      const accountType = TEST_CONFIG.isBusiness
        ? "💼 Business"
        : "👤 Personal";
      console.log(`✅ Account Type: ${accountType}`);
      console.log(`   Phone: ${TEST_CONFIG.accountPhone || "(not available)"}`);
      if (!TEST_CONFIG.isBusiness) {
        console.log("   ℹ️  Business-only tests will be skipped automatically");
      }
    }
  } catch (error) {
    console.log("⚠️  Could not detect account type, assuming Personal");
    TEST_CONFIG.isBusiness = false;
  }
}

function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function waitForInput(prompt: string = ""): Promise<string> {
  const rl = createReadlineInterface();
  return new Promise((resolve) => {
    rl.question(prompt, (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function waitForEnter(prompt: string = ""): Promise<void> {
  const rl = createReadlineInterface();
  return new Promise((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

async function getTestPhone(prompt: string): Promise<string> {
  if (TEST_CONFIG.testPhone) {
    console.log(`${prompt} [cached: ${TEST_CONFIG.testPhone}]`);
    console.log("Press ENTER to use cached, or enter new number:");
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
    console.log("Press ENTER to use cached, or enter new number:");
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
    console.log("Press ENTER to use cached, or enter new JID:");
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
      client.removeListener("message", handler);
      reject(new Error("Timeout waiting for message"));
    }, timeout);

    const handler = (msg: any) => {
      if (condition(msg)) {
        clearTimeout(timer);
        client.removeListener("message", handler);
        resolve(msg);
      }
    };

    client.on("message", handler);
  });
}

// ============================================================
// TEST EXECUTION
// ============================================================

async function runTest(
  test: TestItem,
  client?: MiawClient
): Promise<"pass" | "fail" | "skip"> {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🧪 ${test.name}`);
  console.log("═".repeat(60));

  // Skip business-only tests for personal accounts
  if (test.businessOnly && !TEST_CONFIG.isBusiness) {
    console.log("⏭️  Skipped: Requires Business account");
    return "skip";
  }

  try {
    if (test.test) {
      // Simple test function (may be sync or async)
      const result = await test.test(client!);
      if (typeof result === "boolean") {
        return result ? "pass" : "fail";
      }
      return result as "pass" | "fail" | "skip";
    }

    if (test.action) {
      // Action that returns pass/fail/skip or boolean
      const result = await test.action(client!);
      if (typeof result === "boolean") {
        return result ? "pass" : "fail";
      }
      return result as "pass" | "fail" | "skip";
    }

    return "skip";
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    return "fail";
  }
}

// Show help/usage information
function showHelp() {
  console.log(
    "\n╔════════════════════════════════════════════════════════════╗"
  );
  console.log("║     Miaw Core - Interactive Manual Testing Script        ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  console.log("\n📖 Usage: npm run test:manual [group]\n");
  console.log("Available test groups:\n");
  console.log("  all         - Run all tests interactively");
  console.log("  core        - Core Client (connect, disconnect, state)");
  console.log(
    "  get         - Basic GET Operations (profile, contacts, chats)"
  );
  console.log("  messaging   - Messaging (send, react, forward, edit, delete)");
  console.log("  contacts    - Contacts (check, info, add, remove)");
  console.log(
    "  group       - Group Management (create, update, participants)"
  );
  console.log(
    "  profile     - Profile Management (update name, status, picture)"
  );
  console.log("  business    - Business [BIZ] (labels + catalog)");
  console.log("  newsletter  - Newsletter (create, metadata, follow)");
  console.log("  ux          - UX Features (typing, presence, read receipts)");

  // Count tests per category
  const categoryCounts: { [key: string]: number } = {};
  for (const test of tests) {
    if (test.category !== "Prerequisites" && test.category !== "Final") {
      categoryCounts[test.category] = (categoryCounts[test.category] || 0) + 1;
    }
  }

  console.log("\n📊 Test counts by category:\n");
  for (const [arg, categories] of Object.entries(CATEGORY_MAP)) {
    const count = categories.reduce(
      (sum, cat) => sum + (categoryCounts[cat] || 0),
      0
    );
    const bizTag = arg === "business" ? " [BIZ]" : "";
    console.log(`  ${arg.padEnd(12)} ${count} tests${bizTag}`);
  }

  const totalTests = tests.filter(
    (t) => t.category !== "Prerequisites" && t.category !== "Final"
  ).length;
  console.log(`\n  Total: ${totalTests} tests`);

  console.log("\n💡 Examples:");
  console.log("  npm run test:manual all       # Run all tests");
  console.log(
    "  npm run test:manual group     # Run group management tests only"
  );
  console.log("  npm run test:manual messaging # Run messaging tests only");

  console.log(
    `\n🔧 Debug Mode: ${DEBUG_MODE ? "ON" : "OFF"} (set DEBUG=true in .env)`
  );

  console.log("\n");
}

// Get tests to run based on CLI argument
function getTestsToRun(): TestItem[] {
  if (cliArg === "all") {
    return tests;
  }

  const targetCategories = CATEGORY_MAP[cliArg];
  if (!targetCategories) {
    return []; // Will trigger help display
  }

  // Filter tests by category, but always include connection setup
  const connectionTests = tests.filter(
    (t) => t.category === "Prerequisites" || t.category === "Core Client"
  );
  const categoryTests = tests.filter((t) =>
    targetCategories.includes(t.category)
  );
  const disconnectTest = tests.filter((t) => t.category === "Final");

  // Combine: connection + category tests + disconnect
  // Remove duplicates if Core Client was selected
  const combined = [...connectionTests];
  for (const test of categoryTests) {
    if (!combined.some((t) => t.name === test.name)) {
      combined.push(test);
    }
  }
  combined.push(...disconnectTest);

  return combined;
}

async function main() {
  // If no argument or invalid argument, show help
  if (!cliArg || (!CATEGORY_MAP[cliArg] && cliArg !== "all")) {
    showHelp();
    return;
  }

  const testsToRun = getTestsToRun();
  const targetDesc = cliArg === "all" ? "all tests" : `${cliArg} tests`;

  console.log(
    "\n╔════════════════════════════════════════════════════════════╗"
  );
  console.log("║     Miaw Core - Interactive Manual Testing Script        ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`\n🎯 Running: ${targetDesc}`);
  console.log("\nActions: [Enter] run | [n] skip | [s] skip all | [q] quit");
  console.log("Icons: ⚡ auto | 👤 interactive | [BIZ] business only");
  console.log(
    `\n🔧 Debug Mode: ${DEBUG_MODE ? "ON (verbose logging)" : "OFF (quiet)"}`
  );
  if (!DEBUG_MODE) {
    console.log(
      "   Tip: Set DEBUG=true in .env to enable verbose Baileys logs"
    );
  }

  // Show pre-loaded test contacts
  console.log("\n📋 Test Contacts (from .env.test):");
  if (TEST_CONFIG.testPhone) {
    console.log(`   Phone A: ${TEST_CONFIG.testPhone}`);
  } else {
    console.log("   Phone A: (not set - will prompt when needed)");
  }
  if (TEST_CONFIG.testPhone2) {
    console.log(`   Phone B: ${TEST_CONFIG.testPhone2}`);
  } else {
    console.log("   Phone B: (not set - will prompt when needed)");
  }
  if (TEST_CONFIG.testGroupJid) {
    console.log(`   Group:   ${TEST_CONFIG.testGroupJid}`);
  } else {
    console.log("   Group:   (not set - will prompt when needed)");
  }
  console.log(
    "   Tip: Set TEST_CONTACT_PHONE_A, TEST_CONTACT_PHONE_B, TEST_GROUP_JID in .env.test"
  );

  // Check if existing session exists
  const sessionDir = path.join(TEST_CONFIG.sessionPath, TEST_CONFIG.instanceId);
  const sessionExists = fs.existsSync(sessionDir);

  if (sessionExists) {
    console.log("\n📂 Existing session found!");
    console.log("   Continue with existing session or start fresh?");
    console.log("   [y] Continue with existing session (default)");
    console.log("   [n] Clear session and scan new QR code");
    const answer = await waitForInput("> [y/n]: ");
    if (answer.toLowerCase() === "n") {
      console.log("🗑️  Clearing existing session...");
      fs.rmSync(sessionDir, { recursive: true, force: true });
      console.log("✅ Session cleared. You will need to scan a new QR code.");
    } else {
      console.log("✅ Using existing session.");
    }
  } else {
    console.log(
      "\n📂 No existing session found. You will need to scan a QR code."
    );
  }

  await waitForEnter("\n> Press ENTER to start...");

  // Create client once
  const client = new MiawClient({
    instanceId: TEST_CONFIG.instanceId,
    sessionPath: TEST_CONFIG.sessionPath,
    debug: DEBUG_MODE,
  });

  // Run tests sequentially
  let lastResult: "pass" | "fail" | "skip" | null = null;

  for (let i = 0; i < testsToRun.length; i++) {
    const test = testsToRun[i];
    const progress = `[${i + 1}/${testsToRun.length}]`;
    const bizTag = test.businessOnly ? " [BIZ]" : "";
    const interactiveTag = test.action ? " 👤" : " ⚡"; // 👤 = needs interaction, ⚡ = auto

    // Show upcoming test info
    console.log(`\n${"-".repeat(60)}`);
    if (lastResult !== null) {
      const resultIcon =
        lastResult === "pass" ? "✅" : lastResult === "fail" ? "❌" : "⏭️";
      console.log(`Last: ${resultIcon} ${lastResult.toUpperCase()}`);
    }
    console.log(`Next ${progress}:${interactiveTag} ${test.name}${bizTag}`);

    // Prompt for action
    const preAnswer = await waitForInput(
      "> [Enter] run | [n] skip | [q] quit: "
    );
    if (preAnswer.toLowerCase() === "q") break;
    if (preAnswer.toLowerCase() === "s") break;
    if (preAnswer.toLowerCase() === "n") {
      testResults[test.name] = "skip";
      lastResult = "skip";
      console.log(`⏭️  Skipped`);
      continue;
    }

    const result = await runTest(test, client);
    testResults[test.name] = result;
    lastResult = result;
  }

  // Cleanup
  console.log("\n🧹 Cleaning up...");
  await client.disconnect();
  await client.dispose();
  console.log("✅ Cleanup complete");

  // Show summary
  showSummary();
}

function showSummary() {
  console.log(
    "\n\n╔════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║                    Test Summary                             ║"
  );
  console.log("╚════════════════════════════════════════════════════════════╝");

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

  console.log("\nBy Category:");
  for (const [category, catResults] of Object.entries(byCategory)) {
    console.log(`\n${category}:`);
    console.log(`  ✅ Pass: ${catResults.pass}`);
    console.log(`  ❌ Fail: ${catResults.fail}`);
    console.log(`  ⏭️  Skip: ${catResults.skip}`);
  }

  console.log("\n\nTotal:");
  console.log(`  ✅ Passed: ${results.pass}`);
  console.log(`  ❌ Failed: ${results.fail}`);
  console.log(`  ⏭️  Skipped: ${results.skip}`);
  console.log(`  📊 Total: ${Object.keys(testResults).length}`);

  // Get package version
  let miawCoreVersion = "unknown";
  let baileysVersion = "unknown";
  const nodeVersion = process.version;

  try {
    const packagePath = require.resolve("../package.json");
    const pkg = require(packagePath);
    miawCoreVersion = pkg.version;
    baileysVersion = pkg.dependencies?.["@whiskeysockets/baileys"] || "unknown";
  } catch {
    // Ignore errors
  }

  console.log(
    "\n\n╔════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║                    Test Report                              ║"
  );
  console.log("╚════════════════════════════════════════════════════════════╝");

  console.log("\nTest Date:", new Date().toISOString());
  console.log("Miaw Core Version:", miawCoreVersion);
  console.log("Baileys Version:", baileysVersion);
  console.log("Node.js Version:", nodeVersion);
  console.log("Instance ID:", TEST_CONFIG.instanceId);

  // Generate report text for MANUAL_TEST_CHECKLIST.md
  console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Copy this to MANUAL_TEST_CHECKLIST.md Notes section:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
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

  console.log("\n\n✅ Testing complete!");
}

// Run the test
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
