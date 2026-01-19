/**
 * Catalog Commands (WhatsApp Business only)
 *
 * Commands for managing product catalogs
 */

import * as fs from "fs";
import { MiawClient } from "../../index.js";
import { ensureConnected } from "../utils/session.js";
import { formatTable } from "../utils/formatter.js";

/**
 * List catalog products
 *
 * Usage: catalog list [--phone <phone>] [--limit <n>] [--cursor <cursor>]
 */
export async function cmdCatalogList(
  client: MiawClient,
  args: { phone?: string; limit?: number; cursor?: string },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  const limit = args.limit || 10;
  const catalogResult = await client.getCatalog(args.phone, limit, args.cursor);

  if (jsonOutput) {
    console.log(JSON.stringify(catalogResult, null, 2));
    return catalogResult.success;
  }

  if (!catalogResult.success) {
    console.log(`❌ Failed to get catalog: ${catalogResult.error}`);
    return false;
  }

  const products = catalogResult.products || [];

  if (products.length === 0) {
    console.log("📦 No products found in catalog");
    return true;
  }

  const tableData = products.map((p) => ({
    id: p.id || "-",
    name: p.name || "-",
    price: p.price ? `${p.price} ${p.currency || ""}`.trim() : "-",
    hidden: p.isHidden ? "Yes" : "No",
  }));

  console.log(`\n📦 Catalog Products (${products.length}):\n`);
  console.log(
    formatTable(tableData, [
      { key: "id", label: "ID", width: 20 },
      { key: "name", label: "Name", width: 30 },
      { key: "price", label: "Price", width: 15 },
      { key: "hidden", label: "Hidden", width: 8 },
    ])
  );

  if (catalogResult.nextCursor) {
    console.log(`\n📄 More products available. Use --cursor ${catalogResult.nextCursor}`);
  }

  return true;
}

/**
 * List product collections
 *
 * Usage: catalog collections [--phone <phone>] [--limit <n>]
 */
export async function cmdCatalogCollections(
  client: MiawClient,
  args: { phone?: string; limit?: number },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  const limit = args.limit || 51;
  const collections = await client.getCollections(args.phone, limit);

  if (jsonOutput) {
    console.log(JSON.stringify(collections, null, 2));
    return true;
  }

  if (collections.length === 0) {
    console.log("📁 No collections found");
    return true;
  }

  const tableData = collections.map((c) => ({
    id: c.id || "-",
    name: c.name || "-",
    products: c.products?.length?.toString() || "0",
  }));

  console.log(`\n📁 Collections (${collections.length}):\n`);
  console.log(
    formatTable(tableData, [
      { key: "id", label: "ID", width: 20 },
      { key: "name", label: "Name", width: 30 },
      { key: "products", label: "Products", width: 10 },
    ])
  );

  return true;
}

/**
 * Create a product
 *
 * Usage: catalog product create <name> <description> <price> <currency> [options]
 * Options: --image <path>, --url <url>, --retailerId <id>, --hidden
 */
export async function cmdCatalogProductCreate(
  client: MiawClient,
  args: {
    name: string;
    description: string;
    price: number;
    currency: string;
    image?: string;
    url?: string;
    retailerId?: string;
    hidden?: boolean;
  },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  if (!args.name || !args.description || !args.price || !args.currency) {
    console.log("❌ Usage: catalog product create <name> <description> <price> <currency>");
    console.log("   Options: --image <path>, --url <url>, --retailerId <id>, --hidden");
    return false;
  }

  // Handle image
  let imageBuffers: Buffer[] | undefined;
  if (args.image) {
    if (!fs.existsSync(args.image)) {
      console.log(`❌ Image file not found: ${args.image}`);
      return false;
    }
    imageBuffers = [fs.readFileSync(args.image)];
  }

  const createResult = await client.createProduct({
    name: args.name,
    description: args.description,
    price: args.price,
    currency: args.currency.toUpperCase(),
    imageBuffers,
    url: args.url,
    retailerId: args.retailerId,
    isHidden: args.hidden,
  });

  if (jsonOutput) {
    console.log(JSON.stringify(createResult, null, 2));
    return createResult.success;
  }

  if (createResult.success) {
    console.log(`✅ Product created successfully`);
    console.log(`   ID: ${createResult.productId}`);
    console.log(`   Name: ${args.name}`);
    console.log(`   Price: ${args.price} ${args.currency.toUpperCase()}`);
  } else {
    console.log(`❌ Failed to create product: ${createResult.error}`);
  }

  return createResult.success;
}

/**
 * Update a product
 *
 * Usage: catalog product update <productId> [options]
 * Options: --name <name>, --description <desc>, --price <price>, --currency <currency>,
 *          --image <path>, --url <url>, --retailerId <id>, --hidden
 */
export async function cmdCatalogProductUpdate(
  client: MiawClient,
  args: {
    productId: string;
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    image?: string;
    url?: string;
    retailerId?: string;
    hidden?: boolean;
  },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  if (!args.productId) {
    console.log("❌ Usage: catalog product update <productId> [options]");
    console.log(
      "   Options: --name <name>, --description <desc>, --price <price>, --currency <currency>"
    );
    console.log("            --image <path>, --url <url>, --retailerId <id>, --hidden");
    return false;
  }

  // At least one update option is required
  if (
    !args.name &&
    !args.description &&
    !args.price &&
    !args.currency &&
    !args.image &&
    !args.url &&
    !args.retailerId &&
    args.hidden === undefined
  ) {
    console.log("❌ At least one update option is required");
    console.log(
      "   Options: --name <name>, --description <desc>, --price <price>, --currency <currency>"
    );
    console.log("            --image <path>, --url <url>, --retailerId <id>, --hidden");
    return false;
  }

  // Handle image
  let imageBuffers: Buffer[] | undefined;
  if (args.image) {
    if (!fs.existsSync(args.image)) {
      console.log(`❌ Image file not found: ${args.image}`);
      return false;
    }
    imageBuffers = [fs.readFileSync(args.image)];
  }

  // Build options object - only include provided fields
  // Note: updateProduct requires name, description, price, currency
  // If not provided, we need to fetch current values first
  const catalogResult = await client.getCatalog(undefined, 100);
  const existingProduct = catalogResult.products?.find((p) => p.id === args.productId);

  if (!existingProduct) {
    console.log(`❌ Product not found: ${args.productId}`);
    return false;
  }

  const updateResult = await client.updateProduct(args.productId, {
    name: args.name || existingProduct.name || "",
    description: args.description || existingProduct.description || "",
    price: args.price ?? existingProduct.price ?? 0,
    currency: args.currency?.toUpperCase() || existingProduct.currency || "USD",
    imageBuffers,
    url: args.url,
    retailerId: args.retailerId,
    isHidden: args.hidden,
  });

  if (jsonOutput) {
    console.log(JSON.stringify(updateResult, null, 2));
    return updateResult.success;
  }

  if (updateResult.success) {
    console.log(`✅ Product updated successfully`);
    console.log(`   ID: ${args.productId}`);
  } else {
    console.log(`❌ Failed to update product: ${updateResult.error}`);
  }

  return updateResult.success;
}

/**
 * Delete products
 *
 * Usage: catalog product delete <productId> [productId...]
 */
export async function cmdCatalogProductDelete(
  client: MiawClient,
  args: { productIds: string[] },
  jsonOutput: boolean
): Promise<boolean> {
  const result = await ensureConnected(client);
  if (!result.success) {
    console.log(`❌ Not connected: ${result.reason}`);
    return false;
  }

  if (!args.productIds || args.productIds.length === 0) {
    console.log("❌ Usage: catalog product delete <productId> [productId...]");
    return false;
  }

  const deleteResult = await client.deleteProducts(args.productIds);

  if (jsonOutput) {
    console.log(JSON.stringify(deleteResult, null, 2));
    return deleteResult.success;
  }

  if (deleteResult.success) {
    console.log(`✅ Products deleted successfully`);
    console.log(`   Deleted: ${deleteResult.deletedCount} product(s)`);
  } else {
    console.log(`❌ Failed to delete products: ${deleteResult.error}`);
  }

  return deleteResult.success;
}
