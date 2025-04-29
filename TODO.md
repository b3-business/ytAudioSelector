* Fix video firstload issue 
  * `document.querySelector("#movie_player").setAudioTrack(tracks.find((t)=>t.Ef.id.includes("en")))`
  * use this for verification that the extension worked
  * verification will not work on shorts without audio selection, as they dont have any "languages" in the player, despite available.

* Fix Short Firstload issue on shorts without audio selection available. (HARD)

