const STATE = {
  backendUrl: null,
  resume: null,
  qaCache: {}
};

let INITIALIZED = false;

const BUTTON_ID = "job-app-filler-button";

async function getConfig() {
  const fromStorage = await chrome.storage.sync.get(["backendUrl", "autoDraftOpenEnded"]);
  const backendUrl = (fromStorage.backendUrl || "http://localhost:8000").replace(/\/$/, "");
  const autoDraftOpenEnded = fromStorage.autoDraftOpenEnded !== false;
  return { backendUrl, autoDraftOpenEnded };
}

function ensureButton() {
  if (document.getElementById(BUTTON_ID)) return;
  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.textContent = "Auto-Fill";
  btn.style.position = "fixed";
  btn.style.bottom = "20px";
  btn.style.right = "20px";
  btn.style.zIndex = 999999;
  btn.style.padding = "12px 16px";
  btn.style.borderRadius = "14px";
  btn.style.border = "none";
  btn.style.boxShadow = "0 10px 30px rgba(0,0,0,0.18)";
  btn.style.background = "linear-gradient(135deg, #66b3ff, #6f7cff)";
  btn.style.color = "#0c0f1f";
  btn.style.fontWeight = "700";
  btn.style.cursor = "pointer";
  btn.style.fontFamily = "Inter, 'Segoe UI', system-ui, sans-serif";
  btn.addEventListener("click", handleAutoFill);
  document.body.appendChild(btn);
}

async function fetchResume() {
  if (STATE.resume) return STATE.resume;
  if (!STATE.backendUrl) return null;
  try {
    const res = await fetch(`${STATE.backendUrl}/resume`);
    if (!res.ok) throw new Error("resume missing");
    STATE.resume = await res.json();
    return STATE.resume;
  } catch (_err) {
    return null;
  }
}

function getLabelText(el) {
  if (!el) return "";
  const id = el.id ? `[for="${el.id}"]` : null;
  if (id) {
    const label = document.querySelector(`label${id}`);
    if (label) return label.innerText.trim();
  }
  if (el.closest("label")) {
    return el.closest("label").innerText.trim();
  }
  const aria = el.getAttribute?.("aria-label") || el.placeholder || "";
  if (aria) return aria.trim();
  const legend = el.closest?.("fieldset")?.querySelector("legend");
  if (legend) return legend.innerText.trim();
  const prevLabel = el.parentElement?.querySelector?.("label");
  if (prevLabel) return prevLabel.innerText.trim();
  return el.name || el.id || "";
}

function getQuestionText(el) {
  if (!el) return "";
  const direct = getLabelText(el);
  if (direct) return direct;
  const legend = el.closest?.("fieldset")?.querySelector("legend");
  if (legend) return legend.innerText.trim();
  const heading = el.closest?.(".ashby-application-form-field-entry, .question, .form-group")
    ?.querySelector("label, .question-title, [class*='question-title'], h1, h2, h3, h4, h5, h6");
  if (heading && heading.innerText) return heading.innerText.trim();
  return getLabelText(el);
}

function inferContactValue(labelText, resume) {
  if (!resume) return null;
  const label = labelText.toLowerCase();
  
  // Handle name fields with priority order
  if (label.includes("legal first name") || label.includes("legal first")) {
    const first = (resume.full_name || "").split(" ").filter(Boolean)[0];
    return first || "";
  }
  if (label.includes("legal last name") || label.includes("legal last")) {
    const parts = (resume.full_name || "").split(" ").filter(Boolean);
    const last = parts.length > 1 ? parts[parts.length - 1] : "";
    return last || "";
  }
  if (label.includes("first name") || label.includes("given name") || label.includes("forename")) {
    const first = (resume.full_name || "").split(" ").filter(Boolean)[0];
    return first || "";
  }
  if (label.includes("last name") || label.includes("surname") || label.includes("family name")) {
    const parts = (resume.full_name || "").split(" ").filter(Boolean);
    const last = parts.length > 1 ? parts[parts.length - 1] : "";
    return last || "";
  }
  if (label.includes("preferred name")) return resume.full_name || "";
  if (label.includes("full name") || label.includes("complete name")) return resume.full_name || "";
  if (label.includes("name") && !label.includes("user") && !label.includes("file")) {
    // Generic "name" field - prefer full name
    return resume.full_name || "";
  }
  
  // Other contact info
  if (label.includes("email")) return resume.email || "";
  if (label.includes("phone")) return resume.phone || "";
  if (label.includes("city")) {
    // Try to extract city from resume location or return null to use stored answer
    const location = resume.location || "";
    if (location) {
      // If location contains a comma, take the first part (usually city)
      const parts = location.split(",");
      return parts[0].trim();
    }
    return null; // Let it fall through to stored answers
  }
  if (label.includes("linkedin")) return resume.linkedin || resume.links?.linkedin || "";
  if (label.includes("github")) return resume.github || resume.links?.github || "";
  if (label.includes("address") || (label.includes("location") && !label.includes("city")))
    return resume.location || "";
  if (label.includes("education")) return (resume.education || []).join("; ");
  if (label.includes("experience")) return (resume.experience || []).join("; ");
  if (label.includes("skill")) return (resume.skills || []).join(", ");
  return null;
}

function isClosedField(field) {
  const type = (field.type || "").toLowerCase();
  return ["radio", "checkbox", "select-one", "select-multiple"].includes(type);
}

function isOpenEnded(field) {
  const type = (field.type || "").toLowerCase();
  return field.tagName === "TEXTAREA" || type === "textarea";
}

function detectIntent(text) {
  const t = (text || "").toLowerCase();
  if (!t) return null;
  
  // Handle name fields with specific order (most specific first)
  if (t.includes("legal first name") || t.includes("legal first")) return "legal-first-name";
  if (t.includes("legal last name") || t.includes("legal last")) return "legal-last-name";
  if (t.includes("first name") || t.includes("given name") || t.includes("forename")) return "first-name";
  if (t.includes("last name") || t.includes("surname") || t.includes("family name")) return "last-name";
  if (t.includes("preferred name")) return "preferred-name";
  if (t.includes("full name") || t.includes("your name") || t.includes("complete name")) return "full-name";
  if (t.includes("name") && !t.includes("user") && !t.includes("file")) return "name";
  
  // Other contact info
  if (t.includes("city")) return "city";
  if (t.includes("linkedin")) return "linkedin";
  if (t.includes("github") || t.includes("git hub")) return "github";
  if (t.includes("portfolio")) return "portfolio";
  if (t.includes("website") || t.includes("url")) return "website";
  if (t.includes("phone")) return "phone";
  if (t.includes("email")) return "email";
  
  // Authorization and preferences
  if (t.includes("citizen") || t.includes("work authorization") || t.includes("authorized"))
    return "authorization";
  if (t.includes("visa") || t.includes("sponsor") || t.includes("sponsorship")) return "visa";
  if (t.includes("relocation") || t.includes("remote") || t.includes("hybrid"))
    return "location-preference";
  if (t.includes("how did you hear") || t.includes("hear about us") || t.includes("source")) return "referral-source";
  return null;
}

function gatherChoices(field) {
  if (field.tagName === "SELECT") {
    return Array.from(field.options).map((opt) => opt.textContent?.trim() || opt.value);
  }
  if (field.type === "radio" || field.type === "checkbox") {
    const group = document.querySelectorAll(`input[name="${field.name}"]`);
    return Array.from(group).map((item) => getLabelText(item) || item.value);
  }
  return [];
}

async function lookupClosedAnswer(question, intent = null) {
  const cacheHit = STATE.qaCache[question];
  if (cacheHit) return cacheHit;
  const res = await fetch(`${STATE.backendUrl}/closed-question`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, intent })
  });
  const data = await res.json();
  if (data.found && data.answer) {
    STATE.qaCache[question] = data.answer;
    return data.answer;
  }
  return null;
}

async function storeClosedAnswer(question, answer, choices = [], intent = null) {
  if (!answer) return;
  try {
    const response = await fetch(`${STATE.backendUrl}/closed-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, choices, intent })
    });
    if (!response.ok) {
      console.error(`Failed to save answer for "${question}": HTTP ${response.status}`);
      return;
    }
    const data = await response.json();
    STATE.qaCache[question] = answer;
    if (data.updated) {
      console.log(`✅ Updated answer for "${question}" to "${answer}"`);
    } else {
      console.log(`✅ Saved answer for "${question}": "${answer}"`);
    }
  } catch (err) {
    console.error(`❌ Error saving answer for "${question}":`, err);
  }
}

function setFieldValue(field, value) {
  if (field.tagName === "SELECT") {
    for (const opt of field.options) {
      if (opt.textContent?.trim().toLowerCase() === value.toLowerCase() || opt.value.toLowerCase() === value.toLowerCase()) {
        opt.selected = true;
        field.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    }
    return false;
  }

  if (field.type === "radio" || field.type === "checkbox") {
    const group = document.querySelectorAll(`input[name="${field.name}"]`);
    for (const item of group) {
      const candidate = getLabelText(item) || item.value;
      if (candidate.toLowerCase() === value.toLowerCase()) {
        item.checked = true;
        item.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }
    }
    return false;
  }

  if (field.value) return false;
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}

function chooseClosestChoice(choices, target) {
  const norm = (s) => (s || "").toLowerCase().trim();
  const t = norm(target);
  let best = null;
  choices.forEach((c) => {
    const nc = norm(c);
    if (!nc) return;
    if (nc.includes("company") && (nc.includes("website") || nc.includes("site") || nc.includes("careers"))) {
      best = c;
      return;
    }
    if (!best && nc.includes("website")) best = c;
  });
  return best;
}

function isChoiceButton(btn) {
  if (!btn || btn.tagName !== "BUTTON") return false;
  const type = (btn.type || "button").toLowerCase();
  if (type === "submit" || type === "reset") return false;
  const text = (btn.textContent || "").trim();
  if (!text) return false;
  return true;
}

function getButtonGroups() {
  const buttons = Array.from(document.querySelectorAll("button")).filter(isChoiceButton);
  const groups = new Map();
  buttons.forEach((btn) => {
    const container =
      btn.closest(".ashby-application-form-field-entry") ||
      btn.closest("[role='group']") ||
      btn.closest(".form-group, .question, .field") ||
      btn.parentElement;
    const question = getQuestionText(container || btn);
    if (!question) return;
    const key = container || btn;
    if (!groups.has(key)) {
      groups.set(key, { question, buttons: [], container: container || btn });
    }
    groups.get(key).buttons.push(btn);
  });
  return Array.from(groups.values());
}

function setButtonGroupValue(group, answer) {
  if (!answer) return false;
  const target = group.buttons.find((b) => (b.textContent || "").trim().toLowerCase() === answer.toLowerCase());
  if (target) {
    target.click();
    target.dataset.lastClicked = "1";
    return true;
  }
  return false;
}

function attachButtonListeners(group) {
  group.buttons.forEach((btn) => {
    if (btn.dataset.qaListener === "1") return;
    btn.dataset.qaListener = "1";
    btn.addEventListener("click", () => {
      const answer = (btn.textContent || "").trim();
      btn.dataset.lastClicked = "1";
      storeClosedAnswer(
        group.question,
        answer,
        group.buttons.map((b) => b.textContent?.trim() || ""),
        detectIntent(group.question)
      );
    });
  });
}

function initButtonCapture() {
  const buttonGroups = getButtonGroups();
  buttonGroups.forEach((group) => attachButtonListeners(group));
}

function detectSelectedButton(group) {
  const preferredClasses = ["active", "selected", "is-selected", "chosen", "checked"];
  const byClass = group.buttons.find((b) => preferredClasses.some((cls) => b.classList.contains(cls)));
  if (byClass) return byClass;
  const aria = group.buttons.find((b) => b.getAttribute("aria-pressed") === "true");
  if (aria) return aria;
  const dataSelected = group.buttons.find(
    (b) => b.dataset.selected === "true" || b.dataset.state === "selected"
  );
  if (dataSelected) return dataSelected;
  if (group.container) {
    const pressed = group.container.querySelector("[aria-pressed='true'], [data-state='on']");
    if (pressed) return pressed;
  }
  const last = group.buttons.find((b) => b.dataset.lastClicked === "1");
  if (last) return last;
  return null;
}

function attachClosedListener(field, question, choices) {
  if (field.dataset.qaListener === "1") return;
  const handler = (event) => {
    const target = event.target;
    let answer = "";
    if (target.tagName === "SELECT") {
      answer = target.options[target.selectedIndex]?.textContent?.trim() || target.value;
    } else if (target.type === "radio" || target.type === "checkbox") {
      const label = getLabelText(target);
      answer = label || target.value;
    }
    storeClosedAnswer(question, answer, choices, detectIntent(question));
  };
  field.addEventListener("change", handler);
  if (field.tagName === "SELECT") {
    field.dataset.qaListener = "1";
  } else {
    document.querySelectorAll(`input[name="${field.name}"]`).forEach((el) => {
      el.dataset.qaListener = "1";
      el.addEventListener("change", handler);
    });
  }
}

async function handleOpenEnded(field, question, config) {
  if (!config.autoDraftOpenEnded || field.value.trim()) return;
  const resumeSummary = STATE.resume?.summary || "";
  const jobContext = {
    url: window.location.href,
    role: document.title,
    company: window.location.hostname
  };
  try {
    const res = await fetch(`${STATE.backendUrl}/open-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, job_context: jobContext, resume_summary: resumeSummary })
    });
    const data = await res.json();
    if (data.draft) {
      setFieldValue(field, data.draft);
    }
  } catch (_err) {
    // ignore failures; user can still type manually
  }
}

async function handleAutoFill() {
  const config = await getConfig();
  STATE.backendUrl = config.backendUrl;
  const resume = await fetchResume();
  const fields = Array.from(document.querySelectorAll("input, textarea, select")).filter(
    (el) => !el.disabled && el.offsetParent !== null
  );

  for (const field of fields) {
    const question = getQuestionText(field);
    const intent = detectIntent(question);
    const choices = gatherChoices(field);

    if (isClosedField(field)) {
      attachClosedListener(field, question, choices);
      try {
        const answer = await lookupClosedAnswer(question, intent);
        if (answer) setFieldValue(field, answer);
        else if (intent === "referral-source" && choices.length) {
          const pick = chooseClosestChoice(choices, "company website");
          if (pick) {
            setFieldValue(field, pick);
            await storeClosedAnswer(question, pick, choices, intent);
          }
        }
      } catch (_err) {
        // ignore lookup failure
      }
      continue;
    }

    const contactValue = inferContactValue(question, resume);
    if (contactValue) {
      setFieldValue(field, contactValue);
      continue;
    }

    if (field.tagName === "INPUT") {
      try {
        const stored = await lookupClosedAnswer(question, intent);
        if (stored) {
          setFieldValue(field, stored);
          continue;
        }
      } catch (_err) {
        // ignore lookup failure
      }
      // If intent is known, prefer stored answers to avoid AI drafts
      if (intent) {
        const stored = await lookupClosedAnswer(question, intent);
        if (stored) {
          setFieldValue(field, stored);
          continue;
        }
      }
    }

    if (isOpenEnded(field)) {
      // For known contact/profile intents in textareas, reuse stored answers and skip Gemini
      if (intent) {
        try {
          const stored = await lookupClosedAnswer(question, intent);
          if (stored) {
            setFieldValue(field, stored);
            continue;
          }
        } catch (_err) {
          // ignore
        }
      }
      await handleOpenEnded(field, question, config);
    }
  }

  const buttonGroups = getButtonGroups();
  for (const group of buttonGroups) {
    attachButtonListeners(group);
    try {
      const answer = await lookupClosedAnswer(group.question, detectIntent(group.question));
      const intent = detectIntent(group.question);
      if (answer) {
        setButtonGroupValue(group, answer);
      } else if (intent === "referral-source") {
        const pick = chooseClosestChoice(
          group.buttons.map((b) => b.textContent?.trim() || ""),
          "company website"
        );
        if (pick) {
          setButtonGroupValue(group, pick);
          await storeClosedAnswer(group.question, pick, group.buttons.map((b) => b.textContent?.trim() || ""), intent);
        }
      }
    } catch (_err) {
      // ignore lookup failure
    }
  }
}

function initClosedCapture() {
  const fields = Array.from(document.querySelectorAll("input, select")).filter(isClosedField);
  fields.forEach((field) => {
    const question = getQuestionText(field);
    const choices = gatherChoices(field);
    attachClosedListener(field, question, choices);
  });
}

function init() {
  if (INITIALIZED) return;
  INITIALIZED = true;
  ensureButton();
  initClosedCapture();
  initButtonCapture();
}

if (document.readyState === "complete" || document.readyState === "interactive") {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init);
}

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message?.type === "trigger-auto-fill") {
    handleAutoFill();
  }
  if (message?.type === "trigger-save-answers") {
    saveManualAnswers();
  }
});

async function saveManualAnswers() {
  const config = await getConfig();
  STATE.backendUrl = config.backendUrl;
  initButtonCapture();
  const fields = Array.from(document.querySelectorAll("input, select, textarea")).filter(
    (el) => !el.disabled && el.offsetParent !== null
  );
  for (const field of fields) {
    const question = getQuestionText(field);
    const intent = detectIntent(question);
    if (isClosedField(field)) {
      const choices = gatherChoices(field);
      let answer = "";
      if (field.tagName === "SELECT") {
        answer = field.options[field.selectedIndex]?.textContent?.trim() || field.value || "";
      } else if (field.type === "radio" || field.type === "checkbox") {
        const group = document.querySelectorAll(`input[name="${field.name}"]`);
        const checked = Array.from(group).find((item) => item.checked);
        if (checked) {
          answer = getLabelText(checked) || checked.value || "";
        }
      }
      if (answer) await storeClosedAnswer(question, answer, choices, intent);
      continue;
    }
    // Save consistent text inputs and textareas if they match known intents (e.g., LinkedIn, phone, city)
    if (field.tagName === "INPUT" || (field.tagName === "TEXTAREA" && intent)) {
      const value = (field.value || "").trim();
      const q = question.toLowerCase();
      const openEndedHints = ["why", "describe", "tell us", "motivation", "cover letter", "essay"];
      if (openEndedHints.some((hint) => q.includes(hint))) continue;
      if (value) await storeClosedAnswer(question, value, [], intent);
    }
  }
  // Also save button-group choices
  const buttonGroups = getButtonGroups();
  for (const group of buttonGroups) {
    const selected = detectSelectedButton(group);
    const answer = (selected && (selected.textContent || "").trim()) || "";
    if (answer) await storeClosedAnswer(group.question, answer, group.buttons.map((b) => b.textContent?.trim() || ""), detectIntent(group.question));
  }
}
