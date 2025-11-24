const fillBtn = document.getElementById("fillBtn");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");
const optionsLink = document.getElementById("optionsLink");

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) throw new Error("No active tab");
  if (tab.url.startsWith("chrome://") || tab.url.startsWith("edge://") || tab.url.startsWith("about:")) {
    throw new Error("Cannot run on browser pages");
  }
  return tab;
}

async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["contentScript.js"]
    });
  } catch (err) {
    // Ignore if already injected; propagate others
    const msg = String(err || "");
    if (!msg.includes("Cannot access a chrome:// URL") && !msg.includes("Cannot access a chrome-extension://")) {
      throw err;
    }
  }
}

async function sendToPage(type) {
  const tab = await getActiveTab();
  await ensureContentScript(tab.id);
  await chrome.tabs.sendMessage(tab.id, { type });
}

fillBtn.addEventListener("click", async () => {
  statusEl.textContent = "Triggering...";
  try {
    await sendToPage("trigger-auto-fill");
    statusEl.textContent = "Sent. Check the page.";
  } catch (err) {
    statusEl.textContent = "Could not reach page. Reload and try again.";
    console.error(err);
  }
});

saveBtn.addEventListener("click", async () => {
  statusEl.textContent = "Saving...";
  try {
    await sendToPage("trigger-save-answers");
    statusEl.textContent = "Saved answers for this page.";
  } catch (err) {
    statusEl.textContent = "Could not save; reload and try again.";
    console.error(err);
  }
});

optionsLink.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});
