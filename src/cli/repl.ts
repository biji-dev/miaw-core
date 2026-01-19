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

    if (input === "help" || input.startsWith("help ")) {
      const parts = input.split(/\s+/);
      const helpTopic = parts[1] || "";
      showReplHelp(helpTopic);
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
 * Show REPL help - full or topic-specific
 */
function showReplHelp(topic: string = ""): void {
  const topicLower = topic.toLowerCase();

  // Topic-specific help
  switch (topicLower) {
    case "instance":
      showHelpInstance();
      return;
    case "get":
      showHelpGet();
      return;
    case "load":
      showHelpLoad();
      return;
    case "send":
      showHelpSend();
      return;
    case "group":
      showHelpGroup();
      return;
    case "check":
      showHelpCheck();
      return;
    case "contact":
      showHelpContact();
      return;
    case "profile":
      showHelpProfile();
      return;
    case "label":
      showHelpLabel();
      return;
    case "catalog":
      showHelpCatalog();
      return;
    case "":
      // Show full help
      break;
    default:
      console.log(`❌ Unknown help topic: ${topic}`);
      console.log(`Available topics: instance, get, load, send, group, check, contact, profile, label, catalog`);
      console.log(`Usage: help [topic]`);
      return;
  }

  // Full help
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                           REPL Commands                                ║
╚════════════════════════════════════════════════════════════════════════╝

REPL-SPECIFIC:
  help [topic]                                Show help (topics: instance, get, send, group, contact, profile, label, catalog)
  status                                      Show connection status
  use <instance-id>                           Switch active instance
  connect [id]                                Connect to WhatsApp
  disconnect [id]                             Disconnect from WhatsApp
  debug [on|off]                              Toggle debug mode
  instances, ls                               List all instances
  exit, quit                                  Exit REPL

COMMANDS (use "help <command>" for details):
  instance    Manage WhatsApp instances (create, connect, disconnect, etc.)
  get         Fetch data (profile, contacts, groups, chats, messages, labels)
  load        Load older messages from chat history
  send        Send messages (text, image, document)
  group       Group management (info, participants, invites, settings)
  check       Check if phone numbers are on WhatsApp
  contact     Contact management (list, info, add, remove)
  profile     Profile management (picture, name, status)
  label       Label management (WhatsApp Business)
  catalog     Catalog management (WhatsApp Business)

QUICK EXAMPLES:
  get groups --limit 5                        List first 5 groups
  send text 6281234567890 "Hello"             Send a text message
  contact list --filter john                  Find contacts named john
  group info 120363039902323086@g.us          Get group details

Type "help <command>" for detailed help on each command.
`);
}

/**
 * Show help for instance commands
 */
function showHelpInstance(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                       Instance Commands                                ║
╚════════════════════════════════════════════════════════════════════════╝

COMMANDS:
  instance ls                                 List all instances
  instance status [id]                        Show connection status
  instance create <id>                        Create new instance
  instance delete <id>                        Delete instance
  instance connect <id>                       Connect instance
  instance disconnect <id>                    Disconnect instance
  instance logout <id>                        Logout and clear session

EXAMPLES:
  instance ls                                 List all instances
  instance status                             Show current instance status
  instance status my-bot                      Show status of 'my-bot' instance
  instance create my-bot                      Create a new instance 'my-bot'
  instance connect my-bot                     Connect 'my-bot' to WhatsApp
  instance disconnect my-bot                  Disconnect 'my-bot'
  instance logout my-bot                      Logout and require new QR scan

NOTES:
  - Each instance maintains its own WhatsApp session
  - Creating an instance will prompt for QR code scan
  - Logout clears the session, requiring re-authentication
`);
}

/**
 * Show help for get commands
 */
function showHelpGet(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                          Get Commands                                  ║
╚════════════════════════════════════════════════════════════════════════╝

COMMANDS:
  get profile [jid]                           Get profile (own or contact)
  get contacts [options]                      List all contacts
  get groups [options]                        List all groups
  get chats [options]                         List all chats
  get messages <jid> [options]                Get chat messages
  get labels                                  List labels (Business only)

OPTIONS:
  --limit N                                   Limit number of results
  --filter TEXT                               Filter by name/phone (case-insensitive)
  --json                                      Output as JSON

EXAMPLES:
  get profile                                 Get your own profile
  get profile 6281234567890                   Get contact's profile
  get contacts                                List all contacts
  get contacts --limit 10                     List first 10 contacts
  get contacts --filter john                  Find contacts matching 'john'
  get groups --limit 5                        List first 5 groups
  get groups --filter family                  Find groups matching 'family'
  get chats --limit 20                        List recent 20 chats
  get messages 6281234567890@s.whatsapp.net   Get messages from chat
  get messages 6281234567890@s.whatsapp.net --limit 50
  get labels                                  List all labels

NOTES:
  - JID format: phone@s.whatsapp.net (individual), groupid@g.us (group)
  - Filter searches in name, phone, and JID fields
`);
}

/**
 * Show help for load commands
 */
function showHelpLoad(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                         Load Commands                                  ║
╚════════════════════════════════════════════════════════════════════════╝

COMMANDS:
  load messages <jid> [--count N]             Load older messages from history

OPTIONS:
  --count N                                   Number of messages to load (default: 50)

EXAMPLES:
  load messages 6281234567890@s.whatsapp.net  Load 50 older messages
  load messages 6281234567890@s.whatsapp.net --count 100
  load messages 120363039902323086@g.us       Load group messages

NOTES:
  - JID format: phone@s.whatsapp.net (individual), groupid@g.us (group)
  - Messages are loaded from WhatsApp's server history
  - Use 'get messages' to view loaded messages
`);
}

/**
 * Show help for send commands
 */
function showHelpSend(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                         Send Commands                                  ║
╚════════════════════════════════════════════════════════════════════════╝

COMMANDS:
  send text <phone> <message>                 Send text message
  send image <phone> <path> [caption]         Send image
  send document <phone> <path> [caption]      Send document

EXAMPLES:
  send text 6281234567890 "Hello World"       Send text to number
  send text 6281234567890 "Hello, how are you?"
  send image 6281234567890 ./photo.jpg        Send image
  send image 6281234567890 ./photo.jpg "Check this out!"
  send document 6281234567890 ./report.pdf    Send document
  send document 6281234567890 ./report.pdf "Monthly Report"

NOTES:
  - Phone number format: international without + (e.g., 6281234567890)
  - Supported image formats: JPEG, PNG, GIF, WebP
  - Documents can be any file type (PDF, DOC, ZIP, etc.)
  - Caption is optional for images and documents
`);
}

/**
 * Show help for group commands
 */
function showHelpGroup(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                         Group Commands                                 ║
╚════════════════════════════════════════════════════════════════════════╝

COMMANDS:
  group list [options]                        List all groups
  group info <jid>                            Get group details
  group create <name> <phones..>              Create new group
  group leave <jid>                           Leave a group

PARTICIPANT MANAGEMENT:
  group participants <jid> [options]          List group members
  group participants add <jid> <phones>       Add members to group
  group participants remove <jid> <phones>    Remove members from group
  group participants promote <jid> <phones>   Promote to admin
  group participants demote <jid> <phones>    Demote from admin

INVITE MANAGEMENT:
  group invite-link <jid>                     Get invite link
  group invite accept <code>                  Join via invite code
  group invite revoke <jid>                   Revoke and get new link
  group invite info <code>                    Get info from invite code

GROUP SETTINGS:
  group name set <jid> <name>                 Update group name
  group description set <jid> [desc]          Update group description
  group picture set <jid> <path>              Update group picture

OPTIONS:
  --limit N                                   Limit number of results
  --filter TEXT                               Filter by name (case-insensitive)

EXAMPLES:
  group list                                  List all groups
  group list --filter family                  Find groups with 'family'
  group info 120363039902323086@g.us          Get group details
  group participants 120363039902323086@g.us  List members
  group participants add 120363039902323086@g.us 6281234567890 6289876543210
  group create "My Team" 6281234567890 6289876543210
  group invite-link 120363039902323086@g.us   Get invite link
  group name set 120363039902323086@g.us "New Name"

NOTES:
  - Group JID format: groupid@g.us
  - Multiple phones can be separated by spaces
  - You must be an admin to manage participants and settings
`);
}

/**
 * Show help for check commands
 */
function showHelpCheck(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                         Check Commands                                 ║
╚════════════════════════════════════════════════════════════════════════╝

COMMANDS:
  check <phone>                               Check if number is on WhatsApp
  check <phone1> <phone2> ...                 Batch check multiple numbers

OPTIONS:
  --json                                      Output as JSON

EXAMPLES:
  check 6281234567890                         Check single number
  check 6281234567890 6289876543210           Check multiple numbers
  check 6281234567890 6289876543210 --json    JSON output

OUTPUT:
  Shows whether each number is registered on WhatsApp and its JID.

NOTES:
  - Phone number format: international without + (e.g., 6281234567890)
  - Useful for validating contacts before sending messages
`);
}

/**
 * Show help for contact commands
 */
function showHelpContact(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                        Contact Commands                                ║
╚════════════════════════════════════════════════════════════════════════╝

COMMANDS:
  contact list [options]                      List all contacts
  contact info <phone>                        Get contact information
  contact business <phone>                    Get business profile
  contact picture <phone> [--high]            Get profile picture URL
  contact add <phone> <name> [options]        Add or edit contact
  contact remove <phone>                      Remove contact

OPTIONS:
  --limit N                                   Limit number of results
  --filter TEXT                               Filter by name/phone
  --high                                      Get high-resolution picture
  --first <firstName>                         Set first name
  --last <lastName>                           Set last name
  --json                                      Output as JSON

EXAMPLES:
  contact list                                List all contacts
  contact list --limit 10                     List first 10 contacts
  contact list --filter john                  Find contacts matching 'john'
  contact info 6281234567890                  Get contact details
  contact business 6281234567890              Get business profile (if business account)
  contact picture 6281234567890               Get profile picture URL
  contact picture 6281234567890 --high        Get high-res profile picture
  contact add 6281234567890 "John Doe"        Add/update contact
  contact add 6281234567890 "John Doe" --first John --last Doe
  contact remove 6281234567890                Remove contact

NOTES:
  - Phone number format: international without + (e.g., 6281234567890)
  - Business profile only available for WhatsApp Business accounts
  - Profile picture may be unavailable due to privacy settings
`);
}

/**
 * Show help for profile commands
 */
function showHelpProfile(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                        Profile Commands                                ║
╚════════════════════════════════════════════════════════════════════════╝

COMMANDS:
  profile picture set <path>                  Set your profile picture
  profile picture remove                      Remove your profile picture
  profile name set <name>                     Set your display name
  profile status set <status>                 Set your status/about text

EXAMPLES:
  profile picture set ./avatar.jpg            Set profile picture
  profile picture remove                      Remove profile picture
  profile name set "My Bot"                   Set display name
  profile name set "Customer Support Bot"
  profile status set "Available 24/7"         Set status text
  profile status set "Away until Monday"

NOTES:
  - Supported image formats: JPEG, PNG
  - Display name may take time to propagate
  - Status/about text has a character limit
`);
}

/**
 * Show help for label commands
 */
function showHelpLabel(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                    Label Commands (WhatsApp Business)                  ║
╚════════════════════════════════════════════════════════════════════════╝

COMMANDS:
  label list                                  List all labels
  label chats <labelId>                       List chats with this label
  label add <name> <color>                    Create a new label
  label chat add <jid> <labelId>              Add label to chat
  label chat remove <jid> <labelId>           Remove label from chat

COLOR OPTIONS:
  By number: 0-19
  By name: salmon, gold, yellow, mint, teal, cyan, sky, blue, purple, pink,
           rose, orange, lime, green, emerald, indigo, violet, magenta, red, gray

EXAMPLES:
  label list                                  List all labels
  label chats 12345678901                     List chats with label ID
  label add "VIP" blue                        Create blue "VIP" label
  label add "New Lead" 3                      Create label with color #3
  label chat add 6281234567890 12345678901    Add label to chat
  label chat remove 6281234567890 12345678901 Remove label from chat

NOTES:
  - Labels are only available for WhatsApp Business accounts
  - Label IDs are returned when creating or listing labels
  - JID format: phone@s.whatsapp.net or groupid@g.us
`);
}

/**
 * Show help for catalog commands
 */
function showHelpCatalog(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                   Catalog Commands (WhatsApp Business)                 ║
╚════════════════════════════════════════════════════════════════════════╝

COMMANDS:
  catalog list [options]                      List catalog products
  catalog collections [options]               List product collections
  catalog product create <name> <desc> <price> <currency>
  catalog product update <productId> [options]
  catalog product delete <productIds...>      Delete products

OPTIONS:
  --phone <phone>                             View another business's catalog
  --limit N                                   Limit number of results
  --cursor <cursor>                           Pagination cursor
  --image <path>                              Product image path
  --url <url>                                 Product landing page URL
  --retailerId <id>                           Your internal SKU/product ID
  --hidden                                    Mark product as hidden

EXAMPLES:
  catalog list                                List your catalog
  catalog list --limit 20                     List first 20 products
  catalog list --phone 6281234567890          View another's catalog
  catalog collections                         List your collections
  catalog product create "T-Shirt" "Cotton shirt" 50000 IDR
  catalog product create "Laptop" "Gaming laptop" 15000000 IDR --image ./laptop.jpg
  catalog product update 1234567890 --price 55000
  catalog product update 1234567890 --name "New Name" --hidden
  catalog product delete 1234567890           Delete one product
  catalog product delete 1234567890 1234567891  Delete multiple products

NOTES:
  - Catalog is only available for WhatsApp Business accounts
  - Currency should be a valid ISO currency code (IDR, USD, EUR, etc.)
  - Product IDs are returned when creating or listing products
`);
}

/**
 * Get prompt string based on connection state
 */
function getPrompt(instanceId: string, state: string): string {
  const status = state === "connected" ? "✓" : "✗";
  return `miaw-cli[${instanceId}] ${status}> `;
}

