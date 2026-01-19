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
  --session-path <path>                       Session directory (default: "./sessions-cli")
  --json                                      Output as JSON
  --debug                                     Enable verbose logging
  --help                                      Show this help message

COMMANDS:

INSTANCE MANAGEMENT:
  instance ls                                 List all instances
  instance status [id]                        Show connection status
  instance create <id>                        Create new instance
  instance delete <id>                        Delete instance
  instance connect <id>                       Connect instance
  instance disconnect <id>                    Disconnect instance
  instance logout <id>                        Logout and clear session

GET OPERATIONS:
  get profile [jid]                           Get profile (own or contact)
  get contacts [options]                      List all contacts
  get groups [options]                        List all groups
  get chats [options]                         List all chats
  get messages <jid> [options]                Get chat messages
  get labels                                  List labels/lists

  Options: --limit N, --filter TEXT (case-insensitive search)

LOAD OPERATIONS:
  load messages <jid> [--count N]             Load older messages (default: 50)

SEND OPERATIONS:
  send text <phone> <message>                 Send text message
  send image <phone> <path>                   Send image
  send document <phone> <path>                Send document

GROUP OPERATIONS:
  group list [options]                        List all groups
  group info <jid>                            Get group details
  group participants <jid> [options]          List members (with phone/name)
  group participants add <jid> <phones>       Add members to group
  group participants remove <jid> <phones>    Remove members from group
  group participants promote <jid> <phones>   Promote members to admin
  group participants demote <jid> <phones>    Demote admins to member
  group invite-link <jid>                     Get invite link
  group invite accept <code>                  Join group via invite code
  group invite revoke <jid>                   Revoke and get new invite link
  group invite info <code>                    Get group info from invite code
  group create <name> <phones..>              Create new group
  group leave <jid>                           Leave a group
  group name set <jid> <name>                 Update group name
  group description set <jid> [desc]          Update group description
  group picture set <jid> <path>              Update group picture

  Options: --limit N, --filter TEXT (case-insensitive search)

UTILITY:
  check <phone>                               Check if number on WhatsApp
  check <phone1> <phone2>                     Batch check numbers

CONTACT OPERATIONS:
  contact list [options]                      List all contacts
  contact info <phone>                        Get contact info
  contact business <phone>                    Get business profile
  contact picture <phone> [--high]            Get profile picture URL
  contact add <phone> <name> [options]        Add/edit contact
  contact remove <phone>                      Remove contact

  Options: --limit N, --filter TEXT, --first <firstName>, --last <lastName>

PROFILE OPERATIONS:
  profile picture set <path>                  Set profile picture
  profile picture remove                      Remove profile picture
  profile name set <name>                     Set display name
  profile status set <status>                 Set status/about text

LABEL OPERATIONS (WhatsApp Business):
  label list                                  List all labels
  label chats <labelId>                       List chats with this label
  label add <name> <color>                    Create a new label
  label chat add <jid> <labelId>              Add label to chat
  label chat remove <jid> <labelId>           Remove label from chat

  Color: 0-19 or name (salmon, gold, yellow, mint, teal, cyan, sky, blue, etc.)

CATALOG OPERATIONS (WhatsApp Business):
  catalog list [options]                      List catalog products
  catalog collections [options]               List product collections
  catalog product create <name> <desc> <price> <currency>   Create product
  catalog product update <productId> [opts]   Update product
  catalog product delete <ids...>             Delete products

  Options: --phone <phone>, --limit N, --cursor <cursor>
  Product options: --image <path>, --url <url>, --retailerId <id>, --hidden

REPL COMMANDS (interactive mode):
  help                                        Show all commands
  status                                      Show connection status
  use <instance-id>                           Switch active instance
  connect [id]                                Connect to WhatsApp
  disconnect [id]                             Disconnect from WhatsApp
  debug [on|off]                              Toggle debug mode
  instances, ls                               List all instances
  exit, quit                                  Exit REPL

EXAMPLES:
  miaw-cli get groups --limit 10
  miaw-cli get contacts --filter john
  miaw-cli get chats --filter 628
  miaw-cli get profile 6281234567890
  miaw-cli send text 6281234567890 "Hello"
  miaw-cli load messages 6281234567890@s.whatsapp.net
  miaw-cli check 6281234567890
  miaw-cli contact list --limit 10
  miaw-cli contact info 6281234567890
  miaw-cli contact add 6281234567890 "John Doe"
  miaw-cli profile name set "My Bot"
  miaw-cli profile status set "Available"
  miaw-cli group list --filter family
  miaw-cli group participants 120363039902323086@g.us
  miaw-cli label list
  miaw-cli label chats 12345678901
  miaw-cli label add "VIP" blue
  miaw-cli catalog list --limit 20
  miaw-cli catalog product create "T-Shirt" "Cotton shirt" 50000 IDR

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
