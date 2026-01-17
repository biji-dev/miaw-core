/**
 * WhatsApp Label Colors (0-19)
 * Based on LabelColor enum in types/index.ts
 */
export const LABEL_COLOR_NAMES: Record<number, string> = {
  0: "Color 1 (Dark Blue)",
  1: "Color 2 (Green)",
  2: "Color 3 (Purple)",
  3: "Color 4 (Pink)",
  4: "Color 5 (Red)",
  5: "Color 6 (Orange)",
  6: "Color 7 (Yellow)",
  7: "Color 8 (Light Blue)",
  8: "Color 9 (Teal)",
  9: "Color 10 (Lime)",
  10: "Color 11 (Magenta)",
  11: "Color 12 (Brown)",
  12: "Color 13 (Gray)",
  13: "Color 14 (Light Gray)",
  14: "Color 15 (Indigo)",
  15: "Color 16 (Cyan)",
  16: "Color 17 (Violet)",
  17: "Color 18 (Coral)",
  18: "Color 19 (Gold)",
  19: "Color 20 (Silver)",
} as const;

/**
 * Get human-readable color name from LabelColor enum value
 * @param color - Color number (0-19)
 * @returns Color name or "Unknown (N)" for invalid values
 *
 * @example
 * ```typescript
 * getLabelColorName(0); // "Color 1 (Dark Blue)"
 * getLabelColorName(19); // "Color 20 (Silver)"
 * getLabelColorName(99); // "Unknown (99)"
 * ```
 */
export function getLabelColorName(color: number): string {
  return LABEL_COLOR_NAMES[color] || `Unknown (${color})`;
}
