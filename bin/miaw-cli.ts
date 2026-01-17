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
╔════════════════════════════════════════════════════════════╗
║              miaw-cli - WhatsApp CLI Tool                  ║
╚════════════════════════════════════════════════════════════╝

USAGE:
  miaw-cli                    Start interactive REPL mode
  miaw-cli <command> [args]   Run one-shot command

GLOBAL FLAGS:
  --instance-id <id>      Instance ID (default: "default")
  --session-path <path>   Session directory (default: "./sessions-cli")
  --json                  Output as JSON
  --debug                 Enable verbose logging
  --help                  Show this help message

COMMANDS:

INSTANCE MANAGEMENT:
  instance ls                    List all instances
  instance status [id]           Show connection status
  instance create <id>           Create new instance (triggers QR)
  instance delete <id>           Delete instance session
  instance connect <id>          Connect instance
  instance disconnect <id>       Disconnect instance
  instance logout <id>           Logout and clear session

GET OPERATIONS:
  get profile                    Get your profile
  get contacts [--limit N]       List all contacts
  get groups [--limit N]         List all groups
  get chats [--limit N]          List all chats
  get messages <jid> [--limit N] Get chat messages
  get labels                     List labels (Business only)

SEND OPERATIONS:
  send text <phone> <message>    Send text message
  send image <phone> <path>      Send image
  send document <phone> <path>   Send document

GROUP OPERATIONS:
  group info <jid>               Get group details
  group participants <jid>       List group members
  group invite-link <jid>        Get invite link
  group create <name> <phones..> Create new group

UTILITY:
  check <phone>                  Check if number on WhatsApp
  check <phone1> <phone2>        Batch check numbers

REPL COMMANDS (when in interactive mode):
  help                           Show all commands
  status                         Show connection status
  use <instance-id>              Switch active instance
  exit, quit                     Exit REPL

EXAMPLES:
  miaw-cli get groups --limit 10
  miaw-cli get contacts --json
  miaw-cli send text 6281234567890 "Hello"
  miaw-cli check 6281234567890
  miaw-cli instance status

For more information: https://github.com/biji-dev/miaw-core
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
