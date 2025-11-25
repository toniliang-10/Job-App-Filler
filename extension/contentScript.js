const STATE = {
  backendUrl: null,
  resume: null,
  qaCache: {}
};

let INITIALIZED = false;

const BUTTON_ID = "job-app-filler-button";
const NOTIFICATION_ID = "job-app-filler-notification";

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

function showNotification(message, type = "success") {
  // Remove existing notification if any
  const existing = document.getElementById(NOTIFICATION_ID);
  if (existing) {
    existing.remove();
  }

  const notification = document.createElement("div");
  notification.id = NOTIFICATION_ID;
  notification.textContent = message;
  
  // Base styles
  notification.style.position = "fixed";
  notification.style.top = "20px";
  notification.style.right = "20px";
  notification.style.zIndex = 1000000;
  notification.style.padding = "16px 24px";
  notification.style.borderRadius = "12px";
  notification.style.boxShadow = "0 10px 40px rgba(0,0,0,0.25)";
  notification.style.fontFamily = "Inter, 'Segoe UI', system-ui, sans-serif";
  notification.style.fontSize = "14px";
  notification.style.fontWeight = "600";
  notification.style.maxWidth = "400px";
  notification.style.wordWrap = "break-word";
  notification.style.transition = "all 0.3s ease";
  notification.style.opacity = "0";
  notification.style.transform = "translateY(-10px)";
  
  // Type-specific styling
  if (type === "success") {
    notification.style.background = "linear-gradient(135deg, #10b981, #059669)";
    notification.style.color = "#ffffff";
  } else if (type === "error") {
    notification.style.background = "linear-gradient(135deg, #ef4444, #dc2626)";
    notification.style.color = "#ffffff";
  } else if (type === "info") {
    notification.style.background = "linear-gradient(135deg, #3b82f6, #2563eb)";
    notification.style.color = "#ffffff";
  }
  
  document.body.appendChild(notification);
  
  // Trigger fade-in animation
  setTimeout(() => {
    notification.style.opacity = "1";
    notification.style.transform = "translateY(0)";
  }, 10);
  
  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateY(-10px)";
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 4000);
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
  if (label.includes("middle name") || label.includes("middle initial")) {
    // Most resumes don't have middle name, return empty
    return "";
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
  if (label.includes("name") && !label.includes("user") && !label.includes("file") && !label.includes("company")) {
    // Generic "name" field - prefer full name
    return resume.full_name || "";
  }
  
  // Contact info
  if (label.includes("email")) return resume.email || "";
  if (label.includes("phone") || label.includes("mobile") || label.includes("telephone")) return resume.phone || "";
  if (label.includes("city") && !label.includes("citizenship")) {
    // Try to extract city from resume location or return null to use stored answer
    const location = resume.location || "";
    if (location) {
      // If location contains a comma, take the first part (usually city)
      const parts = location.split(",");
      return parts[0].trim();
    }
    return null; // Let it fall through to stored answers
  }
  if (label.includes("state") || label.includes("province")) {
    const location = resume.location || "";
    if (location && location.includes(",")) {
      const parts = location.split(",");
      if (parts.length >= 2) {
        // Return the part after the first comma (usually state)
        return parts[1].trim().split(",")[0].trim();
      }
    }
    return null;
  }
  if (label.includes("country") && !label.includes("phone")) {
    const location = resume.location || "";
    if (location && location.includes(",")) {
      const parts = location.split(",");
      if (parts.length >= 3) {
        // Return the last part (usually country)
        return parts[parts.length - 1].trim();
      }
    }
    return null;
  }
  
  // Social profiles
  if (label.includes("linkedin")) return resume.linkedin || resume.links?.linkedin || "";
  if (label.includes("github")) return resume.github || resume.links?.github || "";
  if (label.includes("portfolio")) return resume.portfolio || resume.links?.portfolio || "";
  if (label.includes("website") || label.includes("personal site")) return resume.website || resume.portfolio || "";
  
  // Education fields
  if (label.includes("university") || label.includes("college") || (label.includes("school") && !label.includes("high"))) {
    return (resume.education || [])[0] || "";
  }
  if (label.includes("major") || label.includes("field of study")) {
    // Try to extract from education array or return null
    return null;
  }
  if (label.includes("degree") && !label.includes("level")) {
    return null;
  }
  
  // Address fields (most resumes don't have detailed address)
  if (label.includes("street address") || label.includes("address line")) return "";
  if (label.includes("apt") || label.includes("apartment") || label.includes("unit")) return "";
  if (label.includes("zip") || label.includes("postal")) return "";
  
  // Generic fallbacks
  if (label.includes("address") || (label.includes("location") && !label.includes("city") && !label.includes("work")))
    return resume.location || "";
  if (label.includes("education") && !label.includes("level")) return (resume.education || []).join("; ");
  if (label.includes("experience") && !label.includes("years")) return (resume.experience || []).join("; ");
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
  if (t.includes("middle name")) return "middle-name";
  if (t.includes("middle initial")) return "middle-initial";
  if (t.includes("suffix") || t.includes("jr") || t.includes("sr") || t.includes("iii")) return "suffix";
  if (t.includes("preferred name")) return "preferred-name";
  if (t.includes("full name") || t.includes("your name") || t.includes("complete name")) return "full-name";
  if (t.includes("name") && !t.includes("user") && !t.includes("file") && !t.includes("company")) return "name";
  
  // Contact info
  if (t.includes("street address") || t.includes("address line 1")) return "street-address";
  if (t.includes("address line 2") || t.includes("apartment") || t.includes("apt") || t.includes("unit")) return "address-line-2";
  if (t.includes("city") && !t.includes("citizenship")) return "city";
  if (t.includes("state") || t.includes("province") || t.includes("region")) return "state";
  if (t.includes("zip") || t.includes("postal code")) return "zip-code";
  if (t.includes("country") && !t.includes("phone")) return "country";
  if (t.includes("phone") || t.includes("mobile") || t.includes("telephone") || t.includes("cell")) return "phone";
  if (t.includes("email")) return "email";
  
  // Social media and web presence
  if (t.includes("linkedin")) return "linkedin";
  if (t.includes("github") || t.includes("git hub")) return "github";
  if (t.includes("portfolio")) return "portfolio";
  if (t.includes("twitter")) return "twitter";
  if (t.includes("website") || (t.includes("personal") && t.includes("site"))) return "website";
  
  // Education
  if (t.includes("university") || t.includes("college") || (t.includes("school") && !t.includes("high school"))) return "university";
  if (t.includes("degree") && !t.includes("level")) return "degree";
  if (t.includes("highest") && (t.includes("education") || t.includes("degree"))) return "education-level";
  if (t.includes("major") || t.includes("field of study") || t.includes("concentration")) return "major";
  if (t.includes("minor")) return "minor";
  if (t.includes("gpa") || t.includes("grade point")) return "gpa";
  if (t.includes("graduation") && (t.includes("date") || t.includes("year"))) return "graduation-date";
  if (t.includes("graduation year")) return "graduation-year";
  
  // Work experience
  if (t.includes("years of experience") || t.includes("professional experience")) return "years-experience";
  if (t.includes("relevant experience")) return "relevant-experience";
  if (t.includes("python") && t.includes("experience")) return "python-experience";
  if (t.includes("javascript") && t.includes("experience")) return "javascript-experience";
  if (t.includes("react") && t.includes("experience")) return "react-experience";
  if (t.includes("node") && t.includes("experience")) return "node-experience";
  if (t.includes("sql") && t.includes("experience")) return "sql-experience";
  if (t.includes("current") && (t.includes("company") || t.includes("employer"))) return "current-company";
  if (t.includes("current") && (t.includes("title") || t.includes("position"))) return "current-title";
  if (t.includes("previous") && (t.includes("company") || t.includes("employer"))) return "previous-company";
  if (t.includes("management experience")) return "management-experience";
  
  // Skills
  if (t.includes("programming") && (t.includes("language") || t.includes("skill"))) return "programming-languages";
  if (t.includes("technical skills")) return "technical-skills";
  if (t.includes("database") && (t.includes("experience") || t.includes("skill"))) return "database-skills";
  if (t.includes("framework") || t.includes("technolog")) return "frameworks";
  if (t.includes("certification")) return "certifications";
  if (t.includes("aws") || t.includes("cloud")) return "cloud-experience";
  
  // Authorization and legal
  if (t.includes("legally authorized") || t.includes("work authorization") || t.includes("authorized to work"))
    return "authorization";
  if (t.includes("visa") || t.includes("sponsor") || t.includes("sponsorship")) return "visa";
  if (t.includes("citizen") && !t.includes("authorization")) return "citizenship";
  if (t.includes("security clearance")) return "security-clearance";
  if (t.includes("felony") || t.includes("convicted")) return "criminal-record";
  if (t.includes("driver") && t.includes("license")) return "drivers-license";
  
  // Work preferences
  if (t.includes("relocation") || t.includes("willing to relocate")) return "relocation";
  if (t.includes("remote") && !t.includes("work location")) return "remote-preference";
  if (t.includes("hybrid") && !t.includes("work location")) return "hybrid-preference";
  if (t.includes("work location") || t.includes("location preference")) return "location-preference";
  if (t.includes("full") && t.includes("time")) return "employment-type-fulltime";
  if (t.includes("part") && t.includes("time")) return "employment-type-parttime";
  if (t.includes("employment type")) return "employment-type";
  
  // Availability and start date
  if (t.includes("start date") || t.includes("earliest") || t.includes("available to start")) return "start-date";
  if (t.includes("notice period")) return "notice-period";
  if (t.includes("availability") || t.includes("available for interview")) return "availability";
  if (t.includes("currently employed")) return "currently-employed";
  
  // Compensation
  if (t.includes("salary") && (t.includes("expectation") || t.includes("desired") || t.includes("expected"))) 
    return "salary-expectation";
  
  // Travel and schedule
  if (t.includes("travel") && (t.includes("willing") || t.includes("percentage") || t.includes("can you"))) 
    return "travel-willingness";
  if (t.includes("work nights") || t.includes("work weekends") || t.includes("overtime")) return "schedule-flexibility";
  if (t.includes("office") && t.includes("per week")) return "office-days";
  
  // Referrals and discovery
  if (t.includes("how did you hear") || t.includes("hear about us") || t.includes("find this job")) 
    return "referral-source";
  if (t.includes("referred by") || t.includes("referral name") || t.includes("employee referral")) 
    return "referral-name";
  if (t.includes("know anyone") || t.includes("employee id")) return "employee-connection";
  
  // Demographics (EEO)
  if (t.includes("veteran")) return "veteran-status";
  if (t.includes("disability")) return "disability-status";
  if (t.includes("gender") && !t.includes("all")) return "gender";
  if (t.includes("race") || t.includes("ethnicity")) return "race-ethnicity";
  if (t.includes("pronoun")) return "pronouns";
  
  // Age and eligibility
  if (t.includes("18") && (t.includes("over") || t.includes("older") || t.includes("years"))) return "age-18";
  if (t.includes("age")) return "age";
  
  // References
  if (t.includes("reference") && (t.includes("name") || t.includes("contact"))) return "reference";
  
  // Previous employment at company
  if (t.includes("worked") && t.includes("before") || t.includes("former employee") || t.includes("previously employed")) 
    return "previous-employment-here";
  
  // Transportation
  if (t.includes("reliable transportation")) return "transportation";
  
  // Contact preferences
  if (t.includes("contact method") || t.includes("preferred contact") || t.includes("how") && t.includes("contact")) 
    return "contact-method";
  
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
  if (!answer) return { success: false, updated: false, question };
  
  try {
    const response = await fetch(`${STATE.backendUrl}/closed-question`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, choices, intent })
    });
    
    if (!response.ok) {
      console.error(`Failed to save answer for "${question}": HTTP ${response.status}`);
      return { success: false, updated: false, question };
    }
    
    const data = await response.json();
    STATE.qaCache[question] = answer;
    
    const wasUpdated = data.updated || false;
    if (wasUpdated) {
      console.log(`✅ Updated answer for "${question}" to "${answer}"`);
    } else {
      console.log(`✅ Saved answer for "${question}": "${answer}"`);
    }
    
    return { success: true, updated: wasUpdated, question };
  } catch (err) {
    console.error(`❌ Error saving answer for "${question}":`, err);
    return { success: false, updated: false, question };
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
  
  // Track results
  const results = {
    updated: 0,
    saved: 0,
    failed: 0
  };
  
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
      if (answer) {
        const result = await storeClosedAnswer(question, answer, choices, intent);
        if (result.success) {
          if (result.updated) {
            results.updated++;
          } else {
            results.saved++;
          }
        } else {
          results.failed++;
        }
      }
      continue;
    }
    // Save consistent text inputs and textareas if they match known intents (e.g., LinkedIn, phone, city)
    if (field.tagName === "INPUT" || (field.tagName === "TEXTAREA" && intent)) {
      const value = (field.value || "").trim();
      const q = question.toLowerCase();
      const openEndedHints = ["why", "describe", "tell us", "motivation", "cover letter", "essay"];
      if (openEndedHints.some((hint) => q.includes(hint))) continue;
      if (value) {
        const result = await storeClosedAnswer(question, value, [], intent);
        if (result.success) {
          if (result.updated) {
            results.updated++;
          } else {
            results.saved++;
          }
        } else {
          results.failed++;
        }
      }
    }
  }
  
  // Also save button-group choices
  const buttonGroups = getButtonGroups();
  for (const group of buttonGroups) {
    const selected = detectSelectedButton(group);
    const answer = (selected && (selected.textContent || "").trim()) || "";
    if (answer) {
      const result = await storeClosedAnswer(
        group.question, 
        answer, 
        group.buttons.map((b) => b.textContent?.trim() || ""), 
        detectIntent(group.question)
      );
      if (result.success) {
        if (result.updated) {
          results.updated++;
        } else {
          results.saved++;
        }
      } else {
        results.failed++;
      }
    }
  }
  
  // Display summary notification
  const total = results.updated + results.saved;
  if (total > 0 || results.failed > 0) {
    let message = "✅ Saved!";
    const parts = [];
    
    if (results.updated > 0) {
      parts.push(`Updated ${results.updated} answer${results.updated > 1 ? 's' : ''}`);
    }
    if (results.saved > 0) {
      parts.push(`Added ${results.saved} new answer${results.saved > 1 ? 's' : ''}`);
    }
    
    if (parts.length > 0) {
      message += " " + parts.join(", ");
    }
    
    if (results.failed > 0) {
      message += ` (${results.failed} failed)`;
      showNotification(message, "info");
    } else {
      showNotification(message, "success");
    }
  } else {
    showNotification("No answers to save", "info");
  }
}
