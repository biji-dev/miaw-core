import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Handles file-based session storage for authentication state
 */
export class SessionStorage {
  private sessionDir: string;
  private sessionFile: string;

  constructor(sessionPath: string, instanceId: string) {
    this.sessionDir = sessionPath;
    this.sessionFile = join(sessionPath, `${instanceId}.json`);

    // Ensure session directory exists
    if (!existsSync(this.sessionDir)) {
      mkdirSync(this.sessionDir, { recursive: true });
    }
  }

  /**
   * Check if session file exists
   */
  exists(): boolean {
    return existsSync(this.sessionFile);
  }

  /**
   * Load session data from file
   */
  load(): any {
    try {
      if (!this.exists()) {
        return null;
      }

      const data = readFileSync(this.sessionFile, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load session:', error);
      return null;
    }
  }

  /**
   * Save session data to file
   */
  save(data: any): void {
    try {
      writeFileSync(this.sessionFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save session:', error);
      throw error;
    }
  }

  /**
   * Get the session file path
   */
  getFilePath(): string {
    return this.sessionFile;
  }
}
