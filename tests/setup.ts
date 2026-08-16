/**
 * Global Test Setup
 * Runs before all tests
 */

import { beforeAll, afterAll, afterEach } from 'vitest';

/**
 * Mock environment variables
 */
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

/**
 * Global test utilities
 */
export const testUtils = {
  /**
   * Generate mock IDs
   */
  generateId: (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,

  /**
   * Wait for condition
   */
  waitFor: async (condition: () => boolean, timeout = 5000) => {
    const start = Date.now();
    while (!condition()) {
      if (Date.now() - start > timeout) {
        throw new Error('Timeout waiting for condition');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  },

  /**
   * Mock datetime for consistent testing
   */
  mockDate: (dateString: string) => {
    const date = new Date(dateString);
    const now = Date.now;
    Date.now = () => date.getTime();
    return () => {
      Date.now = now;
    };
  },
};

/**
 * Global hooks
 */
beforeAll(() => {
  console.log('🧪 Starting test suite');
});

afterEach(() => {
  // Cleanup after each test
  vi.clearAllMocks();
});

afterAll(() => {
  console.log('✅ Test suite completed');
});

// Suppress console errors in tests unless needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
