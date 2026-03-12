/**
 * Unit Tests for Proxy Agent Utilities
 *
 * Tests validateProxyConfig() and createProxyAgents() from src/utils/proxy-agent.ts
 */

import { describe, it, expect } from "@jest/globals";
import {
  validateProxyConfig,
  createProxyAgents,
} from "../../src/utils/proxy-agent.js";
import type { ProxyConfig } from "../../src/types/index.js";

describe("Proxy Agent Utilities", () => {
  describe("validateProxyConfig", () => {
    describe("valid configurations", () => {
      it("should accept HTTP proxy URL", () => {
        expect(validateProxyConfig("http://proxy.example.com:8080")).toBe(true);
      });

      it("should accept HTTPS proxy URL", () => {
        expect(validateProxyConfig("https://proxy.example.com:8080")).toBe(
          true
        );
      });

      it("should accept SOCKS4 proxy URL", () => {
        expect(validateProxyConfig("socks4://proxy.example.com:1080")).toBe(
          true
        );
      });

      it("should accept SOCKS5 proxy URL", () => {
        expect(validateProxyConfig("socks5://proxy.example.com:1080")).toBe(
          true
        );
      });

      it("should accept SOCKS proxy URL (generic)", () => {
        expect(validateProxyConfig("socks://proxy.example.com:1080")).toBe(
          true
        );
      });

      it("should accept proxy URL with authentication", () => {
        expect(
          validateProxyConfig("socks5://user:pass@proxy.example.com:1080")
        ).toBe(true);
      });

      it("should accept ProxyConfig object", () => {
        const config: ProxyConfig = { url: "http://proxy.example.com:8080" };
        expect(validateProxyConfig(config)).toBe(true);
      });

      it("should accept ProxyConfig object with auth fields", () => {
        const config: ProxyConfig = {
          url: "http://proxy.example.com:8080",
          username: "user",
          password: "pass",
        };
        expect(validateProxyConfig(config)).toBe(true);
      });
    });

    describe("invalid configurations", () => {
      it("should reject non-URL string", () => {
        expect(validateProxyConfig("not-a-url")).toBe(false);
      });

      it("should reject empty string", () => {
        expect(validateProxyConfig("")).toBe(false);
      });

      it("should reject FTP protocol", () => {
        expect(validateProxyConfig("ftp://proxy.example.com:21")).toBe(false);
      });

      it("should reject invalid ProxyConfig object", () => {
        const config: ProxyConfig = { url: "not-a-url" };
        expect(validateProxyConfig(config)).toBe(false);
      });

      it("should reject unsupported protocol", () => {
        expect(validateProxyConfig("ws://proxy.example.com:8080")).toBe(false);
      });
    });
  });

  describe("createProxyAgents", () => {
    describe("HTTP/HTTPS proxies", () => {
      it("should create both wsAgent and fetchAgent for HTTP proxy", async () => {
        const agents = await createProxyAgents("http://proxy.example.com:8080");

        expect(agents.wsAgent).toBeDefined();
        expect(agents.fetchAgent).toBeDefined();
        // wsAgent should be an HttpsProxyAgent (extends http.Agent)
        expect(agents.wsAgent.constructor.name).toBe("HttpsProxyAgent");
      });

      it("should create both wsAgent and fetchAgent for HTTPS proxy", async () => {
        const agents = await createProxyAgents(
          "https://proxy.example.com:8080"
        );

        expect(agents.wsAgent).toBeDefined();
        expect(agents.fetchAgent).toBeDefined();
        expect(agents.wsAgent.constructor.name).toBe("HttpsProxyAgent");
      });
    });

    describe("SOCKS proxies", () => {
      it("should create wsAgent but no fetchAgent for SOCKS5 proxy", async () => {
        const agents = await createProxyAgents(
          "socks5://proxy.example.com:1080"
        );

        expect(agents.wsAgent).toBeDefined();
        expect(agents.fetchAgent).toBeUndefined();
        expect(agents.wsAgent.constructor.name).toBe("SocksProxyAgent");
      });

      it("should create wsAgent but no fetchAgent for SOCKS4 proxy", async () => {
        const agents = await createProxyAgents(
          "socks4://proxy.example.com:1080"
        );

        expect(agents.wsAgent).toBeDefined();
        expect(agents.fetchAgent).toBeUndefined();
        expect(agents.wsAgent.constructor.name).toBe("SocksProxyAgent");
      });

      it("should create wsAgent but no fetchAgent for generic SOCKS proxy", async () => {
        const agents = await createProxyAgents(
          "socks://proxy.example.com:1080"
        );

        expect(agents.wsAgent).toBeDefined();
        expect(agents.fetchAgent).toBeUndefined();
        expect(agents.wsAgent.constructor.name).toBe("SocksProxyAgent");
      });
    });

    describe("ProxyConfig object", () => {
      it("should handle ProxyConfig with URL only", async () => {
        const agents = await createProxyAgents({
          url: "http://proxy.example.com:8080",
        });

        expect(agents.wsAgent).toBeDefined();
        expect(agents.fetchAgent).toBeDefined();
      });

      it("should merge separate auth credentials into URL", async () => {
        const agents = await createProxyAgents({
          url: "http://proxy.example.com:8080",
          username: "testuser",
          password: "testpass",
        });

        expect(agents.wsAgent).toBeDefined();
        expect(agents.fetchAgent).toBeDefined();
      });

      it("should handle SOCKS5 ProxyConfig with auth", async () => {
        const agents = await createProxyAgents({
          url: "socks5://proxy.example.com:1080",
          username: "testuser",
          password: "testpass",
        });

        expect(agents.wsAgent).toBeDefined();
        expect(agents.fetchAgent).toBeUndefined();
      });
    });

    describe("error handling", () => {
      it("should throw for unsupported protocol", async () => {
        await expect(
          createProxyAgents("ftp://proxy.example.com:21")
        ).rejects.toThrow("Unsupported proxy protocol");
      });

      it("should throw for invalid URL", async () => {
        await expect(createProxyAgents("not-a-url")).rejects.toThrow();
      });

      it("should throw for empty string", async () => {
        await expect(createProxyAgents("")).rejects.toThrow();
      });
    });
  });
});
