let selectedLanguages = [];
let enabled = false;
let logEnv = "PROD";

const activePorts = [];

function logger(logMessage) {
  if (logEnv === "DEV") {
    console.log(logMessage);
  }
}

chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local") {
    if (changes.enabled) {
      enabled = changes.enabled.newValue;
      logger(["Enabled updated", enabled]);
    }
    if (changes.logEnv) {
      logEnv = changes.logEnv.newValue;
      logger(["Log environment updated", logEnv]);
    }
    if (changes.selectedLanguages) {
      selectedLanguages = changes.selectedLanguages.newValue;
      logger(["Preferred languages updated", selectedLanguages]);
    }
  }
  for (const port of activePorts) {
    port.postMessage({
      type: "preferredLanguagesData",
      data: {
        selectedLanguages,
        enabled,
        logEnv,
      },
    });
  }
});

async function getSelectedLanguages() {
  const storage = await chrome.storage.local.get(["selectedLanguages"]);
  if (Object.keys(storage).length === 0) {
    return [];
  } else {
    return storage.selectedLanguages;
  }
}

async function setSelectedLanguages(selectedLanguages) {
  chrome.storage.local.set({ selectedLanguages }).then(() => {
    logger(["Preferred languages updated", selectedLanguages]);
  });
}

chrome.runtime.onMessageExternal.addListener(
  async (request, sender, sendResponse) => {
    if (request.type === "preferredLanguagesRequest") {
      logger("Returning preferred languages on website request");
      sendResponse({
        type: "preferredLanguagesData",
        data: {
          selectedLanguages,
          enabled,
          logEnv,
        },
      });
    }
  }
);

chrome.runtime.onInstalled.addListener(() => {
  // if no preferred languages are set, open options page on install
  logger("Checking preferred languages on install");
  chrome.storage.local.get(["selectedLanguages"], (result) => {
    if (Object.keys(result).length === 0) {
      chrome.tabs.create({
        url: "options.html",
      });
    }
  });
});

chrome.runtime.onConnectExternal.addListener((port) => {
  activePorts.push(port);
  port.onDisconnect.addListener(() => {
    console.log("port external disconnected");
    activePorts.splice(activePorts.indexOf(port), 1);
  });
});

chrome.runtime.onConnect.addListener((port) => {
  logger("Port connected");
  // will be invoked for isolated content scripts and options page
  activePorts.push(port);
  port.onDisconnect.addListener(() => {
    console.log("BackgroundJS - Port disconnected");
    activePorts.splice(activePorts.indexOf(port), 1);
  });
  // on connect send the current preferred languages once
  port.postMessage({
    type: "preferredLanguagesData",
    data: {
      selectedLanguages,
      enabled,
      logEnv,
    },
  });
});

async function loadVariables() {
  chrome.storage.local.get(["enabled", "logEnv"], (result) => {
    if (Object.keys(result).length === 0) {
      enabled = false;
      logEnv = "PROD";
    } else {
      enabled = result.enabled;
      logEnv = result.logEnv;
    }
  });
  selectedLanguages = await getSelectedLanguages();
}

loadVariables();
