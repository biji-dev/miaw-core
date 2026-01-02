import { useMultiFileAuthState } from '@whiskeysockets/baileys';
import { join } from 'node:path';

/**
 * Handles authentication state management
 */
export class AuthHandler {
  private sessionPath: string;
  private instanceId: string;

  constructor(sessionPath: string, instanceId: string) {
    this.sessionPath = sessionPath;
    this.instanceId = instanceId;
  }

  /**
   * Initialize and load auth state
   * Returns { state, saveCreds } from Baileys
   */
  async initialize() {
    const authPath = join(this.sessionPath, this.instanceId);
    return await useMultiFileAuthState(authPath);
  }

  /**
   * Get the full path to the session directory for this instance
   */
  getAuthPath(): string {
    return join(this.sessionPath, this.instanceId);
  }
}
