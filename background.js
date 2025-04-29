let selectedLanguages = [];
let enabled = true;
let logEnv = "PROD";

const REQUESTS = {
  PREFERRED_LANGUAGES_REQUEST: "preferredLanguagesRequest",
  PING: "ping",
};
const RESPONSES = {
  PREFERRED_LANGUAGES_DATA: "preferredLanguagesData",
  PONG: "pong",
};

const activePorts = [];

function logger(logMessage) {
  if (logEnv === "DEV") {
    console.log(logMessage);
  }
}

function updatePorts() {
  for (const port of activePorts) {
    port.postMessage({
      type: RESPONSES.PREFERRED_LANGUAGES_DATA,
      data: {
        selectedLanguages,
        enabled,
        logEnv,
      },
    });
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
  updatePorts();
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
    if (request.type === REQUESTS.PING) {
      logger("PING received from external request");
      sendResponse({ type: RESPONSES.PONG });
      return;
    }
    if (request.type === REQUESTS.PREFERRED_LANGUAGES_REQUEST) {
      logger("Returning preferred languages on website request");
      sendResponse({
        type: RESPONSES.PREFERRED_LANGUAGES_DATA,
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

function connectPort(port) {
  logger("Port connected");
  // will be invoked for isolated content scripts and options page
  activePorts.push(port);
  port.onDisconnect.addListener(() => {
    console.log("BackgroundJS - Port disconnected");
    activePorts.splice(activePorts.indexOf(port), 1);
  });
  port.onMessage.addListener((message) => {
    if (message.type === REQUESTS.PING) {
      port.postMessage({
        type: RESPONSES.PONG,
      });
    }
  });
}

chrome.runtime.onConnectExternal.addListener((port) => {
  connectPort(port);
  logger("External port connected")
});

chrome.runtime.onConnect.addListener((port) => {
  connectPort(port)
  logger("internal port connected")
  // on connect send the current preferred languages once
  port.postMessage({
    type: "preferredLanguagesData",
    data: {
      selectedLanguages,
      enabled,
      logEnv,
    },
  });
  logger("Port connected and sent preferred languages");
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
  logger(["Selected languages loaded", selectedLanguages]);
  updatePorts();
}

loadVariables();
