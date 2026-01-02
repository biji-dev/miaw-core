import { useMultiFileAuthState } from "@whiskeysockets/baileys";
import { join } from "node:path";
import { rmSync, existsSync } from "node:fs";

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

  /**
   * Clear all session files for this instance.
   * This is needed when logged out to allow fresh QR code authentication.
   */
  clearSession(): boolean {
    const authPath = this.getAuthPath();
    if (existsSync(authPath)) {
      rmSync(authPath, { recursive: true, force: true });
      return true;
    }
    return false;
  }
}
