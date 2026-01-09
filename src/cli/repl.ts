/**
 * Interactive REPL (Read-Eval-Print Loop)
 *
 * Provides an interactive shell for running miaw-cli commands
 */

import * as readline from "readline";
import { createClient, ensureConnected, listInstances } from "./utils/session.js";
import { disconnectAll } from "./utils/client-cache.js";
import { runCommand } from "./commands/index.js";

export interface ClientConfig {
  instanceId: string;
  sessionPath: string;
  debug?: boolean;
}

/**
 * Run the interactive REPL
 */
export async function runRepl(config: ClientConfig): Promise<void> {
  // Create client
  const client = createClient(config);

  // Show welcome message
  showWelcome(config);

  // Check connection status
  const state = client.getConnectionState();
  if (state !== "connected") {
    console.log("📱 Not connected. Type 'connect' to connect to WhatsApp.");
  } else {
    console.log("✅ Connected to WhatsApp!");
  }

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: getPrompt(config.instanceId, state),
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

    if (input === "connect") {
      await handleConnect(client);
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
      await runCommand(command, args, {
        clientConfig: config,
        jsonOutput: false,
      });
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
  connect              Connect to WhatsApp
  disconnect           Disconnect from WhatsApp
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
  console.log(`State:     ${client.getConnectionState()}`);

  if (client.getConnectionState() === "connected") {
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
