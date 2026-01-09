/**
 * CLI Output Formatter
 *
 * Formats data as tables or JSON for CLI output
 */

import Table from "cli-table3";

export interface ColumnConfig {
  key: string;
  label: string;
  width?: number;
  truncate?: number;
}

/**
 * Format data as a table
 */
export function formatTable(
  data: any[],
  columns: ColumnConfig[]
): string {
  if (!data || data.length === 0) {
    return "No data found.";
  }

  // Build column config for cli-table3
  const colConfig: { [key: string]: number } = {};
  const head: string[] = [];

  for (const col of columns) {
    head.push(col.label);
    colConfig[col.key] = col.width || 30;
  }

  const table = new Table({
    head,
    colWidths: Object.values(colConfig),
    wordWrap: true,
  });

  // Add rows
  for (const item of data) {
    const row: string[] = [];
    for (const col of columns) {
      let value = item[col.key];

      // Handle null/undefined
      if (value === null || value === undefined) {
        value = "-";
      }

      // Convert to string
      let strValue = String(value);

      // Truncate if needed
      if (col.truncate && strValue.length > col.truncate) {
        strValue = strValue.substring(0, col.truncate) + "...";
      }

      row.push(strValue);
    }
    table.push(row);
  }

  return table.toString();
}

/**
 * Format data as JSON
 */
export function formatJson(data: any): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Format a single object as key-value table
 */
export function formatKeyValue(
  data: any,
  title?: string
): string {
  if (!data) {
    return "No data found.";
  }

  const table = new Table({
    head: ["Key", "Value"],
    colWidths: [25, 50],
    wordWrap: true,
  });

  for (const [key, value] of Object.entries(data)) {
    let displayValue = value;

    if (value === null || value === undefined) {
      displayValue = "-";
    } else if (typeof value === "object") {
      displayValue = JSON.stringify(value);
    } else {
      displayValue = String(value);
    }

    table.push([key, displayValue]);
  }

  let output = table.toString();
  if (title) {
    output = `\n${title}\n${output}`;
  }

  return output;
}

/**
 * Format success/error message
 */
export function formatMessage(
  success: boolean,
  message: string,
  details?: string
): string {
  const icon = success ? "✅" : "❌";
  let output = `${icon} ${message}`;

  if (details) {
    output += `\n${details}`;
  }

  return output;
}

/**
 * Format a list of items
 */
export function formatList(items: string[], title?: string): string {
  if (!items || items.length === 0) {
    return "No items found.";
  }

  let output = "";
  if (title) {
    output += `${title}\n`;
  }

  items.forEach((item, index) => {
    output += `  ${index + 1}. ${item}\n`;
  });

  return output.trim();
}
