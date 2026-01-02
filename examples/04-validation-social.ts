/**
 * Validation & Social Example (v0.4.0)
 *
 * Demonstrates contact validation and information features:
 * - Checking if phone numbers are on WhatsApp
 * - Getting contact information and status
 * - Getting business profile details
 * - Getting profile pictures
 * - Getting group information and participants
 */

import { MiawClient } from "miaw-core";
import qrcode from "qrcode-terminal";

const client = new MiawClient({
  instanceId: "validation-bot",
  sessionPath: "./sessions",
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ Validation Bot ready!");
});

client.on("message", async (message) => {
  if (message.fromMe) return;

  const text = message.text || "";

  // Check if a number is on WhatsApp
  // Usage: !check 628123456789
  if (text.startsWith("!check ")) {
    const phone = text.substring(7).trim();
    const result = await client.checkNumber(phone);

    if (result.exists) {
      await client.sendText(
        message.from,
        `✅ *${phone}* is on WhatsApp!\nJID: ${result.jid}`
      );
    } else {
      await client.sendText(
        message.from,
        `❌ *${phone}* is not on WhatsApp.`
      );
    }
  }

  // Check multiple numbers
  // Usage: !checkmany 628123456789,628987654321
  if (text.startsWith("!checkmany ")) {
    const phones = text.substring(11).split(",").map((p) => p.trim());
    const results = await client.checkNumbers(phones);

    let response = "*WhatsApp Number Check Results:*\n\n";
    for (const [phone, result] of Object.entries(results)) {
      const status = result.exists ? "✅" : "❌";
      response += `${status} ${phone}: ${result.exists ? result.jid : "Not found"}\n`;
    }

    await client.sendText(message.from, response);
  }

  // Get contact info
  if (text === "!myinfo") {
    const info = await client.getContactInfo(message.from);
    if (info) {
      let response = "*Your Info:*\n";
      response += `Name: ${info.name || "Unknown"}\n`;
      response += `Status: ${info.status || "No status"}\n`;
      response += `JID: ${info.jid}\n`;
      await client.sendText(message.from, response);
    }
  }

  // Get business profile
  if (text === "!business") {
    const profile = await client.getBusinessProfile(message.from);
    if (profile) {
      let response = "*Business Profile:*\n";
      response += `Business: ${profile.businessName || "N/A"}\n`;
      response += `Website: ${profile.website || "N/A"}\n`;
      response += `Email: ${profile.email || "N/A"}\n`;
      response += `Category: ${profile.category || "N/A"}\n`;
      response += `Address: ${profile.address || "N/A"}\n`;
      response += `Description: ${profile.description || "N/A"}\n`;
      await client.sendText(message.from, response);
    } else {
      await client.sendText(message.from, "❌ This is not a business account.");
    }
  }

  // Get profile picture
  if (text === "!pfp") {
    const pfp = await client.getProfilePicture(message.from, "high");
    if (pfp) {
      await client.sendText(message.from, `📸 Profile Picture: ${pfp}`);
    } else {
      await client.sendText(message.from, "❌ No profile picture found.");
    }
  }

  // Get group info (must be used in a group)
  if (text === "!groupinfo" && message.from.endsWith("@g.us")) {
    const groupInfo = await client.getGroupInfo(message.from);
    if (groupInfo) {
      let response = "*Group Information:*\n";
      response += `Name: ${groupInfo.name}\n`;
      response += `ID: ${groupInfo.id}\n`;
      response += `Created: ${groupInfo.createdAt ? new Date(groupInfo.createdAt * 1000).toLocaleString() : "Unknown"}\n`;
      response += `Owner: ${groupInfo.owner || "Unknown"}\n`;
      response += `Participants: ${groupInfo.participantCount || 0}\n`;
      response += `Description: ${groupInfo.description || "None"}\n`;
      response += `Is Announce: ${groupInfo.announce ? "Yes" : "No"}\n`;
      response += `Is Restricted: ${groupInfo.restricted ? "Yes" : "No"}\n`;
      await client.sendText(message.from, response);
    }
  }

  // Get group participants (must be used in a group)
  if (text === "!participants" && message.from.endsWith("@g.us")) {
    const participants = await client.getGroupParticipants(message.from);
    if (participants && participants.length > 0) {
      let response = "*Group Participants:*\n\n";
      for (const p of participants) {
        const role = p.isAdmin ? "👑 Admin" : p.isSuperAdmin ? "⭐ Owner" : "👤 Member";
        response += `${role}: ${p.id}\n`;
      }
      await client.sendText(message.from, response);
    }
  }

  // Help menu
  if (text === "!help") {
    const helpText = `
*Validation & Social Commands:*
!check <phone> - Check if number is on WhatsApp
!checkmany <p1,p2> - Check multiple numbers
!myinfo - Get your contact info
!business - Get business profile (if business account)
!pfp - Get profile picture URL
!groupinfo - Get group info (in group only)
!participants - List group participants (in group only)
    `;
    await client.sendText(message.from, helpText);
  }
});

client.connect().catch(console.error);
