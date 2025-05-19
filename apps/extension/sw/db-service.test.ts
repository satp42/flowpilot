import { initDatabase, addEvent, getAllEvents, getEventsByCaseId, clearEvents, EventRecord } from './db-service';

describe('Database Service', () => {
  beforeEach(async () => {
    await clearEvents();
  });

  it('should initialize the database successfully', async () => {
    const db = await initDatabase();
    expect(db).toBeDefined();
    expect(db.name).toBe('workflow-recorder-db');
    expect(db.version).toBe(1);
  });

  it('should add an event to the database', async () => {
    const event: EventRecord = {
      caseId: 'test-case-1',
      activity: 'click #button',
      ts: Date.now(),
      attributes: {
        url: 'https://example.com',
        title: 'Example Page',
        visible_text: 'Click me',
        tag: 'button'
      }
    };

    const id = await addEvent(event);
    expect(id).toBeDefined();
    
    const events = await getAllEvents();
    expect(events.length).toBe(1);
    expect(events[0].caseId).toBe('test-case-1');
    expect(events[0].activity).toBe('click #button');
  });

  it('should retrieve events by case ID', async () => {
    // Add events with different case IDs
    await addEvent({
      caseId: 'case-A',
      activity: 'action-1',
      ts: Date.now()
    });
    
    await addEvent({
      caseId: 'case-A',
      activity: 'action-2',
      ts: Date.now() + 1000
    });
    
    await addEvent({
      caseId: 'case-B',
      activity: 'action-3',
      ts: Date.now() + 2000
    });

    // Retrieve events for case-A
    const caseAEvents = await getEventsByCaseId('case-A');
    expect(caseAEvents.length).toBe(2);
    expect(caseAEvents[0].activity).toBe('action-1');
    expect(caseAEvents[1].activity).toBe('action-2');

    // Retrieve events for case-B
    const caseBEvents = await getEventsByCaseId('case-B');
    expect(caseBEvents.length).toBe(1);
    expect(caseBEvents[0].activity).toBe('action-3');
  });

  it('should clear all events from the database', async () => {
    // Add some events
    await addEvent({
      caseId: 'test-case',
      activity: 'action-1',
      ts: Date.now()
    });
    
    await addEvent({
      caseId: 'test-case',
      activity: 'action-2',
      ts: Date.now() + 1000
    });

    // Verify events were added
    let events = await getAllEvents();
    expect(events.length).toBe(2);

    // Clear all events
    await clearEvents();

    // Verify events were cleared
    events = await getAllEvents();
    expect(events.length).toBe(0);
  });
}); 