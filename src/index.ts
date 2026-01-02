/**
 * Miaw Core - Simplified WhatsApp API wrapper for Baileys
 * Multiple Instance of App WhatsApp
 */

// Main client
export { MiawClient } from "./client/MiawClient.js";

// Types
export {
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

// Utility exports for advanced users
export { MessageHandler } from "./handlers/MessageHandler.js";
