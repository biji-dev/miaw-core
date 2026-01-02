/**
 * Test Setup and Utilities
 */
import { config } from "dotenv";
import { MiawClient } from "../src/index.js";

// Load test environment variables
config({ path: ".env.test" });

export const TEST_CONFIG = {
  instanceId: process.env.TEST_INSTANCE_ID || "miaw-test-bot",
  sessionPath: process.env.TEST_SESSION_PATH || "./test-sessions",
  contactPhoneA: process.env.TEST_CONTACT_PHONE_A || "",
  contactPhoneB: process.env.TEST_CONTACT_PHONE_B || "",
  groupJid: process.env.TEST_GROUP_JID || "",
  connectTimeout: parseInt(process.env.TEST_CONNECT_TIMEOUT || "60000"),
  messageTimeout: parseInt(process.env.TEST_MESSAGE_TIMEOUT || "30000"),
};

/**
 * Create a test client instance
 */
export function createTestClient(
  options?: Partial<typeof TEST_CONFIG>
): MiawClient {
  return new MiawClient({
    instanceId: options?.instanceId || TEST_CONFIG.instanceId,
    sessionPath: options?.sessionPath || TEST_CONFIG.sessionPath,
    debug: true,
  });
}

/**
 * Wait for a specific event with timeout
 */
export function waitForEvent<T = any>(
  client: MiawClient,
  eventName: string,
  timeout: number = TEST_CONFIG.connectTimeout
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);

    client.once(eventName as any, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

/**
 * Wait for a message matching a condition
 */
export function waitForMessage(
  client: MiawClient,
  condition: (msg: any) => boolean,
  timeout: number = TEST_CONFIG.messageTimeout
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Timeout waiting for matching message"));
    }, timeout);

    const handler = (msg: any) => {
      if (condition(msg)) {
        clearTimeout(timer);
        client.off("message", handler);
        resolve(msg);
      }
    };

    client.on("message", handler);
  });
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
