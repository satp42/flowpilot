// Required for fake indexeddb
require('fake-indexeddb/auto');

// Add testing library matchers
require('@testing-library/jest-dom');

// Polyfill structuredClone which is missing in Node.js environment
if (typeof structuredClone !== 'function') {
  global.structuredClone = obj => {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Mock Chrome API
global.chrome = {
  runtime: {
    sendMessage: jest.fn().mockImplementation(() => Promise.resolve()),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onInstalled: {
      addListener: jest.fn()
    },
    onConnect: {
      addListener: jest.fn()
    }
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}; 