/**
 * Prompt Utility - Class-based approach
 *
 * Provides a single source of truth for all user prompts in the CLI.
 * Handles REPL context by reusing the REPL's readline interface
 * to avoid double-character echo issues.
 */

import * as readline from "readline";

/**
 * PromptManager class - manages prompt state and operations
 * Eliminates global mutable state by encapsulating readline management
 */
export class PromptManager {
  private replReadline: readline.Interface | null = null;
  private replLineHandler: ((line: string) => void) | null = null;

  /**
   * Register the REPL's readline interface
   * This allows the prompt utility to reuse the REPL's interface
   */
  setReplReadline(rl: readline.Interface): void {
    this.replReadline = rl;
  }

  /**
   * Store the REPL's line handler for restoration
   */
  setReplLineHandler(handler: (line: string) => void): void {
    this.replLineHandler = handler;
  }

  /**
   * Clear the REPL readline reference (called on REPL exit)
   */
  clearReplReadline(): void {
    this.replReadline = null;
    this.replLineHandler = null;
  }

  /**
   * Prompt user for input
   *
   * When called from REPL context, reuses the REPL's readline interface
   * to avoid creating a second interface that would cause double echo.
   */
  async prompt(question: string): Promise<string> {
    // If we have a REPL readline, use it directly
    if (this.replReadline) {
      return new Promise<string>((resolve) => {
        // Remove all 'line' listeners to prevent REPL from processing input
        this.replReadline!.removeAllListeners("line");

        // Use the REPL's interface to ask the question
        this.replReadline!.question(question, (answer) => {
          // Restore the REPL's line handler
          if (this.replLineHandler) {
            this.replReadline!.on("line", this.replLineHandler);
          }
          // Show the prompt again
          this.replReadline!.prompt();
          resolve(answer.trim());
        });
      });
    }

    // Fallback for non-REPL context (e.g., direct CLI commands)
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(question, (ans) => {
        rl.close();
        resolve(ans.trim());
      });
    });

    return answer;
  }

  /**
   * Prompt user for yes/no confirmation
   */
  async confirm(question: string): Promise<boolean> {
    const answer = await this.prompt(`${question} [y/N]: `);
    return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
  }
}

/**
 * Default singleton instance for convenience
 */
export const promptManager = new PromptManager();

/**
 * Convenience function: Register the REPL's readline interface
 * Uses the singleton instance for backwards compatibility
 */
export function setReplReadline(rl: readline.Interface): void {
  promptManager.setReplReadline(rl);
}

/**
 * Convenience function: Store the REPL's line handler for restoration
 * Uses the singleton instance for backwards compatibility
 */
export function setReplLineHandler(handler: (line: string) => void): void {
  promptManager.setReplLineHandler(handler);
}

/**
 * Convenience function: Clear the REPL readline reference
 * Uses the singleton instance for backwards compatibility
 */
export function clearReplReadline(): void {
  promptManager.clearReplReadline();
}

/**
 * Convenience function: Prompt user for input
 * Uses the singleton instance for backwards compatibility
 */
export async function prompt(question: string): Promise<string> {
  return promptManager.prompt(question);
}

/**
 * Convenience function: Prompt user for yes/no confirmation
 * Uses the singleton instance for backwards compatibility
 */
export async function confirm(question: string): Promise<boolean> {
  return promptManager.confirm(question);
}
