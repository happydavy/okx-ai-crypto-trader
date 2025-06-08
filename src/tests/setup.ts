
import { vi } from 'vitest';

// Mock crypto-js for signature generation
vi.mock('crypto-js', () => ({
  HmacSHA256: vi.fn(() => 'mocked-hash'),
  enc: {
    Base64: {
      stringify: vi.fn(() => 'mocked-signature')
    }
  }
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
};
