/**
 * Customer Service Bot - Real World Example
 *
 * A production-ready customer service bot with:
 * - Auto-replies with business hours info
 * - Label-based conversation tracking (Business account)
 * - Agent handoff notifications
 * - Common FAQ responses
 * - Sentiment-based routing
 */

import { MiawClient, LabelColor } from "miaw-core";
import qrcode from "qrcode-terminal";

// Configuration
const CONFIG = {
  instanceId: "customer-service-bot",
  sessionPath: "./sessions",
  businessHours: {
    start: 9, // 9 AM
    end: 17, // 5 PM
    timezone: "UTC",
  },
  autoReply: true,
  agents: ["628111111111@s.whatsapp.net", "628222222222@s.whatsapp.net"],
  keywords: {
    urgent: ["urgent", "emergency", "asap", "immediately"],
    billing: ["billing", "payment", "invoice", "refund"],
    technical: ["error", "bug", "issue", "problem", "not working"],
    pricing: ["price", "cost", "how much", "pricing"],
  },
  labels: {
    new: "New Inquiry",
    urgent: "Urgent",
    billing: "Billing",
    technical: "Technical Support",
    resolved: "Resolved",
  },
};

class CustomerServiceBot {
  private client: MiawClient;
  private ticketCounter = 0;

  constructor() {
    this.client = new MiawClient({
      instanceId: CONFIG.instanceId,
      sessionPath: CONFIG.sessionPath,
      debug: true,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on("qr", (qr) => {
      console.log("\n=== SCAN QR CODE FOR CUSTOMER SERVICE BOT ===");
      qrcode.generate(qr, { small: true });
      console.log("================================================\n");
    });

    this.client.on("ready", () => {
      console.log("✅ Customer Service Bot is ready!");
      this.initializeLabels();
    });

    this.client.on("message", async (message) => this.handleMessage(message));

    this.client.on("error", (error) => {
      console.error("Bot error:", error);
    });
  }

  private async initializeLabels(): Promise<void> {
    // Create labels for conversation tracking (Business account only)
    const labels = [
      { name: CONFIG.labels.new, color: LabelColor.Color1 },
      { name: CONFIG.labels.urgent, color: LabelColor.Color8 },
      { name: CONFIG.labels.billing, color: LabelColor.Color5 },
      { name: CONFIG.labels.technical, color: LabelColor.Color3 },
      { name: CONFIG.labels.resolved, color: LabelColor.Color10 },
    ];

    for (const label of labels) {
      await this.client.addLabel(label);
    }

    console.log("✅ Labels initialized");
  }

  private async handleMessage(message: any): Promise<void> {
    if (message.fromMe) return;

    const text = message.text?.toLowerCase() || "";
    const ticketId = ++this.ticketCounter;

    console.log(`📩 Ticket #${ticketId} from ${message.from}: ${message.text}`);

    // Categorize message
    const category = this.categorizeMessage(text);
    const isUrgent = this.isUrgent(text);
    const isBusinessHours = this.isBusinessHours();

    // Auto-reply based on category
    if (CONFIG.autoReply) {
      await this.sendAutoReply(message, category, isUrgent, isBusinessHours, ticketId);
    }

    // Add label (Business account)
    if (category) {
      await this.client.addChatLabel(message.from, category);
    }

    // Route to agents if urgent or outside business hours
    if (isUrgent || !isBusinessHours) {
      await this.notifyAgents(message, category, isUrgent, ticketId);
    }
  }

  private categorizeMessage(text: string): string | null {
    // Check for billing inquiries
    if (CONFIG.keywords.billing.some((k) => text.includes(k))) {
      return CONFIG.labels.billing;
    }

    // Check for technical issues
    if (CONFIG.keywords.technical.some((k) => text.includes(k))) {
      return CONFIG.labels.technical;
    }

    // Check for pricing inquiries
    if (CONFIG.keywords.pricing.some((k) => text.includes(k))) {
      return "Pricing"; // No label, just category
    }

    return CONFIG.labels.new;
  }

  private isUrgent(text: string): boolean {
    return CONFIG.keywords.urgent.some((k) => text.includes(k));
  }

  private isBusinessHours(): boolean {
    const now = new Date();
    const hour = parseInt(now.toLocaleString("en-US", { timeZone: CONFIG.businessHours.timezone, hour: "numeric" }));
    return hour >= CONFIG.businessHours.start && hour < CONFIG.businessHours.end;
  }

  private async sendAutoReply(
    message: any,
    category: string | null,
    isUrgent: boolean,
    isBusinessHours: boolean,
    ticketId: number
  ): Promise<void> {
    let response = `🎫 *Ticket #${ticketId}*\n\n`;
    response += `Thank you for contacting us! ${isUrgent ? "🚨 This has been marked as URGENT." : ""}\n\n`;

    // Custom responses based on category
    if (category === CONFIG.labels.billing) {
      response += `I see you have a billing inquiry. Here are some quick answers:\n\n`;
      response += `💳 *Payment Methods:* We accept credit cards, PayPal, and bank transfers.\n`;
      response += `📄 *Invoices:* Sent automatically within 24 hours of payment.\n`;
      response += `💰 *Refunds:* Processed within 5-7 business days.\n\n`;
      response += `For more details, please contact our billing team.`;
    } else if (category === CONFIG.labels.technical) {
      response += `I see you're experiencing a technical issue. Let's troubleshoot:\n\n`;
      response += `🔧 *Try these steps:*\n`;
      response += `1. Clear your browser cache\n`;
      response += `2. Try a different browser\n`;
      response += `3. Check our status page: status.example.com\n\n`;
      response += `If the issue persists, our technical team will assist you shortly.`;
    } else {
      response += `Our team will get back to you within ${isBusinessHours ? "1 hour" : "the next business day"}.`;
    }

    // Add business hours info
    response += `\n\n🕐 *Business Hours:* ${CONFIG.businessHours.start}:00 - ${CONFIG.businessHours.end}:00 (${CONFIG.businessHours.timezone})`;

    // Add help command
    response += `\n\nType *!help* for available commands.`;

    await this.client.sendText(message.from, response);
  }

  private async notifyAgents(message: any, category: string | null, isUrgent: boolean, ticketId: number): Promise<void> {
    for (const agentJid of CONFIG.agents) {
      let notification = `🆘 *New Customer Inquiry*\n\n`;
      notification += `🎫 Ticket #${ticketId}\n`;
      notification += `👤 Customer: ${message.from}\n`;
      notification += `💬 Message: ${message.text}\n`;
      notification += `📁 Category: ${category || "General"}\n`;
      if (isUrgent) notification += `🚨 URGENT\n`;
      notification += `\nPlease respond to the customer directly.`;

      await this.client.sendText(agentJid, notification);
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
const bot = new CustomerServiceBot();
bot.start().catch(console.error);

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down Customer Service Bot...");
  await bot.stop();
  process.exit(0);
});
