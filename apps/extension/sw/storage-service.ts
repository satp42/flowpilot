// Storage service that provides a consistent interface for storing events
// Uses chrome.storage.local which is recommended for Chrome extensions

export interface EventRecord {
  caseId: string;
  activity: string;
  ts: number;
  attributes?: {
    url?: string;
    title?: string;
    visible_text?: string;
    tag?: string;
    [key: string]: any;
  };
}

// The key used to store events in chrome.storage.local
const EVENTS_KEY = 'workflow_recorder_events';

export class StorageService {
  // Initialize the storage with optional initial data
  static async init(): Promise<StorageService> {
    console.log('Initializing storage service...');
    const service = new StorageService();
    try {
      // Make sure we have an array to store events
      const data = await chrome.storage.local.get(EVENTS_KEY);
      if (!data[EVENTS_KEY]) {
        await chrome.storage.local.set({ [EVENTS_KEY]: [] });
        console.log('Initialized empty events array in chrome.storage.local');
      } else {
        console.log(`Found ${data[EVENTS_KEY].length} existing events in storage`);
      }
    } catch (error) {
      console.error('Error initializing storage:', error);
      // Create an empty array if storage fails
      await chrome.storage.local.set({ [EVENTS_KEY]: [] });
    }
    return service;
  }

  // Add a new event to storage
  async addEvent(event: EventRecord): Promise<void> {
    try {
      console.log('Adding event to storage:', event);
      
      // Get current events
      const data = await chrome.storage.local.get(EVENTS_KEY);
      const events: EventRecord[] = data[EVENTS_KEY] || [];
      
      // Add the new event
      events.push({
        ...event,
        // Ensure each event has the required fields
        caseId: event.caseId,
        activity: event.activity,
        ts: event.ts || Date.now()
      });
      
      // Store updated events
      await chrome.storage.local.set({ [EVENTS_KEY]: events });
      console.log('Event added successfully, total events:', events.length);
      
      // Log storage usage for debugging
      const bytesInUse = await chrome.storage.local.getBytesInUse(EVENTS_KEY);
      console.log(`Storage usage: ${bytesInUse} bytes`);
    } catch (error) {
      console.error('Error adding event to storage:', error);
      throw error;
    }
  }

  // Get all events from storage
  async getAllEvents(): Promise<EventRecord[]> {
    try {
      const data = await chrome.storage.local.get(EVENTS_KEY);
      return data[EVENTS_KEY] || [];
    } catch (error) {
      console.error('Error getting events from storage:', error);
      return [];
    }
  }

  // Get events by case ID
  async getEventsByCaseId(caseId: string): Promise<EventRecord[]> {
    try {
      const allEvents = await this.getAllEvents();
      return allEvents.filter(event => event.caseId === caseId);
    } catch (error) {
      console.error(`Error getting events for case ${caseId}:`, error);
      return [];
    }
  }

  // Clear all events from storage
  async clearEvents(): Promise<void> {
    try {
      await chrome.storage.local.set({ [EVENTS_KEY]: [] });
      console.log('All events cleared from storage');
    } catch (error) {
      console.error('Error clearing events from storage:', error);
      throw error;
    }
  }

  // Export events to XES format (placeholder for future implementation)
  async exportToXES(): Promise<string> {
    const events = await this.getAllEvents();
    // Will implement XES conversion later
    return JSON.stringify(events);
  }
} 