/**
 * Integration Tests: Business Features (v0.9.0)
 *
 * Tests for WhatsApp Business features:
 * - Label operations (addLabel, addChatLabel, removeChatLabel, addMessageLabel, removeMessageLabel)
 * - Catalog/Product operations (getCatalog, getCollections, createProduct, updateProduct, deleteProducts)
 * - Contact management (addOrEditContact, removeContact)
 *
 * NOTE: These tests require a WhatsApp Business account.
 * Label and Catalog features only work with Business accounts.
 */
import { createTestClient, waitForEvent, TEST_CONFIG, sleep } from '../setup.js';
import { MiawClient } from '../../src/index.js';
import { LabelColor, PredefinedLabelId } from '../../src/types';

describe('Business Features (v0.9.0)', () => {
  let client: MiawClient;

  beforeAll(async () => {
    client = createTestClient();
    await client.connect();
    await waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);
    console.log('\n=== BOT READY FOR BUSINESS FEATURES TESTS ===\n');
  }, TEST_CONFIG.connectTimeout);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('Label Operations (WhatsApp Business only)', () => {
    test('test_add_label', async () => {
      // Skip by default - label operations require WhatsApp Business account
      console.log('⏭️  Skipping: Label operations require WhatsApp Business account');
      console.log('   To test manually with a Business account:');
      console.log('   const result = await client.addLabel({');
      console.log('     id: "label-123",');
      console.log('     name: "VIP Customer",');
      console.log('     color: LabelColor.Color5,');
      console.log('   });');
      console.log('   expect(result.success).toBe(true);');

      // Uncomment to test with Business account:
      // const result = await client.addLabel({
      //   id: `test-label-${Date.now()}`,
      //   name: 'Test Label',
      //   color: LabelColor.Color1,
      // });
      // expect(result.success).toBe(true);
      // console.log('✅ Label created successfully');
    });

    test('test_add_chat_label', async () => {
      console.log('⏭️  Skipping: Chat label requires WhatsApp Business account');
      console.log('   To test manually:');
      console.log('   const result = await client.addChatLabel("6281234567890", "label-id");');

      // Uncomment to test:
      // const result = await client.addChatLabel(TEST_CONFIG.phone, 'label-id');
      // expect(result.success).toBe(true);
    });

    test('test_remove_chat_label', async () => {
      console.log('⏭️  Skipping: Remove chat label requires WhatsApp Business account');
      console.log('   To test manually:');
      console.log('   const result = await client.removeChatLabel("6281234567890", "label-id");');

      // Uncomment to test:
      // const result = await client.removeChatLabel(TEST_CONFIG.phone, 'label-id');
      // expect(result.success).toBe(true);
    });

    test('test_add_message_label', async () => {
      console.log('⏭️  Skipping: Message label requires WhatsApp Business account');
      console.log('   To test manually:');
      console.log('   const result = await client.addMessageLabel("6281234567890", "msg-id", "label-id");');

      // Uncomment to test:
      // const result = await client.addMessageLabel(TEST_CONFIG.phone, 'message-id', 'label-id');
      // expect(result.success).toBe(true);
    });

    test('test_remove_message_label', async () => {
      console.log('⏭️  Skipping: Remove message label requires WhatsApp Business account');
      console.log('   To test manually:');
      console.log('   const result = await client.removeMessageLabel("6281234567890", "msg-id", "label-id");');

      // Uncomment to test:
      // const result = await client.removeMessageLabel(TEST_CONFIG.phone, 'message-id', 'label-id');
      // expect(result.success).toBe(true);
    });

    test('test_fetch_all_labels', async () => {
      const result = await client.fetchAllLabels();

      expect(result.success).toBe(true);
      expect(result.labels).toBeDefined();
      expect(Array.isArray(result.labels)).toBe(true);

      console.log('✅ Fetched all labels');
      console.log('   Total labels:', result.labels?.length);

      if (result.labels && result.labels.length > 0) {
        const sample = result.labels[0];
        console.log('   Sample label:', {
          id: sample.id,
          name: sample.name,
          color: sample.color,
          predefinedId: sample.predefinedId || '(none)',
        });
      } else {
        console.log('   ⚠️  No labels found (might not be a Business account or no labels created)');
      }
    });
  });

  describe('Catalog/Product Operations (WhatsApp Business only)', () => {
    test('test_get_catalog', async () => {
      // Skip by default - catalog requires WhatsApp Business account
      console.log('⏭️  Skipping: Get catalog requires WhatsApp Business account');
      console.log('   To test manually with a Business account:');
      console.log('   const catalog = await client.getCatalog();');
      console.log('   expect(catalog.success).toBe(true);');
      console.log('   console.log("Products:", catalog.products);');

      // Uncomment to test with Business account:
      // const catalog = await client.getCatalog();
      // expect(catalog.success).toBe(true);
      // console.log('✅ Catalog fetched successfully');
      // console.log('   Products:', catalog.products?.length);
    });

    test('test_get_collections', async () => {
      console.log('⏭️  Skipping: Get collections requires WhatsApp Business account');
      console.log('   To test manually:');
      console.log('   const collections = await client.getCollections();');
      console.log('   console.log("Collections:", collections);');

      // Uncomment to test:
      // const collections = await client.getCollections();
      // console.log('✅ Collections fetched successfully');
      // console.log('   Collections:', collections.length);
    });

    test('test_create_product', async () => {
      console.log('⏭️  Skipping: Create product requires WhatsApp Business account');
      console.log('   To test manually:');
      console.log('   const result = await client.createProduct({');
      console.log('     name: "Test Product",');
      console.log('     price: 9999, // in cents');
      console.log('     description: "A test product",');
      console.log('     imageUrls: ["https://example.com/image.jpg"],');
      console.log('   });');

      // Uncomment to test:
      // const result = await client.createProduct({
      //   name: 'Test Product',
      //   price: 9999,
      //   description: 'A test product',
      //   imageUrls: ['https://example.com/image.jpg'],
      // });
      // expect(result.success).toBe(true);
      // console.log('✅ Product created successfully:', result.productId);
    });

    test('test_update_product', async () => {
      console.log('⏭️  Skipping: Update product requires WhatsApp Business account');
      console.log('   To test manually:');
      console.log('   const result = await client.updateProduct("product-id", {');
      console.log('     name: "Updated Product",');
      console.log('     price: 19999,');
      console.log('   });');

      // Uncomment to test:
      // const result = await client.updateProduct('product-id', {
      //   name: 'Updated Product',
      //   price: 19999,
      // });
      // expect(result.success).toBe(true);
    });

    test('test_delete_products', async () => {
      console.log('⏭️  Skipping: Delete products requires WhatsApp Business account');
      console.log('   To test manually:');
      console.log('   const result = await client.deleteProducts(["product-id-1", "product-id-2"]);');

      // Uncomment to test:
      // const result = await client.deleteProducts(['product-id-1', 'product-id-2']);
      // expect(result.success).toBe(true);
      // console.log('✅ Products deleted successfully:', result.deletedCount);
    });
  });

  describe('Contact Management', () => {
    let testPhone: string;

    test('test_add_or_edit_contact', async () => {
      await sleep(1000);

      // Use a test phone number (you may want to use your own number for testing)
      testPhone = TEST_CONFIG.contactPhoneA;

      const result = await client.addOrEditContact({
        phone: testPhone,
        name: `Test Contact ${Date.now()}`,
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result.success).toBe(true);
      console.log('✅ Contact added/edited successfully');
      console.log('   Phone:', testPhone);
    });

    test('test_add_or_edit_contact_with_phone_only', async () => {
      await sleep(1000);

      const testPhone2 = TEST_CONFIG.contactPhoneA;

      const result = await client.addOrEditContact({
        phone: testPhone2,
        name: `Simple Contact ${Date.now()}`,
      });

      expect(result.success).toBe(true);
      console.log('✅ Simple contact added successfully');
    });

    test('test_add_or_edit_contact_error_handling', async () => {
      // Create a new client without connecting
      const disconnectedClient = new MiawClient({
        instanceId: 'test-disconnected-contact',
      });

      const result = await disconnectedClient.addOrEditContact({
        phone: '1234567890',
        name: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not connected');
      console.log('✅ Correctly rejected contact operation without connection');
    });

    test('test_remove_contact', async () => {
      await sleep(1000);

      // Note: This will actually remove the contact from your WhatsApp
      // Use with caution

      console.log('⏭️  Skipping: Remove contact actually removes from your WhatsApp');
      console.log('   To test manually:');
      console.log('   const result = await client.removeContact("6281234567890");');
      console.log('   expect(result.success).toBe(true);');

      // Uncomment to test:
      // const result = await client.removeContact(testPhone);
      // expect(result.success).toBe(true);
      // console.log('✅ Contact removed successfully');
    });
  });

  describe('Error Handling for Business Features', () => {
    test('test_label_operations_require_connection', async () => {
      const disconnectedClient = new MiawClient({
        instanceId: 'test-disconnected-labels',
      });

      const result = await disconnectedClient.addLabel({
        id: 'test',
        name: 'Test',
        color: LabelColor.Color1,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not connected');
    });

    test('test_catalog_operations_require_connection', async () => {
      const disconnectedClient = new MiawClient({
        instanceId: 'test-disconnected-catalog',
      });

      const result = await disconnectedClient.getCatalog();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not connected');
    });

    test('test_product_operations_require_connection', async () => {
      const disconnectedClient = new MiawClient({
        instanceId: 'test-disconnected-product',
      });

      const result = await disconnectedClient.createProduct({
        name: 'Test',
        price: 100,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Not connected');
    });
  });
});
