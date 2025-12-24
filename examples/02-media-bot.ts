/**
 * Media Bot Example (v0.2.0)
 *
 * Demonstrates media handling capabilities:
 * - Sending images with captions
 * - Sending videos with GIF support
 * - Sending audio and voice notes
 * - Sending documents
 * - Downloading media from received messages
 */

import { MiawClient } from "miaw-core";
import { writeFileSync } from "fs";
import qrcode from "qrcode-terminal";

const client = new MiawClient({
  instanceId: "media-bot",
  sessionPath: "./sessions",
});

client.on("qr", (qr) => {
  console.log("\n=== SCAN QR CODE ===");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ Media Bot ready!");
});

client.on("message", async (message) => {
  if (message.fromMe) return;

  const text = message.text?.toLowerCase() || "";

  // Send image
  if (text === "!image") {
    await client.sendImage(message.from, {
      url: "https://picsum.photos/800/600",
      caption: "Here's a random image!",
    });
  }

  // Send image from local file
  if (text === "!local") {
    await client.sendImage(message.from, {
      path: "./my-photo.jpg",
      caption: "Here's a local photo!",
    });
  }

  // Send video
  if (text === "!video") {
    await client.sendVideo(message.from, {
      url: "https://sample-videos.com/video123.mp4",
      caption: "Check out this video!",
    });
  }

  // Send audio (voice note)
  if (text === "!voice") {
    await client.sendAudio(message.from, {
      path: "./voice-note.mp3",
      ptt: true, // Push-to-talk (voice note)
    });
  }

  // Send document
  if (text === "!pdf") {
    await client.sendDocument(message.from, {
      path: "./document.pdf",
      caption: "Here's the document you requested.",
    });
  }

  // Download received media
  if (message.media) {
    console.log(`📎 Media received: ${message.type}`);
    console.log(`   Mimetype: ${message.media.mimetype}`);
    console.log(`   Size: ${message.media.fileSize || "unknown"}`);

    // Download the media
    const buffer = await client.downloadMedia(message);
    const extension = message.media.mimetype.split("/")[1] || "bin";
    const filename = `./downloads/${message.id}.${extension}`;

    writeFileSync(filename, buffer);
    console.log(`💾 Saved to: ${filename}`);
  }
});

client.connect().catch(console.error);
