// Listen to popup.js messages (AUTOFILL request)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "AUTOFILL") {
    window.postMessage({ __autofill__: true, student: msg.student }, "*");
  }
});

// Bridge page → background
window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (!event.data || !event.data.__studentFilled__) return;

  // Relay to background
  chrome.runtime.sendMessage({ type: "STUDENT_SUBMITTED", student: event.data.student });
});
