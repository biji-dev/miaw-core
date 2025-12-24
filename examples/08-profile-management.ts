/**
 * Profile Management Example (v0.8.0)
 *
 * Demonstrates profile management features:
 * - Updating your profile picture (from file, URL, or Buffer)
 * - Removing your profile picture
 * - Updating your display name (push name)
 * - Updating your profile status (About text)
 */

import { MiawClient } from "miaw-core";
import { readFileSync } from "fs";
import qrcode from "qrcode-terminal";

const client = new MiawClient({
  instanceId: "profile-bot",
  sessionPath: "./sessions",
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ Profile Bot ready!");
});

client.on("message", async (message) => {
  if (message.fromMe) return;

  const text = message.text?.toLowerCase() || "";

  // === PROFILE PICTURE ===

  // Update profile picture from URL
  if (text.startsWith("!setpfpurl ")) {
    const url = text.substring(11).trim();
    const result = await client.updateProfilePicture({ url });

    if (result.success) {
      await client.sendText(message.from, "✅ Profile picture updated from URL!");
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // Update profile picture from local file
  if (text.startsWith("!setpfp ")) {
    const filePath = text.substring(8).trim();
    const result = await client.updateProfilePicture({ path: filePath });

    if (result.success) {
      await client.sendText(message.from, "✅ Profile picture updated from file!");
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // Update profile picture from Buffer
  if (text === "!setpfpbuffer") {
    try {
      const imageBuffer = readFileSync("./my-profile-pic.jpg");
      const result = await client.updateProfilePicture({ buffer: imageBuffer });

      if (result.success) {
        await client.sendText(message.from, "✅ Profile picture updated from Buffer!");
      } else {
        await client.sendText(message.from, `❌ Failed: ${result.error}`);
      }
    } catch (error) {
      await client.sendText(message.from, `❌ Failed to read file: ${error}`);
    }
  }

  // Remove profile picture (reset to default)
  if (text === "!removepfp") {
    const result = await client.removeProfilePicture();

    if (result.success) {
      await client.sendText(message.from, "✅ Profile picture removed!");
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // === PROFILE NAME ===

  // Update display name (push name)
  if (text.startsWith("!setname ")) {
    const newName = text.substring(9);
    const result = await client.updateProfileName(newName);

    if (result.success) {
      await client.sendText(message.from, `✅ Display name updated to: ${newName}`);
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // === PROFILE STATUS (ABOUT) ===

  // Update profile status (About text)
  if (text.startsWith("!setstatus ")) {
    const newStatus = text.substring(11);
    const result = await client.updateProfileStatus(newStatus);

    if (result.success) {
      await client.sendText(message.from, `✅ Status updated to: ${newStatus}`);
    } else {
      await client.sendText(message.from, `❌ Failed: ${result.error}`);
    }
  }

  // Set a cool status
  if (text === "!busystatus") {
    const result = await client.updateProfileStatus("Busy with automation 🤖");
    if (result.success) {
      await client.sendText(message.from, "✅ Status set to 'Busy with automation 🤖'");
    }
  }

  if (text === "!availablestatus") {
    const result = await client.updateProfileStatus("Available for chats 💬");
    if (result.success) {
      await client.sendText(message.from, "✅ Status set to 'Available for chats 💬'");
    }
  }

  // === PROFILE INFO ===

  // Get current profile info
  if (text === "!myprofile") {
    const info = await client.getContactInfo("self"); // Using self JID
    if (info) {
      let response = "*My Profile:*\n";
      response += `Name: ${info.name || "Not set"}\n`;
      response += `Status: ${info.status || "Not set"}\n`;
      await client.sendText(message.from, response);
    }
  }

  // Get own profile picture
  if (text === "!mypfp") {
    // Note: You'll need to use your own JID
    const pfp = await client.getProfilePicture("self", "high");
    if (pfp) {
      await client.sendText(message.from, `📸 My Profile Picture: ${pfp}`);
    } else {
      await client.sendText(message.from, "❌ No profile picture set.");
    }
  }

  // Bulk profile update
  if (text.startsWith("!updateprofile ")) {
    const name = text.substring(15).trim();
    const nameResult = await client.updateProfileName(name);
    const statusResult = await client.updateProfileStatus("Powered by Miaw Core 🚀");

    if (nameResult.success && statusResult.success) {
      await client.sendText(message.from, `✅ Profile updated!\nName: ${name}\nStatus: Powered by Miaw Core 🚀`);
    } else {
      await client.sendText(message.from, "❌ Failed to update profile");
    }
  }

  // Help menu
  if (text === "!help") {
    const helpText = `
*Profile Management Commands:*

*Profile Picture:*
!setpfpurl <url> - Set picture from URL
!setpfp <path> - Set picture from file
!setpfpbuffer - Set picture from Buffer (demo)
!removepfp - Remove profile picture

*Profile Name:*
!setname <name> - Update display name

*Profile Status (About):*
!setstatus <text> - Update status text
!busystatus - Set "Busy" status
!availablestatus - Set "Available" status
!updateprofile <name> - Update name + status

*View Profile:*
!myprofile - Get current profile info
!mypfp - Get my profile picture URL
    `;
    await client.sendText(message.from, helpText);
  }
});

client.connect().catch(console.error);
