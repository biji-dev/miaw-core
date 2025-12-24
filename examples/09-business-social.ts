/**
 * Business & Social Features Example (v0.9.0)
 *
 * Demonstrates business and social features:
 * - Label operations (WhatsApp Business only)
 * - Product catalog management (WhatsApp Business only)
 * - Newsletter/channel operations
 * - Contact management
 *
 * Note: Label and catalog features require a WhatsApp Business account.
 * Newsletter features work with regular WhatsApp accounts.
 */

import {
  MiawClient,
  LabelColor,
  PredefinedLabelId,
  Label,
  Product,
  ProductOptions,
} from "miaw-core";
import qrcode from "qrcode-terminal";

const client = new MiawClient({
  instanceId: "business-bot",
  sessionPath: "./sessions",
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ Business & Social Bot ready!");
});

client.on("message", async (message) => {
  const text = message.text?.toLowerCase() || "";
  const isBusinessAccount = message.from.endsWith("@s.whatsapp.net");

  // ============================================================
  // LABEL OPERATIONS (WhatsApp Business Only)
  // ============================================================

  // Create a new label
  if (text.startsWith("!createlabel ")) {
    const labelName = text.substring(13).trim();
    const label: Label = {
      name: labelName,
      color: LabelColor.Color18, // Pink
    };

    const result = await client.addLabel(label);

    if (result.success) {
      await client.sendText(message.from, `✅ Label created! ID: ${result.labelId}`);
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // Create label with predefined ID
  if (text === "!createlabels") {
    // Create using predefined label IDs
    const labels: Label[] = [
      { name: "VIP Customers", color: LabelColor.Color1 }, // Dark Blue
      { name: "Pending Orders", color: LabelColor.Color8 }, // Red
      { name: "Completed", color: LabelColor.Color5 }, // Green
    ];

    for (const label of labels) {
      await client.addLabel(label);
    }

    await client.sendText(message.from, "✅ Created sample labels!");
  }

  // Add label to current chat
  if (text.startsWith("!addchatlabel ")) {
    const labelId = text.substring(14).trim();
    const result = await client.addChatLabel(message.from, labelId);

    if (result.success) {
      await client.sendText(message.from, `✅ Label added to chat!`);
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // Remove label from current chat
  if (text.startsWith("!removechatlabel ")) {
    const labelId = text.substring(17).trim();
    const result = await client.removeChatLabel(message.from, labelId);

    if (result.success) {
      await client.sendText(message.from, `✅ Label removed from chat!`);
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // Add label to received message
  if (text.startsWith("!addmsglabel ") && message.id) {
    const labelId = text.substring(13).trim();
    const result = await client.addMessageLabel(message.id, message.from, labelId);

    if (result.success) {
      await client.sendText(message.from, `✅ Label added to message!`);
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // ============================================================
  // CATALOG/PRODUCT OPERATIONS (WhatsApp Business Only)
  // ============================================================

  // Get product catalog
  if (text === "!catalog") {
    const catalog = await client.getCatalog(message.from);

    if (catalog.success && catalog.products) {
      let response = `📦 *Product Catalog*\n\n`;
      for (const product of catalog.products) {
        response += `*${product.name}*\n`;
        response += `Price: $${(product.priceAmount1000! / 1000).toFixed(2)}\n`;
        if (product.description) {
          response += `${product.description}\n`;
        }
        response += `ID: ${product.id}\n\n`;
      }
      await client.sendText(message.from, response);
    } else {
      await client.sendText(message.from, "❌ No catalog found or not a business account");
    }
  }

  // Get catalog collections
  if (text === "!collections") {
    const collections = await client.getCollections(message.from);

    if (collections.length > 0) {
      let response = `🗂️ *Collections*\n\n`;
      for (const coll of collections) {
        response += `*${coll.name}*\n`;
        response += `ID: ${coll.id}\n`;
        if (coll.description) {
          response += `${coll.description}\n`;
        }
        response += `Products: ${coll.productCount}\n\n`;
      }
      await client.sendText(message.from, response);
    } else {
      await client.sendText(message.from, "No collections found");
    }
  }

  // Add a new product
  if (text.startsWith("!addproduct ")) {
    // Simplified example - in production, parse JSON or use structured format
    const productData: ProductOptions = {
      name: "Sample Product",
      priceAmount1000: 1999, // $19.99
      description: "A great product!",
      url: "https://example.com/product",
    };

    const result = await client.createProduct(productData);

    if (result.success) {
      await client.sendText(message.from, `✅ Product added! ID: ${result.productId}`);
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // ============================================================
  // NEWSLETTER/CHANNEL OPERATIONS
  // ============================================================

  // Create a newsletter/channel
  if (text.startsWith("!createnewsletter ")) {
    const name = text.substring(18).trim();
    const result = await client.createNewsletter(name);

    if (result.success && result.newsletterId) {
      await client.sendText(message.from, `✅ Newsletter created!\nID: ${result.newsletterId}\n\nShare this ID for others to follow!`);
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // Get newsletter metadata
  if (text.startsWith("!newsletterinfo ")) {
    const newsletterId = text.substring(16).trim();
    const metadata = await client.getNewsletterMetadata(newsletterId);

    if (metadata) {
      let response = `*Newsletter Info*\n\n`;
      response += `Name: ${metadata.name}\n`;
      response += `ID: ${metadata.id}\n`;
      if (metadata.description) {
        response += `Description: ${metadata.description}\n`;
      }
      response += `Subscribers: ${metadata.subscriberCount || "Unknown"}\n`;
      response += `Verified: ${metadata.isVerified ? "Yes ✅" : "No"}\n`;
      await client.sendText(message.from, response);
    } else {
      await client.sendText(message.from, "❌ Newsletter not found");
    }
  }

  // Follow a newsletter
  if (text.startsWith("!follow ")) {
    const newsletterId = text.substring(8).trim();
    const result = await client.followNewsletter(newsletterId);

    if (result.success) {
      await client.sendText(message.from, "✅ Followed newsletter!");
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // Unfollow newsletter
  if (text.startsWith("!unfollow ")) {
    const newsletterId = text.substring(10).trim();
    const result = await client.unfollowNewsletter(newsletterId);

    if (result.success) {
      await client.sendText(message.from, "✅ Unfollowed newsletter!");
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // Mute newsletter
  if (text.startsWith("!mutenewsletter ")) {
    const newsletterId = text.substring(15).trim();
    const result = await client.muteNewsletter(newsletterId);

    if (result.success) {
      await client.sendText(message.from, "✅ Newsletter muted!");
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // Fetch newsletter messages
  if (text.startsWith("!newslettermsgs ")) {
    const newsletterId = text.substring(16).trim();
    const messages = await client.fetchNewsletterMessages(newsletterId, 10);

    if (messages.messages.length > 0) {
      let response = `*Newsletter Messages*\n\n`;
      for (const msg of messages.messages) {
        response += `*${msg.text || "[Media]"}*\n`;
        response += `From: ${msg.senderName}\n`;
        response += `${new Date(msg.timestamp * 1000).toLocaleString()}\n\n`;
      }
      await client.sendText(message.from, response);
    } else {
      await client.sendText(message.from, "No messages found");
    }
  }

  // React to newsletter message
  if (text.startsWith("!reactnewsletter ")) {
    // Usage: !reactnewsletter newsletterId emoji
    const parts = text.substring(17).split(" ");
    if (parts.length >= 2) {
      const newsletterId = parts[0];
      const emoji = parts[1];
      // Note: You need a specific message ID from the newsletter
      // await client.reactToNewsletterMessage(newsletterId, messageId, emoji);
      await client.sendText(message.from, `Reacted with ${emoji}!`);
    }
  }

  // ============================================================
  // CONTACT MANAGEMENT
  // ============================================================

  // Add or edit a contact
  if (text.startsWith("!addcontact ")) {
    // Usage: !addcontact phone|name
    const args = text.substring(12).split("|");
    if (args.length >= 2) {
      const phone = args[0].trim();
      const name = args[1].trim();

      const result = await client.addOrEditContact({
        phone,
        name,
      });

      if (result.success) {
        await client.sendText(message.from, `✅ Contact saved: ${name}`);
      } else {
        await client.sendText(message.from, `❌ Failed: ${result.error}`);
      }
    } else {
      await client.sendText(message.from, "Usage: !addcontact phone|name");
    }
  }

  // Remove a contact
  if (text.startsWith("!removecontact ")) {
    const phone = text.substring(15).trim();
    const result = await client.removeContact(phone);

    if (result.success) {
      await client.sendText(message.from, "✅ Contact removed!");
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // ============================================================
  // HELP MENU
  // ============================================================

  if (text === "!help") {
    const helpText = `
*Business & Social Features (v0.9.0)*

*Labels (WhatsApp Business only):*
!createlabel <name> - Create new label
!createlabels - Create sample labels
!addchatlabel <id> - Add label to chat
!removechatlabel <id> - Remove label from chat
!addmsglabel <id> - Add label to message

*Catalog (WhatsApp Business only):*
!catalog - View product catalog
!collections - View catalog collections
!addproduct <json> - Add new product

*Newsletters/Channels:*
!createnewsletter <name> - Create newsletter
!newsletterinfo <id> - Get newsletter info
!follow <id> - Follow newsletter
!unfollow <id> - Unfollow newsletter
!mutenewsletter <id> - Mute newsletter
!newslettermsgs <id> - Fetch messages

*Contacts:*
!addcontact phone|name - Add/edit contact
!removecontact <phone> - Remove contact
    `;
    await client.sendText(message.from, helpText);
  }
});

client.connect().catch(console.error);
