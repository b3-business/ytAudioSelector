// This script is intended to be used in a website's context
// where window.localStorage is available.

(function() {
  if (window && window.localStorage && typeof window.localStorage.setItem === 'function') {
    const originalSetItem = window.localStorage.setItem;

    window.localStorage.setItem = function(key, value) {
      console.log('window.localStorage.setItem called. \nKey:', key, '\nValue:', value);
      if (key === 'yt-player-user-settings') {
        console.trace('Stack trace:');
      }
      // 'this' in localStorage methods refers to the localStorage object itself.
      return originalSetItem.apply(window.localStorage, [key, value]);
    };

    console.log('window.localStorage.setItem has been hooked.');
  } else {
    console.error('window.localStorage.setItem not found. Hooking failed.');
  }
})();