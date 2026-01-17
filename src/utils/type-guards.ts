/**
 * Type guard utilities for runtime type checking
 * Provides safe type narrowing for error handling and Baileys structures
 */

import { BaileysMessage, BaileysMessageUpsert } from "../types/baileys.js";

/**
 * Type guard for Baileys message upsert event
 * @param value - Value to check
 * @returns true if value is a valid BaileysMessageUpsert
 */
export function isBaileysMessageUpsert(value: unknown): value is BaileysMessageUpsert {
  return (
    typeof value === "object" &&
    value !== null &&
    "messages" in value &&
    Array.isArray((value as BaileysMessageUpsert).messages) &&
    "type" in value
  );
}

/**
 * Type guard for Baileys message
 * @param value - Value to check
 * @returns true if value is a valid BaileysMessage
 */
export function isBaileysMessage(value: unknown): value is BaileysMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "key" in value &&
    typeof (value as BaileysMessage).key === "object"
  );
}

/**
 * Type guard for error objects
 * @param value - Value to check
 * @returns true if value is an Error instance
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Extract error message safely from unknown error value
 * @param error - Error value to extract message from
 * @returns Error message string
 *
 * @example
 * ```typescript
 * try {
 *   // ... code
 * } catch (error: unknown) {
 *   console.error(getErrorMessage(error));
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}
