/**
 * Unit Tests for AuthHandler
 */

import { jest, describe, beforeEach, afterEach, afterAll, it, expect } from '@jest/globals';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Create the mock function with proper type
const mockUseMultiFileAuthState = jest.fn<() => Promise<any>>();

// Mock Baileys before importing AuthHandler
jest.unstable_mockModule('@whiskeysockets/baileys', () => ({
  useMultiFileAuthState: mockUseMultiFileAuthState,
}));

// Dynamic import after mocking
const { AuthHandler } = await import('../../src/handlers/AuthHandler.js');

describe('AuthHandler', () => {
  const testSessionPath = './test-sessions-unit';
  const testInstanceId = 'test-instance';

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup mock to return fake auth state
    mockUseMultiFileAuthState.mockResolvedValue({
      state: {
        creds: {
          registrationId: 123,
          registration: {},
          account: {},
          me: {},
          signalId: '',
          advSecretKey: Uint8Array.from([]),
          processedHistoryMessages: [],
          nextPreKeyId: 1,
          firstUnuploadedPreKeyId: 1,
          syncLock: {},
          accountSettings: {},
        },
        keys: {},
      },
      saveCreds: jest.fn(),
    });
  });

  afterEach(() => {
    // Clean up test sessions
    const testPath = join(testSessionPath, testInstanceId);
    if (existsSync(testPath)) {
      rmSync(testPath, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    // Clean up test sessions directory
    if (existsSync(testSessionPath)) {
      rmSync(testSessionPath, { recursive: true, force: true });
    }
  });

  describe('constructor', () => {
    it('should create instance with session path and instance ID', () => {
      const handler = new AuthHandler(testSessionPath, testInstanceId);
      expect(handler).toBeInstanceOf(AuthHandler);
    });

    it('should accept empty string session path', () => {
      const handler = new AuthHandler('', testInstanceId);
      expect(handler).toBeInstanceOf(AuthHandler);
    });

    it('should accept empty string instance ID', () => {
      const handler = new AuthHandler(testSessionPath, '');
      expect(handler).toBeInstanceOf(AuthHandler);
    });
  });

  describe('getAuthPath', () => {
    it('should return joined path of session path and instance ID', () => {
      const handler = new AuthHandler(testSessionPath, testInstanceId);
      const result = handler.getAuthPath();
      expect(result).toBe(join(testSessionPath, testInstanceId));
    });

    it('should handle empty session path', () => {
      const handler = new AuthHandler('', testInstanceId);
      const result = handler.getAuthPath();
      expect(result).toBe(join('', testInstanceId));
    });

    it('should handle empty instance ID', () => {
      const handler = new AuthHandler(testSessionPath, '');
      const result = handler.getAuthPath();
      expect(result).toBe(join(testSessionPath, ''));
    });

    it('should handle special characters in instance ID', () => {
      const handler = new AuthHandler(testSessionPath, 'test-instance-123');
      const result = handler.getAuthPath();
      expect(result).toBe(join(testSessionPath, 'test-instance-123'));
    });

    it('should handle nested paths', () => {
      const handler = new AuthHandler('./sessions/subdir', testInstanceId);
      const result = handler.getAuthPath();
      expect(result).toBe(join('./sessions/subdir', testInstanceId));
    });
  });

  describe('initialize', () => {
    it('should call useMultiFileAuthState with correct path', async () => {
      const handler = new AuthHandler(testSessionPath, testInstanceId);
      await handler.initialize();

      expect(mockUseMultiFileAuthState).toHaveBeenCalledTimes(1);
      expect(mockUseMultiFileAuthState).toHaveBeenCalledWith(join(testSessionPath, testInstanceId));
    });

    it('should return the auth state from Baileys', async () => {
      const mockState = { creds: {}, keys: {} };
      const mockSaveCreds = jest.fn();

      mockUseMultiFileAuthState.mockResolvedValue({
        state: mockState,
        saveCreds: mockSaveCreds,
      });

      const handler = new AuthHandler(testSessionPath, testInstanceId);
      const result = await handler.initialize();

      expect(result).toBeDefined();
      expect(result.state).toBe(mockState);
      expect(result.saveCreds).toBe(mockSaveCreds);
    });

    it('should handle multiple instances with different paths', async () => {
      const handler1 = new AuthHandler(testSessionPath, 'instance-1');
      const handler2 = new AuthHandler(testSessionPath, 'instance-2');

      await handler1.initialize();
      await handler2.initialize();

      expect(mockUseMultiFileAuthState).toHaveBeenCalledTimes(2);
      expect(mockUseMultiFileAuthState).toHaveBeenNthCalledWith(1, join(testSessionPath, 'instance-1'));
      expect(mockUseMultiFileAuthState).toHaveBeenNthCalledWith(2, join(testSessionPath, 'instance-2'));
    });

    it('should handle Baileys errors gracefully', async () => {
      const handler = new AuthHandler(testSessionPath, testInstanceId);
      mockUseMultiFileAuthState.mockRejectedValue(new Error('Auth failed'));

      await expect(handler.initialize()).rejects.toThrow('Auth failed');
    });
  });
});
