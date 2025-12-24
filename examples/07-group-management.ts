/**
 * Group Management Example (v0.7.0)
 *
 * Demonstrates comprehensive group administration features:
 * - Creating new groups
 * - Adding and removing participants
 * - Promoting and demoting admins
 * - Updating group name and description
 * - Managing group profile picture
 * - Creating and revoking invite links
 * - Accepting group invites
 * - Getting group invite info
 * - Leaving groups
 */

import { MiawClient } from "miaw-core";
import qrcode from "qrcode-terminal";

const client = new MiawClient({
  instanceId: "group-admin-bot",
  sessionPath: "./sessions",
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ Group Admin Bot ready!");
});

client.on("message", async (message) => {
  const text = message.text?.toLowerCase() || "";

  // === GROUP CREATION ===

  // Create a new group
  // Usage: !creategroup Group Name phone1,phone2,phone3
  if (text.startsWith("!creategroup ")) {
    const args = text.substring(13).trim();
    const firstSpace = args.indexOf(" ");
    if (firstSpace === -1) {
      await client.sendText(message.from, "Usage: !creategroup Group Name phone1,phone2,phone3");
      return;
    }

    const groupName = args.substring(0, firstSpace);
    const participantsStr = args.substring(firstSpace + 1);
    const participants = participantsStr.split(",").map((p) => p.trim());

    const result = await client.createGroup(groupName, participants);

    if (result.success) {
      await client.sendText(
        message.from,
        `✅ Group created!\nID: ${result.groupId}\nName: ${result.name}\nParticipants: ${result.participantCount}`
      );
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // === PARTICIPANT MANAGEMENT ===

  // Add participants to group (must be admin)
  // Usage: !add phone1,phone2,phone3
  if (text.startsWith("!add ") && message.from.endsWith("@g.us")) {
    const phones = text.substring(5).split(",").map((p) => p.trim());
    const results = await client.addParticipants(message.from, phones);

    let response = "*Add Results:*\n";
    for (const r of results) {
      const status = r.success ? "✅" : "❌";
      response += `${status} ${r.phone}: ${r.success ? "Added" : r.error}\n`;
    }
    await client.sendText(message.from, response);
  }

  // Remove participants from group (must be admin)
  // Usage: !remove phone1,phone2,phone3
  if (text.startsWith("!remove ") && message.from.endsWith("@g.us")) {
    const phones = text.substring(8).split(",").map((p) => p.trim());
    const results = await client.removeParticipants(message.from, phones);

    let response = "*Remove Results:*\n";
    for (const r of results) {
      const status = r.success ? "✅" : "❌";
      response += `${status} ${r.phone}: ${r.success ? "Removed" : r.error}\n`;
    }
    await client.sendText(message.from, response);
  }

  // Leave current group
  if (text === "!leave" && message.from.endsWith("@g.us")) {
    await client.sendText(message.from, "Goodbye! 👋");
    await client.leaveGroup(message.from);
  }

  // === ADMIN MANAGEMENT ===

  // Promote to admin (must be admin)
  // Usage: !promote phone1,phone2
  if (text.startsWith("!promote ") && message.from.endsWith("@g.us")) {
    const phones = text.substring(9).split(",").map((p) => p.trim());
    const results = await client.promoteToAdmin(message.from, phones);

    let response = "*Promote Results:*\n";
    for (const r of results) {
      const status = r.success ? "✅" : "❌";
      response += `${status} ${r.phone}: ${r.success ? "Promoted" : r.error}\n`;
    }
    await client.sendText(message.from, response);
  }

  // Demote from admin (must be admin)
  // Usage: !demote phone1,phone2
  if (text.startsWith("!demote ") && message.from.endsWith("@g.us")) {
    const phones = text.substring(7).split(",").map((p) => p.trim());
    const results = await client.demoteFromAdmin(message.from, phones);

    let response = "*Demote Results:*\n";
    for (const r of results) {
      const status = r.success ? "✅" : "❌";
      response += `${status} ${r.phone}: ${r.success ? "Demoted" : r.error}\n`;
    }
    await client.sendText(message.from, response);
  }

  // === GROUP SETTINGS ===

  // Update group name (must be admin)
  // Usage: !groupname New Name Here
  if (text.startsWith("!groupname ") && message.from.endsWith("@g.us")) {
    const newName = text.substring(11);
    const result = await client.updateGroupName(message.from, newName);

    if (result.success) {
      await client.sendText(message.from, "✅ Group name updated!");
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // Update group description (must be admin)
  // Usage: !groupdesc Your description here
  if (text.startsWith("!groupdesc ") && message.from.endsWith("@g.us")) {
    const desc = text.substring(11);
    const result = await client.updateGroupDescription(message.from, desc);

    if (result.success) {
      await client.sendText(message.from, "✅ Group description updated!");
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // Clear group description
  if (text === "!cleargroupdesc" && message.from.endsWith("@g.us")) {
    const result = await client.updateGroupDescription(message.from, "");
    if (result.success) {
      await client.sendText(message.from, "✅ Group description cleared!");
    }
  }

  // Update group picture (must be admin)
  if (text === "!grouppic" && message.from.endsWith("@g.us")) {
    const result = await client.updateGroupPicture(message.from, {
      path: "./group-image.jpg",
    });

    if (result.success) {
      await client.sendText(message.from, "✅ Group picture updated!");
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // === GROUP INVITES ===

  // Get group invite link (must be admin)
  if (text === "!invitelink" && message.from.endsWith("@g.us")) {
    const result = await client.getGroupInviteLink(message.from);

    if (result.success) {
      await client.sendText(message.from, `🔗 Group Invite: ${result.url}`);
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // Revoke and get new invite link (must be admin)
  if (text === "!revokeinvite" && message.from.endsWith("@g.us")) {
    const result = await client.revokeGroupInvite(message.from);

    if (result.success) {
      await client.sendText(message.from, `🔗 New Invite Link: ${result.url}`);
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // Accept group invite
  // Usage: !join <invite-code> or !join https://chat.whatsapp.com/...
  if (text.startsWith("!join ")) {
    const invite = text.substring(5).trim();
    const result = await client.acceptGroupInvite(invite);

    if (result.success) {
      await client.sendText(message.from, `✅ Joined group! ID: ${result.groupId}`);
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // Get invite info without joining
  // Usage: !inviteinfo <invite-code>
  if (text.startsWith("!inviteinfo ")) {
    const invite = text.substring(12).trim();
    const info = await client.getGroupInviteInfo(invite);

    if (info) {
      let response = "*Group Info:*\n";
      response += `Name: ${info.name}\n`;
      response += `ID: ${info.id}\n`;
      response += `Owner: ${info.owner}\n`;
      response += `Created: ${info.createdAt ? new Date(info.createdAt * 1000).toLocaleString() : "Unknown"}\n`;
      if (info.description) {
        response += `Description: ${info.description}\n`;
      }
      response += `Participants: ${info.participantCount}\n`;
      await client.sendText(message.from, response);
    } else {
      await client.sendText(message.from, "❌ Invalid invite code");
    }
  }

  // Help menu
  if (text === "!help") {
    const helpText = `
*Group Management Commands:*

*Creation:*
!creategroup <name> <p1,p2,p3> - Create new group

*Participants:*
!add <phone1,phone2> - Add members (admin only)
!remove <phone1,phone2> - Remove members (admin only)
!leave - Leave current group

*Admin:*
!promote <phone1,phone2> - Promote to admin (admin only)
!demote <phone1,phone2> - Demote to member (admin only)

*Settings:*
!groupname <new name> - Update group name (admin)
!groupdesc <desc> - Update description (admin)
!cleargroupdesc - Clear description (admin)
!grouppic - Update group picture (admin)

*Invites:*
!invitelink - Get invite link (admin)
!revokeinvite - Revoke and get new link (admin)
!join <code> - Join via invite code
!inviteinfo <code> - Preview group info
    `;
    await client.sendText(message.from, helpText);
  }
});

client.connect().catch(console.error);
