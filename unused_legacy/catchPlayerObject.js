console.log("injecting script to catch player object");

Object.defineProperty(window, "_yt_player", {
  set: function (obj) {
    if (Object.keys(obj).length === 0) {
      console.log("empty object, blocking");
      return;
    }
    this._hooked_yt_player = obj;
  },
  get: function () {
    return this._hooked_yt_player;
  },
});

//pass non empty object to _yt_player because empty object is blocked, so it will not be set
window._yt_player = new Proxy(
  {
    _proxy: true,
  },
  {
    set: function (target, property, value) {
      // player constructor has 4 arguments, the document has inline script referencing this constructor
      if (typeof value === "function" && value.length === 4) {
        //console.log("potential Youtube Player constructor hooked", value);
        target[property] = new Proxy(value, {
          construct: function (target, args) {
            const instance = new target(...args);
            if (Object.keys(target).includes("create")) {
              console.log("Youtube Player instance creator hooked", instance);
              window._hooked_yt_player_instance = instance;
            }
            return instance;
          },
        });
        return true;
      }

      target[property] = value;
      return true;
    },
  }
);