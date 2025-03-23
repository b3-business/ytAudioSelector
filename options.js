let selectedLanguages = undefined;
let enabled = false;
let logEnv = "PROD";
const extensionId = "bafgagiibjihhmmcddalbojahagoidho";
const port = chrome.runtime.connect(extensionId);

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
    if (message.type === "preferredLanguagesData") {
      selectedLanguages = message.data.selectedLanguages;
      enabled = message.data.enabled;
      logEnv = message.data.logEnv;
      fillOptions();
      fillSelectedLanguages();
      updateEnabledState();
      updateLogEnvCheckbox();
    }
    logger(message);
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
  languages.forEach((language) => {
    if (selectedLanguages.includes(language)) {
      return;
    }
    const option = document.createElement("option");
    option.value = language;
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
    li.textContent = language;

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