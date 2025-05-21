// Popup logic for Workflow Recorder
console.log('Popup initialized');

// The key used to store events in chrome.storage.local
const EVENTS_KEY = 'workflow_recorder_events';

// DOM elements
const eventsContainer = document.getElementById('eventsContainer');
const emptyState = document.getElementById('emptyState');
const eventCount = document.getElementById('eventCount');
const refreshBtn = document.getElementById('refreshBtn');
const clearBtn = document.getElementById('clearBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');

// Format a timestamp
function formatTimestamp(ts) {
  const date = new Date(ts);
  return date.toLocaleString();
}

// Load and display events
async function loadEvents() {
  try {
    console.log('Loading events from storage...');
    
    // Get events from storage
    const data = await chrome.storage.local.get(EVENTS_KEY);
    const events = data[EVENTS_KEY] || [];
    
    console.log(`Loaded ${events.length} events`);
    
    // Update event count
    eventCount.textContent = `(${events.length})`;
    
    // Clear the container
    eventsContainer.innerHTML = '';
    
    if (events.length === 0) {
      // Show empty state
      eventsContainer.appendChild(emptyState);
    } else {
      // Sort events by timestamp (newest first)
      events.sort((a, b) => b.ts - a.ts);
      
      // Create event elements
      events.forEach(event => {
        const eventEl = document.createElement('div');
        eventEl.className = 'event-item';
        
        const timeEl = document.createElement('div');
        timeEl.className = 'event-time';
        timeEl.textContent = formatTimestamp(event.ts);
        
        const activityEl = document.createElement('div');
        activityEl.textContent = event.activity;
        
        const urlEl = document.createElement('div');
        urlEl.textContent = event.attributes?.url || 'No URL';
        urlEl.style.fontSize = '12px';
        
        eventEl.appendChild(timeEl);
        eventEl.appendChild(activityEl);
        eventEl.appendChild(urlEl);
        
        eventsContainer.appendChild(eventEl);
      });
    }
  } catch (error) {
    console.error('Error loading events:', error);
    eventsContainer.innerHTML = '<p>Error loading events. Check console for details.</p>';
  }
}

// Clear all events
async function clearEvents() {
  try {
    console.log('Clearing all events...');
    
    await chrome.storage.local.set({ [EVENTS_KEY]: [] });
    
    // Reload events
    loadEvents();
  } catch (error) {
    console.error('Error clearing events:', error);
  }
}

// Export events to CSV
async function exportEventsToCSV() {
  try {
    console.log('Exporting events to CSV...');
    
    // Send message to service worker to trigger flush
    const response = await chrome.runtime.sendMessage({ command: 'flushEvents' });
    
    console.log('Export response:', response);
    
    // Show feedback to user
    if (response.status === 'success') {
      alert('Events exported to CSV successfully!');
    } else {
      alert(`Error exporting events: ${response.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Error exporting events to CSV:', error);
    alert(`Error exporting events: ${error.message || error}`);
  }
}

// Add event listeners
refreshBtn.addEventListener('click', loadEvents);
clearBtn.addEventListener('click', clearEvents);
exportCsvBtn.addEventListener('click', exportEventsToCSV);

// Load events on popup open
loadEvents(); 