const recievingMessageData = {
  SET_PREFERRED_LANGUAGES: "setPreferredLanguages",
  GET_PREFERRED_LANGUAGES: "getPreferredLanguages",
};

const returnMessageData = {
  PREFERRED_LANGUAGES: "preferredLanguages",
};

let selectedLanguages = [];

async function saveSelectedLanguages() {
  await chrome.storage.local.set({ selectedLanguages: selectedLanguages });
}

window.addEventListener("message", (event) => {
  console.log("Message received in storage proxy", event);
  switch (event.data.type) {
    case recievingMessageData.SET_PREFERRED_LANGUAGES:
      selectedLanguages = event.data.data;
      saveSelectedLanguages();
      break;
    case recievingMessageData.GET_PREFERRED_LANGUAGES:
      window.postMessage(
        { type: returnMessageData.PREFERRED_LANGUAGES, data: selectedLanguages },
        "/"
      );
      break;
    default:
      console.log("Unknown message type, ignoring", event);
  }
});

async function main() {
  const storage = await chrome.storage.local.get();
  if (Object.keys(storage).length === 0) {
    selectedLanguages = [];
  } else {
    selectedLanguages = storage.selectedLanguages;
  }
}

main();
