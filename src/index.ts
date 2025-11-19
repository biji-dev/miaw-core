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
  ConnectionState,
  SendTextOptions,
  SendMessageResult,
  MiawClientEvents,
} from './types';

// Utility exports for advanced users
export { MessageHandler } from './handlers/MessageHandler';
