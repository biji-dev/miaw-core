/**
 * Integration Tests: Connection & Authentication
 */
import { MiawClient } from '../../src/index.js';
import { createTestClient, waitForEvent, TEST_CONFIG } from '../setup.js';
import qrcode from 'qrcode-terminal';

describe('Connection & Authentication', () => {
  let client: MiawClient;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  test('test_initial_connection', async () => {
    client = createTestClient();

    // Listen for QR code and display it
    client.on('qr', (qr) => {
      console.log('\n=================================');
      console.log('QR CODE REQUIRED - Scan with WhatsApp');
      console.log('=================================\n');

      // Display QR code in terminal
      qrcode.generate(qr, { small: true });

      console.log('\n=================================');
      console.log('Waiting for QR scan...');
      console.log('=================================\n');
    });

    // Connect
    await client.connect();

    // Wait for ready
    await waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);

    // Verify connection
    expect(client.getInstanceId()).toBe(TEST_CONFIG.instanceId);

    console.log('✅ Connection successful!');
  }, TEST_CONFIG.connectTimeout + 5000);

  test('test_session_persistence', async () => {
    // This test assumes session already exists from previous test
    client = createTestClient();

    let qrShown = false;
    client.once('qr', () => {
      qrShown = true;
    });

    await client.connect();
    await waitForEvent(client, 'ready');

    // Should NOT show QR if session exists
    expect(qrShown).toBe(false);
  }, TEST_CONFIG.connectTimeout);

  test('test_connection_events', async () => {
    client = createTestClient();

    const events: string[] = [];

    client.on('connection', (state) => {
      events.push(state);
    });

    await client.connect();
    await waitForEvent(client, 'ready');

    // Should have seen connecting and connected states
    expect(events).toContain('connecting');
    expect(events).toContain('connected');
  }, TEST_CONFIG.connectTimeout);

  test('test_graceful_disconnect', async () => {
    client = createTestClient();

    await client.connect();
    await waitForEvent(client, 'ready');

    const disconnectPromise = waitForEvent(client, 'disconnected');
    await client.disconnect();
    await disconnectPromise;

    // Client should be disconnected
    expect(client['socket']).toBeNull();
  }, TEST_CONFIG.connectTimeout);
});
