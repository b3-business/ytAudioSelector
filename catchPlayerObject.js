console.log("injecting script to catch player object");

Object.defineProperty(window, '_yt_player', {
  set: function(obj) {
    console.log("_yt_player", obj);
    this._hooked_yt_player = obj;
  },
  get: function() {
    return this._hooked_yt_player;
  }
});

const _test_yt_player = {
  set b(obj) {
    console.log("b", obj);
    this._hooked_b = obj;
  },
  get b() {
    return this._hooked_b;
  }
};
