/**
 * Instance Registry
 *
 * Centralized tracking of all MiawClient instances and their connection states.
 * Provides a single source of truth for instance status across the CLI.
 */

import { MiawClient } from "../../index.js";
import type { ConnectionState } from "../../types/index.js";
import type { ClientConfig } from "./session.js";

/**
 * Information about a tracked instance
 */
interface InstanceInfo {
  instanceId: string;
  sessionPath: string;
  state: ConnectionState;
  client: MiawClient;
  lastUpdated: number;
}

/**
 * Generate registry key from client config
 */
function getRegistryKey(config: ClientConfig): string {
  return `${config.instanceId}:${config.sessionPath}`;
}

/**
 * Singleton Instance Registry
 *
 * Tracks all active MiawClient instances and their connection states.
 * Listens to "connection" events from clients to automatically update states.
 */
class InstanceRegistry {
  private instances: Map<string, InstanceInfo> = new Map();

  /**
   * Register a new client instance
   */
  register(config: ClientConfig, client: MiawClient): void {
    const key = getRegistryKey(config);

    // Remove existing entry if present (cleanup old event listeners)
    if (this.instances.has(key)) {
      this.unregister(config);
    }

    // Get initial state
    const initialState = client.getConnectionState();

    // Create instance info
    const info: InstanceInfo = {
      instanceId: config.instanceId,
      sessionPath: config.sessionPath,
      state: initialState,
      client,
      lastUpdated: Date.now(),
    };

    // Store in registry
    this.instances.set(key, info);

    // Listen for connection state changes
    const connectionHandler = (state: ConnectionState) => {
      this.updateState(config, state);
    };

    client.on("connection", connectionHandler);

    // Store event handler for cleanup
    (info as any)._connectionHandler = connectionHandler;
  }

  /**
   * Unregister a client instance
   */
  unregister(config: ClientConfig): void {
    const key = getRegistryKey(config);
    const info = this.instances.get(key);

    if (info) {
      // Remove event listener
      const handler = (info as any)._connectionHandler;
      if (handler) {
        info.client.off("connection", handler);
      }

      // Remove from registry
      this.instances.delete(key);
    }
  }

  /**
   * Update connection state for an instance
   */
  updateState(config: ClientConfig, state: ConnectionState): void {
    const key = getRegistryKey(config);
    const info = this.instances.get(key);

    if (info) {
      info.state = state;
      info.lastUpdated = Date.now();
    }
  }

  /**
   * Get connection state for a specific instance
   * Returns null if instance is not registered
   */
  getInstanceState(config: ClientConfig): ConnectionState | null {
    const key = getRegistryKey(config);
    const info = this.instances.get(key);

    return info?.state ?? null;
  }

  /**
   * Get client for a specific instance
   * Returns null if instance is not registered
   */
  getClient(config: ClientConfig): MiawClient | null {
    const key = getRegistryKey(config);
    const info = this.instances.get(key);

    return info?.client ?? null;
  }

  /**
   * List all instances for a given session path
   */
  listInstances(sessionPath: string): InstanceInfo[] {
    const instances: InstanceInfo[] = [];

    for (const info of this.instances.values()) {
      if (info.sessionPath === sessionPath) {
        instances.push(info);
      }
    }

    return instances;
  }

  /**
   * Get registry statistics (for debugging)
   */
  getStats(): {
    size: number;
    instances: Array<{ key: string; instanceId: string; state: string }>;
  } {
    const instances: Array<{ key: string; instanceId: string; state: string }> = [];

    for (const [key, info] of this.instances.entries()) {
      instances.push({
        key,
        instanceId: info.instanceId,
        state: info.state,
      });
    }

    return {
      size: this.instances.size,
      instances,
    };
  }

  /**
   * Clear all instances (for testing/cleanup)
   */
  clear(): void {
    for (const info of this.instances.values()) {
      const handler = (info as any)._connectionHandler;
      if (handler) {
        info.client.off("connection", handler);
      }
    }
    this.instances.clear();
  }
}

// Export singleton instance
export const instanceRegistry = new InstanceRegistry();

// Export convenience functions
export function registerInstance(config: ClientConfig, client: MiawClient): void {
  instanceRegistry.register(config, client);
}

export function unregisterInstance(config: ClientConfig): void {
  instanceRegistry.unregister(config);
}

export function updateInstanceState(config: ClientConfig, state: ConnectionState): void {
  instanceRegistry.updateState(config, state);
}

export function getInstanceState(config: ClientConfig): ConnectionState | null {
  return instanceRegistry.getInstanceState(config);
}

export function getInstanceClient(config: ClientConfig): MiawClient | null {
  return instanceRegistry.getClient(config);
}

export function listInstanceStates(sessionPath: string): InstanceInfo[] {
  return instanceRegistry.listInstances(sessionPath);
}

export type { InstanceInfo };
