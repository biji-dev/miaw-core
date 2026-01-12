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
import { listInstanceStates, updateInstanceState } from "../utils/instance-registry.js";
import { confirm } from "../utils/prompt.js";
import type { CLIContext } from "../context.js";

/**
 * Result type for instance connect command
 */
export interface InstanceConnectResult {
  success: boolean;
  switchToInstance?: string;
}

/**
 * Result type for instance disconnect command
 */
export interface InstanceDisconnectResult {
  success: boolean;
  switchToInstance?: string;
}

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

  // Get states from registry for all tracked instances
  const trackedStates = new Map<string, string>();
  for (const info of listInstanceStates(sessionPath)) {
    trackedStates.set(info.instanceId, info.state);
  }

  console.log(`\n📱 Instances (${instances.length}):\n`);
  for (const instanceId of instances) {
    // Use registry state if available, otherwise show as disconnected
    const status = trackedStates.get(instanceId) ?? "disconnected";
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
  instanceId: string,
  context: CLIContext
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

    // Try to get state from registry first (doesn't create new client)
    let state = context.registry.getInstanceState({ instanceId: id, sessionPath });
    let client: any = null;

    // If not in registry, try to get from cache (but don't create new one)
    if (state === null) {
      // Use context to access cache without circular dependency
      if (context.cache.hasClient({ instanceId: id, sessionPath })) {
        client = context.cache.getOrCreateClient({ instanceId: id, sessionPath });
        state = client.getConnectionState();
      } else {
        state = "disconnected";
      }
    } else {
      // Get client from registry if we have a state
      client = context.registry.getInstanceClient({ instanceId: id, sessionPath });
    }

    console.log(`Status: ${state}`);
    console.log(`Session: ${path.join(sessionPath, id)}`);

    if (state === "connected" && client) {
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
): Promise<InstanceConnectResult> {
  const instances = listInstances(sessionPath);

  if (!instances.includes(instanceId)) {
    console.log(`❌ Instance "${instanceId}" not found.`);
    console.log(`Create it first with: miaw-cli instance create ${instanceId}`);
    return { success: false };
  }

  console.log(`\n📱 Connecting instance: ${instanceId}`);

  // Use cached client (creates new if not in cache)
  const client = getOrCreateClient({ instanceId, sessionPath });

  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Failed to connect: ${result.reason}`);
    return { success: false };
  }

  console.log(`✅ Connected!`);

  // Explicitly update registry state for immediate consistency
  // The event listener might not have fired yet, so update proactively
  updateInstanceState({ instanceId, sessionPath }, "connected");

  // Signal REPL to switch to this instance
  return { success: true, switchToInstance: instanceId };
}

/**
 * Disconnect instance
 */
export async function cmdInstanceDisconnect(
  sessionPath: string,
  instanceId: string,
  currentInstanceId?: string
): Promise<InstanceDisconnectResult> {
  const client = getOrCreateClient({ instanceId, sessionPath });

  const state = client.getConnectionState();
  if (state !== "connected") {
    console.log(`ℹ️  Instance "${instanceId}" is not connected.`);
    // Still remove from cache to clean up
    await disconnectClient({ instanceId, sessionPath });
    return { success: true };
  }

  await client.disconnect();
  // Remove from cache after disconnecting
  await disconnectClient({ instanceId, sessionPath });
  console.log(`✅ Disconnected from "${instanceId}"`);

  // If we disconnected the currently active instance, suggest switching to default
  if (currentInstanceId && instanceId === currentInstanceId) {
    return { success: true, switchToInstance: "default" };
  }

  return { success: true };
}

/**
 * Logout and clear session
 */
export async function cmdInstanceLogout(
  sessionPath: string,
  instanceId: string,
  currentInstanceId?: string
): Promise<boolean | { success: boolean; switchToInstance?: string }> {
  const client = getOrCreateClient({ instanceId, sessionPath });

  // Always ask for confirmation
  const ans = await confirm(
    `This will logout and clear the session for "${instanceId}". Continue?`
  );
  if (!ans) {
    console.log("Cancelled.");
    return false;
  }

  // Show loading indicator
  console.log(`⏳ Logging out "${instanceId}"...`);

  // Always attempt logout to send remove-companion-device request
  // (will attempt reconnect if disconnected)
  // Note: client.logout() already clears the session directory via authHandler.clearSession()
  try {
    await client.logout();

    // Wait a brief moment for socket event handlers to complete
    // This prevents output appearing after REPL prompt is shown
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error) {
    console.log(`⚠️  Logout request failed: ${error}`);
    console.log("   Continuing with session cleanup...");
  }

  // Remove from cache
  await disconnectClient({ instanceId, sessionPath });

  // Double-check session directory is deleted (logout should have already done this)
  const sessionStillExists = deleteInstance(sessionPath, instanceId);

  if (sessionStillExists) {
    // This means logout didn't clean up properly - now we cleaned it manually
    console.log(`✅ Logged out and cleared remaining session files for "${instanceId}"`);
  } else {
    // Normal case - logout already cleaned everything
    console.log(`✅ Logged out and cleared session for "${instanceId}"`);
  }

  // Final brief pause to ensure message is displayed before prompt returns
  await new Promise(resolve => setTimeout(resolve, 50));

  // Check if we need to switch instances (when logging out the current instance)
  if (currentInstanceId && instanceId === currentInstanceId) {
    // Get remaining instances
    const instances = listInstances(sessionPath);

    if (instances.length > 0) {
      // Try to switch to "default" if it exists, otherwise use the first available
      const newInstance = instances.includes("default") ? "default" : instances[0];
      console.log(`📌 Switching to instance: ${newInstance}`);
      return { success: true, switchToInstance: newInstance };
    } else {
      // No instances left - stay on current (non-existent) instance
      console.log(`⚠️  No instances available. Use "instance create <id>" to create one.`);
      return true;
    }
  }

  return true;
}
