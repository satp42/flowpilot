/**
 * @jest-environment jsdom
 */

// Import the StorageService and types
import { StorageService, EventRecord } from './storage-service';

// Define types for our test mocks
interface StorageServiceMock {
  addEvent: jest.Mock;
  getAllEvents: jest.Mock;
  getEventsByCaseId: jest.Mock;
  clearEvents: jest.Mock;
}

// Define type for message listener
type MessageListener = (
  message: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => boolean | void;

// Mock the StorageService
jest.mock('./storage-service', () => {
  // Create mock function
  const initMock = jest.fn().mockResolvedValue({
    addEvent: jest.fn().mockResolvedValue(undefined),
    getAllEvents: jest.fn().mockResolvedValue([]),
    getEventsByCaseId: jest.fn().mockResolvedValue([]),
    clearEvents: jest.fn().mockResolvedValue(undefined)
  });
  
  return {
    StorageService: {
      init: initMock
    },
    EventRecord: {}
  };
});

// Mock Chrome API
global.chrome = {
  runtime: {
    onMessage: {
      addListener: jest.fn()
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
      get: jest.fn().mockResolvedValue({}),
      set: jest.fn().mockResolvedValue(undefined),
      getBytesInUse: jest.fn().mockResolvedValue(0)
    }
  }
} as any;

describe('Background Service Worker', () => {
  let messageListener: MessageListener;
  let storageServiceMock: StorageServiceMock;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Reset our mocked StorageService instance
    storageServiceMock = {
      addEvent: jest.fn().mockResolvedValue(undefined),
      getAllEvents: jest.fn().mockResolvedValue([]),
      getEventsByCaseId: jest.fn().mockResolvedValue([]),
      clearEvents: jest.fn().mockResolvedValue(undefined)
    };
    
    // Update the init mock to return our instance
    (StorageService.init as jest.Mock).mockResolvedValue(storageServiceMock);
    
    // Capture the message listener
    chrome.runtime.onMessage.addListener = jest.fn((listener) => {
      messageListener = listener;
    });
    
    // Import the background script which will register listeners
    jest.isolateModules(() => {
      require('./background');
    });
  });
  
  it('should initialize StorageService on startup', () => {
    // Verify StorageService.init was called
    expect(StorageService.init).toHaveBeenCalled();
  });
  
  it('should initialize StorageService on installation', async () => {
    // We need to re-setup the entire test environment for this specific test
    
    // First clear all the mocks
    jest.clearAllMocks();
    
    // Create our storage service mock with a promise that we can control
    let resolveStoragePromise: (value: any) => void;
    const storagePromise = new Promise(resolve => {
      resolveStoragePromise = resolve;
    });
    
    // Mock StorageService.init to track when it's called and allow us to resolve it manually
    (StorageService.init as jest.Mock).mockImplementation(() => {
      // When init is called, resolve our promise with the mock service
      setTimeout(() => resolveStoragePromise(storageServiceMock), 10);
      return storagePromise;
    });
    
    // Create a fresh mock for onInstalled.addListener
    const addListenerMock = jest.fn();
    
    // Replace the chrome.runtime.onInstalled.addListener with our fresh mock
    chrome.runtime.onInstalled.addListener = addListenerMock;
    
    // Re-import the background script which will register the listener
    jest.isolateModules(() => {
      require('./background');
    });
    
    // Verify the listener was registered 
    expect(addListenerMock).toHaveBeenCalled();
    
    // Reset the init mock to verify it's called during installation
    (StorageService.init as jest.Mock).mockClear();
    
    // Get the callback directly from the mock calls
    const callback = addListenerMock.mock.calls[0][0];
    
    // Now trigger the installation callback
    // Call the function with a simple object that matches the expected structure
    callback({ reason: 'install', previousVersion: '' });
    
    // Wait a small amount of time for any async operations in the callback to start
    await new Promise(resolve => setTimeout(resolve, 50));
      
    // Now we should see StorageService.init was called
    expect(StorageService.init).toHaveBeenCalled();
  }, 10000); // Add timeout as jest option
  
  it('should save events to storage when received from content script', async () => {
    // Mock that StorageService is initialized
    // Reset previous mock and create a new one that tracks when it's called
    (StorageService.init as jest.Mock).mockClear();
    
    // Create a promise to track when sendResponse is called
    let resolveSendResponsePromise: (value: unknown) => void;
    const sendResponsePromise = new Promise(resolve => {
      resolveSendResponsePromise = resolve;
    });
    
    // Create a sample event
    const event = {
      caseId: 'test-case',
      activity: 'click #button',
      ts: Date.now(),
      attributes: {
        url: 'https://example.com'
      }
    };
    
    // Mock sendResponse function that resolves our promise when called
    const sendResponse = jest.fn((...args) => {
      resolveSendResponsePromise(args);
      return true;
    });
    
    // Setup the StorageService.init to return our mock immediately
    (StorageService.init as jest.Mock).mockResolvedValue(storageServiceMock);
    
    // Create a complete chrome.tabs.Tab mock
    const mockTab: chrome.tabs.Tab = {
      id: 1,
      url: 'https://example.com',
      index: 0,
      pinned: false,
      highlighted: false,
      windowId: 1,
      active: true,
      incognito: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1
    };
    
    // Call the message listener with our sample event
    messageListener(event, { tab: mockTab }, sendResponse);
    
    // Wait for sendResponse to be called, which indicates the async process is complete
    await sendResponsePromise;
    
    // Verify addEvent was called with our event
    expect(storageServiceMock.addEvent).toHaveBeenCalledWith(expect.objectContaining({
      caseId: event.caseId,
      activity: event.activity,
      ts: event.ts
    }));
    
    // Verify the sendResponse callback was called with success
    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
      status: 'saved'
    }));
  });
  
  it('should return an error for invalid event data', () => {
    // Create an invalid event (missing required fields)
    const invalidEvent = {
      // Missing caseId, activity, and ts
      someOtherField: 'value'
    };
    
    // Mock sendResponse function
    const sendResponse = jest.fn();
    
    // Create a basic mock Tab
    const mockTab: chrome.tabs.Tab = {
      id: 1,
      index: 0,
      pinned: false,
      highlighted: false,
      windowId: 1,
      active: true,
      incognito: false,
      selected: false,
      discarded: false,
      autoDiscardable: true,
      groupId: -1
    };
    
    // Call the message listener with our invalid event
    messageListener(invalidEvent, { tab: mockTab }, sendResponse);
    
    // Verify addEvent was NOT called
    expect(storageServiceMock.addEvent).not.toHaveBeenCalled();
    
    // Verify the sendResponse callback was called with error
    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
      error: 'Invalid event data'
    }));
  });
}); 