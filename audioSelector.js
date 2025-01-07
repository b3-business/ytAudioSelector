console.log("Audio Selector Script Loaded");

// load the preferences from the local storage
const preferedLanguages =
  JSON.parse(localStorage.getItem("preferedLanguages")) || [];
const p = [];

function isOriginalAudioTrack(language) {
  return language.includes("original");
}

function main() {
  let settingsAudioTrackElement = document.querySelectorAll(
    "#ytp-id-18 > div > div > div.ytp-menuitem.ytp-audio-menu-item"
  );

  if (settingsAudioTrackElement.length < 1) {
    console.log("No Audio Track Element Found");
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
    return;
  }
  const originalAudioTrack = audioTrackOptions.find((e) =>
    isOriginalAudioTrack(e.lang)
  );

  
}

main();
