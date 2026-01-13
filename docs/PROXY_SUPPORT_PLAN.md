# Proxy Support Implementation Plan for Miaw Core

## Executive Summary

This document outlines the research findings and implementation plan for adding proxy support to Miaw Core, enabling each WhatsApp instance to connect through a dedicated proxy. This feature is essential for:

- **IP Rotation**: Avoiding rate limits and blocks
- **Geographic Distribution**: Connecting from different regions
- **Privacy/Security**: Masking server IP addresses
- **Multi-instance Scaling**: Running multiple instances without IP conflicts

## Research Findings

### Baileys Native Proxy Support

**Good news!** Baileys natively supports proxy configuration through two key options in `SocketConfig`:

```typescript
// From Baileys src/Types/Socket.ts
export type SocketConfig = {
  // ...
  /** proxy agent */
  agent?: Agent; // For WebSocket connections
  /** agent used for fetch requests -- uploading/downloading media */
  fetchAgent?: Agent; // For HTTP requests (media upload/download)
  // ...
};
```

### How Proxies Work in Baileys

1. **WebSocket Connection** (`agent`):

   - Used in `src/Socket/Client/websocket.ts`
   - Passed to the `ws` (WebSocket) library constructor
   - Handles the main WhatsApp WebSocket connection

2. **HTTP Requests** (`fetchAgent`):
   - Used in `src/Utils/messages-media.ts`
   - Handles media upload/download operations
   - Used for fetching WhatsApp version info

### WebSocket Client Implementation (Baileys)

```typescript
// From src/Socket/Client/websocket.ts
connect() {
  this.socket = new WebSocket(this.url, {
    origin: DEFAULT_ORIGIN,
    headers: this.config.options?.headers as {},
    handshakeTimeout: this.config.connectTimeoutMs,
    timeout: this.config.connectTimeoutMs,
    agent: this.config.agent  // <-- Proxy agent passed here
  })
}
```

## Proxy Libraries Comparison

### 1. `https-proxy-agent` / `http-proxy-agent`

**Best for HTTP/HTTPS proxies**

```bash
npm install https-proxy-agent http-proxy-agent
```

```typescript
import { HttpsProxyAgent } from "https-proxy-agent";
import { HttpProxyAgent } from "http-proxy-agent";

const httpsAgent = new HttpsProxyAgent("http://proxy.example.com:8080");
const httpAgent = new HttpProxyAgent("http://proxy.example.com:8080");
```

### 2. `socks-proxy-agent`

**Best for SOCKS4/SOCKS5 proxies**

```bash
npm install socks-proxy-agent
```

```typescript
import { SocksProxyAgent } from "socks-proxy-agent";

// SOCKS5
const agent = new SocksProxyAgent("socks5://user:pass@proxy.example.com:1080");

// SOCKS4
const agent = new SocksProxyAgent("socks4://proxy.example.com:1080");
```

### 3. `proxy-agent` (Universal)

**Automatically detects proxy type from URL**

```bash
npm install proxy-agent
```

```typescript
import { ProxyAgent } from "proxy-agent";

// Works with HTTP, HTTPS, SOCKS4, SOCKS5
const agent = new ProxyAgent("socks5://proxy.example.com:1080");
```

### Recommendation: `proxy-agent`

- Unified API for all proxy types
- Automatic protocol detection
- Active maintenance
- Works seamlessly with `ws` library

## Implementation Plan

### Phase 1: Type Definitions

Add proxy configuration types to `src/types/index.ts`:

```typescript
import type { Agent } from "node:https";

/**
 * Proxy configuration for WhatsApp connections
 */
export interface ProxyConfig {
  /**
   * Proxy URL (supports HTTP, HTTPS, SOCKS4, SOCKS5)
   * Examples:
   * - http://proxy.example.com:8080
   * - https://proxy.example.com:8080
   * - socks4://proxy.example.com:1080
   * - socks5://user:pass@proxy.example.com:1080
   */
  url: string;

  /**
   * Optional: Username for proxy authentication
   * (Can also be included in URL)
   */
  username?: string;

  /**
   * Optional: Password for proxy authentication
   * (Can also be included in URL)
   */
  password?: string;
}

// Update MiawClientOptions
export interface MiawClientOptions {
  // ... existing options ...

  /**
   * Proxy configuration for this instance
   * Each instance can have its own proxy for IP rotation
   */
  proxy?: ProxyConfig | string; // string = proxy URL directly

  /**
   * Custom agent for WebSocket connections
   * Alternative to proxy config for advanced use cases
   */
  agent?: Agent;

  /**
   * Custom agent for HTTP fetch requests (media upload/download)
   * Alternative to proxy config for advanced use cases
   */
  fetchAgent?: Agent;
}
```

### Phase 2: Proxy Agent Factory

Create `src/utils/proxy-agent.ts`:

```typescript
import type { Agent } from "node:https";
import type { ProxyConfig } from "../types/index.js";

/**
 * Creates a proxy agent from configuration
 * Supports HTTP, HTTPS, SOCKS4, SOCKS5 proxies
 */
export async function createProxyAgent(
  config: ProxyConfig | string
): Promise<Agent> {
  const { ProxyAgent } = await import("proxy-agent");

  let proxyUrl: string;

  if (typeof config === "string") {
    proxyUrl = config;
  } else {
    const url = new URL(config.url);

    // Add auth if provided separately
    if (config.username) {
      url.username = config.username;
    }
    if (config.password) {
      url.password = config.password;
    }

    proxyUrl = url.toString();
  }

  return new ProxyAgent(proxyUrl);
}

/**
 * Validates a proxy configuration
 */
export function validateProxyConfig(config: ProxyConfig | string): boolean {
  try {
    const url = typeof config === "string" ? config : config.url;
    const parsed = new URL(url);

    const supportedProtocols = [
      "http:",
      "https:",
      "socks4:",
      "socks5:",
      "socks:",
    ];
    return supportedProtocols.includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

### Phase 3: MiawClient Integration

Update `src/client/MiawClient.ts`:

```typescript
import { createProxyAgent, validateProxyConfig } from "../utils/proxy-agent.js";
import type { Agent } from "node:https";

export class MiawClient extends EventEmitter {
  private proxyAgent: Agent | null = null;

  constructor(options: MiawClientOptions) {
    super();

    // Store proxy config for lazy initialization
    this.options = {
      // ... existing defaults ...
      proxy: options.proxy,
      agent: options.agent,
      fetchAgent: options.fetchAgent,
    };
  }

  async connect(): Promise<void> {
    // ... existing connection guards ...

    try {
      this.updateConnectionState("connecting");

      // Initialize proxy agent if configured
      const agent = await this.resolveProxyAgent();

      // ... existing auth state loading ...

      // Create socket with proxy support
      this.socket = makeWASocket({
        version,
        logger: this.logger,
        printQRInTerminal: false,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, this.logger),
        },
        browser: Browsers.macOS("Desktop"),
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        fireInitQueries: true,

        // Proxy configuration
        agent: agent, // For WebSocket
        fetchAgent: agent, // For media HTTP requests
      });

      // ... rest of connection logic ...
    } catch (error) {
      // ... error handling ...
    }
  }

  /**
   * Resolves the proxy agent from configuration
   */
  private async resolveProxyAgent(): Promise<Agent | undefined> {
    // Direct agent takes priority
    if (this.options.agent) {
      return this.options.agent;
    }

    // Create agent from proxy config
    if (this.options.proxy) {
      if (!validateProxyConfig(this.options.proxy)) {
        throw new Error("Invalid proxy configuration");
      }

      this.proxyAgent = await createProxyAgent(this.options.proxy);
      this.logger.info("Proxy agent initialized");
      return this.proxyAgent;
    }

    return undefined;
  }

  /**
   * Get current proxy information
   */
  getProxyInfo(): { url: string } | null {
    if (typeof this.options.proxy === "string") {
      return { url: this.options.proxy };
    }
    if (this.options.proxy?.url) {
      return { url: this.options.proxy.url };
    }
    return null;
  }
}
```

### Phase 4: Proxy List File Loader

**Why File-Based Configuration?**

For proxy rotation, **file-based configuration is the recommended approach** over environment variables because:

- Proxy lists can contain hundreds of entries (env vars have size limits)
- Files are easier to update without restarting the application
- Standard format used by industry tools (HAProxy, Nginx, etc.)
- Can be managed by external tools or scripts
- Supports comments and documentation inline

Create `src/utils/proxy-loader.ts`:

```typescript
import { promises as fs } from "node:fs";
import { resolve } from "node:path";
import type { ProxyConfig } from "../types/index.js";

/**
 * Supported proxy list file formats
 */
export type ProxyFileFormat = "txt" | "json";

/**
 * Proxy list file configuration
 */
export interface ProxyListConfig {
  /**
   * Path to the proxy list file
   * Can be absolute or relative to cwd
   */
  filePath: string;

  /**
   * File format (auto-detected from extension if not specified)
   * - txt: One proxy URL per line (supports # comments)
   * - json: Array of proxy URLs or ProxyConfig objects
   */
  format?: ProxyFileFormat;

  /**
   * Watch file for changes and auto-reload
   * @default false
   */
  watchForChanges?: boolean;
}

/**
 * Loads proxy list from a file
 *
 * Supported formats:
 * - .txt: One proxy URL per line, # for comments
 * - .json: Array of strings or ProxyConfig objects
 *
 * @example
 * // proxies.txt
 * # US Proxies
 * socks5://proxy1.us.example.com:1080
 * socks5://proxy2.us.example.com:1080
 *
 * # EU Proxies
 * socks5://proxy1.eu.example.com:1080
 */
export async function loadProxyListFromFile(
  config: ProxyListConfig | string
): Promise<(ProxyConfig | string)[]> {
  const filePath = typeof config === "string" ? config : config.filePath;
  const absolutePath = resolve(process.cwd(), filePath);

  // Check if file exists
  try {
    await fs.access(absolutePath);
  } catch {
    throw new Error(`Proxy list file not found: ${absolutePath}`);
  }

  const content = await fs.readFile(absolutePath, "utf-8");
  const format = detectFormat(
    filePath,
    typeof config === "string" ? undefined : config.format
  );

  switch (format) {
    case "txt":
      return parseTxtFormat(content);
    case "json":
      return parseJsonFormat(content);
    default:
      throw new Error(`Unsupported proxy file format: ${format}`);
  }
}

/**
 * Detect file format from extension or explicit config
 */
function detectFormat(
  filePath: string,
  explicitFormat?: ProxyFileFormat
): ProxyFileFormat {
  if (explicitFormat) return explicitFormat;

  const ext = filePath.toLowerCase().split(".").pop();
  switch (ext) {
    case "txt":
    case "list":
    case "proxies":
      return "txt";
    case "json":
      return "json";
    default:
      // Default to txt for unknown extensions
      return "txt";
  }
}

/**
 * Parse TXT format: one proxy per line, # for comments
 */
function parseTxtFormat(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

/**
 * Parse JSON format: array of strings or ProxyConfig objects
 */
function parseJsonFormat(content: string): (ProxyConfig | string)[] {
  try {
    const data = JSON.parse(content);

    if (!Array.isArray(data)) {
      throw new Error("JSON proxy file must contain an array");
    }

    return data.map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (typeof item === "object" && item.url) {
        return item as ProxyConfig;
      }
      throw new Error(`Invalid proxy entry: ${JSON.stringify(item)}`);
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in proxy file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Watch proxy file for changes and reload
 * Returns a function to stop watching
 */
export function watchProxyFile(
  filePath: string,
  onReload: (proxies: (ProxyConfig | string)[]) => void,
  onError?: (error: Error) => void
): () => void {
  const absolutePath = resolve(process.cwd(), filePath);
  let debounceTimer: NodeJS.Timeout | null = null;

  const watcher = fs.watch(absolutePath).then(async (w) => {
    for await (const event of w) {
      if (event.eventType === "change") {
        // Debounce to avoid multiple reloads
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          try {
            const proxies = await loadProxyListFromFile(filePath);
            onReload(proxies);
          } catch (error) {
            onError?.(error as Error);
          }
        }, 100);
      }
    }
  });

  // Return cleanup function
  return () => {
    watcher.then((w) => w?.close?.());
    if (debounceTimer) clearTimeout(debounceTimer);
  };
}

/**
 * Validates all proxies in a list
 */
export async function validateProxyList(
  proxies: (ProxyConfig | string)[]
): Promise<{ valid: string[]; invalid: string[] }> {
  const { validateProxyConfig } = await import("./proxy-agent.js");

  const valid: string[] = [];
  const invalid: string[] = [];

  for (const proxy of proxies) {
    const url = typeof proxy === "string" ? proxy : proxy.url;
    if (validateProxyConfig(proxy)) {
      valid.push(url);
    } else {
      invalid.push(url);
    }
  }

  return { valid, invalid };
}
```

**Example Proxy List Files:**

`proxies.txt`:

```txt
# US Region Proxies
socks5://user:pass@us-proxy1.example.com:1080
socks5://user:pass@us-proxy2.example.com:1080

# EU Region Proxies
socks5://user:pass@eu-proxy1.example.com:1080
socks5://user:pass@eu-proxy2.example.com:1080

# Asia Region Proxies
http://asia-proxy1.example.com:8080
http://asia-proxy2.example.com:8080
```

`proxies.json`:

```json
[
  "socks5://proxy1.example.com:1080",
  "socks5://proxy2.example.com:1080",
  {
    "url": "http://proxy3.example.com:8080",
    "username": "user",
    "password": "pass"
  }
]
```

### Phase 5: Proxy Rotation Support

Create `src/utils/proxy-rotation.ts`:

```typescript
import type { Agent } from "node:https";
import type { ProxyConfig } from "../types/index.js";
import { createProxyAgent } from "./proxy-agent.js";
import {
  loadProxyListFromFile,
  watchProxyFile,
  type ProxyListConfig,
} from "./proxy-loader.js";

export type ProxyRotationStrategy = "round-robin" | "random" | "weighted";

export interface ProxyPool {
  proxies: (ProxyConfig | string)[];
  strategy: ProxyRotationStrategy;
  weights?: number[]; // For weighted strategy
}

/**
 * Proxy pool manager for rotating proxies across instances
 */
export class ProxyRotator {
  private proxies: (ProxyConfig | string)[];
  private strategy: ProxyRotationStrategy;
  private weights: number[];
  private currentIndex: number = 0;
  private agentCache: Map<string, Agent> = new Map();

  constructor(pool: ProxyPool) {
    this.proxies = pool.proxies;
    this.strategy = pool.strategy;
    this.weights = pool.weights || pool.proxies.map(() => 1);

    if (this.proxies.length === 0) {
      throw new Error("Proxy pool cannot be empty");
    }
  }

  /**
   * Get the next proxy based on rotation strategy
   */
  async getNextAgent(): Promise<Agent> {
    const proxy = this.selectProxy();
    const key = typeof proxy === "string" ? proxy : proxy.url;

    // Return cached agent if available
    if (this.agentCache.has(key)) {
      return this.agentCache.get(key)!;
    }

    const agent = await createProxyAgent(proxy);
    this.agentCache.set(key, agent);
    return agent;
  }

  /**
   * Get proxy for a specific instance (deterministic based on instanceId)
   */
  async getAgentForInstance(instanceId: string): Promise<Agent> {
    const hash = this.hashString(instanceId);
    const index = hash % this.proxies.length;
    const proxy = this.proxies[index];
    const key = typeof proxy === "string" ? proxy : proxy.url;

    if (!this.agentCache.has(key)) {
      this.agentCache.set(key, await createProxyAgent(proxy));
    }

    return this.agentCache.get(key)!;
  }

  private selectProxy(): ProxyConfig | string {
    switch (this.strategy) {
      case "round-robin":
        const proxy = this.proxies[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
        return proxy;

      case "random":
        return this.proxies[Math.floor(Math.random() * this.proxies.length)];

      case "weighted":
        return this.weightedRandom();

      default:
        return this.proxies[0];
    }
  }

  private weightedRandom(): ProxyConfig | string {
    const totalWeight = this.weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < this.proxies.length; i++) {
      random -= this.weights[i];
      if (random <= 0) {
        return this.proxies[i];
      }
    }

    return this.proxies[this.proxies.length - 1];
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  /**
   * Clear the agent cache (useful when proxies become stale)
   */
  clearCache(): void {
    this.agentCache.clear();
  }

  /**
   * Reload proxies from the original file (if loaded from file)
   */
  async reload(proxies: (ProxyConfig | string)[]): Promise<void> {
    this.proxies = proxies;
    this.weights = proxies.map(() => 1);
    this.currentIndex = 0;
    this.agentCache.clear();
  }

  /**
   * Get pool statistics
   */
  getStats(): { total: number; cached: number; proxies: string[] } {
    return {
      total: this.proxies.length,
      cached: this.agentCache.size,
      proxies: this.proxies.map((p) => (typeof p === "string" ? p : p.url)),
    };
  }

  /**
   * Create a ProxyRotator from a file
   * @param fileConfig - Path to proxy file or ProxyListConfig
   * @param strategy - Rotation strategy (default: round-robin)
   * @param watchForChanges - Auto-reload when file changes
   */
  static async fromFile(
    fileConfig: ProxyListConfig | string,
    strategy: ProxyRotationStrategy = "round-robin",
    watchForChanges = false
  ): Promise<ProxyRotator> {
    const proxies = await loadProxyListFromFile(fileConfig);

    if (proxies.length === 0) {
      throw new Error("Proxy file is empty");
    }

    const rotator = new ProxyRotator({ proxies, strategy });

    // Set up file watcher if requested
    if (watchForChanges) {
      const filePath =
        typeof fileConfig === "string" ? fileConfig : fileConfig.filePath;
      watchProxyFile(
        filePath,
        (newProxies) => {
          rotator.reload(newProxies);
          console.log(`Proxy list reloaded: ${newProxies.length} proxies`);
        },
        (error) => {
          console.error(`Failed to reload proxy list: ${error.message}`);
        }
      );
    }

    return rotator;
  }
}
```

### Phase 6: Dependencies

Add to `package.json`:

```json
{
  "dependencies": {
    "proxy-agent": "^6.4.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

### Phase 7: Export Updates

Update `src/index.ts`:

```typescript
// Proxy utilities
export { createProxyAgent, validateProxyConfig } from "./utils/proxy-agent.js";
export { ProxyRotator } from "./utils/proxy-rotation.js";
export {
  loadProxyListFromFile,
  watchProxyFile,
  validateProxyList,
} from "./utils/proxy-loader.js";
export type {
  ProxyPool,
  ProxyRotationStrategy,
} from "./utils/proxy-rotation.js";
export type { ProxyFileFormat, ProxyListConfig } from "./utils/proxy-loader.js";
```

## Usage Examples

### Basic Proxy Usage

```typescript
import { MiawClient } from "miaw-core";

// Using proxy URL directly
const client = new MiawClient({
  instanceId: "bot-1",
  proxy: "socks5://proxy.example.com:1080",
});

// Using proxy config object
const client2 = new MiawClient({
  instanceId: "bot-2",
  proxy: {
    url: "http://proxy.example.com:8080",
    username: "user",
    password: "pass",
  },
});

await client.connect();
```

### Loading Proxies from File

```typescript
import { ProxyRotator, loadProxyListFromFile } from "miaw-core";

// Load from TXT file (one proxy per line)
const proxies = await loadProxyListFromFile("./proxies.txt");
console.log(`Loaded ${proxies.length} proxies`);

// Create rotator from file (recommended)
const rotator = await ProxyRotator.fromFile(
  "./proxies.txt",
  "round-robin",
  true // watch for changes
);

// Get stats
console.log(rotator.getStats());
// { total: 10, cached: 0, proxies: ['socks5://...', ...] }
```

### Proxy Rotation for Multiple Instances

```typescript
import { MiawClient, ProxyRotator } from "miaw-core";

// Create proxy pool from file
const rotator = await ProxyRotator.fromFile("./proxies.txt", "round-robin");

// Create multiple instances with rotated proxies
async function createInstances(count: number) {
  const instances = [];

  for (let i = 0; i < count; i++) {
    const agent = await rotator.getNextAgent();

    const client = new MiawClient({
      instanceId: `bot-${i}`,
      agent: agent,
      fetchAgent: agent,
    });

    instances.push(client);
  }

  return instances;
}

// Or use deterministic proxy per instance (same instance always gets same proxy)
async function createInstanceWithDeterministicProxy(instanceId: string) {
  const agent = await rotator.getAgentForInstance(instanceId);

  return new MiawClient({
    instanceId,
    agent,
    fetchAgent: agent,
  });
}
```

### Environment Variable for Single Instance

```typescript
import { MiawClient } from "miaw-core";

// Single proxy from environment
const client = new MiawClient({
  instanceId: "production-bot",
  proxy: process.env.WHATSAPP_PROXY_URL,
});
```

---

## Phase 8: CLI Integration (miaw-cli)

### CLI Proxy Commands

Add new proxy management commands to `miaw-cli`:

```
PROXY OPERATIONS:
  proxy ls                       List proxies from configured file
  proxy test [url]               Test proxy connectivity
  proxy test-all                 Test all proxies in list
  proxy validate                 Validate proxy file format
  proxy stats                    Show proxy rotation statistics
  proxy reload                   Reload proxy list from file
```

### CLI Global Flags for Proxy

```
PROXY FLAGS:
  --proxy <url>                  Use specific proxy for this instance
  --proxy-file <path>            Path to proxy list file
  --proxy-strategy <strategy>    Rotation strategy: round-robin, random, weighted
  --proxy-watch                  Watch proxy file for changes
```

### CLI Implementation

Create `src/cli/commands/proxy.ts`:

```typescript
import {
  loadProxyListFromFile,
  validateProxyList,
  ProxyRotator,
} from "../../index.js";
import type { CLIContext } from "../context.js";

export async function handleProxyCommand(
  args: string[],
  context: CLIContext
): Promise<boolean> {
  const subcommand = args[0];

  switch (subcommand) {
    case "ls":
    case "list":
      return await listProxies(context);

    case "test":
      return await testProxy(args[1], context);

    case "test-all":
      return await testAllProxies(context);

    case "validate":
      return await validateProxyFile(context);

    case "stats":
      return await showProxyStats(context);

    case "reload":
      return await reloadProxies(context);

    default:
      console.log(
        "Unknown proxy command. Use: ls, test, test-all, validate, stats, reload"
      );
      return false;
  }
}

async function listProxies(context: CLIContext): Promise<boolean> {
  const proxyFile = context.flags["proxy-file"] || "./proxies.txt";

  try {
    const proxies = await loadProxyListFromFile(proxyFile);

    console.log(`\n📋 Proxies loaded from: ${proxyFile}\n`);
    console.log(`Total: ${proxies.length} proxies\n`);

    proxies.forEach((proxy, index) => {
      const url = typeof proxy === "string" ? proxy : proxy.url;
      // Mask credentials for display
      const masked = maskProxyUrl(url);
      console.log(`  ${index + 1}. ${masked}`);
    });

    return true;
  } catch (error) {
    console.error(`❌ Failed to load proxy file: ${(error as Error).message}`);
    return false;
  }
}

async function testProxy(
  proxyUrl: string | undefined,
  context: CLIContext
): Promise<boolean> {
  if (!proxyUrl) {
    console.error("❌ Please provide a proxy URL to test");
    return false;
  }

  console.log(`\n🔍 Testing proxy: ${maskProxyUrl(proxyUrl)}`);

  try {
    const { createProxyAgent } = await import("../../utils/proxy-agent.js");
    const agent = await createProxyAgent(proxyUrl);

    // Test connection to WhatsApp
    const startTime = Date.now();
    const response = await fetch("https://web.whatsapp.com", {
      method: "HEAD",
      dispatcher: agent as any,
      signal: AbortSignal.timeout(10000),
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      console.log(`✅ Proxy is working! Latency: ${latency}ms`);
      return true;
    } else {
      console.log(`⚠️ Proxy responded with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Proxy test failed: ${(error as Error).message}`);
    return false;
  }
}

async function testAllProxies(context: CLIContext): Promise<boolean> {
  const proxyFile = context.flags["proxy-file"] || "./proxies.txt";

  try {
    const proxies = await loadProxyListFromFile(proxyFile);

    console.log(`\n🔍 Testing ${proxies.length} proxies...\n`);

    let working = 0;
    let failed = 0;

    for (const proxy of proxies) {
      const url = typeof proxy === "string" ? proxy : proxy.url;
      const masked = maskProxyUrl(url);
      process.stdout.write(`  Testing ${masked}... `);

      try {
        const { createProxyAgent } = await import("../../utils/proxy-agent.js");
        const agent = await createProxyAgent(proxy);

        const startTime = Date.now();
        const response = await fetch("https://web.whatsapp.com", {
          method: "HEAD",
          dispatcher: agent as any,
          signal: AbortSignal.timeout(10000),
        });

        const latency = Date.now() - startTime;

        if (response.ok) {
          console.log(`✅ ${latency}ms`);
          working++;
        } else {
          console.log(`⚠️ Status ${response.status}`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ ${(error as Error).message}`);
        failed++;
      }
    }

    console.log(`\n📊 Results: ${working} working, ${failed} failed`);
    return failed === 0;
  } catch (error) {
    console.error(`❌ Failed to load proxy file: ${(error as Error).message}`);
    return false;
  }
}

async function validateProxyFile(context: CLIContext): Promise<boolean> {
  const proxyFile = context.flags["proxy-file"] || "./proxies.txt";

  try {
    const proxies = await loadProxyListFromFile(proxyFile);
    const { valid, invalid } = await validateProxyList(proxies);

    console.log(`\n📋 Proxy File Validation: ${proxyFile}\n`);
    console.log(`  ✅ Valid: ${valid.length}`);
    console.log(`  ❌ Invalid: ${invalid.length}`);

    if (invalid.length > 0) {
      console.log(`\n  Invalid entries:`);
      invalid.forEach((url) => console.log(`    - ${url}`));
    }

    return invalid.length === 0;
  } catch (error) {
    console.error(`❌ Validation failed: ${(error as Error).message}`);
    return false;
  }
}

async function showProxyStats(context: CLIContext): Promise<boolean> {
  if (!context.proxyRotator) {
    console.log("⚠️ No proxy rotator initialized. Use --proxy-file to enable.");
    return false;
  }

  const stats = context.proxyRotator.getStats();

  console.log(`\n📊 Proxy Rotation Statistics\n`);
  console.log(`  Total proxies: ${stats.total}`);
  console.log(`  Cached agents: ${stats.cached}`);
  console.log(
    `  Strategy: ${context.flags["proxy-strategy"] || "round-robin"}`
  );

  return true;
}

async function reloadProxies(context: CLIContext): Promise<boolean> {
  const proxyFile = context.flags["proxy-file"] || "./proxies.txt";

  try {
    const proxies = await loadProxyListFromFile(proxyFile);

    if (context.proxyRotator) {
      await context.proxyRotator.reload(proxies);
      console.log(`✅ Reloaded ${proxies.length} proxies from ${proxyFile}`);
    } else {
      console.log(`⚠️ No proxy rotator to reload. Use --proxy-file to enable.`);
    }

    return true;
  } catch (error) {
    console.error(`❌ Failed to reload proxies: ${(error as Error).message}`);
    return false;
  }
}

/**
 * Mask credentials in proxy URL for display
 */
function maskProxyUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = "****";
    }
    return parsed.toString();
  } catch {
    return url;
  }
}
```

### Update CLI Context

Update `src/cli/context.ts` to support proxy rotator:

```typescript
import type { ProxyRotator } from "../utils/proxy-rotation.js";

export interface CLIContext {
  // ... existing properties ...
  proxyRotator?: ProxyRotator;
}
```

### Update CLI Entry Point

Update `bin/miaw-cli.ts` to handle proxy flags:

```typescript
// After parsing args, initialize proxy rotator if --proxy-file is provided
if (flags["proxy-file"]) {
  const { ProxyRotator } = await import("../src/utils/proxy-rotation.js");
  const strategy = (flags["proxy-strategy"] as string) || "round-robin";
  const watch = flags["proxy-watch"] === true;

  const proxyRotator = await ProxyRotator.fromFile(
    flags["proxy-file"] as string,
    strategy as any,
    watch
  );

  // Make available to commands via context
  context.proxyRotator = proxyRotator;

  console.log(
    `📡 Proxy rotator initialized: ${proxyRotator.getStats().total} proxies`
  );
}

// When creating instances, use proxy from rotator
if (context.proxyRotator) {
  const agent = await context.proxyRotator.getAgentForInstance(instanceId);
  clientConfig.agent = agent;
  clientConfig.fetchAgent = agent;
} else if (flags.proxy) {
  clientConfig.proxy = flags.proxy as string;
}
```

### CLI Help Update

Add to help message in `bin/miaw-cli.ts`:

```
PROXY OPERATIONS:
  proxy ls                       List proxies from configured file
  proxy test <url>               Test specific proxy connectivity
  proxy test-all                 Test all proxies in list
  proxy validate                 Validate proxy file format
  proxy stats                    Show proxy rotation statistics
  proxy reload                   Reload proxy list from file

PROXY FLAGS:
  --proxy <url>                  Use specific proxy for this command
  --proxy-file <path>            Path to proxy list file (enables rotation)
  --proxy-strategy <strategy>    Rotation strategy: round-robin, random, weighted
  --proxy-watch                  Watch proxy file for changes (auto-reload)
```

### CLI Usage Examples

```bash
# List proxies from file
miaw-cli proxy ls --proxy-file ./proxies.txt

# Test a specific proxy
miaw-cli proxy test socks5://proxy.example.com:1080

# Test all proxies in file
miaw-cli proxy test-all --proxy-file ./proxies.txt

# Validate proxy file format
miaw-cli proxy validate --proxy-file ./proxies.txt

# Connect instance with single proxy
miaw-cli instance connect my-bot --proxy socks5://proxy.example.com:1080

# Connect instance with proxy rotation
miaw-cli instance connect my-bot --proxy-file ./proxies.txt

# Use specific rotation strategy
miaw-cli instance connect my-bot --proxy-file ./proxies.txt --proxy-strategy random

# Enable hot-reload of proxy file
miaw-cli instance connect my-bot --proxy-file ./proxies.txt --proxy-watch

# Send message through proxy
miaw-cli send text 6281234567890 "Hello" --proxy socks5://proxy.example.com:1080
```

---

## Testing Plan

### Unit Tests

```typescript
describe("Proxy Support", () => {
  describe("validateProxyConfig", () => {
    it("should accept valid HTTP proxy", () => {
      expect(validateProxyConfig("http://proxy:8080")).toBe(true);
    });

    it("should accept valid SOCKS5 proxy", () => {
      expect(validateProxyConfig("socks5://proxy:1080")).toBe(true);
    });

    it("should reject invalid URL", () => {
      expect(validateProxyConfig("not-a-url")).toBe(false);
    });
  });

  describe("ProxyRotator", () => {
    it("should rotate round-robin correctly", async () => {
      // Test implementation
    });

    it("should return same proxy for same instanceId", async () => {
      // Test deterministic assignment
    });
  });
});
```

### Integration Tests

```typescript
describe("MiawClient with Proxy", () => {
  it("should connect through SOCKS5 proxy", async () => {
    // Requires actual proxy server
  });

  it("should upload media through proxy", async () => {
    // Test fetchAgent configuration
  });
});
```

## Security Considerations

1. **Credential Management**: Never log proxy credentials
2. **Proxy Authentication**: Support both URL-embedded and separate credentials
3. **Connection Timeouts**: Implement appropriate timeouts for proxy connections
4. **Error Handling**: Don't expose proxy details in error messages
5. **SOCKS5 DNS Resolution**: Use remote DNS resolution to prevent DNS leaks

## Performance Considerations

1. **Agent Caching**: Reuse agents across requests
2. **Connection Pooling**: Leverage built-in connection pooling
3. **Lazy Initialization**: Create agents only when needed
4. **Health Checks**: Implement proxy health monitoring

## Rollout Plan

### Phase 1: MVP (Week 1)

- [ ] Add `ProxyConfig` type
- [ ] Implement `createProxyAgent` utility
- [ ] Add `proxy` option to `MiawClientOptions`
- [ ] Update `connect()` to use proxy agent

### Phase 2: Enhanced Features (Week 2)

- [ ] Implement `ProxyRotator` class
- [ ] Add proxy validation
- [ ] Add `getProxyInfo()` method
- [ ] Update documentation

### Phase 3: File-Based Proxy Loading (Week 3)

- [ ] Implement `proxy-loader.ts` utility
- [ ] Add `loadProxyListFromFile()` function
- [ ] Add `ProxyRotator.fromFile()` static method
- [ ] Implement file watcher for hot-reload
- [ ] Support TXT and JSON file formats

### Phase 4: CLI Integration (Week 4)

- [ ] Create `src/cli/commands/proxy.ts`
- [ ] Implement CLI proxy commands (ls, test, test-all, validate, stats, reload)
- [ ] Add `--proxy`, `--proxy-file`, `--proxy-strategy`, `--proxy-watch` flags
- [ ] Update CLI help text
- [ ] Integration between CLI context and proxy rotator

### Phase 5: Testing & Documentation (Week 5)

- [ ] Unit tests for proxy utilities
- [ ] Unit tests for proxy loader
- [ ] Integration tests with real proxies
- [ ] CLI command tests
- [ ] Example code in `examples/` directory
- [ ] Update README and API docs

## Related Files to Modify

1. `src/types/index.ts` - Add ProxyConfig and update MiawClientOptions
2. `src/client/MiawClient.ts` - Implement proxy support in connect()
3. `src/utils/proxy-agent.ts` - New file for proxy agent factory
4. `src/utils/proxy-rotation.ts` - New file for proxy rotation
5. `src/utils/proxy-loader.ts` - New file for file-based proxy loading
6. `src/cli/commands/proxy.ts` - New file for CLI proxy commands
7. `src/cli/context.ts` - Update CLI context with proxy rotator
8. `bin/miaw-cli.ts` - Add proxy flags and command routing
9. `src/index.ts` - Export new types and utilities
10. `package.json` - Add proxy-agent dependency
11. `docs/USAGE.md` - Document proxy configuration
12. `examples/` - Add proxy usage examples

## Conclusion

Implementing proxy support in Miaw Core is **fully feasible** thanks to Baileys' native support for the `agent` and `fetchAgent` options. The implementation requires:

1. Adding type definitions for proxy configuration
2. Creating a proxy agent factory using the `proxy-agent` library
3. Passing the agent to Baileys' `makeWASocket` function
4. Implementing file-based proxy loading for easy management
5. Adding CLI commands for proxy management and testing
6. Optionally implementing proxy rotation for multi-instance scenarios

The approach is non-invasive, maintaining backward compatibility while enabling powerful proxy features for users who need them.

---

## Quick Reference

### Proxy File Format (proxies.txt)

```
# HTTP proxies
http://proxy1.example.com:8080
http://user:pass@proxy2.example.com:8080

# SOCKS proxies (recommended for WhatsApp)
socks5://proxy3.example.com:1080
socks5://user:pass@proxy4.example.com:1080
```

### Minimum Viable CLI Commands

```bash
# Single proxy
miaw-cli instance connect my-bot --proxy socks5://proxy:1080

# Multiple proxies with rotation
miaw-cli instance connect my-bot --proxy-file ./proxies.txt

# Test all proxies
miaw-cli proxy test-all --proxy-file ./proxies.txt
```

### Programmatic Usage

```typescript
import { MiawClient, ProxyRotator } from "miaw-core";

// Simple: single proxy
const client = new MiawClient({
  instanceId: "my-bot",
  proxy: "socks5://proxy:1080",
});

// Advanced: rotation from file
const rotator = await ProxyRotator.fromFile(
  "./proxies.txt",
  "round-robin",
  true
);
const agent = await rotator.getNextAgent();
const client2 = new MiawClient({
  instanceId: "bot-2",
  agent,
  fetchAgent: agent,
});
```
