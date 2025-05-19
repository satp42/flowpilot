import { openDB, IDBPDatabase } from 'idb';

// Define the event type
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

// Database name and version
export const DB_NAME = 'workflow-recorder-db';
export const DB_VERSION = 1;
export const EVENTS_STORE = 'events';

// Singleton instance to ensure we don't open multiple connections
let dbPromise: Promise<IDBPDatabase> | null = null;

// Initialize the database
export async function initDatabase(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    console.log('Initializing IndexedDB database:', DB_NAME);
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading IndexedDB from version ${oldVersion} to ${newVersion}`);
        
        // Create an object store for events if it doesn't exist
        if (!db.objectStoreNames.contains(EVENTS_STORE)) {
          console.log('Creating events object store');
          const store = db.createObjectStore(EVENTS_STORE, { keyPath: 'id', autoIncrement: true });
          
          // Create indexes for efficient querying
          store.createIndex('caseId', 'caseId');
          store.createIndex('activity', 'activity');
          store.createIndex('ts', 'ts');
          
          console.log('Object store and indexes created successfully');
        } else {
          console.log('Events object store already exists');
        }
      },
      blocked() {
        console.warn('IndexedDB upgrade was blocked');
      },
      blocking() {
        console.warn('This connection is blocking a newer version');
      },
      terminated() {
        console.error('IndexedDB connection was terminated unexpectedly');
        dbPromise = null;
      }
    });
    
    // Force the promise to execute immediately, not lazily
    dbPromise.then(db => {
      console.log('IndexedDB connection established successfully');
      console.log('Database name:', db.name);
      console.log('Database version:', db.version);
      console.log('Object stores:', Array.from(db.objectStoreNames));
      return db;
    }).catch(err => {
      console.error('Error initializing IndexedDB:', err);
      dbPromise = null;
      throw err;
    });
  }
  
  return dbPromise;
}

// Force immediate initialization to avoid lazy loading issues
export function preloadDatabase() {
  return initDatabase().catch(err => {
    console.error('Failed to preload database:', err);
  });
}

// Add a new event to the database
export async function addEvent(event: EventRecord): Promise<IDBValidKey> {
  try {
    const db = await initDatabase();
    console.log('Adding event to IndexedDB:', event);
    const result = await db.add(EVENTS_STORE, event);
    console.log('Event added successfully with ID:', result);
    return result;
  } catch (error) {
    console.error('Error adding event to IndexedDB:', error);
    throw error;
  }
}

// Get all events
export async function getAllEvents(): Promise<EventRecord[]> {
  try {
    const db = await initDatabase();
    const events = await db.getAll(EVENTS_STORE);
    console.log(`Retrieved ${events.length} events from IndexedDB`);
    return events;
  } catch (error) {
    console.error('Error getting all events from IndexedDB:', error);
    throw error;
  }
}

// Get events by case ID
export async function getEventsByCaseId(caseId: string): Promise<EventRecord[]> {
  try {
    const db = await initDatabase();
    const index = db.transaction(EVENTS_STORE).store.index('caseId');
    const events = await index.getAll(caseId);
    console.log(`Retrieved ${events.length} events for case ${caseId}`);
    return events;
  } catch (error) {
    console.error(`Error getting events for case ${caseId}:`, error);
    throw error;
  }
}

// Clear all events
export async function clearEvents(): Promise<void> {
  try {
    const db = await initDatabase();
    await db.clear(EVENTS_STORE);
    console.log('All events cleared from IndexedDB');
  } catch (error) {
    console.error('Error clearing events from IndexedDB:', error);
    throw error;
  }
}

// Example: Export events to XES format (to be implemented later)
export async function exportToXES(): Promise<string> {
  const events = await getAllEvents();
  // We'll implement the XES conversion later
  return JSON.stringify(events);
} 