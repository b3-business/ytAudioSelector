const _audioSelector_ExtensionId = 'oekkkogcccckecdkgnlnbblcfiafehaj';

// send message to extention to wake it up. its potentially inactive by chrome
chrome.runtime.sendMessage(_audioSelector_ExtensionId, { type: 'ping' }, (response) => {
  if (response.type === 'pong') {
    console.log('Background script is active');
  }
});

class AudioSelector {
  constructor() {
    this.extensionId = _audioSelector_ExtensionId;
    this.preferredLanguages = [];
    this.enabled = false;
    this.logEnv = 'DEV';
    this.port = chrome.runtime.connect(this.extensionId);
    this.notificationDialog = null;
    this.notificationLangSpan = null;
    this.initialNotification = false;
    this.notificationTimeout = undefined;
    this.REQUESTS = {
      PREFERRED_LANGUAGES_REQUEST: 'preferredLanguagesRequest',
      PING: 'ping',
    };
    this.RESPONSES = {
      PREFERRED_LANGUAGES_DATA: 'preferredLanguagesData',
      PONG: 'pong',
    };
    this.videoLanguageCache = {};
    this.heartbeatInterval = undefined;

    this.responseModifyHandler = {
      '/youtubei/v1/player': this.playerResponseHandler.bind(this),
      '/youtubei/v1/account/get_setting_values': this.getSettingValuesResponseHandler.bind(this),
    };

    this.port.onMessage.addListener(this.messageHandler.bind(this));
    this.port.onDisconnect.addListener(this.disconnectHandler.bind(this));
  }

  logger(logArguments) {
    if (this.logEnv === 'DEV') {
      console.log(logArguments);
    }
  }

  heartbeatFunction() {
    try {
      //_audioSelector.logger("heartbeat ping");
      this.port.postMessage({
        type: this.REQUESTS.PING,
      });
    } catch (error) {
      // port is disconnected
      clearInterval(this.heartbeatInterval);
      this.reconnectPort();
    }
  }

  setLocalStorage(key, value) {
    this.logger(['Setting localStorage', key, value]);
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  patchYTPlayerUserSettingsLocalStorage(lang) {
    // in a recent update youtube added a really dumb "quick fix" for the audio track selection, patching the localStorage to make it work again
    lang = lang || 'en.4'; // "en.4", "en-US.4", or default to "en.4" - works best with full code!
    let userSettings = {
      // 483 seems to be the key for audio language setting
      483: {
        stringValue: lang,
      },
    };

    try {
      const localStorageItem = window.localStorage.getItem('yt-player-user-settings');
      this.logger(['Settings from localStorage', localStorageItem]);
      if (localStorageItem === null) {
        this.setLocalStorage('yt-player-user-settings', {
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

      this.setLocalStorage('yt-player-user-settings', {
        creation: Date.now(),
        data: JSON.stringify(userSettings),
        expiration: Date.now() + 1000 * 60 * 60 * 24 * 30, // 1 month
      });
      // force overriding multiple times, as youtube seems to read and write this localStorage item multiple times
      // multiple force patching no longer required, as the xmlHttpRequest is patched to modify the response directly
    } catch (error) {
      this.logger(['Failed to patch ytPlayerUserSettings localStorage', error]);
    }
  }

  applyLanguage(lang, audioTracks, context, langId) {
    this.logger(
      `Applying audio language: ${lang} for video ${context.videoDetails.title} (${context.videoDetails.videoId})`
    );
    this.videoLanguageCache[context.videoDetails.videoId] = {
      lang: lang,
      langId: langId,
    };
    this.patchYTPlayerUserSettingsLocalStorage(langId);
    // set the audio track as default
    // audioTracks.forEach((audioTrackOption) => {
    //   if (audioTrackOption.audioTrack.displayName === lang) {
    //     audioTrackOption.audioTrack.audioIsDefault = true;
    //   } else {
    //     audioTrackOption.audioTrack.audioIsDefault = false;
    //   }
    // });
    this.notificationLangSpan.textContent = lang;
    this.notificationDialog.show();
    this.notificationTimeout = setTimeout(() => {
      this.notificationDialog.close();
    }, 2500);
  }

  selectAudioTrack(audioTracks, context) {
    // yt will lauch the player with the first audio track set as default
    // we need to select the audio track based on the preferred languages
    const preferredLanguages = this.preferredLanguages;
    if (preferredLanguages === undefined) {
      this.logger('No preferred languages found');
      return;
    }

    const originalAudioTrackLang = audioTracks.find((e) => {
      let result = e.audioTrack?.id.includes('.4');
      if (result) {
        // e.g "en.4" or "en-US.4"
        this.logger(['Original audio track found by id magic number (4)', e.audioTrack.id]);
      }
      return result;
    });

    if (originalAudioTrackLang === undefined) {
      this.logger('No original audio track found');
      return;
    }

    const matchedLang = [];

    for (let audioTrackOption of audioTracks) {
      const lang = audioTrackOption.audioTrack.displayName;
      const langCode = audioTrackOption.audioTrack.id.split(/[-\.]/)[0];
      // original track is a preferred language, select it. - Strategy 1
      if (preferredLanguages.includes(langCode) && originalAudioTrackLang.audioTrack.displayName === lang) {
        this.logger(
          `Strategy 1 (matched original) - Selecting ${lang} audio track for video ${context.videoDetails.title} (${context.videoDetails.videoId})`
        );
        this.applyLanguage(lang, audioTracks, context, audioTrackOption.audioTrack.id);
        return;
      }
      // original track is not a preferred language, select the first preferred language. - Strategy 2
      // remember matched language
      if (preferredLanguages.includes(lang)) {
        matchedLang.push(audioTrackOption);
      }
    }

    matchedLang.sort((a, b) => preferredLanguages.indexOf(a.lang) - preferredLanguages.indexOf(b.lang));
    this.logger(['Matched Languages', matchedLang]);

    // select the first matched preferred language
    if (matchedLang.length > 0) {
      const firstMatchedLang = matchedLang[0];
      this.logger(
        `Strategy 2 (first match) - Selecting ${firstMatchedLang.audioTrack.displayName} Audio Track for video ${context.videoDetails.title} (${context.videoDetails.videoId})`
      );
      this.applyLanguage(firstMatchedLang.audioTrack.displayName, audioTracks, context, firstMatchedLang.audioTrack.id);
      return;
    }

    // no preferred language found, select the original track - Strategy 3
    if (!matchedLang.length && originalAudioTrackLang) {
      this.logger(
        `Strategy 3 (original) - Selecting ${originalAudioTrackLang.audioTrack.displayName} Audio Track for video ${context.videoDetails.title} (${context.videoDetails.videoId})`
      );
      this.applyLanguage(
        originalAudioTrackLang.audioTrack.displayName,
        audioTracks,
        context,
        originalAudioTrackLang.audioTrack.id
      );
    }
  }

  updateData(data) {
    this.preferredLanguages = data.selectedLanguages;
    this.enabled = data.enabled;
    this.logEnv = data.logEnv;
  }

  reconnectPort() {
    clearInterval(this.heartbeatInterval);
    try {
      this.port = chrome.runtime.connect(this.extensionId);
      this.port.onMessage.addListener(this.messageHandler.bind(this));
      this.port.onDisconnect.addListener(this.disconnectHandler.bind(this));
      this.heartbeatInterval = setInterval(this.heartbeatFunction.bind(this), 5000);
      this.logger('AudioSelector Extension Port reconnected');
    } catch (error) {
      setTimeout(() => {
        this.reconnectPort();
      }, 1000);
    }
  }

  messageHandler(message) {
    if (message.type === this.RESPONSES.PREFERRED_LANGUAGES_DATA) {
      this.logger(['Received preferred languages update', message.data]);
      this.updateData(message.data);
    }
  }

  disconnectHandler() {
    this.logger('AudioSelector Extension Port disconnected');
    // try to reconnect to the background script
    clearInterval(this.heartbeat);
    setTimeout(this.reconnectPort.bind(this), 1000);
  }

  playerResponseHandler(fetchPromise) {
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
            this.logger('modifying response');
            this.selectAudioTrack(audioTracks, responseContext);
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
          this.logger(['Response modified', responseBefore, responseAfter]);
          this.logger([responseBefore.headers, responseAfter.headers]);
          return responseBefore; // experimental, only rely on local storage patching
          // return responseAfter;
        })
        .catch((reason) => {
          this.logger(['Failed to read response text', reason]);
          return responseBefore;
        });
    });
  }

  getSettingValuesResponseHandler(responseString) {
    const videoId = new URL(location.href).searchParams.get('v') || new URL(location.href).pathname.split('/').pop();
    let jsonBefore;
    try {
      jsonBefore = JSON.parse(responseString);
    } catch (error) {
      this.logger(['Failed to parse JSON string', error, responseString]);
      return responseString; // Return original string if parsing fails
    }

    let jsonAfter = JSON.parse(JSON.stringify(jsonBefore)); // Deep clone to avoid modifying the original object if it's passed by reference elsewhere

    if (jsonAfter?.settingValues) {
      this.logger('modifying get_setting_values response (synchronous)');
      if (Array.isArray(jsonAfter.settingValues)) {
        for (const setting of jsonAfter.settingValues) {
          if (setting.key === '483') {
            const preferredLangId =
              this.preferredLanguages && this.preferredLanguages.length > 0
                ? this.preferredLanguages[0] // Assuming preferredLanguages stores full IDs like "en.4" or just codes like "en"
                : 'en.4'; // Default

            let langIdToSet = preferredLangId;
            if (!preferredLangId.includes('.')) {
              // Basic check if it's a code vs full ID
              langIdToSet = preferredLangId + '.4';
            }

            setting.value = {
              // Use videoLanguageCache if available, otherwise use the first preferred language, or default
              stringValue: this.videoLanguageCache[videoId]?.langId || preferredLangId,
            };
            this.logger([`Patched setting '483' to stringValue: ${setting.value.stringValue}`]);
          }
        }
      }
    } else {
      this.logger(['No settingValues found in the provided JSON string', jsonBefore]);
      // Return original string if structure is not as expected, or handle as needed
      return responseString;
    }

    try {
      const modifiedString = JSON.stringify(jsonAfter);
      this.logger(['Response modified (synchronous)', responseString, modifiedString]);
      return modifiedString;
    } catch (error) {
      this.logger(['Failed to stringify modified JSON object', error, jsonAfter]);
      return responseString; // Return original string if stringifying fails
    }
  }

  getResponseModifyHandler(fetchArg0) {
    if (typeof fetchArg0 === 'string') {
      this.logger(['fetch called with string', fetchArg0]);
      const url = new URL(fetchArg0, window.location.href);
      const path = url.pathname;
      return this.responseModifyHandler[path] || null;
    }
    if (fetchArg0.url) {
      this.logger(['fetch called with object', fetchArg0]);
      const url = new URL(fetchArg0.url, window.location.href);
      const path = url.pathname;
      return this.responseModifyHandler[path] || null;
    }
    return null;
  }

  init() {
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

    this.notificationDialog = notificationDialog;
    this.notificationLangSpan = notificationDialog.querySelector('#audioSelectorNotificationLang');

    const appendNotificationDialog = () => {
      if (document.body) {
        document.body.appendChild(notificationDialog);
        return true;
      }
      return false;
    };

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
      this.initialNotification && clearTimeout(this.notificationTimeout) && notificationDialog.show();
      this.notificationTimeout = setTimeout(() => {
        notificationDialog.close();
      }, 2500);
    }, 0);

    setInterval(this.heartbeatFunction.bind(this), 5000);

    // requires externally_connectable in manifest --> documentation https://developer.chrome.com/docs/extensions/develop/concepts/messaging#external-webpage
    // use sendmessage to request preferred languages from the extension once for the page initialization
    chrome.runtime.sendMessage(this.extensionId, { type: this.REQUESTS.PREFERRED_LANGUAGES_REQUEST }, (response) => {
      this.logger(['Received preferred languages', response.data]);
      this.updateData(response.data);
    });

    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      set: (obj) => {
        try {
          if (
            _audioSelector.enabled === true &&
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
        } catch (error) {
          _audioSelector.logger(['Error in ytInitialPlayerResponse setter', error]);
        }
        window._hooked_ytInitialPlayerResponse = obj;
      },
      get: function () {
        return window._hooked_ytInitialPlayerResponse;
      },
    });

    // UBO fetch hook -- credits to Raymond Hill
    window.fetch = new Proxy(window.fetch, {
      apply: (target, thisArg, args) => {
        const fetchPromise = Reflect.apply(target, thisArg, args);
        try {
          if (this.enabled === false) {
            return fetchPromise;
          }
          const responseModifyHandler = this.getResponseModifyHandler(args[0]);
          if (responseModifyHandler === null) {
            return fetchPromise;
          }
          const url = args[0] instanceof Request ? args[0].url : args[0];
          this.logger(['fetching', url, fetchPromise]);
          return responseModifyHandler(fetchPromise).catch((reason) => {
            this.logger(['Failed to fetch', reason]);
            return fetchPromise;
          });
        } catch (error) {
          this.logger(['generic error', error]);
          return fetchPromise;
        }
      },
    });

    // --- Intercept XMLHttpRequest constructor to modify response ---
    (function () {
      try {
        window.XMLHttpRequest = new Proxy(window.XMLHttpRequest, {
          construct(target, args) {
            if (_audioSelector.enabled === false) {
              return new target(...args);
            }
            _audioSelector.logger('Intercepting XMLHttpRequest constructor');
            const xhr = new target(...args);
            const onloadHandler = [];
            let intercept = false;

            const xhrProxy = new Proxy(xhr, {
              get(target, prop) {
                if (target[prop] && typeof target[prop] !== 'function') {
                  return target[prop];
                }
                if (prop === 'open') {
                  return function (...args) {
                    if (args[1] && args[1].includes('/youtubei/v1/account/get_setting_values')) {
                      intercept = true;
                      xhr.addEventListener('load', function () {
                        _audioSelector.logger('Intercepted XMLHttpRequest response');
                        const final = () => {
                          // we dont care about error handling here, the caller should handle it
                          onloadHandler.forEach((handler) => handler.call(this));
                        };

                        const responseModifyHandler = _audioSelector.getResponseModifyHandler(args[1]);
                        // this.responseText and this.response are not writable, so we use Object.defineProperty
                        if (!responseModifyHandler) {
                          final();
                          return;
                        }
                        Object.defineProperty(this, 'responseText', {
                          value: responseModifyHandler(this.responseText),
                        });
                        Object.defineProperty(this, 'response', {
                          value: responseModifyHandler(this.response),
                        });
                        _audioSelector.logger(['Modified get_setting_values response', this.responseText, this.response]);
                        final();
                        return;
                      });
                    }
                    return target[prop].apply(xhr, args);
                  };
                }
                if (prop === 'addEventListener') {
                  return function (...args) {
                    if (args[0] === 'load' && intercept) {
                      onloadHandler.push(args[1]);
                      return;
                    }
                  };
                }
                return target[prop].bind(xhr);
              },
              set(target, prop, value) {
                if (prop === 'onload' && intercept) {
                  onloadHandler.push(value);
                  return true;
                }

                target[prop] = value;
                return true;
              },
            });

            return xhrProxy;
          },
        });
      } catch (e) {
        console.error('Error intercepting XMLHttpRequest:', e);
      }
    })();
  }
}

const _audioSelector = new AudioSelector();
_audioSelector.init();
