// at document_start in isolated
// load preferred languages from chrome storage


async function loadPreferredLanguages() {
  let selectedLanguages = [];
  const storage = await chrome.storage.local.get();
  if (Object.keys(storage).length === 0) {
    selectedLanguages = [];
  } else {
    selectedLanguages = storage.selectedLanguages;
  }
  console.log("Preferred languages loaded, sending PostMessage", selectedLanguages);
  (async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    console.log("async execution test before postMessage");
  })();
  window.postMessage(
    {
      type: "preferredLanguages",
      data: selectedLanguages,
    },
    "/"
  );
  console.log("PostMessage sent");
  (async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    console.log("async execution test after postMessage");
  })();
}

console.log("waiting for preferred languages postMessage");
loadPreferredLanguages();