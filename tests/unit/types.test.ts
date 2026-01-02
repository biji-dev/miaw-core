/**
 * Unit Tests for Types
 */

import {
  PredefinedLabelId,
  LabelColor,
  ConnectionState,
  PresenceStatus,
  type MiawClientOptions,
  type MiawMessage,
  type SendMessageResult,
  type CheckNumberResult,
  type MediaInfo,
  type MessageEdit,
  type MessageDelete,
  type MessageReaction,
} from "../../src/types/index.js";

describe("Enums", () => {
  describe("PredefinedLabelId", () => {
    it("should have correct values", () => {
      expect(PredefinedLabelId.NewCustomer).toBe(1);
      expect(PredefinedLabelId.NewOrder).toBe(2);
      expect(PredefinedLabelId.PendingPayment).toBe(3);
      expect(PredefinedLabelId.Paid).toBe(4);
      expect(PredefinedLabelId.Shipped).toBe(5);
    });

    it("should have 5 predefined labels", () => {
      const values = Object.values(PredefinedLabelId).filter(
        (v) => typeof v === "number"
      );
      expect(values).toHaveLength(5);
    });
  });

  describe("LabelColor", () => {
    it("should have 20 colors", () => {
      expect(LabelColor.Color1).toBe(0);
      expect(LabelColor.Color20).toBe(19);
    });

    it("should have sequential values from 0 to 19", () => {
      for (let i = 0; i < 20; i++) {
        expect((LabelColor as any)[`Color${i + 1}`]).toBe(i);
      }
    });
  });

  describe("ConnectionState", () => {
    it("should have valid connection states", () => {
      const states: ConnectionState[] = [
        "disconnected",
        "connecting",
        "connected",
        "reconnecting",
        "qr_required",
      ];
      expect(states).toHaveLength(5);
    });

    it("should accept valid connection states", () => {
      const validStates: ConnectionState[] = [
        "disconnected",
        "connecting",
        "connected",
        "reconnecting",
        "qr_required",
      ];
      validStates.forEach((state) => {
        expect(state).toBeTruthy();
      });
    });
  });

  describe("PresenceStatus", () => {
    it("should accept available and unavailable as valid statuses", () => {
      const available: PresenceStatus = "available";
      const unavailable: PresenceStatus = "unavailable";
      expect(available).toBe("available");
      expect(unavailable).toBe("unavailable");
    });
  });
});

describe("Type Guards and Validation", () => {
  describe("MiawClientOptions", () => {
    it("should accept minimal options", () => {
      const options: MiawClientOptions = {
        instanceId: "test-bot",
      };
      expect(options.instanceId).toBe("test-bot");
    });

    it("should accept full options", () => {
      const options: MiawClientOptions = {
        instanceId: "test-bot",
        sessionPath: "./sessions",
        debug: true,
        autoReconnect: true,
        maxReconnectAttempts: 10,
        reconnectDelay: 5000,
      };
      expect(options.instanceId).toBe("test-bot");
      expect(options.sessionPath).toBe("./sessions");
      expect(options.debug).toBe(true);
      expect(options.autoReconnect).toBe(true);
      expect(options.maxReconnectAttempts).toBe(10);
      expect(options.reconnectDelay).toBe(5000);
    });

    it("should accept undefined optional fields", () => {
      const options: MiawClientOptions = {
        instanceId: "test-bot",
        sessionPath: undefined,
        debug: undefined,
        autoReconnect: undefined,
        maxReconnectAttempts: undefined,
        reconnectDelay: undefined,
      };
      expect(options.instanceId).toBe("test-bot");
    });
  });

  describe("MiawMessage", () => {
    it("should create a valid text message", () => {
      const message: MiawMessage = {
        id: "msg123",
        from: "1234567890@s.whatsapp.net",
        senderPhone: "1234567890",
        senderName: "John Doe",
        text: "Hello World",
        timestamp: 1234567890,
        isGroup: false,
        fromMe: false,
        type: "text",
      };
      expect(message.id).toBe("msg123");
      expect(message.type).toBe("text");
      expect(message.text).toBe("Hello World");
    });

    it("should create a valid image message", () => {
      const media: MediaInfo = {
        mimetype: "image/jpeg",
        fileSize: 12345,
        width: 800,
        height: 600,
      };

      const message: MiawMessage = {
        id: "msg124",
        from: "1234567890@s.whatsapp.net",
        text: "Image caption",
        timestamp: 1234567890,
        isGroup: false,
        fromMe: false,
        type: "image",
        media,
      };
      expect(message.type).toBe("image");
      expect(message.media?.mimetype).toBe("image/jpeg");
      expect(message.media?.width).toBe(800);
    });

    it("should create a valid group message", () => {
      const message: MiawMessage = {
        id: "msg125",
        from: "group123@g.us",
        senderPhone: "1234567890",
        senderName: "John Doe",
        text: "Group message",
        timestamp: 1234567890,
        isGroup: true,
        participant: "1234567890@s.whatsapp.net",
        fromMe: false,
        type: "text",
      };
      expect(message.isGroup).toBe(true);
      expect(message.participant).toBe("1234567890@s.whatsapp.net");
    });

    it("should create a message with all media types", () => {
      const mediaTypes: MiawMessage["type"][] = [
        "image",
        "video",
        "audio",
        "document",
        "sticker",
      ];

      mediaTypes.forEach((type) => {
        const message: MiawMessage = {
          id: `msg${type}`,
          from: "1234567890@s.whatsapp.net",
          timestamp: 1234567890,
          isGroup: false,
          fromMe: false,
          type,
          media: {
            mimetype: "test/mimetype",
          },
        };
        expect(message.type).toBe(type);
      });
    });
  });

  describe("SendMessageResult", () => {
    it("should create a successful result", () => {
      const result: SendMessageResult = {
        success: true,
        messageId: "msg123",
      };
      expect(result.success).toBe(true);
      expect(result.messageId).toBe("msg123");
    });

    it("should create a failed result", () => {
      const result: SendMessageResult = {
        success: false,
        error: "Failed to send",
      };
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to send");
    });
  });

  describe("CheckNumberResult", () => {
    it("should create a result for existing number", () => {
      const result: CheckNumberResult = {
        exists: true,
        jid: "1234567890@s.whatsapp.net",
      };
      expect(result.exists).toBe(true);
      expect(result.jid).toBe("1234567890@s.whatsapp.net");
    });

    it("should create a result for non-existing number", () => {
      const result: CheckNumberResult = {
        exists: false,
      };
      expect(result.exists).toBe(false);
    });

    it("should create a result with error", () => {
      const result: CheckNumberResult = {
        exists: false,
        error: "Network error",
      };
      expect(result.exists).toBe(false);
      expect(result.error).toBe("Network error");
    });
  });

  describe("MediaInfo", () => {
    it("should create complete image media info", () => {
      const media: MediaInfo = {
        mimetype: "image/jpeg",
        fileSize: 100000,
        width: 1920,
        height: 1080,
        viewOnce: false,
      };
      expect(media.mimetype).toBe("image/jpeg");
      expect(media.fileSize).toBe(100000);
      expect(media.width).toBe(1920);
      expect(media.height).toBe(1080);
      expect(media.viewOnce).toBe(false);
    });

    it("should create complete video media info", () => {
      const media: MediaInfo = {
        mimetype: "video/mp4",
        fileSize: 5000000,
        width: 1920,
        height: 1080,
        duration: 120,
        gifPlayback: true,
        viewOnce: false,
      };
      expect(media.duration).toBe(120);
      expect(media.gifPlayback).toBe(true);
    });

    it("should create complete audio media info", () => {
      const media: MediaInfo = {
        mimetype: "audio/mpeg",
        fileSize: 3000000,
        duration: 180,
        ptt: true,
      };
      expect(media.duration).toBe(180);
      expect(media.ptt).toBe(true);
    });

    it("should create complete document media info", () => {
      const media: MediaInfo = {
        mimetype: "application/pdf",
        fileSize: 500000,
        fileName: "document.pdf",
      };
      expect(media.fileName).toBe("document.pdf");
    });
  });

  describe("Message Events", () => {
    it("should create MessageEdit", () => {
      const edit: MessageEdit = {
        messageId: "msg123",
        chatId: "1234567890@s.whatsapp.net",
        newText: "Edited text",
        editTimestamp: 1234567890000,
      };
      expect(edit.messageId).toBe("msg123");
      expect(edit.newText).toBe("Edited text");
      expect(edit.editTimestamp).toBe(1234567890000);
    });

    it("should create MessageDelete", () => {
      const deletion: MessageDelete = {
        messageId: "msg123",
        chatId: "1234567890@s.whatsapp.net",
        fromMe: false,
        participant: "1234567890@s.whatsapp.net",
      };
      expect(deletion.messageId).toBe("msg123");
      expect(deletion.fromMe).toBe(false);
      expect(deletion.participant).toBe("1234567890@s.whatsapp.net");
    });

    it("should create MessageReaction", () => {
      const reaction: MessageReaction = {
        messageId: "msg123",
        chatId: "1234567890@s.whatsapp.net",
        reactorId: "0987654321@s.whatsapp.net",
        emoji: "👍",
        isRemoval: false,
      };
      expect(reaction.emoji).toBe("👍");
      expect(reaction.isRemoval).toBe(false);
    });

    it("should create MessageReaction with removal", () => {
      const reaction: MessageReaction = {
        messageId: "msg123",
        chatId: "1234567890@s.whatsapp.net",
        reactorId: "0987654321@s.whatsapp.net",
        emoji: "",
        isRemoval: true,
      };
      expect(reaction.emoji).toBe("");
      expect(reaction.isRemoval).toBe(true);
    });
  });
});

describe("Type Compatibility", () => {
  it("should allow media to be optional in MiawMessage", () => {
    const message: MiawMessage = {
      id: "msg123",
      from: "1234567890@s.whatsapp.net",
      timestamp: 1234567890,
      isGroup: false,
      fromMe: false,
      type: "text",
    };
    expect(message.media).toBeUndefined();
  });

  it("should allow text to be optional in MiawMessage", () => {
    const message: MiawMessage = {
      id: "msg123",
      from: "1234567890@s.whatsapp.net",
      timestamp: 1234567890,
      isGroup: false,
      fromMe: false,
      type: "image",
      media: {
        mimetype: "image/jpeg",
      },
    };
    expect(message.text).toBeUndefined();
  });

  it("should allow participant to be optional in MiawMessage", () => {
    const dmMessage: MiawMessage = {
      id: "msg123",
      from: "1234567890@s.whatsapp.net",
      timestamp: 1234567890,
      isGroup: false,
      fromMe: false,
      type: "text",
    };
    expect(dmMessage.participant).toBeUndefined();
  });
});
