# base.js

* line 77236 ytp-audio-menu-item


ytp-menuitem --> click handler with language (line 124424)
ytp-menuitem-label


Need to find aE "this" object being used in the functions (line 130569)

Using the "this" object can then be used to get video audio options (aE.tracks[])


* new aE(this.C, this) line 131213

_yt_player.b --> temporary variable for every object creation

### almost bottom of the file, 
```js
g.Km.create = function(P, v, l, e) {
        try {
            var h = typeof P === "string" ? P : "player" + g.sy(P)
              , z = A9[h];
            if (z) {
                try {
                    z.dispose()
                } catch (Q) {
                    g.Zx(Q)
                }
                A9[h] = null
            }
            var m = new g.Km(P,v,l,e);
            m.addOnDisposeCallback(function() {
                A9[h] = null;
                m.Uv && m.Uv()
            });
            return A9[h] = m // this is not a global variable on window... 
        } catch (Q) {
            throw g.Zx(Q),
            (Q && Q instanceof Error ? Q : Error(String(Q))).stack;
        }
    }
    ;

```