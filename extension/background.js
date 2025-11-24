const DEFAULT_CONFIG = {
  backendUrl: "http://localhost:8000",
  autoDraftOpenEnded: true
};

chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get(["backendUrl", "autoDraftOpenEnded"]);
  const updates = {};
  if (!existing.backendUrl) {
    updates.backendUrl = DEFAULT_CONFIG.backendUrl;
  }
  if (existing.autoDraftOpenEnded === undefined) {
    updates.autoDraftOpenEnded = DEFAULT_CONFIG.autoDraftOpenEnded;
  }
  if (Object.keys(updates).length > 0) {
    await chrome.storage.sync.set(updates);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "get-config") {
    chrome.storage.sync
      .get(["backendUrl", "autoDraftOpenEnded"])
      .then((config) => sendResponse({ ...DEFAULT_CONFIG, ...config }));
    return true; // async
  }
});
