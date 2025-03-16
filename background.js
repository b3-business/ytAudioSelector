chrome.runtime.onMessageExternal.addListener(
  async (request, sender, sendResponse) => {
    let selectedLanguages = [];
    if (request.type === "preferredLanguagesRequest") {
      console.log("Received preferred languages request");
      const storage = await chrome.storage.local.get();
      if (Object.keys(storage).length === 0) {
        selectedLanguages = [];
      } else {
        selectedLanguages = storage.selectedLanguages;
      }
      console.log("Preferred languages loaded, sending response", selectedLanguages);
      sendResponse({ type: "preferredLanguagesData", data: selectedLanguages });
    }
  }
);
