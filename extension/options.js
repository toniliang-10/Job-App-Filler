const backendUrlInput = document.getElementById("backendUrl");
const autoDraftCheckbox = document.getElementById("autoDraft");
const statusEl = document.getElementById("status");

async function loadSettings() {
  const { backendUrl, autoDraftOpenEnded } = await chrome.storage.sync.get([
    "backendUrl",
    "autoDraftOpenEnded"
  ]);
  backendUrlInput.value = backendUrl || "http://localhost:8000";
  autoDraftCheckbox.checked = autoDraftOpenEnded !== false;
}

async function saveSettings() {
  const backendUrl = backendUrlInput.value.trim();
  const autoDraftOpenEnded = autoDraftCheckbox.checked;
  await chrome.storage.sync.set({ backendUrl, autoDraftOpenEnded });
  setStatus("Saved", "ok");
}

async function testConnection() {
  const url = backendUrlInput.value.trim().replace(/\/$/, "");
  setStatus("Testing...");
  try {
    const res = await fetch(`${url}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setStatus(data.status === "ok" ? "Connected" : "Unexpected response", "ok");
  } catch (err) {
    setStatus(`Could not reach backend (${err.message})`, "error");
  }
}

function setStatus(text, tone = "muted") {
  statusEl.textContent = text;
  statusEl.style.color =
    tone === "ok" ? "#66b3ff" : tone === "error" ? "#ff7a7a" : "#9aa3c2";
}

document.getElementById("saveBtn").addEventListener("click", saveSettings);
document.getElementById("testBtn").addEventListener("click", testConnection);

loadSettings();
