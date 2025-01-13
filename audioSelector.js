console.log("Audio Selector Script Loaded");

// load the preferences from the local storage
let preferedLanguages = [];

function isOriginalAudioTrack(language) {
  return language.includes("original");
}

async function main() {
  const storage = await chrome.storage.local.get();
  if (Object.keys(storage).length === 0) {
    preferedLanguages = [];
  }
  else {
    preferedLanguages = storage.selectedLanguages;
  }

  // get the settings button
  let settingsButton = document.querySelector("#movie_player > div.ytp-chrome-bottom > div.ytp-chrome-controls > div.ytp-right-controls > button.ytp-button.ytp-settings-button.ytp-hd-quality-badge")
  if (!settingsButton) {
    console.log("No Settings Button Found");
    return;
  }

  settingsButton.click();

  let settingsAudioTrackElement = document.querySelectorAll(
    "#ytp-id-18 > div > div > div.ytp-menuitem.ytp-audio-menu-item"
  );

  if (settingsAudioTrackElement.length < 1) {
    console.log("No Audio Track Element Found");
    settingsButton.click(); // close the settings
    return;
  }

  settingsAudioTrackElement[0].click();

  let audioTrackOptions = Array.from(
    document.querySelectorAll("#ytp-id-18 > div > div.ytp-panel-menu > div")
  ).map((e) => {
    return {
      lang: e.textContent,
      isSelected: e.getAttribute("aria-checked") === "true",
      element: e,
    };
  });

  if (audioTrackOptions.length < 1) {
    console.log("No Audio Track Options Found");
    settingsButton.click(); // close the settings
    return;
  }
  const originalAudioTrack = audioTrackOptions.find((e) =>
    isOriginalAudioTrack(e.lang)
  );

  const matchedLang = []

  for (let audioTrackOption of audioTrackOptions) {
    const lang = audioTrackOption.lang.replace("original", "").trim();
    // original track is a prefered language, select it. - Strategy 1 
    if (preferedLanguages.includes(lang) && originalAudioTrack.lang === lang) {
      if (!audioTrackOption.isSelected) {
        console.log(`Selecting ${lang} Audio Track`);
        audioTrackOption.element.click();
      }
      settingsButton.click(); // close the settings
      return;
    }
    // original track is not a prefered language, select the first prefered language. - Strategy 2
    // remember matched language
    if (preferedLanguages.includes(lang)) {
      matchedLang.push(audioTrackOption);
    }
  }

  // select the first matched prefered language
  if (matchedLang.length > 0) {
    const firstMatchedLang = matchedLang[0];
    if (!firstMatchedLang.isSelected) {
      console.log(`Selecting ${firstMatchedLang.lang} Audio Track`);
      firstMatchedLang.element.click();
    }
  }

  // no prefered language found, select the original track - Strategy 3 
  if (!matchedLang.length && originalAudioTrack) {
    if (!originalAudioTrack.isSelected) {
      console.log(`Selecting ${originalAudioTrack.lang} Audio Track`);
      originalAudioTrack.element.click();
    }
  }

  settingsButton.click(); // close the settings
}

try {
  main();
}
catch (e) {
  console.log(e);
}
