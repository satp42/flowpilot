/**
 * @jest-environment jsdom
 */

// We need to mock the chrome API
// This is already done in our jest.setup.js

describe('Recorder Content Script', () => {
  let eventHandler: any;
  
  // Save the original addEventListener method
  const originalAddEventListener = document.addEventListener;
  
  beforeEach(() => {
    // Clear all mocks and reset DOM
    jest.clearAllMocks();
    document.body.innerHTML = `
      <button id="test-button">Click Me</button>
      <div class="container">
        <a href="#" class="link">Test Link</a>
      </div>
    `;
    
    // Mock addEventListener to capture the event handler
    document.addEventListener = jest.fn((event, handler, options) => {
      if (event === 'click') {
        eventHandler = handler;
      }
      return originalAddEventListener(event, handler, options);
    });
    
    // Import the recorder module, which will register event listeners
    jest.isolateModules(() => {
      require('./recorder');
    });
  });
  
  afterEach(() => {
    // Restore the original addEventListener
    document.addEventListener = originalAddEventListener;
  });
  
  it('should register a click event listener', () => {
    expect(document.addEventListener).toHaveBeenCalledWith('click', expect.any(Function), true);
  });
  
  it('should send a message when a click event occurs', () => {
    // Find and click the test button
    const button = document.getElementById('test-button');
    expect(button).not.toBeNull();
    
    // Simulate a click with our captured handler
    if (eventHandler && button) {
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: button });
      eventHandler(clickEvent);
      
      // Verify that sendMessage was called
      expect(chrome.runtime.sendMessage).toHaveBeenCalled();
      
      // Check the structure of the event object
      const eventObj = (chrome.runtime.sendMessage as jest.Mock).mock.calls[0][0];
      expect(eventObj).toHaveProperty('caseId');
      expect(eventObj).toHaveProperty('activity');
      expect(eventObj).toHaveProperty('ts');
      expect(eventObj).toHaveProperty('attributes');
      
      // Check that the activity contains the correct selector
      expect(eventObj.activity).toContain('#test-button');
    }
  });
  
  it('should generate proper selectors for elements', () => {
    const link = document.querySelector('.link');
    expect(link).not.toBeNull();
    
    if (eventHandler && link) {
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: link });
      eventHandler(clickEvent);
      
      const eventObj = (chrome.runtime.sendMessage as jest.Mock).mock.calls[0][0];
      // Should use the class selector
      expect(eventObj.activity).toContain('.link');
    }
  });
}); 