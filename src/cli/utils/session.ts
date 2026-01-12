/**
 * CLI Session Management Utilities
 *
 * Helper functions for managing MiawClient instances and sessions
 */

import * as fs from "fs";
import * as path from "path";
import qrcode from "qrcode-terminal";
import { MiawClient } from "../../index.js";

// Re-export prompt functions from shared utility
export { prompt, confirm } from "./prompt.js";

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

  // Track QR display timing
  const QR_DISPLAY_TIME = Date.now();
  const QR_GRACE_PERIOD = 30000; // 30 seconds - covers full connection handshake including transient disconnects
  const QR_SCAN_TIMEOUT = 60000; // 60 seconds to scan QR

  const connected = await new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      const finalState = client.getConnectionState();
      console.log(`\n⏱️  Connection timeout (final state: ${finalState})`);
      resolve(false);
    }, 120000);

    const onReady = () => {
      clearTimeout(timeout);
      clearInterval(pollInterval);
      client.off("ready", onReady);
      client.off("disconnected", onDisconnected);
      resolve(true);
    };

    const onDisconnected = () => {
      const timeSinceQrDisplay = Date.now() - QR_DISPLAY_TIME;

      // During 30s grace period after QR display, ignore all disconnects
      // Baileys emits transient disconnects (codes 408/428) during normal connection handshake
      if (timeSinceQrDisplay < QR_GRACE_PERIOD) {
        return; // Wait patiently - this is expected during QR scan and initial handshake
      }

      // After grace period, continue to be patient
      // Auto-reconnect will retry transient issues
      // Let the main timeout (120s) catch true hangs
      // Don't fail prematurely - the ready event will fire when truly connected
    };

    client.once("ready", onReady);
    client.on("disconnected", onDisconnected);

    // Also poll connection state as fallback in case event was missed
    let dots = 0;
    let stuckStateCount = 0;
    const STUCK_THRESHOLD = 30; // 30 seconds = 30 polling intervals - be patient
    const pollInterval = setInterval(() => {
      const currentState = client.getConnectionState();
      const now = Date.now();
      const timeSinceQrDisplay = now - QR_DISPLAY_TIME;

      if (currentState === "connected") {
        clearTimeout(timeout);
        clearInterval(pollInterval);
        client.off("ready", onReady);
        client.off("disconnected", onDisconnected);
        resolve(true);
      } else if (currentState === "disconnected") {
        // Just show feedback - don't fail here
        // The onDisconnected event handler and main timeout will handle failures
        const message = timeSinceQrDisplay < QR_GRACE_PERIOD
          ? "Waiting for QR scan..."
          : "Waiting for connection...";
        dots = (dots + 1) % 4;
        process.stdout.write(`\r${".".repeat(dots).padEnd(3, " ")} ${message}   `);
      } else if (currentState === "qr_required") {
        // QR timeout check
        if (timeSinceQrDisplay > QR_SCAN_TIMEOUT) {
          clearTimeout(timeout);
          clearInterval(pollInterval);
          client.off("ready", onReady);
          client.off("disconnected", onDisconnected);
          console.log(`\n⏱️  QR code not scanned within ${QR_SCAN_TIMEOUT / 1000}s`);
          resolve(false);
          return;
        }
        dots = (dots + 1) % 4;
        process.stdout.write(`\r${".".repeat(dots).padEnd(3, " ")} Waiting for QR scan...   `);
      } else if (currentState === "connecting" || currentState === "reconnecting") {
        stuckStateCount++;
        dots = (dots + 1) % 4;
        process.stdout.write(`\r${".".repeat(dots).padEnd(3, " ")} State: ${currentState}   `);

        // If stuck for too long, reset counter and keep trying
        // Let the main timeout (120s) catch true hangs
        if (stuckStateCount > STUCK_THRESHOLD) {
          stuckStateCount = 0; // Reset and keep waiting - be patient
        }
      } else {
        stuckStateCount = 0;
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
