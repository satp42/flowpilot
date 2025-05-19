// Background Service Worker for Workflow Recorder
import { StorageService, EventRecord } from './storage-service';

console.log('SW ready');

// Store the StorageService instance once initialized
let storageService: StorageService | null = null;

// Initialize the storage service when the service worker starts
StorageService.init()
  .then(service => {
    console.log('Storage service initialized successfully');
    storageService = service;
    
    // Log storage info
    return service.getAllEvents();
  })
  .then(events => {
    console.log(`Loaded ${events.length} events from storage`);
  })
  .catch(err => console.error('Failed to initialize storage service:', err));

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
  
  // Initialize storage on installation as well
  if (!storageService) {
    StorageService.init()
      .then(service => {
        console.log('Storage service initialized on installation');
        storageService = service;
      })
      .catch(err => console.error('Failed to initialize storage service on installation:', err));
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received event from content script:', message);
  console.log('From tab:', sender.tab?.id, sender.tab?.url);
  
  // Persist the event to storage
  if (message && message.caseId && message.activity && message.ts) {
    const event: EventRecord = {
      caseId: message.caseId,
      activity: message.activity,
      ts: message.ts,
      attributes: message.attributes || {}
    };
    
    // Make sure we have a storage service
    const initAndStore = async () => {
      try {
        // Initialize storage service if not already initialized
        if (!storageService) {
          console.log('Storage service not initialized, initializing now...');
          storageService = await StorageService.init();
        }
        
        // Add the event to storage
        await storageService.addEvent(event);
        console.log('Event saved to storage');
        sendResponse({ status: 'saved' });
      } catch (err) {
        console.error('Failed to save event to storage:', err);
        sendResponse({ status: 'error', error: err instanceof Error ? err.message : String(err) });
      }
    };
    
    // Start the async process
    initAndStore();
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
  
  sendResponse({ status: 'error', error: 'Invalid event data' });
  return true;
});

// Keep service worker alive
chrome.runtime.onConnect.addListener(port => {
  console.log('Port connected:', port.name);
}); 