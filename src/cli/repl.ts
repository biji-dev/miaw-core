/**
 * Interactive REPL (Read-Eval-Print Loop)
 *
 * Provides an interactive shell for running miaw-cli commands
 */

import * as readline from "readline";
import { ensureConnected, listInstances } from "./utils/session.js";
import { disconnectAll, getOrCreateClient } from "./utils/client-cache.js";
import { getInstanceState } from "./utils/instance-registry.js";
import { runCommand } from "./commands/index.js";

// =============================================================================
// Command Tree for Autocomplete
// =============================================================================

interface CommandNode {
  aliases?: string[];
  subcommands?: string[];
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
    flags: ["--limit", "--json"],
  },
  send: {
    subcommands: ["text", "image", "document"],
  },
  group: {
    subcommands: ["info", "participants", "invite-link", "create"],
  },
  check: {},
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

    // Level 2: Subcommands (second word onwards)
    if (parts.length >= 2) {
      const category = parts[0];
      const categoryData = commandTree[category];

      // Commands that accept instance ID as second argument
      if (["use", "connect", "disconnect"].includes(category) && parts.length === 2) {
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
        // Only return subcommands if we found matches or currentPart is empty
        if (hits.length > 0 || currentPart === "") {
          return [hits, currentPart];
        }
      }
    }

    // Level 3: Flags and instance IDs (third word onwards)
    if (parts.length >= 3) {
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

      // Instance ID completion (for 'use', 'instance delete', 'instance connect', etc.)
      if (["use", "instance", "connect"].includes(category)) {
        const instances = listInstances(sessionPath);
        for (const inst of instances) {
          if (inst.startsWith(currentPart)) {
            hits.push(inst);
          }
        }
        return [hits, currentPart];
      }
    }

    return [[], line];
  };
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
  // Create client (uses cache)
  const client = getOrCreateClient(config);

  // Show welcome message
  showWelcome(config);

  // Check connection status
  const state = client.getConnectionState();
  if (state !== "connected") {
    console.log("📱 Not connected. Type 'connect' to connect to WhatsApp.");
  } else {
    console.log("✅ Connected to WhatsApp!");
  }

  // Create readline interface with autocomplete
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: getPrompt(config.instanceId, state),
    completer: createCompleter(config.sessionPath),
  });

  // Handle REPL commands
  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();

    if (!input) {
      rl.prompt();
      return;
    }

    // Handle REPL-specific commands
    if (input === "exit" || input === "quit") {
      console.log("\n👋 Goodbye!");
      rl.close();
      return;
    }

    if (input === "help") {
      showReplHelp();
      rl.prompt();
      return;
    }

    if (input === "status") {
      await showStatus(client, config);
      rl.prompt();
      return;
    }

    if (input.startsWith("use ")) {
      const newInstanceId = input.slice(4).trim();
      if (newInstanceId) {
        config.instanceId = newInstanceId;
        console.log(`✅ Switched to instance: ${newInstanceId}`);
        rl.setPrompt(getPrompt(newInstanceId, client.getConnectionState()));
      }
      rl.prompt();
      return;
    }

    if (input === "connect" || input.startsWith("connect ")) {
      const parts = input.split(/\s+/);
      const targetInstanceId = parts[1];

      if (targetInstanceId) {
        // Connect to specified instance
        const result = await runCommand("instance", ["connect", targetInstanceId], {
          clientConfig: config,
          jsonOutput: false,
        });

        // Handle auto-switch if result indicates it
        if (result && typeof result === "object" && "switchToInstance" in result) {
          const switchTo = result.switchToInstance;
          if (switchTo && switchTo !== config.instanceId) {
            config.instanceId = switchTo;
            const newClient = getOrCreateClient(config);
            rl.setPrompt(getPrompt(switchTo, newClient.getConnectionState()));
            rl.prompt();
            return;
          }
        }
      } else {
        // Connect to current instance (existing behavior)
        await handleConnect(client);
      }

      rl.setPrompt(getPrompt(config.instanceId, client.getConnectionState()));
      rl.prompt();
      return;
    }

    if (input === "disconnect") {
      await handleDisconnect(client);
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
      await showInstances(config.sessionPath);
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
          config.instanceId = switchTo;
          // Get the new client for the switched instance
          const newClient = getOrCreateClient(config);
          console.log(`✅ Switched to instance: ${switchTo}`);
          // Update prompt with new client's state
          rl.setPrompt(getPrompt(switchTo, newClient.getConnectionState()));
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
  });

  rl.on("close", async () => {
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
╔════════════════════════════════════════════════════════════╗
║                      REPL Commands                        ║
╚════════════════════════════════════════════════════════════╝

REPL-SPECIFIC:
  help                 Show this help message
  status               Show connection status
  exit, quit           Exit REPL
  use <instance-id>    Switch to a different instance
  connect [id]         Connect to WhatsApp (optional: specify instance)
  disconnect           Disconnect from WhatsApp
  debug [on|off]       Enable/disable debug mode (default: on)
  instances, ls        List all instances

INSTANCE MANAGEMENT:
  instance ls                    List all instances
  instance status [id]           Show connection status
  instance create <id>           Create new instance
  instance delete <id>           Delete instance
  instance connect <id>          Connect instance
  instance disconnect <id>       Disconnect instance
  instance logout <id>           Logout and clear session

GET OPERATIONS:
  get profile                    Get your profile
  get contacts [--limit N]       List all contacts
  get groups [--limit N]         List all groups
  get chats [--limit N]          List all chats
  get messages <jid> [--limit N] Get chat messages
  get labels                     List labels (Business)

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

EXAMPLES:
  get groups --limit 5
  send text 6281234567890 "Hello"
  group info 123456789@g.us
  check 6281234567890
`);
}

/**
 * Get prompt string based on connection state
 */
function getPrompt(instanceId: string, state: string): string {
  const status = state === "connected" ? "✓" : "✗";
  return `miaw-cli[${instanceId}] ${status}> `;
}

/**
 * Show connection status
 */
async function showStatus(client: any, config: ClientConfig): Promise<void> {
  console.log(`\n📊 Status:\n`);
  console.log(`Instance:  ${config.instanceId}`);
  console.log(`Session:   ${config.sessionPath}`);

  // Use registry state as the source of truth for consistency
  const registryState = getInstanceState(config);
  const state = registryState ?? client.getConnectionState();

  console.log(`State:     ${state}`);

  if (state === "connected") {
    try {
      const profile = await client.getOwnProfile();
      if (profile) {
        console.log(`Phone:     ${profile.phone || "(not available)"}`);
        console.log(`Name:      ${profile.name || "(not set)"}`);
        console.log(`Business:  ${profile.isBusiness ? "Yes" : "No"}`);
      }
    } catch {
      // Ignore profile errors
    }
  }
  console.log();
}

/**
 * Handle connect command
 */
async function handleConnect(client: any): Promise<void> {
  const state = client.getConnectionState();
  if (state === "connected") {
    console.log("✅ Already connected");
    return;
  }

  console.log("📱 Connecting...");
  const result = await ensureConnected(client);

  if (result.success) {
    console.log("✅ Connected!");
  } else {
    console.log(`❌ Failed to connect: ${result.reason}`);
  }
}

/**
 * Handle disconnect command
 */
async function handleDisconnect(client: any): Promise<void> {
  const state = client.getConnectionState();
  if (state !== "connected") {
    console.log("ℹ️  Not connected");
    return;
  }

  await client.disconnect();
  console.log("✅ Disconnected");
}

/**
 * Show all instances
 */
async function showInstances(sessionPath: string): Promise<void> {
  const instances = listInstances(sessionPath);

  console.log(`\n📱 Instances (${instances.length}):\n`);

  if (instances.length === 0) {
    console.log("  No instances found");
    console.log('  Create one with: instance create <id>\n');
    return;
  }

  for (const instanceId of instances) {
    console.log(`  ${instanceId}`);
  }
  console.log();
}
