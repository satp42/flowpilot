// Content script for Workflow Recorder

console.log('Content script ready');

// Generate a unique case ID for this browsing session
const caseId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// Function to get the most accurate and useful selector for an element
function getElementSelector(element: HTMLElement): string {
  // Try id first as it's most specific
  if (element.id) {
    return `#${element.id}`;
  }
  
  // Try specific attributes that often identify elements
  if (element.getAttribute('data-testid')) {
    return `[data-testid="${element.getAttribute('data-testid')}"]`;
  }
  
  // Get element with class
  if (element.className && typeof element.className === 'string' && element.className.trim() !== '') {
    const classes = element.className.split(' ').filter(c => c.trim() !== '');
    if (classes.length > 0) {
      return `${element.tagName.toLowerCase()}.${classes.join('.')}`;
    }
  }
  
  // Fallback to tag name and position
  let position = 0;
  let sibling = element;
  while (sibling.previousElementSibling) {
    sibling = sibling.previousElementSibling as HTMLElement;
    position++;
  }
  
  return `${element.tagName.toLowerCase()}:nth-child(${position + 1})`;
}

// Create event object and send it to the service worker
function handleClick(event: MouseEvent): void {
  // Ignore right-clicks and modified clicks
  if (event.button !== 0 || event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
    return;
  }
  
  const target = event.target as HTMLElement;
  if (!target) return;
  
  // Build the event object
  const eventObj = {
    caseId: caseId,
    activity: `click ${getElementSelector(target)}`,
    ts: Date.now(),
    attributes: {
      url: window.location.href,
      title: document.title,
      visible_text: target.textContent?.trim().substring(0, 100) || '',
      tag: target.tagName.toLowerCase()
    }
  };
  
  console.log('Captured click event:', eventObj);
  
  // Send event to service worker
  try {
    chrome.runtime.sendMessage(eventObj);
  } catch (err) {
    console.error('Failed to send event to service worker:', err);
  }
}

// Add event listener for clicks - use capture phase to catch events before they're handled
document.addEventListener('click', handleClick, true);

// This will be expanded in further tasks to capture more events 