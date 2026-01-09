/**
 * Instance Management Commands
 *
 * Commands for managing WhatsApp instances (list, status, create, delete, etc.)
 */

import * as path from "path";
import {
  createClient,
  deleteInstance,
  ensureConnected,
  listInstances,
} from "../utils/session.js";
import {
  disconnectClient,
  getOrCreateClient,
} from "../utils/client-cache.js";

/**
 * List all instances
 */
export async function cmdInstanceList(sessionPath: string): Promise<boolean> {
  const instances = listInstances(sessionPath);

  if (instances.length === 0) {
    console.log("No instances found.");
    console.log(`Create one with: miaw-cli instance create <id>`);
    return true;
  }

  console.log(`\n📱 Instances (${instances.length}):\n`);
  for (const instanceId of instances) {
    let status = "disconnected";
    try {
      const client = createClient({ instanceId, sessionPath });
      if (client.getConnectionState() === "connected") {
        status = "connected";
      }
    } catch {}

    console.log(`  ${instanceId} [${status}]`);
  }
  console.log();

  return true;
}

/**
 * Show instance status
 */
export async function cmdInstanceStatus(
  sessionPath: string,
  instanceId: string
): Promise<boolean> {
  const instances = listInstances(sessionPath);

  if (instanceId && !instances.includes(instanceId)) {
    console.log(`❌ Instance "${instanceId}" not found.`);
    console.log(`\nAvailable instances:`, instances.join(", ") || "none");
    return false;
  }

  // Show status for specific instance or all
  const targetInstances = instanceId
    ? [instanceId]
    : instances.length > 0
    ? instances
    : ["default"];

  for (const id of targetInstances) {
    console.log(`\n📱 Instance: ${id}`);
    console.log("─".repeat(50));

    const client = createClient({ instanceId: id, sessionPath });
    const state = client.getConnectionState();

    console.log(`Status: ${state}`);
    console.log(`Session: ${path.join(sessionPath, id)}`);

    if (state === "connected") {
      try {
        const profile = await client.getOwnProfile();
        if (profile) {
          console.log(`Phone: ${profile.phone || "(not available)"}`);
          console.log(`Name: ${profile.name || "(not set)"}`);
          console.log(`Business: ${profile.isBusiness ? "Yes" : "No"}`);
        }
      } catch (err: any) {
        console.log(`Profile: Error - ${err.message}`);
      }
    }
  }

  console.log();
  return true;
}

/**
 * Create new instance (triggers QR)
 */
export async function cmdInstanceCreate(
  sessionPath: string,
  instanceId: string
): Promise<boolean> {
  const instances = listInstances(sessionPath);

  if (instances.includes(instanceId)) {
    console.log(`⚠️  Instance "${instanceId}" already exists.`);
    const ans = await confirm("Do you want to clear and recreate it?");
    if (!ans) {
      console.log("Cancelled.");
      return false;
    }
    deleteInstance(sessionPath, instanceId);
  }

  console.log(`\n📱 Creating instance: ${instanceId}`);
  console.log("─".repeat(50));

  const client = createClient({ instanceId, sessionPath });

  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Failed to connect: ${result.reason}`);
    return false;
  }

  console.log(`\n✅ Instance "${instanceId}" created successfully!`);
  console.log(`You can now use it with: miaw-cli --instance-id ${instanceId} <command>`);

  return true;
}

/**
 * Delete instance
 */
export async function cmdInstanceDelete(
  sessionPath: string,
  instanceId: string
): Promise<boolean> {
  const instances = listInstances(sessionPath);

  if (!instances.includes(instanceId)) {
    console.log(`❌ Instance "${instanceId}" not found.`);
    return false;
  }

  const ans = await confirm(
    `Are you sure you want to delete instance "${instanceId}"?`
  );
  if (!ans) {
    console.log("Cancelled.");
    return false;
  }

  // Remove from cache first (disconnects if connected)
  await disconnectClient({ instanceId, sessionPath });

  // Delete session files
  const success = deleteInstance(sessionPath, instanceId);
  if (success) {
    console.log(`✅ Instance "${instanceId}" deleted.`);
    return true;
  }

  console.log(`❌ Failed to delete instance "${instanceId}".`);
  return false;
}

/**
 * Connect instance
 */
export async function cmdInstanceConnect(
  sessionPath: string,
  instanceId: string
): Promise<boolean> {
  const instances = listInstances(sessionPath);

  if (!instances.includes(instanceId)) {
    console.log(`❌ Instance "${instanceId}" not found.`);
    console.log(`Create it first with: miaw-cli instance create ${instanceId}`);
    return false;
  }

  console.log(`\n📱 Connecting instance: ${instanceId}`);

  // Use cached client (creates new if not in cache)
  const client = getOrCreateClient({ instanceId, sessionPath });

  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Failed to connect: ${result.reason}`);
    return false;
  }

  console.log(`✅ Connected!`);

  return true;
}

/**
 * Disconnect instance
 */
export async function cmdInstanceDisconnect(
  sessionPath: string,
  instanceId: string
): Promise<boolean> {
  const client = getOrCreateClient({ instanceId, sessionPath });

  const state = client.getConnectionState();
  if (state !== "connected") {
    console.log(`ℹ️  Instance "${instanceId}" is not connected.`);
    // Still remove from cache to clean up
    await disconnectClient({ instanceId, sessionPath });
    return true;
  }

  await client.disconnect();
  // Remove from cache after disconnecting
  await disconnectClient({ instanceId, sessionPath });
  console.log(`✅ Disconnected from "${instanceId}"`);

  return true;
}

/**
 * Logout and clear session
 */
export async function cmdInstanceLogout(
  sessionPath: string,
  instanceId: string
): Promise<boolean> {
  const client = getOrCreateClient({ instanceId, sessionPath });

  const state = client.getConnectionState();
  if (state === "connected") {
    const ans = await confirm(
      `This will logout and clear the session for "${instanceId}". Continue?`
    );
    if (!ans) {
      console.log("Cancelled.");
      return false;
    }

    try {
      await client.logout();
    } catch {
      // Logout might fail if not properly connected, try to clear session
    }
  }

  // Remove from cache and delete session files
  await disconnectClient({ instanceId, sessionPath });
  const success = deleteInstance(sessionPath, instanceId);

  if (success) {
    console.log(`✅ Logged out and cleared session for "${instanceId}"`);
    return true;
  }

  console.log(`⚠️  Logged out but session directory may still exist.`);
  return true;
}

/**
 * Helper: Import confirm from session utils
 */
async function confirm(question: string): Promise<boolean> {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} [y/N]: `, (answer) => {
      rl.close();
      resolve(
        answer.toLowerCase() === "y" || answer.toLowerCase() === "yes"
      );
    });
  });
}
