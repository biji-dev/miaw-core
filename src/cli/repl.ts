/**
 * Interactive REPL (Read-Eval-Print Loop)
 *
 * Provides an interactive shell for running miaw-cli commands
 */

import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { listInstances } from "./utils/session.js";
import { disconnectAll, disconnectClient, getOrCreateClient } from "./utils/client-cache.js";
import { runCommand } from "./commands/index.js";
import { setReplReadline, setReplLineHandler, clearReplReadline } from "./utils/prompt.js";
import { initializeCLICleanup } from "./utils/cleanup.js";
import { getErrorMessage } from "../utils/type-guards.js";
import { defaultCLIContext } from "./context.js";
import {
  cmdInstanceList,
  cmdInstanceStatus,
  cmdInstanceConnect,
  cmdInstanceDisconnect,
} from "./commands/commands-index.js";

// =============================================================================
// Command Tree for Autocomplete
// =============================================================================

interface CommandNode {
  aliases?: string[];
  subcommands?: string[];
  nestedSubcommands?: Record<string, string[]>;
  flags?: string[];
}

const commandTree: Record<string, CommandNode> = {
  // REPL-specific commands
  help: {},
  status: {},
  exit: { aliases: ["quit"] },
  use: {},
  connect: {},
  disconnect: {},
  debug: { flags: ["on", "off"] },
  instances: { aliases: ["ls"] },

  // Category commands with subcommands
  instance: {
    subcommands: ["ls", "list", "status", "create", "delete", "connect", "disconnect", "logout"],
  },
  get: {
    subcommands: ["profile", "contacts", "groups", "chats", "messages", "labels"],
    flags: ["--limit", "--json", "--filter"],
  },
  send: {
    subcommands: ["text", "image", "document"],
  },
  group: {
    subcommands: [
      "list", "ls", "info", "participants", "invite-link", "invite", "create", "leave",
      "name", "description", "picture"
    ],
    nestedSubcommands: {
      participants: ["add", "remove", "promote", "demote"],
      invite: ["accept", "revoke", "info"],
      name: ["set"],
      description: ["set"],
      picture: ["set"],
    },
    flags: ["--limit", "--filter", "--json"],
  },
  load: {
    subcommands: ["messages"],
    flags: ["--count"],
  },
  check: {},
  contact: {
    subcommands: ["list", "ls", "info", "business", "picture", "add", "remove"],
    flags: ["--limit", "--filter", "--json", "--high", "--first", "--last"],
  },
  profile: {
    subcommands: ["picture", "name", "status"],
    nestedSubcommands: {
      picture: ["set", "remove"],
      name: ["set"],
      status: ["set"],
    },
  },
  label: {
    subcommands: ["list", "chats", "add", "chat"],
    nestedSubcommands: {
      chat: ["add", "remove"],
    },
  },
  catalog: {
    subcommands: ["list", "collections", "product"],
    nestedSubcommands: {
      product: ["create", "update", "delete"],
    },
    flags: ["--phone", "--limit", "--cursor", "--image", "--url", "--retailerId", "--hidden", "--json"],
  },
};

// =============================================================================
// Autocomplete Completer Function
// =============================================================================

/**
 * Create autocomplete completer function for readline
 * @param sessionPath - Path to session directory (for dynamic instance completion)
 * @returns readline completer function
 */
function createCompleter(sessionPath: string): readline.Completer {
  return (line: string) => {
    const hits: string[] = [];
    const parts = line.split(/\s+/);
    const currentPart = parts[parts.length - 1] || "";

    // Level 1: Top-level commands (only on first word)
    if (parts.length === 1) {
      for (const cmd of Object.keys(commandTree)) {
        if (cmd.startsWith(currentPart)) {
          hits.push(cmd);
        }
        // Also check aliases
        const aliases = commandTree[cmd]?.aliases || [];
        for (const alias of aliases) {
          if (alias.startsWith(currentPart)) {
            hits.push(alias);
          }
        }
      }
      return [hits, currentPart];
    }

    // Level 2: Subcommands (second word)
    if (parts.length === 2) {
      const category = parts[0];
      const categoryData = commandTree[category];

      // Commands that accept instance ID as second argument
      if (["use", "connect", "disconnect"].includes(category)) {
        const instances = listInstances(sessionPath);
        for (const inst of instances) {
          if (inst.startsWith(currentPart)) {
            hits.push(inst);
          }
        }
        return [hits, currentPart];
      }

      if (categoryData?.subcommands) {
        for (const sub of categoryData.subcommands) {
          if (sub.startsWith(currentPart)) {
            hits.push(sub);
          }
        }
        return [hits, currentPart];
      }
    }

    // Level 3: Nested subcommands or flags (third word)
    if (parts.length === 3) {
      const category = parts[0];
      const subCommand = parts[1];
      const categoryData = commandTree[category];

      // Check for nested subcommands
      if (categoryData?.nestedSubcommands?.[subCommand]) {
        const nestedSubs = categoryData.nestedSubcommands[subCommand];
        for (const sub of nestedSubs) {
          if (sub.startsWith(currentPart)) {
            hits.push(sub);
          }
        }
        return [hits, currentPart];
      }

      // Flag completion for commands with flags
      if (categoryData?.flags && currentPart.startsWith("-")) {
        for (const flag of categoryData.flags) {
          if (flag.startsWith(currentPart)) {
            hits.push(flag);
          }
        }
        return [hits, currentPart];
      }

      // Instance ID completion (for 'instance delete', 'instance connect', etc.)
      if (category === "instance") {
        const instances = listInstances(sessionPath);
        for (const inst of instances) {
          if (inst.startsWith(currentPart)) {
            hits.push(inst);
          }
        }
        return [hits, currentPart];
      }
    }

    // Level 4+: Flags (fourth word onwards)
    if (parts.length >= 4) {
      const category = parts[0];
      const categoryData = commandTree[category];

      // Flag completion for commands with flags
      if (categoryData?.flags && currentPart.startsWith("-")) {
        for (const flag of categoryData.flags) {
          if (flag.startsWith(currentPart)) {
            hits.push(flag);
          }
        }
        return [hits, currentPart];
      }
    }

    return [[], line];
  };
}

// =============================================================================
// Command History Management
// =============================================================================

const MAX_HISTORY_SIZE = 1000;

/**
 * Get the path to the history file
 */
function getHistoryFilePath(sessionPath: string): string {
  return path.join(sessionPath, ".cli_history");
}

/**
 * Load command history from file
 */
function loadHistory(sessionPath: string): string[] {
  try {
    const historyPath = getHistoryFilePath(sessionPath);
    if (fs.existsSync(historyPath)) {
      const content = fs.readFileSync(historyPath, "utf8");
      const lines = content.split("\n").filter(line => line.trim() !== "");
      // Return in reverse order (readline expects newest first)
      return lines.slice(-MAX_HISTORY_SIZE);
    }
  } catch (error) {
    // Silently ignore history load errors
  }
  return [];
}

/**
 * Save command history to file
 */
function saveHistory(sessionPath: string, history: string[]): void {
  try {
    const historyPath = getHistoryFilePath(sessionPath);

    // Ensure directory exists
    const dir = path.dirname(historyPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Keep only the last MAX_HISTORY_SIZE entries
    const trimmedHistory = history.slice(-MAX_HISTORY_SIZE);
    fs.writeFileSync(historyPath, trimmedHistory.join("\n") + "\n", "utf8");
  } catch (error) {
    // Silently ignore history save errors
  }
}

/**
 * Add a command to history (avoiding duplicates of the last command)
 */
function addToHistory(history: string[], command: string): void {
  const trimmed = command.trim();
  if (trimmed && trimmed !== history[history.length - 1]) {
    history.push(trimmed);
  }
}

export interface ClientConfig {
  instanceId: string;
  sessionPath: string;
  debug?: boolean;
}

/**
 * Run the interactive REPL
 */
export async function runRepl(config: ClientConfig): Promise<void> {
  // Initialize CLI cleanup handlers for graceful shutdown
  initializeCLICleanup();

  // Create client (uses cache)
  let client = getOrCreateClient(config);

  // Show welcome message
  showWelcome(config);

  // Check connection status
  const state = client.getConnectionState();
  if (state !== "connected") {
    console.log("📱 Not connected. Type 'connect' to connect to WhatsApp.");
  } else {
    console.log("✅ Connected to WhatsApp!");
  }

  // Load command history from previous sessions
  const commandHistory = loadHistory(config.sessionPath);

  // Create readline interface with autocomplete and history
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: getPrompt(config.instanceId, state),
    completer: createCompleter(config.sessionPath),
    history: commandHistory,
    historySize: MAX_HISTORY_SIZE,
  });

  // Register with prompt utility (to avoid double-character echo)
  setReplReadline(rl);

  // Handle REPL commands
  rl.prompt();

  // Define the line handler as a named function so we can store and restore it
  const lineHandler = async (line: string) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    // Add to history (for persistence)
    addToHistory(commandHistory, input);

    // Handle REPL-specific commands
    if (input === "exit" || input === "quit") {
      console.log("\n👋 Goodbye!");
      saveHistory(config.sessionPath, commandHistory);
      rl.close();
      return;
    }

    if (input === "help") {
      showReplHelp();
      rl.prompt();
      return;
    }

    if (input === "status") {
      await cmdInstanceStatus(config.sessionPath, config.instanceId, defaultCLIContext);
      rl.prompt();
      return;
    }

    if (input.startsWith("use ")) {
      const newInstanceId = input.slice(4).trim();
      if (newInstanceId && newInstanceId !== config.instanceId) {
        // Disconnect previous instance to prevent WhatsApp connection conflicts
        // WhatsApp only allows one active connection per account
        const previousState = client.getConnectionState();
        if (previousState === "connected" || previousState === "connecting") {
          console.log(`📴 Disconnecting previous instance: ${config.instanceId}`);
          await disconnectClient({ instanceId: config.instanceId, sessionPath: config.sessionPath });
        }

        config.instanceId = newInstanceId;
        client = getOrCreateClient(config);
        console.log(`✅ Switched to instance: ${newInstanceId}`);
        rl.setPrompt(getPrompt(newInstanceId, client.getConnectionState()));
      } else if (newInstanceId === config.instanceId) {
        console.log(`ℹ️  Already using instance: ${newInstanceId}`);
      }
      rl.prompt();
      return;
    }

    if (input === "connect" || input.startsWith("connect ")) {
      const parts = input.split(/\s+/);
      const targetInstanceId = parts[1] || config.instanceId;

      // If connecting to a different instance, disconnect the current one first
      // to prevent WhatsApp connection conflicts
      if (targetInstanceId !== config.instanceId) {
        const previousState = client.getConnectionState();
        if (previousState === "connected" || previousState === "connecting") {
          console.log(`📴 Disconnecting current instance: ${config.instanceId}`);
          await disconnectClient({ instanceId: config.instanceId, sessionPath: config.sessionPath });
        }
      }

      // Always use cmdInstanceConnect for consistency
      const result = await cmdInstanceConnect(config.sessionPath, targetInstanceId);

      // Handle auto-switch if result indicates it
      if (result && typeof result === "object" && "switchToInstance" in result) {
        const switchTo = result.switchToInstance;
        if (switchTo && switchTo !== config.instanceId) {
          config.instanceId = switchTo;
          client = getOrCreateClient(config);
          rl.setPrompt(getPrompt(switchTo, client.getConnectionState()));
          rl.prompt();
          return;
        }
      }

      rl.setPrompt(getPrompt(config.instanceId, client.getConnectionState()));
      rl.prompt();
      return;
    }

    if (input === "disconnect" || input.startsWith("disconnect ")) {
      const parts = input.split(/\s+/);
      const targetInstanceId = parts[1] || config.instanceId;

      // Always use cmdInstanceDisconnect for consistency
      const result = await cmdInstanceDisconnect(
        config.sessionPath,
        targetInstanceId,
        config.instanceId
      );

      // Handle auto-switch if result suggests it
      if (result && typeof result === "object" && "switchToInstance" in result) {
        const switchTo = result.switchToInstance;
        if (switchTo && switchTo !== config.instanceId) {
          config.instanceId = switchTo;
          client = getOrCreateClient(config);
          console.log(`✅ Switched to instance: ${switchTo}`);
        }
      }

      rl.setPrompt(getPrompt(config.instanceId, client.getConnectionState()));
      rl.prompt();
      return;
    }

    // Debug toggle commands
    if (input === "debug" || input === "debug on") {
      client.enableDebug();
      console.log("✅ Debug mode enabled");
      rl.prompt();
      return;
    }

    if (input === "debug off") {
      client.disableDebug();
      console.log("✅ Debug mode disabled");
      rl.prompt();
      return;
    }

    if (input === "instances" || input === "ls") {
      await cmdInstanceList(config.sessionPath);
      rl.prompt();
      return;
    }

    // Run regular command (remove "miaw-cli" prefix if present)
    let commandInput = input;
    if (input.startsWith("miaw-cli ")) {
      commandInput = input.slice(9).trim();
    }

    const parts = commandInput.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    try {
      const result = await runCommand(command, args, {
        clientConfig: config,
        jsonOutput: false,
      });

      // Check if command suggests switching to a different instance
      if (result && typeof result === "object" && "switchToInstance" in result) {
        const switchTo = result.switchToInstance;
        if (switchTo && switchTo !== config.instanceId) {
          // Disconnect previous instance to prevent WhatsApp connection conflicts
          const previousState = client.getConnectionState();
          if (previousState === "connected" || previousState === "connecting") {
            console.log(`📴 Disconnecting previous instance: ${config.instanceId}`);
            await disconnectClient({ instanceId: config.instanceId, sessionPath: config.sessionPath });
          }
          config.instanceId = switchTo;
          // Get the new client for the switched instance
          client = getOrCreateClient(config);
          console.log(`✅ Switched to instance: ${switchTo}`);
          // Update prompt with new client's state
          rl.setPrompt(getPrompt(switchTo, client.getConnectionState()));
          rl.prompt();
          return;
        }
      }
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }

    // Update prompt in case connection state changed
    rl.setPrompt(getPrompt(config.instanceId, client.getConnectionState()));
    rl.prompt();
  };

  // Wrap async handler to catch promise rejections
  const safeLineHandler = (line: string) => {
    lineHandler(line).catch((error: unknown) => {
      console.error("❌ Command error:", getErrorMessage(error));
      if (config.debug) {
        console.error(error);
      }
      rl.prompt(); // Re-display prompt after error
    });
  };

  // Store the line handler so prompt utility can restore it
  setReplLineHandler(safeLineHandler);

  // Register the safe line handler
  rl.on("line", safeLineHandler);

  rl.on("close", async () => {
    // Save command history before exiting
    saveHistory(config.sessionPath, commandHistory);

    // Clear REPL readline reference
    clearReplReadline();

    // Disconnect all cached clients before exiting
    await disconnectAll();
    console.log();
    process.exit(0);
  });
}

/**
 * Show welcome message
 */
function showWelcome(config: ClientConfig): void {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║              miaw-cli - Interactive Mode                  ║
╚════════════════════════════════════════════════════════════╝

Instance: ${config.instanceId}
Session:  ${config.sessionPath}

Type 'help' for available commands, 'exit' to quit.
`);
}

/**
 * Show REPL help
 */
function showReplHelp(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                           REPL Commands                                ║
╚════════════════════════════════════════════════════════════════════════╝

REPL-SPECIFIC:
  help                                        Show this help message
  status                                      Show connection status
  use <instance-id>                           Switch active instance
  connect [id]                                Connect to WhatsApp
  disconnect [id]                             Disconnect from WhatsApp
  debug [on|off]                              Toggle debug mode
  instances, ls                               List all instances
  exit, quit                                  Exit REPL

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

EXAMPLES:
  get groups --limit 5
  get contacts --filter john
  get chats --filter 628
  get profile 6281234567890
  send text 6281234567890 "Hello"
  load messages 6281234567890@s.whatsapp.net
  check 6281234567890
  contact list --limit 10 --filter john
  contact info 6281234567890
  contact add 6281234567890 "John Doe" --first John --last Doe
  profile name set "My Bot Name"
  profile status set "Hello, I'm a bot"
  group list --filter family
  group participants 120363039902323086@g.us --limit 10
  label list
  label add "VIP" blue
  catalog list --limit 20
  catalog product create "T-Shirt" "Cotton shirt" 50000 IDR
`);
}

/**
 * Get prompt string based on connection state
 */
function getPrompt(instanceId: string, state: string): string {
  const status = state === "connected" ? "✓" : "✗";
  return `miaw-cli[${instanceId}] ${status}> `;
}

