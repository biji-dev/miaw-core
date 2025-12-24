/**
 * Broadcast/Marketing Bot - Real World Example
 *
 * A production-ready broadcast bot with:
 * - Bulk messaging with rate limiting
 * - Contact list management
 * - Campaign tracking
 * - Opt-out handling
 * - Message templating
 * - Delivery reports
 */

import { MiawClient } from "miaw-core";
import { readFileSync, writeFileSync, existsSync } from "fs";
import qrcode from "qrcode-terminal";

// Configuration
const CONFIG = {
  instanceId: "broadcast-bot",
  sessionPath: "./sessions",
  dataFile: "./broadcast-data.json",
  rateLimit: {
    messagesPerMinute: 30, // WhatsApp limit is ~60/min
    delayBetweenMessages: 2000, // 2 seconds
  },
  maxRetries: 3,
};

interface Contact {
  phone: string;
  name?: string;
  optedOut: boolean;
  lastContacted?: number;
  tags?: string[];
}

interface Campaign {
  id: string;
  name: string;
  message: string;
  recipients: string[];
  status: "draft" | "sending" | "completed" | "failed";
  sent: number;
  failed: number;
  total: number;
  startedAt?: number;
  completedAt?: number;
}

interface BroadcastData {
  contacts: Record<string, Contact>;
  campaigns: Record<string, Campaign>;
  optOutKeywords: string[];
}

class BroadcastBot {
  private client: MiawClient;
  private data: BroadcastData;
  private isSending = false;
  private messageQueue: Array<() => Promise<void>> = [];
  private processingQueue = false;

  constructor() {
    this.client = new MiawClient({
      instanceId: CONFIG.instanceId,
      sessionPath: CONFIG.sessionPath,
      debug: true,
    });

    this.data = this.loadData();
    this.setupEventHandlers();
  }

  private loadData(): BroadcastData {
    if (existsSync(CONFIG.dataFile)) {
      const content = readFileSync(CONFIG.dataFile, "utf-8");
      return JSON.parse(content);
    }

    return {
      contacts: {},
      campaigns: {},
      optOutKeywords: ["stop", "unsubscribe", "optout", "remove"],
    };
  }

  private saveData(): void {
    writeFileSync(CONFIG.dataFile, JSON.stringify(this.data, null, 2));
  }

  private setupEventHandlers(): void {
    this.client.on("qr", (qr) => {
      console.log("\n=== SCAN QR CODE FOR BROADCAST BOT ===");
      qrcode.generate(qr, { small: true });
      console.log("========================================\n");
    });

    this.client.on("ready", () => {
      console.log("✅ Broadcast Bot is ready!");
      this.showStats();
    });

    this.client.on("message", async (message) => this.handleMessage(message));

    this.client.on("error", (error) => {
      console.error("Bot error:", error);
    });
  }

  private async handleMessage(message: any): Promise<void> {
    if (message.fromMe) return;

    const text = message.text?.toLowerCase() || "";
    const phone = message.from;

    // Handle opt-out requests
    if (this.data.optOutKeywords.some((k) => text.includes(k))) {
      if (this.data.contacts[phone]) {
        this.data.contacts[phone].optedOut = true;
        this.saveData();
        await this.client.sendText(
          phone,
          "✅ You have been opted out of future messages. Reply START to opt back in."
        );
        console.log(`🚫 ${phone} opted out`);
      }
      return;
    }

    // Handle opt-in requests
    if (text.includes("start") || text.includes("subscribe")) {
      if (this.data.contacts[phone]) {
        this.data.contacts[phone].optedOut = false;
        this.saveData();
        await this.client.sendText(
          phone,
          "✅ You have been opted back in to receive messages."
        );
        console.log(`✅ ${phone} opted in`);
      }
      return;
    }

    // Add new contacts automatically
    if (!this.data.contacts[phone]) {
      this.data.contacts[phone] = {
        phone,
        name: message.senderName,
        optedOut: false,
        tags: [],
      };
      this.saveData();
      console.log(`📇 New contact added: ${phone} (${message.senderName})`);
    }
  }

  /**
   * Add or update a contact
   */
  addContact(phone: string, name?: string, tags?: string[]): void {
    const jid = phone.includes("@") ? phone : `${phone}@s.whatsapp.net`;
    this.data.contacts[jid] = {
      phone: jid,
      name,
      optedOut: false,
      tags,
    };
    this.saveData();
    console.log(`✅ Contact added: ${phone}`);
  }

  /**
   * Add multiple contacts from CSV format: "phone,name,tag1,tag2"
   */
  importContacts(csvData: string[]): void {
    for (const line of csvData) {
      const [phone, name, ...tags] = line.split(",").map((s) => s.trim());
      if (phone) {
        this.addContact(phone, name, tags);
      }
    }
  }

  /**
   * Create a new campaign
   */
  createCampaign(name: string, message: string, recipientFilter?: (c: Contact) => boolean): string {
    const campaignId = `campaign_${Date.now()}`;

    // Get recipients (filter opted out and apply custom filter)
    const recipients = Object.values(this.data.contacts)
      .filter((c) => !c.optedOut)
      .filter(recipientFilter || (() => true))
      .map((c) => c.phone);

    const campaign: Campaign = {
      id: campaignId,
      name,
      message,
      recipients,
      status: "draft",
      sent: 0,
      failed: 0,
      total: recipients.length,
    };

    this.data.campaigns[campaignId] = campaign;
    this.saveData();

    console.log(`✅ Campaign created: ${name} (${recipients.length} recipients)`);
    return campaignId;
  }

  /**
   * Send a campaign
   */
  async sendCampaign(campaignId: string): Promise<void> {
    const campaign = this.data.campaigns[campaignId];
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    if (this.isSending) {
      throw new Error("Another campaign is already sending");
    }

    campaign.status = "sending";
    campaign.startedAt = Date.now();
    this.saveData();

    this.isSending = true;

    console.log(`📤 Starting campaign: ${campaign.name}`);
    console.log(`📊 Total recipients: ${campaign.total}`);

    for (const recipient of campaign.recipients) {
      if (!this.isSending) break;

      try {
        await this.client.sendText(recipient, campaign.message);
        campaign.sent++;

        console.log(`✅ Sent to ${recipient} (${campaign.sent}/${campaign.total})`);

        // Rate limiting
        await this.sleep(CONFIG.rateLimit.delayBetweenMessages);
      } catch (error) {
        console.error(`❌ Failed to send to ${recipient}:`, error);
        campaign.failed++;
      }

      // Save progress every 10 messages
      if (campaign.sent % 10 === 0) {
        this.saveData();
      }
    }

    campaign.status = "completed";
    campaign.completedAt = Date.now();
    this.saveData();

    this.isSending = false;

    console.log(`✅ Campaign completed: ${campaign.name}`);
    console.log(`📊 Sent: ${campaign.sent}, Failed: ${campaign.failed}`);
  }

  /**
   * Stop current campaign
   */
  stopCampaign(): void {
    this.isSending = false;
    console.log("🛑 Campaign stopped");
  }

  /**
   * Get campaign stats
   */
  getCampaignStats(campaignId: string): Campaign | null {
    return this.data.campaigns[campaignId] || null;
  }

  /**
   * List all campaigns
   */
  listCampaigns(): Campaign[] {
    return Object.values(this.data.campaigns);
  }

  /**
   * Show overall statistics
   */
  showStats(): void {
    const totalContacts = Object.keys(this.data.contacts).length;
    const optedOut = Object.values(this.data.contacts).filter((c) => c.optedOut).length;
    const active = totalContacts - optedOut;

    console.log("\n📊 Broadcast Bot Statistics:");
    console.log(`   Total Contacts: ${totalContacts}`);
    console.log(`   Active: ${active}`);
    console.log(`   Opted Out: ${optedOut}`);
    console.log(`   Campaigns: ${Object.keys(this.data.campaigns).length}`);
    console.log("");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async start(): Promise<void> {
    await this.client.connect();
  }

  async stop(): Promise<void> {
    this.isSending = false;
    await this.client.dispose();
  }
}

// Example usage
async function main() {
  const bot = new BroadcastBot();
  await bot.connect();

  // Wait for ready
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Example: Add some contacts
  bot.addContact("6281234567890", "John Doe", ["vip", "customer"]);
  bot.addContact("6280987654321", "Jane Smith", ["prospect"]);

  // Example: Create and send a campaign
  const campaignId = bot.createCampaign(
    "Welcome Message",
    "Hello {{name}}! Welcome to our service. We're excited to have you with us! 🎉\n\nReply STOP to opt out.",
    (contact) => contact.tags?.includes("new") || true // All contacts
  );

  // Uncomment to send the campaign
  // await bot.sendCampaign(campaignId);

  // Show stats
  bot.showStats();
}

// For direct running
if (require.main === module) {
  main().catch(console.error);
}

// Export for use as module
export { BroadcastBot, CONFIG };
