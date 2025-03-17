const _audioSelector_selectAudioTrack = function (audioTracks) {
  //return; // temporary disable
  // yt will lauch the player with the first audio track set as default
  // we need to select the audio track based on the preferred languages
  const applyLanguage = (lang) => {
    audioTracks.forEach((audioTrackOption) => {
      if (audioTrackOption.audioTrack.displayName === lang) {
        audioTrackOption.audioTrack.audioIsDefault = true;
      } else {
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
chrome.runtime.sendMessage(
  _audioSelector_ExtensionId,
  { type: "preferredLanguagesRequest" },
  (response) => {
    console.log("Received preferred languages", response.data);
    window._audioSelector_preferredLanguages = response.data;
  }
);

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

// UBO fetch hook -- credits to Raymond Hill

(() => {
  window.fetch = new Proxy(window.fetch, {
    apply: function (target, thisArg, args) {
      try {
        const fetchPromise = Reflect.apply(target, thisArg, args);
        if (
          typeof args[0] === "string" &&
          args[0].endsWith("youtubei/v1/player") === false &&
          args[0].includes("youtubei/v1/player?") === false
        ) {
          return fetchPromise;
        }
        if (
          args[0].url &&
          args[0].url.endsWith("youtubei/v1/player") === false &&
          args[0].url.includes("youtubei/v1/player?") === false
        ) {
          return fetchPromise;
        }
        console.log("fetching", args[0], fetchPromise);
        //return fetchPromise;
        return fetchPromise
          .then((responseBefore) => {
            console.log("fetch response before", responseBefore);
            const response = responseBefore.clone();
            console.log("fetch response", response);
            return response
              .text()
              .then((textBefore) => {
                let textAfter = textBefore;
                console.log("modifying response");
                if (textBefore.includes("audioIsDefault")) {
                  const responseContext = JSON.parse(textBefore);
                  const audioTracks =
                    responseContext.streamingData.adaptiveFormats.filter(
                      (format) => format.mimeType.includes("audio")
                    );
                  _audioSelector_selectAudioTrack(audioTracks);
                  responseContext.streamingData.adaptiveFormats = audioTracks;
                  textAfter = JSON.stringify(responseContext);
                }
                const responseAfter = new Response(textAfter, {
                  status: responseBefore.status,
                  statusText: responseBefore.statusText,
                  headers: responseBefore.headers,
                });
                Object.defineProperties(responseAfter, {
                  ok: { value: responseBefore.ok },
                  redirected: { value: responseBefore.redirected },
                  type: { value: responseBefore.type },
                  url: { value: responseBefore.url },
                });
                console.log("fetch response after", responseAfter);
                return responseAfter;
              })
              .catch((reason) => {
                console.error("Failed to read response text", reason);
                return responseBefore;
              });
          })
          .catch((reason) => {
            console.error("Failed to fetch", reason);
            return fetchPromise;
          });
      } catch (error) {
        console.error("generic error", error);
      }
    },
  });
})();
