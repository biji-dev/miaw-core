/**
 * Integration Tests: Connection & Authentication
 */
import { MiawClient } from '../../src';
import { createTestClient, waitForEvent, TEST_CONFIG } from '../setup';

describe('Connection & Authentication', () => {
  let client: MiawClient;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  test('test_initial_connection', async () => {
    client = createTestClient();

    // Listen for QR or ready event
    const qrPromise = waitForEvent(client, 'qr', 5000).catch(() => null);
    const readyPromise = waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);

    // Connect
    await client.connect();

    // Either QR is shown (first time) or ready is emitted (session exists)
    const qr = await qrPromise;
    if (qr) {
      console.log('\n=== QR CODE REQUIRED ===');
      console.log('Please scan the QR code with your test WhatsApp number');
      console.log('QR Code:', qr);
      console.log('========================\n');
    }

    // Wait for ready
    await readyPromise;

    // Verify connection
    expect(client.getInstanceId()).toBe(TEST_CONFIG.instanceId);
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
