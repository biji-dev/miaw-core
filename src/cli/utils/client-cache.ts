/**
 * Client Cache Manager
 *
 * Caches MiawClient instances to avoid reconnecting on every command.
 * Key format: `${instanceId}:${sessionPath}`
 */

import { MiawClient } from "../../index.js";
import { createClient, type ClientConfig } from "./session.js";
import { registerInstance, unregisterInstance } from "./instance-registry.js";
import { TIMEOUTS } from "../../constants/timeouts.js";

// Client cache: Map<cacheKey, MiawClient>
const clientCache = new Map<string, MiawClient>();

// Track last usage time for potential TTL eviction (future enhancement)
const lastUsed = new Map<string, number>();

// Track when clients were cached (for grace period check)
const cachedTime = new Map<string, number>();

/**
 * Generate cache key from client config
 */
function getCacheKey(config: ClientConfig): string {
  return `${config.instanceId}:${config.sessionPath}`;
}

/**
 * Get existing client from cache or create new one
 */
export function getOrCreateClient(config: ClientConfig): MiawClient {
  const key = getCacheKey(config);

  // Check cache for existing client
  const cached = clientCache.get(key);
  if (cached) {
    const state = cached.getConnectionState();
    const cacheTime = cachedTime.get(key) || 0;
    const age = Date.now() - cacheTime;

    // Within grace period, always return cached client regardless of state
    // This allows transient disconnects during and after QR connection handshake
    if (age < TIMEOUTS.CACHE_GRACE_PERIOD) {
      lastUsed.set(key, Date.now());
      return cached;
    }

    // After grace period, prefer clients in good states
    if (state === "connected" || state === "connecting" || state === "reconnecting") {
      lastUsed.set(key, Date.now());
      return cached;
    }

    // Don't evict - return cached client even in bad state
    // Let explicit cleanup (disconnectClient) handle eviction
    // This prevents cache churn during transient state changes
    lastUsed.set(key, Date.now());
    return cached;
  }

  // Create new client and cache it
  const client = createClient(config);
  clientCache.set(key, client);
  lastUsed.set(key, Date.now());
  cachedTime.set(key, Date.now()); // Track cache time for grace period

  // Register with instance registry for state tracking
  registerInstance(config, client);

  return client;
}

/**
 * Disconnect and remove specific client from cache
 */
export async function disconnectClient(config: ClientConfig): Promise<void> {
  const key = getCacheKey(config);
  const client = clientCache.get(key);

  if (client && client.getConnectionState() === "connected") {
    await client.disconnect();
  }

  // Unregister from instance registry
  unregisterInstance(config);

  clientCache.delete(key);
  lastUsed.delete(key);
  cachedTime.delete(key);
}

/**
 * Disconnect all cached clients and clear cache
 */
export async function disconnectAll(): Promise<void> {
  const disconnectPromises: Promise<void>[] = [];

  for (const [key, client] of clientCache.entries()) {
    if (client.getConnectionState() === "connected") {
      disconnectPromises.push(
        client.disconnect().catch((err) => {
          // Log but don't fail if disconnect fails
          console.error(`Error disconnecting client ${key}:`, err);
        })
      );
    }
  }

  await Promise.all(disconnectPromises);

  // Unregister all from instance registry
  for (const key of clientCache.keys()) {
    const [instanceId, sessionPath] = key.split(":");
    unregisterInstance({ instanceId, sessionPath });
  }

  clientCache.clear();
  lastUsed.clear();
  cachedTime.clear();
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): {
  size: number;
  keys: string[];
  clients: Array<{ key: string; state: string }>;
} {
  const clients: Array<{ key: string; state: string }> = [];

  for (const [key, client] of clientCache.entries()) {
    clients.push({
      key,
      state: client.getConnectionState(),
    });
  }

  return {
    size: clientCache.size,
    keys: Array.from(clientCache.keys()),
    clients,
  };
}

/**
 * Check if specific client is in cache
 */
export function hasClient(config: ClientConfig): boolean {
  return clientCache.has(getCacheKey(config));
}

/**
 * Remove specific client from cache without disconnecting
 * (Useful when client is already disconnected externally)
 */
export function removeClient(config: ClientConfig): void {
  const key = getCacheKey(config);

  // Unregister from instance registry
  unregisterInstance(config);

  clientCache.delete(key);
  lastUsed.delete(key);
  cachedTime.delete(key);
}
