/**
 * Validation utilities for common operations
 * Provides consistent validation and error messages throughout miaw-core
 */

/**
 * Validate phone number format
 * @param phone - Phone number to validate (should be in international format without + or spaces)
 * @returns Validation result with success status and error message if invalid
 *
 * @example
 * ```typescript
 * validatePhoneNumber("6281234567890");  // { valid: true }
 * validatePhoneNumber("+62812345");      // { valid: false, error: "Phone number should not contain +" }
 * validatePhoneNumber("");                // { valid: false, error: "Phone number cannot be empty" }
 * ```
 */
export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
  if (!phone || phone.trim().length === 0) {
    return { valid: false, error: "Phone number cannot be empty" };
  }

  // Check for invalid characters
  if (phone.includes("+")) {
    return {
      valid: false,
      error: "Phone number should not contain '+' (use international format without prefix)",
    };
  }

  if (phone.includes(" ") || phone.includes("-")) {
    return {
      valid: false,
      error: "Phone number should not contain spaces or hyphens",
    };
  }

  // Basic format check: should be digits only
  if (!/^\d+$/.test(phone)) {
    return {
      valid: false,
      error: "Phone number should contain only digits",
    };
  }

  // Length check: typical international phone numbers are 10-15 digits
  if (phone.length < 10 || phone.length > 15) {
    return {
      valid: false,
      error: "Phone number should be between 10-15 digits",
    };
  }

  return { valid: true };
}

/**
 * Validate JID (WhatsApp identifier) format
 * @param jid - JID to validate (should be in format phone@s.whatsapp.net or groupId@g.us)
 * @returns Validation result with success status and error message if invalid
 *
 * @example
 * ```typescript
 * validateJID("6281234567890@s.whatsapp.net");  // { valid: true }
 * validateJID("123456789@g.us");                 // { valid: true }
 * validateJID("invalid");                        // { valid: false, error: "Invalid JID format" }
 * ```
 */
export function validateJID(jid: string): { valid: boolean; error?: string } {
  if (!jid || jid.trim().length === 0) {
    return { valid: false, error: "JID cannot be empty" };
  }

  // Check for valid WhatsApp JID suffixes
  const validSuffixes = ["@s.whatsapp.net", "@g.us", "@broadcast", "@lid"];
  const hasValidSuffix = validSuffixes.some((suffix) => jid.endsWith(suffix));

  if (!hasValidSuffix) {
    return {
      valid: false,
      error: `JID must end with one of: ${validSuffixes.join(", ")}`,
    };
  }

  // Check format: should have exactly one @ symbol
  const parts = jid.split("@");
  if (parts.length !== 2) {
    return {
      valid: false,
      error: "Invalid JID format: should be identifier@domain",
    };
  }

  // Check that identifier is not empty
  if (parts[0].length === 0) {
    return {
      valid: false,
      error: "JID identifier cannot be empty",
    };
  }

  return { valid: true };
}

/**
 * Validate message text content
 * @param text - Message text to validate
 * @param options - Validation options
 * @returns Validation result with success status and error message if invalid
 *
 * @example
 * ```typescript
 * validateMessageText("Hello");                           // { valid: true }
 * validateMessageText("");                                // { valid: false, error: "Message text cannot be empty" }
 * validateMessageText("a".repeat(65537));                 // { valid: false, error: "Message text exceeds maximum length" }
 * validateMessageText("Hi", { minLength: 5 });           // { valid: false, error: "Message text must be at least 5 characters" }
 * ```
 */
export function validateMessageText(
  text: string,
  options: { minLength?: number; maxLength?: number } = {}
): { valid: boolean; error?: string } {
  const { minLength = 1, maxLength = 65536 } = options;

  if (!text || text.trim().length === 0) {
    return { valid: false, error: "Message text cannot be empty" };
  }

  if (text.length < minLength) {
    return {
      valid: false,
      error: `Message text must be at least ${minLength} character${minLength > 1 ? "s" : ""}`,
    };
  }

  if (text.length > maxLength) {
    return {
      valid: false,
      error: `Message text exceeds maximum length of ${maxLength} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate group name
 * @param name - Group name to validate
 * @returns Validation result with success status and error message if invalid
 *
 * @example
 * ```typescript
 * validateGroupName("My Group");     // { valid: true }
 * validateGroupName("");              // { valid: false, error: "Group name cannot be empty" }
 * validateGroupName("a".repeat(101)); // { valid: false, error: "Group name exceeds maximum length" }
 * ```
 */
export function validateGroupName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Group name cannot be empty" };
  }

  // WhatsApp group name max length is typically 100 characters
  if (name.length > 100) {
    return {
      valid: false,
      error: "Group name exceeds maximum length of 100 characters",
    };
  }

  return { valid: true };
}

/**
 * Validate array of phone numbers
 * @param phones - Array of phone numbers to validate
 * @returns Validation result with success status and error message if invalid
 *
 * @example
 * ```typescript
 * validatePhoneNumbers(["6281234567890", "6287654321098"]);  // { valid: true }
 * validatePhoneNumbers([]);                                   // { valid: false, error: "Phone numbers array cannot be empty" }
 * validatePhoneNumbers(["invalid"]);                          // { valid: false, error: "Invalid phone number at index 0: ..." }
 * ```
 */
export function validatePhoneNumbers(phones: string[]): { valid: boolean; error?: string } {
  if (!phones || phones.length === 0) {
    return { valid: false, error: "Phone numbers array cannot be empty" };
  }

  for (let i = 0; i < phones.length; i++) {
    const validation = validatePhoneNumber(phones[i]);
    if (!validation.valid) {
      return {
        valid: false,
        error: `Invalid phone number at index ${i}: ${validation.error}`,
      };
    }
  }

  return { valid: true };
}
