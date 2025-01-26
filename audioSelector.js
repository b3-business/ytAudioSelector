console.log(window._yt_player);

console.log("Audio Selector Script Loaded");

const youtubeAudioSelectorExtension = {
  preferredLanguages: [],
  preferredLanguagesLoaded: false,
  isOriginalAudioTrack(language) {
    return language.includes("original");
  },

  readAudioTrackOptions() {
    return Array.from(
      document.querySelectorAll("#ytp-id-18 > div > div.ytp-panel-menu > div")
    ).map((e) => {
      return {
        lang: e.textContent,
        isSelected: e.getAttribute("aria-checked") === "true",
        element: e,
      };
    });
  },

  async selectPreferredAudioTrack() {
    let loadingAttempts = 0;
    while (!this.preferredLanguagesLoaded) {
      if (loadingAttempts > 20) {
        console.log("Preferred languages not loaded within 2 seconds");
        return;
      }      
      loadingAttempts++;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const preferredLanguages = this.preferredLanguages;
    if (!preferredLanguages || preferredLanguages.length < 1) {
      console.log("No preferred languages found");
      return;
    }
  
    // get the settings button
    let settingsButton = document.querySelector(
      "#movie_player > div.ytp-chrome-bottom > div.ytp-chrome-controls > div.ytp-right-controls > button.ytp-button.ytp-settings-button.ytp-hd-quality-badge"
    );
    if (!settingsButton) {
      console.log("No settings button found");
      return;
    }
  
    settingsButton.click();
  
    let settingsAudioTrackElement = document.querySelectorAll(
      "#ytp-id-18 > div > div > div.ytp-menuitem.ytp-audio-menu-item"
    );
  
    if (settingsAudioTrackElement.length < 1) {
      console.log("No audio track element found");
      settingsButton.click(); // close the settings
      return;
    }
  
    settingsAudioTrackElement[0].click();
  
    let audioTrackOptions = this.readAudioTrackOptions();
    // Sometimes the initial menu items are still loaded.
    // in that case retry after 0.1 seconds. This is absolutely not clean in any way.
    // until I find a way to actually use the "youtube player context" to get the audio tracks.
    // also, there is absolutely no way to distinguish between "normal menu item" and "audio menu item", they use the same css selector.
    while (
      audioTrackOptions.some((e) => e.lang.toLowerCase().includes("audio track"))
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      audioTrackOptions = this.readAudioTrackOptions();
    }
  
    console.debug("Debug: audio track options", audioTrackOptions);
  
    if (audioTrackOptions.length < 1) {
      console.log("No audio track options found");
      settingsButton.click(); // close the settings
      return;
    }
    const originalAudioTrack = audioTrackOptions.find((e) =>
      this.isOriginalAudioTrack(e.lang)
    );
  
    console.log("original audio track", originalAudioTrack);
  
    const matchedLang = [];
  
    for (let audioTrackOption of audioTrackOptions) {
      const lang = audioTrackOption.lang;
      // original track is a preferred language, select it. - Strategy 1
      if (
        preferredLanguages.includes(lang.replace("original", "").trim()) &&
        originalAudioTrack.lang === lang
      ) {
        console.log(
          `Strategy 1 (matched original) - Selecting ${lang} original audio track`
        );
        if (!audioTrackOption.isSelected) {
          audioTrackOption.element.click();
        }
        settingsButton.click(); // close the settings
        return;
      }
      // original track is not a preferred language, select the first preferred language. - Strategy 2
      // remember matched language
      if (preferredLanguages.includes(lang)) {
        matchedLang.push(audioTrackOption);
      }
    }
  
    // sort the matched languages by the order of the preferred languages
    matchedLang.sort(
      (a, b) =>
        preferredLanguages.indexOf(a.lang) - preferredLanguages.indexOf(b.lang)
    );
    console.debug("Matched Languages", matchedLang);
  
    // select the first matched preferred language
    if (matchedLang.length > 0) {
      const firstMatchedLang = matchedLang[0];
      console.log(
        `Strategy 2 (first match) - Selecting ${firstMatchedLang.lang} Audio Track`
      );
      if (!firstMatchedLang.isSelected) {
        firstMatchedLang.element.click();
        settingsButton.click(); // close the settings
      }
      return;
    }
  
    // no preferred language found, select the original track - Strategy 3
    if (!matchedLang.length && originalAudioTrack) {
      console.log(
        `Strategy 3 (original) - Selecting ${originalAudioTrack.lang} Audio Track`
      );
      if (!originalAudioTrack.isSelected) {
        originalAudioTrack.element.click();
      }
    }
  
    settingsButton.click(); // close the settings
  },
  getPreferredLanguages() {

    window.addEventListener("message", (event) => {
      console.log("Message received in storage proxy", event);
      switch (event.data.type) {
        case "preferredLanguages":
          this.preferredLanguages = event.data.data;
          this.preferredLanguagesLoaded = true;
          break;
        default:
          console.log("Unknown message type, ignoring", event);
      }
    });
    window.postMessage({ type: "getPreferredLanguages" }, "/");
  }
};

youtubeAudioSelectorExtension.getPreferredLanguages();
youtubeAudioSelectorExtension.selectPreferredAudioTrack();
