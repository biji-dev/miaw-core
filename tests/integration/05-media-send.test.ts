/**
 * Integration Tests: Media Sending (v0.2.0)
 *
 * Tests for sending media messages: images, documents, videos, audio
 */
import { createTestClient, waitForEvent, TEST_CONFIG, sleep } from '../setup';
import { MiawClient } from '../../src';
import * as fs from 'fs';
import * as path from 'path';

describe('Media Sending', () => {
  let client: MiawClient;

  // Test media paths - create small test files in test-assets/
  const TEST_ASSETS_DIR = path.join(__dirname, '../test-assets');
  const TEST_IMAGE_PATH = path.join(TEST_ASSETS_DIR, 'test-image.jpg');
  const TEST_DOCUMENT_PATH = path.join(TEST_ASSETS_DIR, 'test-document.txt');

  beforeAll(async () => {
    // Ensure test-assets directory exists
    if (!fs.existsSync(TEST_ASSETS_DIR)) {
      fs.mkdirSync(TEST_ASSETS_DIR, { recursive: true });
    }

    // Create a minimal test image if it doesn't exist (1x1 red JPEG)
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
      // Minimal valid JPEG (1x1 red pixel)
      const minimalJpeg = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
        0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
        0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
        0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
        0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
        0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
        0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
        0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
        0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
        0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d,
        0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
        0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08,
        0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
        0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28,
        0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45,
        0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
        0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
        0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
        0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3,
        0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6,
        0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
        0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2,
        0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4,
        0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01,
        0x00, 0x00, 0x3f, 0x00, 0xfb, 0xd5, 0xdb, 0x20, 0xa8, 0xf1, 0x45, 0xff,
        0xd9,
      ]);
      fs.writeFileSync(TEST_IMAGE_PATH, minimalJpeg);
      console.log('Created test image:', TEST_IMAGE_PATH);
    }

    // Create a test document if it doesn't exist
    if (!fs.existsSync(TEST_DOCUMENT_PATH)) {
      fs.writeFileSync(TEST_DOCUMENT_PATH, 'This is a test document for miaw-core integration tests.\nCreated at: ' + new Date().toISOString());
      console.log('Created test document:', TEST_DOCUMENT_PATH);
    }

    client = createTestClient();
    await client.connect();
    await waitForEvent(client, 'ready', TEST_CONFIG.connectTimeout);
    console.log('\n=== BOT READY FOR MEDIA SENDING TESTS ===\n');
  }, TEST_CONFIG.connectTimeout);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('Image Sending', () => {
    test('test_send_image_from_path', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('Skipping: No test contact configured');
        return;
      }

      const result = await client.sendImage(
        TEST_CONFIG.contactPhoneA,
        TEST_IMAGE_PATH
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('Sent image from file path');
    });

    test('test_send_image_with_caption', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('Skipping: No test contact configured');
        return;
      }

      await sleep(1000); // Rate limiting

      const result = await client.sendImage(
        TEST_CONFIG.contactPhoneA,
        TEST_IMAGE_PATH,
        { caption: `Test image with caption ${Date.now()}` }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('Sent image with caption');
    });

    test('test_send_image_from_buffer', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('Skipping: No test contact configured');
        return;
      }

      await sleep(1000);

      const imageBuffer = fs.readFileSync(TEST_IMAGE_PATH);
      const result = await client.sendImage(
        TEST_CONFIG.contactPhoneA,
        imageBuffer,
        { caption: 'Image from buffer' }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('Sent image from buffer');
    });

    test('test_send_image_view_once', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('Skipping: No test contact configured');
        return;
      }

      await sleep(1000);

      const result = await client.sendImage(
        TEST_CONFIG.contactPhoneA,
        TEST_IMAGE_PATH,
        { caption: 'View once image', viewOnce: true }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('Sent view-once image');
    });

    test('test_send_image_to_group', async () => {
      if (!TEST_CONFIG.groupJid) {
        console.log('Skipping: No test group configured');
        return;
      }

      await sleep(1000);

      const result = await client.sendImage(
        TEST_CONFIG.groupJid,
        TEST_IMAGE_PATH,
        { caption: 'Group image test' }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('Sent image to group');
    });

    test('test_send_image_when_disconnected', async () => {
      // Temporarily disconnect
      await client.disconnect();
      await sleep(1000);

      const result = await client.sendImage(
        TEST_CONFIG.contactPhoneA,
        TEST_IMAGE_PATH
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      console.log('Correctly failed when disconnected');

      // Reconnect for other tests
      await client.connect();
      await waitForEvent(client, 'ready');
    });
  });

  describe('Document Sending', () => {
    test('test_send_document_from_path', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('Skipping: No test contact configured');
        return;
      }

      const result = await client.sendDocument(
        TEST_CONFIG.contactPhoneA,
        TEST_DOCUMENT_PATH
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('Sent document from file path');
    });

    test('test_send_document_with_filename', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('Skipping: No test contact configured');
        return;
      }

      await sleep(1000);

      const result = await client.sendDocument(
        TEST_CONFIG.contactPhoneA,
        TEST_DOCUMENT_PATH,
        { fileName: 'custom-name.txt' }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('Sent document with custom filename');
    });

    test('test_send_document_with_caption', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('Skipping: No test contact configured');
        return;
      }

      await sleep(1000);

      const result = await client.sendDocument(
        TEST_CONFIG.contactPhoneA,
        TEST_DOCUMENT_PATH,
        { caption: `Document with caption ${Date.now()}` }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('Sent document with caption');
    });

    test('test_send_document_pdf', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('Skipping: No test contact configured');
        return;
      }

      await sleep(1000);

      // Send text file but with PDF mimetype override
      const result = await client.sendDocument(
        TEST_CONFIG.contactPhoneA,
        TEST_DOCUMENT_PATH,
        {
          fileName: 'report.pdf',
          mimetype: 'application/pdf',
          caption: 'PDF document test',
        }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('Sent document with PDF mimetype');
    });

    test('test_send_document_from_buffer', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('Skipping: No test contact configured');
        return;
      }

      await sleep(1000);

      const docBuffer = fs.readFileSync(TEST_DOCUMENT_PATH);
      const result = await client.sendDocument(
        TEST_CONFIG.contactPhoneA,
        docBuffer,
        { fileName: 'buffer-doc.txt', caption: 'Document from buffer' }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('Sent document from buffer');
    });
  });

  describe('Video Sending', () => {
    // Note: Video tests require an actual video file in test-assets/
    // Create a small test video manually: test-assets/test-video.mp4
    const TEST_VIDEO_PATH = path.join(TEST_ASSETS_DIR, 'test-video.mp4');

    test('test_send_video_from_path', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('Skipping: No test contact configured');
        return;
      }

      if (!fs.existsSync(TEST_VIDEO_PATH)) {
        console.log('Skipping: No test video file at', TEST_VIDEO_PATH);
        console.log('Create a small test video manually to run this test');
        return;
      }

      const result = await client.sendVideo(
        TEST_CONFIG.contactPhoneA,
        TEST_VIDEO_PATH
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('Sent video from file path');
    });

    test('test_send_video_with_caption', async () => {
      if (!TEST_CONFIG.contactPhoneA || !fs.existsSync(TEST_VIDEO_PATH)) {
        console.log('Skipping: No test contact or video configured');
        return;
      }

      await sleep(1000);

      const result = await client.sendVideo(
        TEST_CONFIG.contactPhoneA,
        TEST_VIDEO_PATH,
        { caption: `Test video with caption ${Date.now()}` }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('Sent video with caption');
    });

    test('test_send_video_as_gif', async () => {
      if (!TEST_CONFIG.contactPhoneA || !fs.existsSync(TEST_VIDEO_PATH)) {
        console.log('Skipping: No test contact or video configured');
        return;
      }

      await sleep(1000);

      const result = await client.sendVideo(
        TEST_CONFIG.contactPhoneA,
        TEST_VIDEO_PATH,
        { caption: 'GIF playback video', gifPlayback: true }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('Sent video with gifPlayback');
    });

    test('test_send_video_from_buffer', async () => {
      if (!TEST_CONFIG.contactPhoneA || !fs.existsSync(TEST_VIDEO_PATH)) {
        console.log('Skipping: No test contact or video configured');
        return;
      }

      await sleep(1000);

      const videoBuffer = fs.readFileSync(TEST_VIDEO_PATH);
      const result = await client.sendVideo(
        TEST_CONFIG.contactPhoneA,
        videoBuffer,
        { caption: 'Video from buffer' }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('Sent video from buffer');
    });
  });

  describe('Audio Sending', () => {
    // Note: Audio tests require an actual audio file in test-assets/
    // Create a small test audio manually: test-assets/test-audio.mp3
    const TEST_AUDIO_PATH = path.join(TEST_ASSETS_DIR, 'test-audio.mp3');

    test('test_send_audio_from_path', async () => {
      if (!TEST_CONFIG.contactPhoneA) {
        console.log('Skipping: No test contact configured');
        return;
      }

      if (!fs.existsSync(TEST_AUDIO_PATH)) {
        console.log('Skipping: No test audio file at', TEST_AUDIO_PATH);
        console.log('Create a small test audio manually to run this test');
        return;
      }

      const result = await client.sendAudio(
        TEST_CONFIG.contactPhoneA,
        TEST_AUDIO_PATH
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('Sent audio from file path');
    });

    test('test_send_audio_as_voice_note', async () => {
      if (!TEST_CONFIG.contactPhoneA || !fs.existsSync(TEST_AUDIO_PATH)) {
        console.log('Skipping: No test contact or audio configured');
        return;
      }

      await sleep(1000);

      const result = await client.sendAudio(
        TEST_CONFIG.contactPhoneA,
        TEST_AUDIO_PATH,
        { ptt: true }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('Sent audio as voice note (PTT)');
    });

    test('test_send_audio_from_buffer', async () => {
      if (!TEST_CONFIG.contactPhoneA || !fs.existsSync(TEST_AUDIO_PATH)) {
        console.log('Skipping: No test contact or audio configured');
        return;
      }

      await sleep(1000);

      const audioBuffer = fs.readFileSync(TEST_AUDIO_PATH);
      const result = await client.sendAudio(
        TEST_CONFIG.contactPhoneA,
        audioBuffer,
        { mimetype: 'audio/mpeg' }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      console.log('Sent audio from buffer');
    });
  });
});
