/**
 * Unit Tests for MessageHandler
 */

import { MessageHandler } from "../../src/handlers/MessageHandler.js";
import { MiawMessage } from "../../src/types/index.js";

describe("MessageHandler", () => {
  describe("formatPhoneToJid", () => {
    it("should format raw phone number to JID", () => {
      expect(MessageHandler.formatPhoneToJid("1234567890")).toBe(
        "1234567890@s.whatsapp.net"
      );
      expect(MessageHandler.formatPhoneToJid("628123456789")).toBe(
        "628123456789@s.whatsapp.net"
      );
    });

    it("should handle phone numbers with special characters", () => {
      expect(MessageHandler.formatPhoneToJid("+1-234-567-8900")).toBe(
        "12345678900@s.whatsapp.net"
      );
      expect(MessageHandler.formatPhoneToJid("(628) 123 456 789")).toBe(
        "628123456789@s.whatsapp.net"
      );
      expect(MessageHandler.formatPhoneToJid("628.123.456.789")).toBe(
        "628123456789@s.whatsapp.net"
      );
    });

    it("should return existing JIDs as-is", () => {
      expect(MessageHandler.formatPhoneToJid("1234567890@s.whatsapp.net")).toBe(
        "1234567890@s.whatsapp.net"
      );
      expect(MessageHandler.formatPhoneToJid("abcd1234@lid")).toBe(
        "abcd1234@lid"
      );
      expect(MessageHandler.formatPhoneToJid("group123@g.us")).toBe(
        "group123@g.us"
      );
      expect(MessageHandler.formatPhoneToJid("12345@c.us")).toBe("12345@c.us");
      expect(MessageHandler.formatPhoneToJid("status@broadcast")).toBe(
        "status@broadcast"
      );
      expect(MessageHandler.formatPhoneToJid("newsletter@newsletter")).toBe(
        "newsletter@newsletter"
      );
    });

    it("should handle empty string", () => {
      expect(MessageHandler.formatPhoneToJid("")).toBe("@s.whatsapp.net");
    });

    it("should handle single digit", () => {
      expect(MessageHandler.formatPhoneToJid("1")).toBe("1@s.whatsapp.net");
    });
  });

  describe("formatJidToPhone", () => {
    it("should extract phone from standard JID", () => {
      expect(MessageHandler.formatJidToPhone("6281234567890@s.whatsapp.net"))
        .toBe("6281234567890");
    });

    it("should strip device suffix from JID", () => {
      expect(MessageHandler.formatJidToPhone("6285604722341:72@s.whatsapp.net"))
        .toBe("6285604722341");
    });

    it("should handle JID with device suffix :0", () => {
      expect(MessageHandler.formatJidToPhone("1234567890:0@s.whatsapp.net"))
        .toBe("1234567890");
    });

    it("should return undefined for LID JIDs", () => {
      expect(MessageHandler.formatJidToPhone("42877077966917@lid"))
        .toBeUndefined();
    });

    it("should return undefined for group JIDs", () => {
      expect(MessageHandler.formatJidToPhone("120363039902323086@g.us"))
        .toBeUndefined();
    });

    it("should return undefined for empty string", () => {
      expect(MessageHandler.formatJidToPhone(""))
        .toBeUndefined();
    });

    it("should handle JID without device suffix", () => {
      expect(MessageHandler.formatJidToPhone("1234567890@s.whatsapp.net"))
        .toBe("1234567890");
    });
  });

  describe("isGroupJid", () => {
    it("should return true for group JIDs", () => {
      expect(MessageHandler.isGroupJid("123456789@g.us")).toBe(true);
      expect(MessageHandler.isGroupJid("abcdefgh12345678@g.us")).toBe(true);
    });

    it("should return false for individual chat JIDs", () => {
      expect(MessageHandler.isGroupJid("1234567890@s.whatsapp.net")).toBe(
        false
      );
      expect(MessageHandler.isGroupJid("abcd1234@lid")).toBe(false);
    });

    it("should return false for other JID types", () => {
      expect(MessageHandler.isGroupJid("status@broadcast")).toBe(false);
      expect(MessageHandler.isGroupJid("newsletter@newsletter")).toBe(false);
    });
  });

  describe("extractChatId", () => {
    it("should extract chat ID from message", () => {
      const message: MiawMessage = {
        id: "msg123",
        from: "1234567890@s.whatsapp.net",
        senderPhone: "1234567890",
        senderName: "John",
        timestamp: 1234567890,
        isGroup: false,
        fromMe: false,
        type: "text",
      };
      expect(MessageHandler.extractChatId(message)).toBe(
        "1234567890@s.whatsapp.net"
      );
    });

    it("should extract group chat ID", () => {
      const message: MiawMessage = {
        id: "msg123",
        from: "group123@g.us",
        senderPhone: "1234567890",
        senderName: "John",
        timestamp: 1234567890,
        isGroup: true,
        fromMe: false,
        type: "text",
      };
      expect(MessageHandler.extractChatId(message)).toBe("group123@g.us");
    });
  });

  describe("normalize", () => {
    it("should return null for empty message object", () => {
      expect(MessageHandler.normalize({})).toBeNull();
    });

    it("should return null for message without messages array", () => {
      expect(MessageHandler.normalize({ foo: "bar" })).toBeNull();
    });

    it("should return null for empty messages array", () => {
      expect(MessageHandler.normalize({ messages: [] })).toBeNull();
    });

    it("should normalize text message", () => {
      const baileysMessage = {
        messages: [
          {
            key: {
              id: "msg123",
              remoteJid: "1234567890@s.whatsapp.net",
              senderPn: "1234567890",
              fromMe: false,
            },
            pushName: "John Doe",
            message: {
              conversation: "Hello World",
            },
            messageTimestamp: 1234567890,
          },
        ],
      };

      const result = MessageHandler.normalize(baileysMessage);
      expect(result).not.toBeNull();
      expect(result?.id).toBe("msg123");
      expect(result?.from).toBe("1234567890@s.whatsapp.net");
      expect(result?.senderPhone).toBe("1234567890");
      expect(result?.senderName).toBe("John Doe");
      expect(result?.text).toBe("Hello World");
      expect(result?.type).toBe("text");
      expect(result?.isGroup).toBe(false);
      expect(result?.fromMe).toBe(false);
      expect(result?.timestamp).toBe(1234567890);
    });

    it("should normalize text message with extendedTextMessage", () => {
      const baileysMessage = {
        messages: [
          {
            key: {
              id: "msg124",
              remoteJid: "1234567890@s.whatsapp.net",
              senderPn: "1234567890",
              fromMe: false,
            },
            pushName: "John Doe",
            message: {
              extendedTextMessage: {
                text: "Extended text",
              },
            },
            messageTimestamp: 1234567890,
          },
        ],
      };

      const result = MessageHandler.normalize(baileysMessage);
      expect(result?.text).toBe("Extended text");
      expect(result?.type).toBe("text");
    });

    it("should normalize image message with metadata", () => {
      const baileysMessage = {
        messages: [
          {
            key: {
              id: "msg125",
              remoteJid: "1234567890@s.whatsapp.net",
              senderPn: "1234567890",
              fromMe: false,
            },
            pushName: "John Doe",
            message: {
              imageMessage: {
                caption: "Image caption",
                mimetype: "image/jpeg",
                fileLength: 12345,
                width: 800,
                height: 600,
              },
            },
            messageTimestamp: 1234567890,
          },
        ],
      };

      const result = MessageHandler.normalize(baileysMessage);
      expect(result?.type).toBe("image");
      expect(result?.text).toBe("Image caption");
      expect(result?.media?.mimetype).toBe("image/jpeg");
      expect(result?.media?.fileSize).toBe(12345);
      expect(result?.media?.width).toBe(800);
      expect(result?.media?.height).toBe(600);
      expect(result?.media?.viewOnce).toBe(false);
    });

    it("should normalize video message with metadata", () => {
      const baileysMessage = {
        messages: [
          {
            key: {
              id: "msg126",
              remoteJid: "1234567890@s.whatsapp.net",
              senderPn: "1234567890",
              fromMe: false,
            },
            pushName: "John Doe",
            message: {
              videoMessage: {
                caption: "Video caption",
                mimetype: "video/mp4",
                fileLength: 100000,
                width: 1920,
                height: 1080,
                seconds: 60,
                gifPlayback: true,
              },
            },
            messageTimestamp: 1234567890,
          },
        ],
      };

      const result = MessageHandler.normalize(baileysMessage);
      expect(result?.type).toBe("video");
      expect(result?.text).toBe("Video caption");
      expect(result?.media?.mimetype).toBe("video/mp4");
      expect(result?.media?.fileSize).toBe(100000);
      expect(result?.media?.width).toBe(1920);
      expect(result?.media?.height).toBe(1080);
      expect(result?.media?.duration).toBe(60);
      expect(result?.media?.gifPlayback).toBe(true);
    });

    it("should normalize document message with metadata", () => {
      const baileysMessage = {
        messages: [
          {
            key: {
              id: "msg127",
              remoteJid: "1234567890@s.whatsapp.net",
              senderPn: "1234567890",
              fromMe: false,
            },
            pushName: "John Doe",
            message: {
              documentMessage: {
                caption: "Document caption",
                mimetype: "application/pdf",
                fileLength: 50000,
                fileName: "document.pdf",
              },
            },
            messageTimestamp: 1234567890,
          },
        ],
      };

      const result = MessageHandler.normalize(baileysMessage);
      expect(result?.type).toBe("document");
      expect(result?.text).toBe("Document caption");
      expect(result?.media?.mimetype).toBe("application/pdf");
      expect(result?.media?.fileSize).toBe(50000);
      expect(result?.media?.fileName).toBe("document.pdf");
    });

    it("should normalize audio message with metadata", () => {
      const baileysMessage = {
        messages: [
          {
            key: {
              id: "msg128",
              remoteJid: "1234567890@s.whatsapp.net",
              senderPn: "1234567890",
              fromMe: false,
            },
            pushName: "John Doe",
            message: {
              audioMessage: {
                mimetype: "audio/mpeg",
                fileLength: 3000,
                seconds: 30,
                ptt: true,
              },
            },
            messageTimestamp: 1234567890,
          },
        ],
      };

      const result = MessageHandler.normalize(baileysMessage);
      expect(result?.type).toBe("audio");
      expect(result?.media?.mimetype).toBe("audio/mpeg");
      expect(result?.media?.fileSize).toBe(3000);
      expect(result?.media?.duration).toBe(30);
      expect(result?.media?.ptt).toBe(true);
    });

    it("should normalize sticker message with metadata", () => {
      const baileysMessage = {
        messages: [
          {
            key: {
              id: "msg129",
              remoteJid: "1234567890@s.whatsapp.net",
              senderPn: "1234567890",
              fromMe: false,
            },
            pushName: "John Doe",
            message: {
              stickerMessage: {
                mimetype: "image/webp",
                fileLength: 5000,
                width: 512,
                height: 512,
              },
            },
            messageTimestamp: 1234567890,
          },
        ],
      };

      const result = MessageHandler.normalize(baileysMessage);
      expect(result?.type).toBe("sticker");
      expect(result?.media?.mimetype).toBe("image/webp");
      expect(result?.media?.fileSize).toBe(5000);
      expect(result?.media?.width).toBe(512);
      expect(result?.media?.height).toBe(512);
    });

    it("should handle view-once messages", () => {
      const baileysMessage = {
        messages: [
          {
            key: {
              id: "msg130",
              remoteJid: "1234567890@s.whatsapp.net",
              senderPn: "1234567890",
              fromMe: false,
            },
            pushName: "John Doe",
            message: {
              viewOnceMessage: {
                message: {
                  imageMessage: {
                    caption: "View once image",
                    mimetype: "image/jpeg",
                    fileLength: 10000,
                  },
                },
              },
            },
            messageTimestamp: 1234567890,
          },
        ],
      };

      const result = MessageHandler.normalize(baileysMessage);
      expect(result?.type).toBe("image");
      expect(result?.text).toBe("View once image");
      expect(result?.media?.viewOnce).toBe(true);
    });

    it("should normalize group message", () => {
      const baileysMessage = {
        messages: [
          {
            key: {
              id: "msg131",
              remoteJid: "group123@g.us",
              participant: "1234567890@s.whatsapp.net",
              participantPn: "1234567890",
              fromMe: false,
            },
            pushName: "John Doe",
            message: {
              conversation: "Group message",
            },
            messageTimestamp: 1234567890,
          },
        ],
      };

      const result = MessageHandler.normalize(baileysMessage);
      expect(result?.isGroup).toBe(true);
      expect(result?.from).toBe("group123@g.us");
      expect(result?.senderPhone).toBe("1234567890");
      expect(result?.participant).toBe("1234567890@s.whatsapp.net");
    });

    it("should handle own message", () => {
      const baileysMessage = {
        messages: [
          {
            key: {
              id: "msg132",
              remoteJid: "1234567890@s.whatsapp.net",
              senderPn: "0987654321",
              fromMe: true,
            },
            pushName: "Me",
            message: {
              conversation: "My message",
            },
            messageTimestamp: 1234567890,
          },
        ],
      };

      const result = MessageHandler.normalize(baileysMessage);
      expect(result?.fromMe).toBe(true);
      expect(result?.senderPhone).toBe("0987654321");
    });

    it("should handle missing timestamp", () => {
      const baileysMessage = {
        messages: [
          {
            key: {
              id: "msg133",
              remoteJid: "1234567890@s.whatsapp.net",
              senderPn: "1234567890",
              fromMe: false,
            },
            pushName: "John Doe",
            message: {
              conversation: "Test",
            },
          },
        ],
      };

      const result = MessageHandler.normalize(baileysMessage);
      expect(result?.timestamp).toBeGreaterThan(0);
      expect(result?.timestamp).toBeLessThanOrEqual(
        Math.floor(Date.now() / 1000)
      );
    });

    it("should handle unknown message type", () => {
      const baileysMessage = {
        messages: [
          {
            key: {
              id: "msg134",
              remoteJid: "1234567890@s.whatsapp.net",
              senderPn: "1234567890",
              fromMe: false,
            },
            pushName: "John Doe",
            message: {
              unknownMessage: {
                someField: "value",
              },
            },
            messageTimestamp: 1234567890,
          },
        ],
      };

      const result = MessageHandler.normalize(baileysMessage);
      expect(result?.type).toBe("unknown");
      expect(result?.text).toBeUndefined();
    });

    it("should handle malformed message gracefully", () => {
      const badMessage = {
        messages: [
          {
            key: {
              id: null,
              remoteJid: undefined,
            },
            message: null,
          },
        ],
      };

      const result = MessageHandler.normalize(badMessage);
      expect(result).not.toBeNull();
      expect(result?.id).toBe("");
      expect(result?.from).toBe("");
    });
  });
});
