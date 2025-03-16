// Does not work, since its impossible to await in a setter. 
// Idea was to catch the setter for ytInitialPlayerResponse and then apply the preferred languages.

const _audioSelector_selectAudioTrack = function (audioTracks) {
  //return; // temporary disable
  // yt will lauch the player with the first audio track set as default
  // we need to select the audio track based on the preferred languages
  const applyLanguage = (lang) => {
    audioTracks.forEach((audioTrackOption) => {
      if (audioTrackOption.audioTrack.displayName === lang) {
        console.log(`Set true`);
        audioTrackOption.audioTrack.audioIsDefault = true;
      } else {
        console.log(`Set false`);
        audioTrackOption.audioTrack.audioIsDefault = false;
      }
    });
  };

  const preferredLanguages = window._audioSelector_preferredLanguages;
  if (preferredLanguages === undefined) {
    console.log("No preferred languages found");
    return;
  }

  const originalAudioTrackLang = audioTracks.find((e) =>
    e.audioTrack?.displayName.includes("original")
  );

  if (originalAudioTrackLang === undefined) {
    console.log("No original audio track found");
    return;
  }

  const matchedLang = [];

  for (let audioTrackOption of audioTracks) {
    const lang = audioTrackOption.audioTrack.displayName;
    // original track is a preferred language, select it. - Strategy 1
    if (
      preferredLanguages.includes(lang.replace("original", "").trim()) &&
      originalAudioTrackLang.audioTrack.displayName === lang
    ) {
      console.log(
        `Strategy 1 (matched original) - Selecting ${lang} original audio track`
      );
      applyLanguage(lang);
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
    applyLanguage(firstMatchedLang.audioTrack.displayName);
    return;
  }

  // no preferred language found, select the original track - Strategy 3
  if (!matchedLang.length && originalAudioTrackLang) {
    console.log(
      `Strategy 3 (original) - Selecting ${originalAudioTrackLang.audioTrack.displayName} Audio Track`
    );
    applyLanguage(originalAudioTrackLang.audioTrack.displayName);
  }
};

// requires externally_connectable in manifest --> documentation https://developer.chrome.com/docs/extensions/develop/concepts/messaging#external-webpage
const _audioSelector_ExtensionId = "bafgagiibjihhmmcddalbojahagoidho";
chrome.runtime.sendMessage(_audioSelector_ExtensionId,{ type: "preferredLanguagesRequest" }, (response) => {
  console.log("Received preferred languages", response.data);
  window._audioSelector_preferredLanguages = response.data;
});

// hook ytInitialPlayerResponse to catch "default audio track" from doc response
Object.defineProperty(window, "ytInitialPlayerResponse", {
  set: function (obj) {
    if (
      // check if the player has multiple audio tracks
      obj?.captions?.playerCaptionsTracklistRenderer?.audioTracks?.length > 1
    ) {
      const audioTracks = obj.streamingData.adaptiveFormats.filter((format) =>
        format.mimeType.includes("audio")
      );
      _audioSelector_selectAudioTrack(audioTracks);
    }
    this._hooked_ytInitialPlayerResponse = obj;
  },
  get: function () {
    return this._hooked_ytInitialPlayerResponse;
  },
});
