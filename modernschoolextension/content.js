/**
 * Vidhyam Autofill - Content Script
 * Bridge between the popup (extension context) and the injected script (page context)
 */

// Listen to messages from popup/background (extension context)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'AUTOFILL') {
    // Forward to the injected script via window.postMessage
    window.postMessage(
      {
        __vidhyam_autofill__: true,
        personData: msg.personData,
        personType: msg.personType || 'student',
      },
      '*'
    );
    sendResponse({ success: true });
  }

  if (msg.action === 'PING') {
    sendResponse({ success: true, alive: true });
  }
});

// Listen to messages from the injected script (page context)
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data || !event.data.__vidhyam_filled__) return;

  // Relay to background
  chrome.runtime.sendMessage({
    type: 'AUTOFILL_COMPLETE',
    personType: event.data.personType,
    filledFields: event.data.filledFields,
    totalFields: event.data.totalFields,
  });
});
