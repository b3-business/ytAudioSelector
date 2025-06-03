const _audioSelector_ExtensionId = 'oekkkogcccckecdkgnlnbblcfiafehaj';

// send message to extention to wake it up. its potentially inactive by chrome
chrome.runtime.sendMessage(_audioSelector_ExtensionId, { type: 'ping' }, (response) => {
  if (response.type === 'pong') {
    console.log('Background script is active');
  }
});

const _audioSelector = {
  extensionId: _audioSelector_ExtensionId,
  preferredLanguages: [],
  enabled: false,
  logEnv: 'DEV',
  port: chrome.runtime.connect(_audioSelector_ExtensionId),
  notificationDialog: null,
  notificationLangSpan: null,
  initialNotification: false,
  notificationTimeout: undefined,
  REQUESTS: {
    PREFERRED_LANGUAGES_REQUEST: 'preferredLanguagesRequest',
    PING: 'ping',
  },
  RESPONSES: {
    PREFERRED_LANGUAGES_DATA: 'preferredLanguagesData',
    PONG: 'pong',
  },

  videoLanguageCache: {},

  logger: function (logArguments) {
    if (this.logEnv === 'DEV') {
      console.log(logArguments);
    }
  },

  heartbeatFunction: () => {
    try {
      //_audioSelector.logger("heartbeat ping");
      _audioSelector.port.postMessage({
        type: _audioSelector.REQUESTS.PING,
      });
    } catch (error) {
      // port is disconnected
      clearInterval(_audioSelector.heartbeatInterval);
      _audioSelector.reconnectPort();
    }
  },
  heartbeatInterval: undefined,
  setLocalStorage(key, value) {
    _audioSelector.logger(['Setting localStorage', key, value]);
    window.localStorage.setItem(key, JSON.stringify(value));
  },
  patchYTPlayerUserSettingsLocalStorage: function (lang) {
    // in a recent update youtube added a really dumb "quick fix" for the audio track selection, patching the localStorage to make it work again
    lang = lang || 'en.4'; // "en.4", "en-US.4", or default to "en.4" - works best with full code!
    let userSettings = {
      // 483 seems to be the key for audio language setting
      483: {
        stringValue: lang, // defaulting to orginal english for now.
      },
    };

    try {
      const localStorageItem = window.localStorage.getItem('yt-player-user-settings');
      _audioSelector.logger(['Settings from localStorage', localStorageItem]);
      if (localStorageItem === null) {
        _audioSelector.logger('yt-player-user-settings not found in localStorage');
        _audioSelector.setLocalStorage('yt-player-user-settings', {
          creation: Date.now(),
          data: JSON.stringify(userSettings),
          expiration: Date.now() + 1000 * 60 * 60 * 24 * 30, // 1 month
        });
        return;
      }
      const ytPlayerUserSettings = JSON.parse(JSON.parse(localStorageItem).data);
      userSettings = {
        ...ytPlayerUserSettings,
        ...userSettings, // merge with existing settings
      };

      _audioSelector.setLocalStorage('yt-player-user-settings', {
        creation: Date.now(),
        data: JSON.stringify(userSettings),
        expiration: Date.now() + 1000 * 60 * 60 * 24 * 30, // 1 month
      });
      // force overriding multiple times, as youtube seems to read and write this localStorage item multiple times
      const forcePatch = (time) => {
        setTimeout(() => {
          _audioSelector.setLocalStorage('yt-player-user-settings', {
            creation: Date.now(),
            data: JSON.stringify(userSettings),
            expiration: Date.now() + 1000 * 60 * 60 * 24 * 30, // 1 month
          });
        }, time);
      };
      // force patching after 1 second, 2 seconds, and 3 seconds
      forcePatch(1000);
      forcePatch(2000);
      forcePatch(3000);
    } catch (error) {
      _audioSelector.logger(['Failed to patch ytPlayerUserSettings localStorage', error]);
    }
  },

  applyLanguage: function (lang, audioTracks, context, langId) {
    _audioSelector.logger(
      `Applying audio language: ${lang} for video ${context.videoDetails.title} (${context.videoDetails.videoId})`
    );
    // patch yt-player-user-settings localStorage
    _audioSelector.patchYTPlayerUserSettingsLocalStorage(langId);
    // set the audio track as default
    // audioTracks.forEach((audioTrackOption) => {
    //   if (audioTrackOption.audioTrack.displayName === lang) {
    //     audioTrackOption.audioTrack.audioIsDefault = true;
    //   } else {
    //     audioTrackOption.audioTrack.audioIsDefault = false;
    //   }
    // });
    _audioSelector.notificationLangSpan.textContent = lang;
    _audioSelector.notificationDialog.show();
    _audioSelector.notificationTimeout = setTimeout(() => {
      _audioSelector.notificationDialog.close();
    }, 2500);
  },

  selectAudioTrack: function (audioTracks, context) {
    //return; // temporary disable
    // yt will lauch the player with the first audio track set as default
    // we need to select the audio track based on the preferred languages
    const preferredLanguages = _audioSelector.preferredLanguages;
    if (preferredLanguages === undefined) {
      _audioSelector.logger('No preferred languages found');
      return;
    }

    const originalAudioTrackLang = audioTracks.find((e) => {
      let result = e.audioTrack?.id.includes('.4');
      if (result) {
        // e.g "en.4" or "en-GB.4"
        _audioSelector.logger(['Original audio track found by id magic number (4)', e.audioTrack.id]);
      }
      return result;
    });

    if (originalAudioTrackLang === undefined) {
      _audioSelector.logger('No original audio track found');
      return;
    }

    const matchedLang = [];

    for (let audioTrackOption of audioTracks) {
      const lang = audioTrackOption.audioTrack.displayName;
      const langCode = audioTrackOption.audioTrack.id.split(/[-\.]/)[0];
      // original track is a preferred language, select it. - Strategy 1
      if (preferredLanguages.includes(langCode) && originalAudioTrackLang.audioTrack.displayName === lang) {
        _audioSelector.logger(
          `Strategy 1 (matched original) - Selecting ${lang} audio track for video ${context.videoDetails.title} (${context.videoDetails.videoId})`
        );
        _audioSelector.applyLanguage(lang, audioTracks, context, audioTrackOption.audioTrack.id);
        return;
      }
      // original track is not a preferred language, select the first preferred language. - Strategy 2
      // remember matched language
      if (preferredLanguages.includes(lang)) {
        matchedLang.push(audioTrackOption);
      }
    }

    // sort the matched languages by the order of the preferred languages
    matchedLang.sort((a, b) => preferredLanguages.indexOf(a.lang) - preferredLanguages.indexOf(b.lang));
    _audioSelector.logger(['Matched Languages', matchedLang]);

    // select the first matched preferred language
    if (matchedLang.length > 0) {
      const firstMatchedLang = matchedLang[0];
      _audioSelector.logger(
        `Strategy 2 (first match) - Selecting ${firstMatchedLang.lang} Audio Track for video ${context.videoDetails.title} (${context.videoDetails.videoId})`
      );
      _audioSelector.applyLanguage(
        firstMatchedLang.audioTrack.displayName,
        audioTracks,
        context,
        firstMatchedLang.audioTrack.id
      );
      return;
    }

    // no preferred language found, select the original track - Strategy 3
    if (!matchedLang.length && originalAudioTrackLang) {
      _audioSelector.logger(
        `Strategy 3 (original) - Selecting ${originalAudioTrackLang.audioTrack.displayName} Audio Track for video ${context.videoDetails.title} (${context.videoDetails.videoId})`
      );
      _audioSelector.applyLanguage(
        originalAudioTrackLang.audioTrack.displayName,
        audioTracks,
        context,
        originalAudioTrackLang.audioTrack.id
      );
    }
  },

  updateData: function (data) {
    _audioSelector.preferredLanguages = data.selectedLanguages;
    _audioSelector.enabled = data.enabled;
    _audioSelector.logEnv = data.logEnv;
  },

  reconnectPort: function () {
    clearInterval(_audioSelector.heartbeatInterval);
    try {
      _audioSelector.port = chrome.runtime.connect(_audioSelector.extensionId);
      _audioSelector.port.onMessage.addListener(_audioSelector.messageHandler);
      _audioSelector.port.onDisconnect.addListener(_audioSelector.disconnectHandler);
      _audioSelector.heartbeatInterval = setInterval(_audioSelector.heartbeatFunction, 5000);
      _audioSelector.logger('AudioSelector Extension Port reconnected');
    } catch (error) {
      setTimeout(() => {
        _audioSelector.reconnectPort();
      }, 1000);
    }
  },

  messageHandler: function (message) {
    if (message.type === _audioSelector.RESPONSES.PREFERRED_LANGUAGES_DATA) {
      _audioSelector.logger(['Received preferred languages update', message.data]);
      _audioSelector.updateData(message.data);
    }
  },
  disconnectHandler: function () {
    _audioSelector.logger('AudioSelector Extension Port disconnected');
    // try to reconnect to the background script
    clearInterval(_audioSelector.heartbeat);
    setTimeout(_audioSelector.reconnectPort, 1000);
  },

  playerResponseHandler: function (fetchPromise) {
    return fetchPromise.then((responseBefore) => {
      const response = responseBefore.clone();
      return response
        .text()
        .then((textBefore) => {
          let textAfter = textBefore;
          if (textBefore.includes('audioIsDefault')) {
            const responseContext = JSON.parse(textBefore);
            const audioTracks = responseContext.streamingData.adaptiveFormats.filter((format) =>
              format.mimeType.includes('audio')
            );
            _audioSelector.logger('modifying response');
            _audioSelector.selectAudioTrack(audioTracks, responseContext);
            responseContext.streamingData.adaptiveFormats = audioTracks;
            if (responseContext.playerConfig?.mediaCommonConfig !== undefined) {
              //responseContext.playerConfig.mediaCommonConfig.useServerDrivenAbr = false;
            }

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
          _audioSelector.logger(['Response modified', responseBefore, responseAfter]);
          _audioSelector.logger([responseBefore.headers, responseAfter.headers]);
          return responseBefore; // experimental, only rely on local storage patching
          return responseAfter;
        })
        .catch((reason) => {
          _audioSelector.logger(['Failed to read response text', reason]);
          return responseBefore;
        });
    });
  },
  getSettingValuesResponseHandler: function (fetchPromise) {
    const videoId =
      new URL(navigator.location.href).searchParams.get('v') ||
      new URL(navigator.location.href).pathname.split('/').pop();
    return fetchPromise.then((responseBefore) => {
      const response = responseBefore.clone();
      return response
        .json()
        .catch((error) => {
          _audioSelector.logger(['Failed to parse JSON', error]);
          return responseBefore;
        })
        .then((jsonBefore) => {
          let jsonAfter = jsonBefore;
          if (jsonBefore?.settingValues) {
            _audioSelector.logger('modifying get_setting_values response');
            // patch the audio language setting value to the preferred language
            if (Array.isArray(jsonAfter.settingValues)) {
              for (const setting of jsonAfter.settingValues) {
                if (setting.key === '483') {
                  setting.value = {
                    stringValue:
                      _audioSelector.videoLanguageCache[videoId] || _audioSelector.preferredLanguages[0] || 'en.4',
                  };
                }
              }
            }
          }
          const responseAfter = new Response(JSON.stringify(jsonAfter), {
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
          _audioSelector.logger(['Response modified', responseBefore, responseAfter]);
          return responseAfter;
        })
        .catch((reason) => {
          _audioSelector.logger(['Failed to read get_setting_values response', reason]);
          return responseBefore;
        });
    });
  },

  responseModifyHandler: {
    '/youtubei/v1/player': _audioSelector.playerResponseHandler,
    '/youtubei/v1/account/get_setting_values': _audioSelector.getSettingValuesResponseHandler,
  },

  getResponseModifyHandler: function (fetchArg0) {
    if (typeof fetchArg0 === 'string') {
      const url = new URL(fetchArg0);
      const path = url.pathname;
      return _audioSelector.responseModifyHandler[path] || null;
    }
    if (fetchArg0.url) {
      const url = new URL(fetchArg0.url);
      const path = url.pathname;
      return _audioSelector.responseModifyHandler[path] || null;
    }
    return null;
  },

  init: function () {
    const escapeHTMLPolicy = trustedTypes.createPolicy('myEscapePolicy', {
      createHTML: (string) => string,
    });

    const notificationDialogHTML = escapeHTMLPolicy.createHTML(`
    <dialog id="audioSelectorNotificationDialog">
      ytAudioSelector: audio language updated to 
      <span id="audioSelectorNotificationLang"></span>
    </dialog>
    `);

    const tmp = document.createElement('div');
    tmp.innerHTML = notificationDialogHTML;
    const notificationDialog = tmp.querySelector('#audioSelectorNotificationDialog');

    _audioSelector.notificationDialog = notificationDialog;
    _audioSelector.notificationLangSpan = notificationDialog.querySelector('#audioSelectorNotificationLang');

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
      notificationDialog.addEventListener('click', (e) => {
        this.logger('notification dialog clicked --> closing');
        e.preventDefault();
        notificationDialog.close();
      });
      // fix for the first notification.
      // reset the notificationTimeout, as the first one is shown delayed, due to the dialog not being appended to the DOM
      _audioSelector.initialNotification &&
        clearTimeout(_audioSelector.notificationTimeout) &&
        notificationDialog.show();
      _audioSelector.notificationTimeout = setTimeout(() => {
        notificationDialog.close();
      }, 2500);
    }, 0);

    setInterval(_audioSelector.heartbeatFunction, 5000);

    // requires externally_connectable in manifest --> documentation https://developer.chrome.com/docs/extensions/develop/concepts/messaging#external-webpage
    // use sendmessage to request preferred languages from the extension once for the page initialization
    chrome.runtime.sendMessage(
      _audioSelector.extensionId,
      { type: this.REQUESTS.PREFERRED_LANGUAGES_REQUEST },
      (response) => {
        _audioSelector.logger(['Received preferred languages', response.data]);
        _audioSelector.updateData(response.data);
      }
    );
    _audioSelector.port.onMessage.addListener(_audioSelector.messageHandler);
    _audioSelector.port.onDisconnect.addListener(_audioSelector.disconnectHandler);

    // hook ytInitialPlayerResponse to catch "default audio track" from doc response
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      set: function (obj) {
        if (
          _audioSelector.enabled === true &&
          // check if the player has multiple audio tracks
          obj.streamingData?.adaptiveFormats?.some((format) => format.audioTrack?.audioIsDefault === true)
        ) {
          _audioSelector.logger('applying audio language fix');
          _audioSelector.initialNotification = true;
          const audioTracks = obj.streamingData.adaptiveFormats.filter((format) => format.audioTrack !== undefined);
          _audioSelector.selectAudioTrack(audioTracks, obj);
          if (obj.playerConfig?.mediaCommonConfig !== undefined) {
            //obj.playerConfig.mediaCommonConfig.useServerDrivenAbr = false;
          }
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
            const responseModifyHandler = _audioSelector.getResponseModifyHandler(args[0]);
            if (responseModifyHandler === null) {
              return fetchPromise;
            }

            _audioSelector.logger(['fetching', args[0], fetchPromise]);
            //return fetchPromise;
            return responseModifyHandler(fetchPromise).catch((reason) => {
              _audioSelector.logger(['Failed to fetch', reason]);
              return fetchPromise;
            });
          } catch (error) {
            _audioSelector.logger(['generic error', error]);
          }
        },
      }));
  },
};

_audioSelector.init();
