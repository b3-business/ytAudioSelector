let selectedLanguages = [];
let enabled = false;
let logEnv = "PROD";
const extensionId = "oekkkogcccckecdkgnlnbblcfiafehaj";
const port = chrome.runtime.connect(extensionId);

const selectedLanguagesTextByCode = new Map();

async function saveSelectedLanguages() {
  await chrome.storage.local.set({
    "selectedLanguages": selectedLanguages,
    "enabled": enabled,
    "logEnv": logEnv
  });

}

function logger(logMessage) {
  if (logEnv === "DEV") {
    console.log(logMessage);
  }
}

async function main() {

  port.onMessage.addListener((message) => {
    if (message.type === RESPONSES.PONG) {
      logger("PONG received from background script");
      return;
    }
    if (message.type === RESPONSES.PREFERRED_LANGUAGES_DATA) {
      selectedLanguages = message.data.selectedLanguages;
      enabled = message.data.enabled;
      logEnv = message.data.logEnv;
      languages.forEach((value, language) => {
        if (selectedLanguages.includes(value)) {
          selectedLanguagesTextByCode.set(value, language);
        }
      });

      fillOptions();
      fillSelectedLanguages();
      updateEnabledState();
      updateLogEnvCheckbox();
    }
    logger(message);
  });

  // waking the background script up. Else we might not receive a response
  port.postMessage({ type: REQUESTS.PING });
  const heartbeat = setInterval(() => {
    port.postMessage({ type: REQUESTS.PING });
  }, 5000); // every 5 seconds to keep the background script if the page is open

  port.onDisconnect.addListener(() => {
    console.log("Options port disconnected");
  });

  port.postMessage({ type: "preferredLanguagesRequest" });
  
  const addLanguageButton = document.getElementById("addLanguage");
  if (addLanguageButton) {
    addLanguageButton.addEventListener("click", addLanguage);
  }

  const toggleEnabledButton = document.getElementById("toggleEnabled");
  if (toggleEnabledButton) {
    toggleEnabledButton.addEventListener("click", toggleEnabled);
  }

  const logEnvCheckbox = document.getElementById("debugLog");
  if (logEnvCheckbox) {
    logEnvCheckbox.addEventListener("change", toggleLogEnv);
  }
  
}

function fillOptions() {
  const select = document.getElementById("addLanguageSelect");
  
  select.innerHTML = "";
  // languages from constants.js
  languages.forEach((value, language) => {
    if (selectedLanguages.includes(value)) {
      return;
    }
    const option = document.createElement("option");
    option.value = value;
    option.textContent = language;
    select.appendChild(option);
  });
}

function fillSelectedLanguages() {
  const selectedLanguagesList = document.getElementById("selectedLanguages");
  if (!selectedLanguagesList) {
    return;
  }
  
  selectedLanguagesList.innerHTML = "";
  selectedLanguages.forEach((language,i) => {
    const li = document.createElement("li");
    li.setAttribute("data-index", i);
    li.textContent = selectedLanguagesTextByCode.get(language) || "Unknown. Please remove this entry.";

    const upButton = document.createElement("button");
    upButton.textContent = "↑";
    if (i === 0) {
      upButton.disabled = true;
    }
    upButton.addEventListener("click", moveLanguageUp);
    li.appendChild(upButton);

    const downButton = document.createElement("button");
    downButton.textContent = "↓";
    if (i === selectedLanguages.length - 1) {
      downButton.disabled = true;
    }
    downButton.addEventListener("click", moveLanguageDown);
    li.appendChild(downButton);
    selectedLanguagesList.appendChild(li);

    const removeButton = document.createElement("button");
    removeButton.textContent = "X";
    removeButton.addEventListener("click", removeLanguage);
    li.appendChild(removeButton);
  });
}

function removeLanguage(e) {
  e.preventDefault();
  const target = e.target;
  if (!target || target.parentElement.tagName !== "LI") {
    return;
  }

  const index = parseInt(target.parentElement.getAttribute("data-index"));
  selectedLanguages.splice(index, 1);
  console.debug(selectedLanguages);
  fillOptions();
  fillSelectedLanguages();
  saveSelectedLanguages();
}

function moveLanguageUp(e) {
  e.preventDefault();
  const target = e.target;
  if (!target || target.parentElement.tagName !== "LI") {
    return;
  }

  const index = parseInt(target.parentElement.getAttribute("data-index"));
  if (index === 0) {
    return;
  }

  const language = selectedLanguages.splice(index, 1)[0];
  selectedLanguages.splice(index - 1, 0, language);
  console.debug(selectedLanguages);
  fillSelectedLanguages();
  saveSelectedLanguages();
}

function moveLanguageDown(e) {
  e.preventDefault();
  const target = e.target;
  if (!target || target.parentElement.tagName !== "LI") {
    return;
  }

  const index = parseInt(target.parentElement.getAttribute("data-index"));
  if (index === selectedLanguages.length - 1) {
    return;
  }

  const language = selectedLanguages.splice(index, 1)[0];
  selectedLanguages.splice(index + 1, 0, language);
  console.debug(selectedLanguages);
  fillSelectedLanguages();
  saveSelectedLanguages();
}

function addLanguage(e) {
  e.preventDefault();
  const select = document.querySelector("select#addLanguageSelect");
  const selectedLanguagesList = document.getElementById("selectedLanguages");
  if (!select || !selectedLanguagesList) {
    console.log("select or selectedLanguagesList not found");
    return;
  }
  
  const selectedLanguage = select.value;
  console.log(selectedLanguage);

  if (!selectedLanguage) {
    console.log("No language selected");
    return;
  }

  if (selectedLanguages.includes(selectedLanguage)) {
    console.log("Language already selected");
    return;
  }

  selectedLanguages.push(selectedLanguage);
  selectedLanguagesTextByCode.set(selectedLanguage, select.options[select.selectedIndex].textContent);
  
  fillOptions();
  fillSelectedLanguages();
  saveSelectedLanguages();
}

function updateEnabledState() {
  const extensionEnabledSpan = document.getElementById("extensionState");
  if (extensionEnabledSpan) {
    extensionEnabledSpan.textContent = enabled ? "active" : "not active";
  }
  extensionEnabledSpan.classList.toggle("active", enabled);
  extensionEnabledSpan.classList.toggle("inactive", !enabled);
}

function toggleEnabled() {
  enabled = enabled === true ? false : true;
  saveSelectedLanguages();
}

function updateLogEnvCheckbox() {
  const logEnvCheckbox = document.getElementById("debugLog");
  if (logEnvCheckbox) {
    logEnvCheckbox.checked = logEnv === "DEV";
  }
}

function toggleLogEnv() {
  logEnv = logEnv === "DEV" ? "PROD" : "DEV";
  saveSelectedLanguages();
}



main();
