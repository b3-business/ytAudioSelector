# Youtube Audio Selector

Youtube for some reason sometimes selects an audio track that you may not want.
This extension allows you to predefine languages, which will be selected automatically when you open a video.

## Link to Chrome Web Store
[ChromeWebStore - YoutubeAudioSelector]( https://chromewebstore.google.com/detail/youtube-audio-selector/oekkkogcccckecdkgnlnbblcfiafehaj)

## Strategy

If one of the predefined languages is the original audio track of the video, it will be selected.
If not, the first matching predefined language will be selected. (in the order of the predefined languages)
If there is no predefined language or none of the languages match, the extension will still select the "original" audio track, if not already selected.

## Example

Video has 4 audio tracks:

- English (Original)
- French
- German
- Spanish

You have predefined:

- English
- Spanish

The extension will select the English audio track, as it is the original audio track of the video and english is one of the predefined languages.

If the video had no English audio track and the original audio track would be French the extension would select the Spanish audio track, as it is the first matching predefined language.

## How to use

- Add Extension from the Chrome Web Store
- Open the extension Popup (or the options page) to select your preferred audio languages.
- Move or remove any languages you dont want.

## How it works

This extension hooks the "ytInitialPlayerResponse" object, which contains the video data, including the audio tracks for the first video that is loaded.
Since we hooked this object, we can intercept the setter and change the `audioTrack.audioIsDefault` property to true for the preferred languages,
based on the strategy described above.

For the following videos (when accessing a new video from recommendations or in shorts), the extension hooks the fetch method, to intercept the loading of the video data. From there on it will again change the `audioTrack.audioIsDefault` property to true for the preferred languages.

The player initializes the video with the first audio track that has the `audioIsDefault` property set to true.
This extension overrides this property to select the preferred audio track instead.

## unused ideas

Currently the extension tries to find the settings button and the audio track button by their class names.

Access to the youtube player API can be found at `document.querySelector("#movie_player")`.
This includes most functions.

Basic data can be found at "window.ytcfg" and "window.ytInitialPlayerResponse".
ytInitialPlayerResponse contains the video data, including the audio tracks.

```js
window.ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer.audioTracks;
window.ytInitialPlayerResponse.streamingData.adaptiveFormats.filter(format =>
	format.mimeType.includes('audio')
);
```

However some further background information is missing from this API.
For example, the audioTracks via `document.querySelector("#movie_player").getAvailableAudioTracks()` are not accessable when using the /shorts/VIDEO_ID player.

Using the "./catchPlayerObject.js" script, we can catch the full player object, that is being created.
This object is still minified though, so its hard to actually find or use anything.

If possible, using this player object to force the audio track would be nice.

yotube sends the language in the protobuf body in the videoplayback request. field 1 --> 69 --> lang id code (de_DE.3, en.4) from initialPlayerResponse 
regardless of whats default 

## Screenshots

![image](https://github.com/user-attachments/assets/dd36aa1a-7912-4f0c-954c-35f269fb54cf)

---

# Dev Section

## Good Test Videos or Shorts

Test Short:
https://www.youtube.com/shorts/kiVfuhaHGL4
