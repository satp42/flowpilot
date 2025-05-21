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
    
    // Add a test event if no events exist
    if (events.length === 0) {
      console.log('Adding a test event for debugging');
      storageService?.addEvent({
        caseId: 'test-session-1',
        activity: 'Click: Test Button',
        ts: Date.now(),
        attributes: {
          url: 'https://example.com/test',
          title: 'Test Page',
          visible_text: 'Test Button',
          tag: 'button'
        }
      });
    }
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

// Function to flush events to a CSV file and trigger download
async function flushEvents(): Promise<void> {
  console.log('Flushing events to CSV...');
  try {
    // Make sure the storage service is initialized
    if (!storageService) {
      console.log('Storage service not initialized, initializing now...');
      storageService = await StorageService.init();
    }
    
    // Get events in CSV format
    const csvContent = await storageService.exportToCSV();
    
    // Create a data URL from the CSV content
    const dataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
    
    // Use chrome.downloads API to download the file
    chrome.downloads.download({
      url: dataUrl,
      filename: 'log.xes.csv',
      saveAs: false
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error('Error downloading CSV:', chrome.runtime.lastError);
      } else {
        console.log('CSV download started with ID:', downloadId);
      }
    });
    
  } catch (error) {
    console.error('Error flushing events to CSV:', error);
    throw error;
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);
  
  // Handle event recording
  if (message && message.caseId && message.activity && message.ts) {
    console.log('Received event from content script:', message);
    console.log('From tab:', sender.tab?.id, sender.tab?.url);
    
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
  
  // Handle flush events command
  if (message && message.command === 'flushEvents') {
    const doFlush = async () => {
      try {
        await flushEvents();
        sendResponse({ status: 'success', message: 'Events flushed to CSV' });
      } catch (err) {
        sendResponse({ status: 'error', error: err instanceof Error ? err.message : String(err) });
      }
    };
    
    doFlush();
    return true;
  }
  
  sendResponse({ status: 'error', error: 'Invalid message data' });
  return true;
});

// Keep service worker alive
chrome.runtime.onConnect.addListener(port => {
  console.log('Port connected:', port.name);
}); 