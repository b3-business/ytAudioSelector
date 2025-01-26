console.log("injecting script to catch player object");

Object.defineProperty(window, "_yt_player", {
  set: function (obj) {
    console.log("setter _yt_player", {...obj});
    if (Object.keys(obj).length === 0) {
      console.log("empty object, blocking");
      return;
    }
    this._hooked_yt_player = obj;
  },
  get: function () {
    console.log("getter _yt_player");
    return this._hooked_yt_player;
  },
});

window._yt_player = {
  set O(obj) {
    const o = {...obj};
    if (Object.keys(o).length > 0) {
      console.log("O", {...obj});
    }
    this._hooked_O = obj;
  },
  get O() {
    return this._hooked_O;
  },
};
