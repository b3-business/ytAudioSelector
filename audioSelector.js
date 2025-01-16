console.log("Audio Selector Script Loaded");

// load the preferences from the local storage
let preferedLanguages = [];

function isOriginalAudioTrack(language) {
  return language.includes("original");
}

function readAudioTrackOptions() {
  return Array.from(
    document.querySelectorAll("#ytp-id-18 > div > div.ytp-panel-menu > div")
  ).map((e) => {
    return {
      lang: e.textContent,
      isSelected: e.getAttribute("aria-checked") === "true",
      element: e,
    };
  });
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

  let audioTrackOptions = readAudioTrackOptions();
  // Sometimes the initial menu items are still loaded. 
  // in that case retry after 0.1 seconds. This is absolutely not clean in any way.
  // until I find a way to actually use the "youtube player context" to get the audio tracks.
  // also, there is absolutely no way to distinguish between "normal menu item" and "audio menu item", they use the same css selector. 
  while (audioTrackOptions.some((e) => e.lang.toLowerCase().includes("audio track"))) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    audioTrackOptions = readAudioTrackOptions();
  }

  console.debug("Debug: Audio Track Options", audioTrackOptions);
  
  if (audioTrackOptions.length < 1) {
    console.log("No Audio Track Options Found");
    settingsButton.click(); // close the settings
    return;
  }
  const originalAudioTrack = audioTrackOptions.find((e) =>
    isOriginalAudioTrack(e.lang)
  );

  console.log("Original Audio Track", originalAudioTrack);

  const matchedLang = []

  for (let audioTrackOption of audioTrackOptions) {
    const lang = audioTrackOption.lang;
    // original track is a prefered language, select it. - Strategy 1 
    console.debug("Checking", lang, preferedLanguages, originalAudioTrack.lang);
    if (preferedLanguages.includes(lang.replace("original", "").trim()) && originalAudioTrack.lang === lang) {
      console.log(`Strategy 1 (matched original) - Selecting ${lang} original Audio Track`);
      if (!audioTrackOption.isSelected) {
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

  // sort the matched languages by the order of the prefered languages
  matchedLang.sort((a, b) => preferedLanguages.indexOf(a.lang) - preferedLanguages.indexOf(b.lang));
  console.debug("Matched Languages", matchedLang);

  // select the first matched prefered language
  if (matchedLang.length > 0) {
    const firstMatchedLang = matchedLang[0];
    console.log(`Strategy 2 (first match) - Selecting ${firstMatchedLang.lang} Audio Track`);
    if (!firstMatchedLang.isSelected) {
      firstMatchedLang.element.click();
      settingsButton.click(); // close the settings
    }
    return;
  }

  // no prefered language found, select the original track - Strategy 3 
  if (!matchedLang.length && originalAudioTrack) {
    console.log(`Strategy 3 (original) - Selecting ${originalAudioTrack.lang} Audio Track`);
    if (!originalAudioTrack.isSelected) {
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
