/**
 * Global Prompt Utility
 *
 * Provides a single source of truth for all user prompts in the CLI.
 * Handles REPL context by reusing the REPL's readline interface
 * to avoid double-character echo issues.
 */

import * as readline from "readline";

// Store REPL's readline if running in REPL context
let replReadline: readline.Interface | null = null;
// Store the REPL's line handler to restore it after prompts
let replLineHandler: ((line: string) => void) | null = null;

/**
 * Register the REPL's readline interface
 * This allows the prompt utility to reuse the REPL's interface
 */
export function setReplReadline(rl: readline.Interface): void {
  replReadline = rl;
}

/**
 * Store the REPL's line handler for restoration
 */
export function setReplLineHandler(handler: (line: string) => void): void {
  replLineHandler = handler;
}

/**
 * Clear the REPL readline reference (called on REPL exit)
 */
export function clearReplReadline(): void {
  replReadline = null;
  replLineHandler = null;
}

/**
 * Prompt user for input
 *
 * When called from REPL context, reuses the REPL's readline interface
 * to avoid creating a second interface that would cause double echo.
 */
export async function prompt(question: string): Promise<string> {
  // If we have a REPL readline, use it directly
  if (replReadline) {
    return new Promise<string>((resolve) => {
      // Remove all 'line' listeners to prevent REPL from processing input
      replReadline!.removeAllListeners('line');

      // Use the REPL's interface to ask the question
      replReadline!.question(question, (answer) => {
        // Restore the REPL's line handler
        if (replLineHandler) {
          replReadline!.on('line', replLineHandler);
        }
        // Show the prompt again
        replReadline!.prompt();
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
export async function confirm(question: string): Promise<boolean> {
  const answer = await prompt(`${question} [y/N]: `);
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}
