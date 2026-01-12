/**
 * Miaw Core - Simplified WhatsApp API wrapper for Baileys
 * Multiple Instance of App WhatsApp
 */

// Main client
export { MiawClient } from "./client/MiawClient.js";

// Types - using 'export type' for type-only exports (required for ESM/tsx compatibility)
export type {
  MiawClientOptions,
  MiawMessage,
  MediaInfo,
  ConnectionState,
  SendTextOptions,
  SendMessageResult,
  MiawClientEvents,
  MediaSource,
  SendImageOptions,
  SendDocumentOptions,
  SendVideoOptions,
  SendAudioOptions,
  MessageEdit,
  MessageDelete,
  MessageReaction,
  CheckNumberResult,
  ContactInfo,
  BusinessProfile,
  GroupParticipant,
  GroupInfo,
  PresenceStatus,
  PresenceUpdate,
  // v0.7.0 Group Management
  ParticipantOperationResult,
  CreateGroupResult,
  GroupOperationResult,
  GroupInviteInfo,
  // v0.8.0 Profile Management
  ProfileOperationResult,
  // v0.9.0 Labels
  Label,
  LabelOperationResult,
  // v0.9.0 Catalog/Product
  Product,
  ProductCatalog,
  ProductOperationResult,
  ProductOptions,
  ProductCollection,
  // v0.9.0 Newsletter/Channel
  NewsletterMetadata,
  NewsletterMessagesResult,
  NewsletterOperationResult,
  NewsletterSubscriptionInfo,
  // v0.9.0 Contact Management
  ContactData,
  ContactOperationResult,
  // v0.9.0 Basic GET Operations
  OwnProfile,
  FetchAllContactsResult,
  FetchAllGroupsResult,
  FetchAllLabelsResult,
  FetchChatMessagesResult,
  FetchAllChatsResult,
  ChatInfo,
} from "./types/index.js";

// v1.2.0 Logger types (for custom logger implementations)
export type { MiawLogger } from "./types/logger.js";

// v1.2.0 Baileys types (for advanced users working with raw Baileys data)
export type {
  BaileysMessage,
  BaileysMessageUpsert,
  BaileysConnectionUpdate,
  BaileysMessageKey,
  BaileysMessageContent,
  Long,
} from "./types/baileys.js";

// Utility exports for advanced users
export { MessageHandler } from "./handlers/MessageHandler.js";

// v1.2.0 Logger utilities
export { createFilteredLogger } from "./utils/filtered-logger.js";

// v1.2.0 Validation utilities
export {
  validatePhoneNumber,
  validateJID,
  validateMessageText,
  validateGroupName,
  validatePhoneNumbers,
} from "./utils/validation.js";

// v1.2.0 Type guard utilities
export {
  isError,
  getErrorMessage,
  isBaileysMessage,
  isBaileysMessageUpsert,
} from "./utils/type-guards.js";

// v1.2.0 Constants
export { TIMEOUTS, THRESHOLDS } from "./constants/timeouts.js";
export { CACHE_CONFIG } from "./constants/cache.js";
export { LABEL_COLOR_NAMES, getLabelColorName } from "./constants/colors.js";
