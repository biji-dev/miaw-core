/**
 * Integration Tests: Media Download (v0.2.0)
 *
 * Tests for downloading media from received messages.
 * These tests require manual interaction - send media to the bot during test.
 */
import { createTestClient, waitForEvent, waitForMessage, TEST_CONFIG } from '../setup';
import { MiawClient, MiawMessage } from '../../src';

describe('Media Download', () => {
  let client: MiawClient;

  beforeAll(async () => {
    client = createTestClient();
    await client.connect();
    await waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);
    console.log('\n=== BOT READY FOR MEDIA DOWNLOAD TESTS ===');
    console.log('Send media messages to the bot to test download functionality\n');
  }, TEST_CONFIG.connectTimeout);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  test('test_download_image', async () => {
    console.log('\nWaiting for image message...');
    console.log('Send an image to the bot to test download');

    let imageMessage: MiawMessage | null = null;

    try {
      imageMessage = await waitForMessage(
        client,
        (msg) => msg.type === 'image' && !msg.fromMe,
        TEST_CONFIG.messageTimeout
      );
    } catch {
      console.log('Skipping: No image message received within timeout');
      return;
    }

    if (!imageMessage) {
      throw new Error('No image message received');
    }

    const buffer = await client.downloadMedia(imageMessage);

    expect(buffer).not.toBeNull();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer!.length).toBeGreaterThan(0);
    console.log(`Downloaded image: ${buffer!.length} bytes`);
  }, TEST_CONFIG.messageTimeout + 5000);

  test('test_download_document', async () => {
    console.log('\nWaiting for document message...');
    console.log('Send a document to the bot to test download');

    let docMessage: MiawMessage | null = null;

    try {
      docMessage = await waitForMessage(
        client,
        (msg) => msg.type === 'document' && !msg.fromMe,
        TEST_CONFIG.messageTimeout
      );
    } catch {
      console.log('Skipping: No document message received within timeout');
      return;
    }

    if (!docMessage) {
      throw new Error('No document message received');
    }

    const buffer = await client.downloadMedia(docMessage);

    expect(buffer).not.toBeNull();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer!.length).toBeGreaterThan(0);
    console.log(`Downloaded document: ${buffer!.length} bytes`);
  }, TEST_CONFIG.messageTimeout + 5000);

  test('test_download_non_media_fails', async () => {
    // Create a mock text message without media
    const textMessage: MiawMessage = {
      id: 'test-id',
      from: '1234567890@s.whatsapp.net',
      text: 'Hello',
      timestamp: Math.floor(Date.now() / 1000),
      isGroup: false,
      fromMe: false,
      type: 'text',
      raw: { key: { id: 'test' }, message: { conversation: 'Hello' } },
    };

    const buffer = await client.downloadMedia(textMessage);

    expect(buffer).toBeNull();
    console.log('Correctly returned null for non-media message');
  });

  test('test_download_without_raw_fails', async () => {
    // Create a message without raw field
    const messageWithoutRaw: MiawMessage = {
      id: 'test-id',
      from: '1234567890@s.whatsapp.net',
      timestamp: Math.floor(Date.now() / 1000),
      isGroup: false,
      fromMe: false,
      type: 'image',
      // No raw field
    };

    const buffer = await client.downloadMedia(messageWithoutRaw);

    expect(buffer).toBeNull();
    console.log('Correctly returned null for message without raw field');
  });
});
