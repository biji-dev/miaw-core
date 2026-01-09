/**
 * CLI Session Management Utilities
 *
 * Helper functions for managing MiawClient instances and sessions
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import qrcode from "qrcode-terminal";
import { MiawClient } from "../../index.js";

export interface ClientConfig {
  instanceId: string;
  sessionPath: string;
  debug?: boolean;
}

/**
 * Get list of existing instances from session directory
 */
export function listInstances(sessionPath: string): string[] {
  if (!fs.existsSync(sessionPath)) {
    return [];
  }

  const items = fs.readdirSync(sessionPath);
  const instances: string[] = [];

  for (const item of items) {
    const itemPath = path.join(sessionPath, item);
    const stats = fs.statSync(itemPath);

    if (stats.isDirectory()) {
      // Check if it has creds.json (valid session)
      const credsPath = path.join(itemPath, "creds.json");
      if (fs.existsSync(credsPath)) {
        instances.push(item);
      }
    }
  }

  return instances;
}

/**
 * Delete an instance session
 */
export function deleteInstance(
  sessionPath: string,
  instanceId: string
): boolean {
  const instancePath = path.join(sessionPath, instanceId);

  if (!fs.existsSync(instancePath)) {
    return false;
  }

  try {
    fs.rmSync(instancePath, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a new MiawClient instance
 */
export function createClient(config: ClientConfig): MiawClient {
  return new MiawClient({
    instanceId: config.instanceId,
    sessionPath: config.sessionPath,
    debug: config.debug || false,
  });
}

/**
 * Wait for client to be ready
 */
export async function waitForConnection(
  client: MiawClient,
  timeout: number = 120000
): Promise<boolean> {
  const state = client.getConnectionState();

  if (state === "connected") {
    return true;
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(false);
    }, timeout);

    client.once("ready", () => {
      clearTimeout(timer);
      resolve(true);
    });

    client.once("disconnected", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

/**
 * Handle QR code display and wait for connection
 */
export async function handleQRConnection(
  client: MiawClient
): Promise<{ success: boolean; reason?: string }> {
  console.log("📱 Connecting to WhatsApp...");

  // Start connection
  client.connect();

  // Wait a moment for connection to initialize
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check if already connected (race condition check)
  if (client.getConnectionState() === "connected") {
    console.log("✅ Connected successfully!");
    return { success: true };
  }

  // Wait for QR or ready
  const result = await new Promise<"qr" | "ready" | "timeout">(
    (resolve) => {
      const timeout = setTimeout(() => {
        console.log("\n⏱️  Timeout while waiting for QR/ready event");
        resolve("timeout");
      }, 120000);

      const onQr = (qr: string) => {
        clearTimeout(timeout);
        console.log("\n📱 Scan the QR code below with WhatsApp:");
        qrcode.generate(qr, { small: true });
        console.log();
        resolve("qr");
      };

      const onReady = () => {
        clearTimeout(timeout);
        resolve("ready");
      };

      client.once("qr", onQr);
      client.once("ready", onReady);
    }
  );

  if (result === "timeout") {
    // Check actual state before giving up
    const finalState = client.getConnectionState();
    if (finalState === "connected") {
      console.log("✅ Connected successfully!");
      return { success: true };
    }
    return { success: false, reason: `Timeout waiting for connection (state: ${finalState})` };
  }

  if (result === "ready") {
    console.log("✅ Connected successfully!");
    return { success: true };
  }

  // QR was shown, wait for ready with polling check as fallback
  console.log("⏳ Waiting for connection...");

  // First check if already connected (could have connected during QR display)
  const initialCheckState = client.getConnectionState();
  if (initialCheckState === "connected") {
    console.log("✅ Connected successfully!");
    return { success: true };
  }

  console.log(`(Current state: ${initialCheckState})`);

  const connected = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      const finalState = client.getConnectionState();
      console.log(`\n⏱️  Connection timeout (final state: ${finalState})`);
      resolve(false);
    }, 120000);

    const onReady = () => {
      clearTimeout(timeout);
      resolve(true);
    };

    const onDisconnected = () => {
      clearTimeout(timeout);
      resolve(false);
    };

    client.once("ready", onReady);
    client.once("disconnected", onDisconnected);

    // Also poll connection state as fallback in case event was missed
    let dots = 0;
    const pollInterval = setInterval(() => {
      const currentState = client.getConnectionState();
      if (currentState === "connected") {
        clearInterval(pollInterval);
        clearTimeout(timeout);
        client.off("ready", onReady);
        client.off("disconnected", onDisconnected);
        resolve(true);
      } else if (currentState === "disconnected") {
        clearInterval(pollInterval);
        clearTimeout(timeout);
        client.off("ready", onReady);
        client.off("disconnected", onDisconnected);
        resolve(false);
      } else {
        // Show progress indicator
        dots = (dots + 1) % 4;
        process.stdout.write(`\r${".".repeat(dots).padEnd(3, " ")} State: ${currentState}   `);
      }
    }, 1000);
  });

  // Clear the progress line
  process.stdout.write("\r" + " ".repeat(50) + "\r");

  if (connected) {
    console.log("✅ Connected successfully!");
    return { success: true };
  }

  const finalState = client.getConnectionState();
  return { success: false, reason: `Failed to connect after QR scan (final state: ${finalState})` };
}

/**
 * Ensure client is connected, handling QR if needed
 */
export async function ensureConnected(
  client: MiawClient,
  options?: { silent?: boolean }
): Promise<{ success: boolean; reason?: string }> {
  const state = client.getConnectionState();

  if (state === "connected") {
    return { success: true };
  }

  if (state === "connecting" || state === "reconnecting") {
    if (options?.silent !== true) {
      console.log("📱 Connection in progress...");
    }
    // Wait for connection to complete
    const connected = await waitForConnection(client, 60000);
    if (connected) {
      return { success: true };
    }
    return { success: false, reason: "Connection timeout" };
  }

  if (options?.silent !== true) {
    console.log("📱 Not connected. Connecting...");
  }

  return handleQRConnection(client);
}

/**
 * Prompt user for input
 */
export function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt for confirmation
 */
export async function confirm(question: string): Promise<boolean> {
  const answer = await prompt(`${question} [y/N]: `);
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

/**
 * Format phone number to JID
 */
export function phoneToJid(phone: string): string {
  if (phone.includes("@")) {
    return phone; // Already a JID
  }
  return `${phone}@s.whatsapp.net`;
}

/**
 * Format JID to phone number
 */
export function jidToPhone(jid: string): string {
  return jid.replace("@s.whatsapp.net", "").replace("@g.us", "");
}
