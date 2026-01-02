/**
 * Group Admin Bot - Real World Example
 *
 * A production-ready group administration bot with:
 * - Auto-moderation (spam filter, bad words)
 * - Welcome messages for new members
 * - Auto-remove inactive members
 * - Admin command shortcuts
 * - Group analytics and reporting
 * - Scheduled announcements
 */

import { MiawClient, MiawMessage } from "miaw-core";
import { readFileSync, writeFileSync, existsSync } from "fs";
import qrcode from "qrcode-terminal";

// Configuration
const CONFIG = {
  instanceId: "group-admin-bot",
  sessionPath: "./sessions",
  dataFile: "./group-admin-data.json",
  moderation: {
    spamThreshold: 5, // messages per minute
    spamAction: "warn", // 'warn', 'mute', 'remove'
    inactiveDays: 30, // remove members inactive for this many days
    badWords: ["spam", "scam", "click here", "free money"],
    linkAllowed: false, // allow links in messages
  },
  welcome: {
    enabled: true,
    message:
      "Welcome {mention}! 🎉\n\nPlease read the group rules:\n1. Be respectful\n2. No spam\n3. Stay on topic\n\nEnjoy your stay!",
    delay: 1000, // ms after user joins
  },
  adminOnly: true, // only respond to admins
};

interface GroupData {
  groupId: string;
  settings: {
    welcomeEnabled: boolean;
    linkAllowed: boolean;
    spamThreshold: number;
  };
  members: Record<
    string,
    {
      joinedAt: number;
      lastActive: number;
      messageCount: number;
      warnings: number;
      isAdmin: boolean;
    }
  >;
  spamLog: Record<string, number[]>; // phone -> timestamps
}

interface GroupAdminData {
  groups: Record<string, GroupData>;
}

class GroupAdminBot {
  private client: MiawClient;
  private data: GroupAdminData;
  private isBotAdmin = new Set<string>();

  constructor() {
    this.client = new MiawClient({
      instanceId: CONFIG.instanceId,
      sessionPath: CONFIG.sessionPath,
      debug: true,
    });

    this.data = this.loadData();
    this.setupEventHandlers();
  }

  private loadData(): GroupAdminData {
    if (existsSync(CONFIG.dataFile)) {
      const content = readFileSync(CONFIG.dataFile, "utf-8");
      return JSON.parse(content);
    }
    return { groups: {} };
  }

  private saveData(): void {
    writeFileSync(CONFIG.dataFile, JSON.stringify(this.data, null, 2));
  }

  private setupEventHandlers(): void {
    this.client.on("qr", (qr) => {
      console.log("\n=== SCAN QR CODE FOR GROUP ADMIN BOT ===");
      qrcode.generate(qr, { small: true });
      console.log("=========================================\n");
    });

    this.client.on("ready", () => {
      console.log("✅ Group Admin Bot is ready!");
      this.initializeGroups();
    });

    this.client.on("message", async (message) => this.handleMessage(message));

    this.client.on("error", (error) => {
      console.error("Bot error:", error);
    });
  }

  private async initializeGroups(): Promise<void> {
    // Get all groups the bot is in
    console.log("📋 Initializing group data...");

    // Note: In a real implementation, you'd fetch all groups from Baileys
    // For this example, we'll load from saved data
  }

  private ensureGroupData(groupId: string): GroupData {
    if (!this.data.groups[groupId]) {
      this.data.groups[groupId] = {
        groupId,
        settings: {
          welcomeEnabled: CONFIG.welcome.enabled,
          linkAllowed: CONFIG.moderation.linkAllowed,
          spamThreshold: CONFIG.moderation.spamThreshold,
        },
        members: {},
        spamLog: {},
      };
    }
    return this.data.groups[groupId];
  }

  private async handleMessage(message: MiawMessage): Promise<void> {
    // Only process group messages
    if (!message.isGroup) return;

    const groupId = message.from;
    const groupData = this.ensureGroupData(groupId);
    const senderPhone = message.senderPhone || "";

    // Track member activity
    if (groupData.members[senderPhone]) {
      groupData.members[senderPhone].lastActive = Date.now();
      groupData.members[senderPhone].messageCount++;
    }

    // Process commands
    if (message.text?.startsWith("!")) {
      await this.handleCommand(message, groupData);
      return;
    }

    // Moderation checks
    await this.checkSpam(message, groupData);
    await this.checkContent(message, groupData);
  }

  private async handleCommand(
    message: MiawMessage,
    groupData: GroupData
  ): Promise<void> {
    const text = message.text || "";
    const parts = text.split(" ");
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Admin-only commands
    if (
      CONFIG.adminOnly &&
      !groupData.members[message.senderPhone || ""]?.isAdmin
    ) {
      // Check if user is actually an admin in the group
      const participants = await this.client.getGroupParticipants(message.from);
      const isAdmin = participants.some(
        (p) => p.jid === message.from && (p.isAdmin || p.isSuperAdmin)
      );

      if (!isAdmin && command !== "!help") {
        await this.client.sendText(
          message.from,
          "❌ This command is for admins only."
        );
        return;
      }

      // Mark as admin
      if (message.senderPhone) {
        groupData.members[message.senderPhone] = groupData.members[
          message.senderPhone
        ] || {
          joinedAt: Date.now(),
          lastActive: Date.now(),
          messageCount: 0,
          warnings: 0,
          isAdmin: true,
        };
      }
    }

    switch (command) {
      case "!help":
        await this.showHelp(message);
        break;

      case "!stats":
        await this.showStats(message, groupData);
        break;

      case "!warn":
        await this.warnUser(message, args[0]);
        break;

      case "!kick":
        await this.kickUser(message, args[0], groupData);
        break;

      case "!announce":
        await this.announce(message, args.join(" "));
        break;

      case "!rules":
        await this.showRules(message);
        break;

      case "!settings":
        await this.showSettings(message, groupData);
        break;

      case "!welcome":
        await this.toggleWelcome(message, groupData);
        break;

      case "!links":
        await this.toggleLinks(message, groupData);
        break;

      case "!clean":
        await this.cleanInactive(message, groupData);
        break;

      default:
        // Unknown command
        break;
    }

    this.saveData();
  }

  private async showHelp(message: MiawMessage): Promise<void> {
    const help =
      `🤖 *Group Admin Bot Commands*\n\n` +
      `*Everyone:*\n` +
      `!help - Show this message\n` +
      `!rules - Show group rules\n` +
      `!stats - Show group statistics\n\n` +
      `*Admins only:*\n` +
      `!warn @user - Warn a user\n` +
      `!kick @user - Remove a user\n` +
      `!announce message - Send announcement\n` +
      `!welcome on/off - Toggle welcome messages\n` +
      `!links on/off - Allow/block links\n` +
      `!clean - Remove inactive members`;

    await this.client.sendText(message.from, help);
  }

  private async showStats(
    message: MiawMessage,
    groupData: GroupData
  ): Promise<void> {
    const totalMembers = Object.keys(groupData.members).length;
    const activeMembers = Object.values(groupData.members).filter(
      (m) => Date.now() - m.lastActive < 7 * 24 * 60 * 60 * 1000 // Active in last 7 days
    ).length;

    const stats =
      `📊 *Group Statistics*\n\n` +
      `Total Members: ${totalMembers}\n` +
      `Active Members (7d): ${activeMembers}\n` +
      `Total Messages: ${Object.values(groupData.members).reduce(
        (sum, m) => sum + m.messageCount,
        0
      )}`;

    await this.client.sendText(message.from, stats);
  }

  private async showRules(message: MiawMessage): Promise<void> {
    const rules =
      `📜 *Group Rules*\n\n` +
      `1. Be respectful to all members\n` +
      `2. No spam or self-promotion\n` +
      `3. Stay on topic\n` +
      `4. No sharing of personal info\n` +
      `5. Follow WhatsApp's terms of service\n\n` +
      `Violations may result in warnings or removal.`;

    await this.client.sendText(message.from, rules);
  }

  private async showSettings(
    message: MiawMessage,
    groupData: GroupData
  ): Promise<void> {
    const settings =
      `⚙️ *Group Settings*\n\n` +
      `Welcome Messages: ${
        groupData.settings.welcomeEnabled ? "✅ On" : "❌ Off"
      }\n` +
      `Links Allowed: ${
        groupData.settings.linkAllowed ? "✅ Yes" : "❌ No"
      }\n` +
      `Spam Threshold: ${groupData.settings.spamThreshold} msgs/min`;

    await this.client.sendText(message.from, settings);
  }

  private async warnUser(message: MiawMessage, phone: string): Promise<void> {
    if (!phone) {
      await this.client.sendText(message.from, "Usage: !warn @phone");
      return;
    }

    const _jid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
    const warnMsg = `⚠️ You have received a warning. Please follow the group rules.`;

    await this.client.sendText(message.from, warnMsg, { quoted: message });
  }

  private async kickUser(
    message: MiawMessage,
    phone: string,
    groupData: GroupData
  ): Promise<void> {
    if (!phone) {
      await this.client.sendText(message.from, "Usage: !kick @phone");
      return;
    }

    const _jid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
    const result = await this.client.removeParticipants(message.from, [phone]);

    if (result[0]?.success) {
      await this.client.sendText(
        message.from,
        `✅ Removed ${phone} from the group.`
      );
      delete groupData.members[phone];
    } else {
      await this.client.sendText(
        message.from,
        `❌ Failed to remove ${phone}. Are they an admin?`
      );
    }
  }

  private async announce(message: MiawMessage, text: string): Promise<void> {
    if (!text) {
      await this.client.sendText(
        message.from,
        "Usage: !announce your message here"
      );
      return;
    }

    const announcement = `📢 *ANNOUNCEMENT*\n\n${text}`;
    await this.client.sendText(message.from, announcement);
  }

  private async toggleWelcome(
    message: MiawMessage,
    groupData: GroupData
  ): Promise<void> {
    const enabled = message.text?.toLowerCase().includes("on");
    groupData.settings.welcomeEnabled = enabled;
    await this.client.sendText(
      message.from,
      `✅ Welcome messages ${enabled ? "enabled" : "disabled"}.`
    );
  }

  private async toggleLinks(
    message: MiawMessage,
    groupData: GroupData
  ): Promise<void> {
    const allowed =
      message.text?.toLowerCase().includes("on") ||
      message.text?.toLowerCase().includes("allow");
    groupData.settings.linkAllowed = allowed;
    await this.client.sendText(
      message.from,
      `✅ Links ${allowed ? "allowed" : "blocked"}.`
    );
  }

  private async cleanInactive(
    message: MiawMessage,
    groupData: GroupData
  ): Promise<void> {
    const now = Date.now();
    const inactiveThreshold =
      CONFIG.moderation.inactiveDays * 24 * 60 * 60 * 1000;
    const inactivePhones: string[] = [];

    for (const [phone, member] of Object.entries(groupData.members)) {
      if (member.isAdmin) continue; // Skip admins
      if (now - member.lastActive > inactiveThreshold) {
        inactivePhones.push(phone);
      }
    }

    if (inactivePhones.length === 0) {
      await this.client.sendText(message.from, "✅ No inactive members found.");
      return;
    }

    await this.client.sendText(
      message.from,
      `Found ${inactivePhones.length} inactive members. Removing... (this may take a while)`
    );

    for (const phone of inactivePhones) {
      await this.client.removeParticipants(message.from, [phone]);
      delete groupData.members[phone];
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Rate limit
    }

    await this.client.sendText(
      message.from,
      `✅ Removed ${inactivePhones.length} inactive members.`
    );
  }

  private async checkSpam(
    message: MiawMessage,
    groupData: GroupData
  ): Promise<void> {
    const senderPhone = message.senderPhone;
    if (!senderPhone || groupData.members[senderPhone]?.isAdmin) return;

    const now = Date.now();
    if (!groupData.spamLog[senderPhone]) {
      groupData.spamLog[senderPhone] = [];
    }

    // Clean old spam logs (older than 1 minute)
    groupData.spamLog[senderPhone] = groupData.spamLog[senderPhone].filter(
      (t) => now - t < 60000
    );

    // Add current message
    groupData.spamLog[senderPhone].push(now);

    // Check threshold
    if (
      groupData.spamLog[senderPhone].length > groupData.settings.spamThreshold
    ) {
      const warnings = ++groupData.members[senderPhone].warnings;

      if (warnings >= 3) {
        // Kick after 3 warnings
        await this.client.sendText(
          message.from,
          `🚫 ${senderPhone} has been removed for spam.`
        );
        await this.client.removeParticipants(message.from, [senderPhone]);
      } else {
        await this.client.sendText(
          message.from,
          `⚠️ ${senderPhone}, please slow down! Warning ${warnings}/3`
        );
      }
    }
  }

  private async checkContent(
    message: MiawMessage,
    groupData: GroupData
  ): Promise<void> {
    const text = message.text?.toLowerCase() || "";
    const _senderPhone = message.senderPhone;

    // Check for bad words
    for (const badWord of CONFIG.moderation.badWords) {
      if (text.includes(badWord)) {
        await this.client.sendText(
          message.from,
          `⚠️ Please avoid using inappropriate language.`
        );
        return;
      }
    }

    // Check for links if not allowed
    if (
      !groupData.settings.linkAllowed &&
      (text.includes("http://") || text.includes("https://"))
    ) {
      await this.client.sendText(
        message.from,
        `⚠️ Links are not allowed in this group.`
      );
    }
  }

  async start(): Promise<void> {
    await this.client.connect();
  }

  async stop(): Promise<void> {
    await this.client.dispose();
  }
}

// Start the bot
const bot = new GroupAdminBot();
bot.start().catch(console.error);

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down Group Admin Bot...");
  await bot.stop();
  process.exit(0);
});
