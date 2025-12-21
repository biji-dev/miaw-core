/**
 * Miaw Core - Simplified WhatsApp API wrapper for Baileys
 * Multiple Instance of App WhatsApp
 */

// Main client
export { MiawClient } from './client/MiawClient';

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
} from './types';

// Utility exports for advanced users
export { MessageHandler } from './handlers/MessageHandler';
