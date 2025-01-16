# Youtube Audio Selector

Youtube for some reason sometimes selects an audio track that you may not want. 
This extension allows you to predefine languages, which will be selected automatically when you open a video.

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
* Add Extension from the Chrome Web Store
* Open the extension Popup (or the options page) to select your prefered audio languages.
* Move or remove any languages you dont want. 


## possible improvements

Currently the extension tries to find the settings button and the audio track button by their class names.

It would be better to actually get the audio options via the actual player api, but as "base.js" is minified, I am not sure how to do that. 

## Screenshots

![image](https://github.com/user-attachments/assets/dd36aa1a-7912-4f0c-954c-35f269fb54cf)

