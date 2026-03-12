/**
 * Unit Tests for MiawClient Proxy Integration
 *
 * Tests proxy-related MiawClient behavior:
 * - Constructor accepts proxy options
 * - getProxyInfo() returns correct info with masked credentials
 * - Backward compatibility without proxy
 */

import { jest, describe, beforeEach, it, expect } from "@jest/globals";
import type { Agent } from "node:https";

// Mock Baileys to prevent real connection attempts
jest.unstable_mockModule("@whiskeysockets/baileys", () => ({
  default: jest.fn(),
  makeWASocket: jest.fn(),
  DisconnectReason: { loggedOut: 401 },
  fetchLatestBaileysVersion: jest
    .fn<() => Promise<any>>()
    .mockResolvedValue({ version: [2, 2413, 1] }),
  makeCacheableSignalKeyStore: jest.fn(),
  Browsers: { macOS: jest.fn(() => ["macOS", "Desktop", "1.0"]) },
  useMultiFileAuthState: jest.fn(),
  downloadMediaMessage: jest.fn(),
  jidNormalizedUser: jest.fn((jid: string) => jid),
}));

// Dynamic import after mocking
const { MiawClient } = await import("../../src/client/MiawClient.js");

describe("MiawClient Proxy Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("constructor with proxy options", () => {
    it("should accept proxy string option", () => {
      const client = new MiawClient({
        instanceId: "test-proxy",
        proxy: "socks5://proxy.example.com:1080",
      });

      expect(client).toBeDefined();
      expect(client.getProxyInfo()).not.toBeNull();
    });

    it("should accept ProxyConfig object option", () => {
      const client = new MiawClient({
        instanceId: "test-proxy",
        proxy: {
          url: "http://proxy.example.com:8080",
          username: "user",
          password: "pass",
        },
      });

      expect(client).toBeDefined();
      expect(client.getProxyInfo()).not.toBeNull();
    });

    it("should accept custom agent option", () => {
      // Create a minimal mock agent
      const mockAgent = { destroy: jest.fn() } as unknown as Agent;

      const client = new MiawClient({
        instanceId: "test-agent",
        agent: mockAgent,
      });

      expect(client).toBeDefined();
    });

    it("should accept custom fetchAgent option", () => {
      const mockFetchAgent = { destroy: jest.fn() };

      const client = new MiawClient({
        instanceId: "test-fetch-agent",
        fetchAgent: mockFetchAgent,
      });

      expect(client).toBeDefined();
    });

    it("should work without proxy (backward compatibility)", () => {
      const client = new MiawClient({
        instanceId: "test-no-proxy",
      });

      expect(client).toBeDefined();
      expect(client.getProxyInfo()).toBeNull();
    });
  });

  describe("getProxyInfo", () => {
    it("should return null when no proxy is configured", () => {
      const client = new MiawClient({
        instanceId: "test-no-proxy",
      });

      expect(client.getProxyInfo()).toBeNull();
    });

    it("should return url and protocol for string proxy", () => {
      const client = new MiawClient({
        instanceId: "test-proxy",
        proxy: "socks5://proxy.example.com:1080",
      });

      const info = client.getProxyInfo();
      expect(info).not.toBeNull();
      expect(info!.protocol).toBe("socks5");
      expect(info!.url).toContain("proxy.example.com");
      expect(info!.url).toContain("1080");
    });

    it("should return url and protocol for HTTP proxy", () => {
      const client = new MiawClient({
        instanceId: "test-proxy",
        proxy: "http://proxy.example.com:8080",
      });

      const info = client.getProxyInfo();
      expect(info).not.toBeNull();
      expect(info!.protocol).toBe("http");
    });

    it("should return url and protocol for ProxyConfig object", () => {
      const client = new MiawClient({
        instanceId: "test-proxy",
        proxy: { url: "https://proxy.example.com:443" },
      });

      const info = client.getProxyInfo();
      expect(info).not.toBeNull();
      expect(info!.protocol).toBe("https");
      expect(info!.url).toContain("proxy.example.com");
    });

    it("should mask password in proxy URL", () => {
      const client = new MiawClient({
        instanceId: "test-proxy",
        proxy: "socks5://user:secretpassword@proxy.example.com:1080",
      });

      const info = client.getProxyInfo();
      expect(info).not.toBeNull();
      expect(info!.url).not.toContain("secretpassword");
      expect(info!.url).toContain("****");
      expect(info!.url).toContain("user");
    });

    it("should mask password from ProxyConfig URL", () => {
      const client = new MiawClient({
        instanceId: "test-proxy",
        proxy: {
          url: "http://admin:topsecret@proxy.example.com:8080",
        },
      });

      const info = client.getProxyInfo();
      expect(info).not.toBeNull();
      expect(info!.url).not.toContain("topsecret");
      expect(info!.url).toContain("****");
    });

    it("should handle proxy URL without password", () => {
      const client = new MiawClient({
        instanceId: "test-proxy",
        proxy: "http://proxy.example.com:8080",
      });

      const info = client.getProxyInfo();
      expect(info).not.toBeNull();
      expect(info!.url).not.toContain("****");
      expect(info!.protocol).toBe("http");
    });
  });
});
