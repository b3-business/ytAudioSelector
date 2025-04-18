const _audioSelector_ExtensionId = "oekkkogcccckecdkgnlnbblcfiafehaj";

const _audioSelector = {
  extensionId: _audioSelector_ExtensionId,
  preferredLanguages: [],
  enabled: false,
  logEnv: "DEV",
  port: chrome.runtime.connect(_audioSelector_ExtensionId),
  notificationDialog: null,
  notificationLangSpan: null,
  initialNotification: false,
  notificationTimeout: undefined,

  logger: function (logArguments) {
    if (this.logEnv === "DEV") {
      console.log(logArguments);
    }
  },

  applyLanguage: function (lang, audioTracks) {
    audioTracks.forEach((audioTrackOption) => {
      if (audioTrackOption.audioTrack.displayName === lang) {
        audioTrackOption.audioTrack.audioIsDefault = true;
      } else {
        audioTrackOption.audioTrack.audioIsDefault = false;
      }
    });
    _audioSelector.notificationLangSpan.textContent = lang;
    _audioSelector.notificationDialog.show();
    _audioSelector.notificationTimeout = setTimeout(() => {
      _audioSelector.notificationDialog.close();
    }, 2500);
  },

  selectAudioTrack: function (audioTracks) {
    //return; // temporary disable
    // yt will lauch the player with the first audio track set as default
    // we need to select the audio track based on the preferred languages
    const preferredLanguages = _audioSelector.preferredLanguages;
    if (preferredLanguages === undefined) {
      _audioSelector.logger("No preferred languages found");
      return;
    }

    const originalAudioTrackLang = audioTracks.find((e) =>{
      let result = e.audioTrack?.id.includes("4");
      if (result) {
        // e.g "en.4" or "en-GB.4"
        _audioSelector.logger(["Original audio track found by id mgic number (4)", e.audioTrack.id]);
      }
      _audioSelector.logger(["Also has original tag:",e.audioTrack?.displayName.toLowerCase().includes("original")]);
      return result;
    }
    );

    if (originalAudioTrackLang === undefined) {
      _audioSelector.logger("No original audio track found");
      return;
    }

    const matchedLang = [];

    for (let audioTrackOption of audioTracks) {
      const lang = audioTrackOption.audioTrack.displayName;
      const langCode = audioTrackOption.audioTrack.id.split(/[-\.]/)[0];
      // original track is a preferred language, select it. - Strategy 1
      if (
        preferredLanguages.includes(langCode) &&
        originalAudioTrackLang.audioTrack.displayName === lang
      ) {
        _audioSelector.logger(
          `Strategy 1 (matched original) - Selecting ${lang} original audio track`
        );
        _audioSelector.applyLanguage(lang, audioTracks);
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
    _audioSelector.logger(["Matched Languages", matchedLang]);

    // select the first matched preferred language
    if (matchedLang.length > 0) {
      const firstMatchedLang = matchedLang[0];
      _audioSelector.logger(
        `Strategy 2 (first match) - Selecting ${firstMatchedLang.lang} Audio Track`
      );
      _audioSelector.applyLanguage(
        firstMatchedLang.audioTrack.displayName,
        audioTracks
      );
      return;
    }

    // no preferred language found, select the original track - Strategy 3
    if (!matchedLang.length && originalAudioTrackLang) {
      _audioSelector.logger(
        `Strategy 3 (original) - Selecting ${originalAudioTrackLang.audioTrack.displayName} Audio Track`
      );
      _audioSelector.applyLanguage(
        originalAudioTrackLang.audioTrack.displayName,
        audioTracks
      );
    }
  },

  init: function () {
    
    const escapeHTMLPolicy = trustedTypes.createPolicy("myEscapePolicy", {
      createHTML: (string) => string,
    });

    const notificationDialogHTML = escapeHTMLPolicy.createHTML(`
    <dialog id="audioSelectorNotificationDialog">
      ytAudioSelector: audio language updated to 
      <span id="audioSelectorNotificationLang"></span>
    </dialog>
    `);

    const tmp = document.createElement("div");
    tmp.innerHTML = notificationDialogHTML;
    const notificationDialog = tmp.querySelector("#audioSelectorNotificationDialog");

    _audioSelector.notificationDialog = notificationDialog;
    _audioSelector.notificationLangSpan = notificationDialog.querySelector("#audioSelectorNotificationLang");

    function appendNotificationDialog() {
      if (document.body) {
        document.body.appendChild(notificationDialog);
        return true;
      }
      return false;
    }

    setTimeout(async () => {
      let appended = appendNotificationDialog();
      while (appended === false) {
        appended = appendNotificationDialog();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      // dialog click event listener must be added after the dialog is appended to the DOM
      notificationDialog.addEventListener("click", (e) => {
        this.logger("notification dialog clicked --> closing");
        e.preventDefault();
        notificationDialog.close();
      });
      // fix for the first notification.
      // reset the notificationTimeout, as the first one is shown delayed, due to the dialog not being appended to the DOM
      _audioSelector.initialNotification && clearTimeout(_audioSelector.notificationTimeout) && notificationDialog.show();
      _audioSelector.notificationTimeout = setTimeout(() => {
        notificationDialog.close();
      }
      , 2500);
    }, 0);


    // requires externally_connectable in manifest --> documentation https://developer.chrome.com/docs/extensions/develop/concepts/messaging#external-webpage
    // use sendmessage to request preferred languages from the extension once for the page initialization
    chrome.runtime.sendMessage(
      _audioSelector.extensionId,
      { type: "preferredLanguagesRequest" },
      (response) => {
        _audioSelector.logger(["Received preferred languages", response.data]);
        _audioSelector.preferredLanguages = response.data.selectedLanguages;
        _audioSelector.enabled = response.data.enabled;
        _audioSelector.logEnv = response.data.logEnv;
      }
    );
    _audioSelector.port.onMessage.addListener((message) => {
      if (message.type === "preferredLanguagesData") {
        _audioSelector.logger([
          "Received preferred languages update",
          message.data,
        ]);
        _audioSelector.preferredLanguages = message.data.selectedLanguages;
        _audioSelector.enabled = message.data.enabled;
        _audioSelector.logEnv = message.data.logEnv;
      }
    });

    // hook ytInitialPlayerResponse to catch "default audio track" from doc response
    Object.defineProperty(window, "ytInitialPlayerResponse", {
      set: function (obj) {
        if (
          _audioSelector.enabled === true &&
          // check if the player has multiple audio tracks
          obj.streamingData?.adaptiveFormats?.some(
            (format) => format.audioTrack?.audioIsDefault === true
          )
        ) {
          _audioSelector.logger("applying audio language fix");
          _audioSelector.initialNotification = true;
          const audioTracks = obj.streamingData.adaptiveFormats.filter(
            (format) => format.mimeType.includes("audio")
          );
          _audioSelector.selectAudioTrack(audioTracks);
        }
        this._hooked_ytInitialPlayerResponse = obj;
      },
      get: function () {
        return this._hooked_ytInitialPlayerResponse;
      },
    }),
      // UBO fetch hook -- credits to Raymond Hill

      (window.fetch = new Proxy(window.fetch, {
        apply: function (target, thisArg, args) {
          try {
            const fetchPromise = Reflect.apply(target, thisArg, args);
            if (_audioSelector.enabled === false) {
              return fetchPromise;
            }
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
            _audioSelector.logger("fetching", args[0], fetchPromise);
            //return fetchPromise;
            return fetchPromise
              .then((responseBefore) => {
                _audioSelector.logger([
                  "fetch response before",
                  responseBefore,
                ]);
                const response = responseBefore.clone();
                return response
                  .text()
                  .then((textBefore) => {
                    let textAfter = textBefore;
                    _audioSelector.logger("modifying response");
                    if (textBefore.includes("audioIsDefault")) {
                      const responseContext = JSON.parse(textBefore);
                      const audioTracks =
                        responseContext.streamingData.adaptiveFormats.filter(
                          (format) => format.mimeType.includes("audio")
                        );
                      _audioSelector.selectAudioTrack(audioTracks);
                      responseContext.streamingData.adaptiveFormats =
                        audioTracks;
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
                    _audioSelector.logger([
                      "fetch response after",
                      responseAfter,
                    ]);
                    return responseAfter;
                  })
                  .catch((reason) => {
                    _audioSelector.logger([
                      "Failed to read response text",
                      reason,
                    ]);
                    return responseBefore;
                  });
              })
              .catch((reason) => {
                _audioSelector.logger(["Failed to fetch", reason]);
                return fetchPromise;
              });
          } catch (error) {
            _audioSelector.logger(["generic error", error]);
          }
        },
      }));
  },
};

_audioSelector.init();
