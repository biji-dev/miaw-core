#!/usr/bin/env node
/**
 * miaw-cli - WhatsApp Command-Line Interface
 *
 * Usage:
 *   miaw-cli                    # Start interactive REPL
 *   miaw-cli <command> [args]   # Run one-shot command
 *
 * Examples:
 *   miaw-cli get groups
 *   miaw-cli send text 6281234567890 "Hello"
 *   miaw-cli instance status
 */

import * as dotenv from "dotenv";
import { runRepl } from "../src/cli/repl.js";
import { runCommand } from "../src/cli/commands/index.js";
import { initializeCLICleanup } from "../src/cli/utils/cleanup.js";
import { getErrorMessage } from "../src/utils/type-guards.js";

// Initialize CLI cleanup handlers for graceful shutdown
initializeCLICleanup();

// Load environment variables
dotenv.config();
dotenv.config({ path: ".env.test" });

// Default configuration
const DEFAULT_INSTANCE_ID = process.env.MIAW_INSTANCE_ID || "default";
const DEFAULT_SESSION_PATH = process.env.MIAW_SESSION_PATH || "./sessions-cli";

/**
 * Parse CLI arguments
 */
function parseArgs(args: string[]): {
  command: string;
  args: string[];
  flags: { [key: string]: string | boolean };
} {
  const flags: { [key: string]: string | boolean } = {};
  const commandArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const flagName = arg.slice(2);
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith("--")) {
        flags[flagName] = nextArg;
        i++;
      } else {
        flags[flagName] = true;
      }
    } else {
      commandArgs.push(arg);
    }
  }

  const command = commandArgs[0] || "";
  const remainingArgs = commandArgs.slice(1);

  return { command, args: remainingArgs, flags };
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                     miaw-cli - WhatsApp CLI Tool                       ║
╚════════════════════════════════════════════════════════════════════════╝

USAGE:
  miaw-cli                                    Start interactive REPL mode
  miaw-cli <command> [args]                   Run one-shot command

GLOBAL FLAGS:
  --instance-id <id>                          Instance ID (default: "default")
  --session-path <path>                       Session directory
  --json                                      Output as JSON
  --debug                                     Enable verbose logging

COMMANDS:
  instance    Manage instances (ls, status, create, delete, connect, disconnect, logout)
  get         Fetch data (profile, contacts, groups, chats, messages, labels)
  load        Load older messages from history
  send        Send messages (text, image, document)
  group       Group management (list, info, participants, invite, settings)
  check       Check if phone numbers are on WhatsApp
  contact     Contact management (list, info, business, picture, add, remove)
  profile     Profile management (picture, name, status)
  label       Label management - WhatsApp Business (list, chats, add, chat)
  catalog     Catalog management - WhatsApp Business (list, collections, product)

COMMON OPTIONS:
  --limit N                                   Limit number of results
  --filter TEXT                               Filter by name/phone (case-insensitive)

EXAMPLES:
  miaw-cli get contacts --limit 10 --filter john
  miaw-cli send text 6281234567890 "Hello"
  miaw-cli group participants add 120363xxx@g.us 628xxx
  miaw-cli contact add 6281234567890 "John Doe"

REPL MODE:
  Run 'miaw-cli' without arguments to start interactive mode.
  In REPL, use 'help <command>' for detailed help on each command.

For detailed documentation: https://github.com/biji-dev/miaw-core/blob/main/docs/CLI.md
`);
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  // Show help if requested
  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    process.exit(0);
  }

  const { command, args: commandArgs, flags } = parseArgs(args);

  // Extract global flags
  const instanceId = (flags["instance-id"] as string) || DEFAULT_INSTANCE_ID;
  const sessionPath = (flags["session-path"] as string) || DEFAULT_SESSION_PATH;
  const jsonOutput = flags.json === true;
  const debugMode = flags.debug === true;

  // Create client configuration
  const clientConfig = {
    instanceId,
    sessionPath,
    debug: debugMode,
  };

  // No command provided - start REPL
  if (!command) {
    console.log(`\n🚀 Starting miaw-cli REPL...`);
    console.log(`📂 Instance: ${instanceId}`);
    console.log(`📂 Session: ${sessionPath}`);
    console.log(`🔧 Debug: ${debugMode ? "ON" : "OFF"}\n`);

    try {
      await runRepl(clientConfig);
    } catch (error: unknown) {
      console.error("❌ REPL error:", getErrorMessage(error));
      process.exit(1);
    }
    return;
  }

  // Run one-shot command
  try {
    const success = await runCommand(command, commandArgs, {
      clientConfig,
      jsonOutput,
      flags,
    });

    if (!success) {
      process.exit(1);
    }
  } catch (error: unknown) {
    console.error("❌ Command error:", getErrorMessage(error));
    if (debugMode && error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the CLI
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
