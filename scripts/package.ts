import {copyFile, mkdir} from "node:fs/promises";

await mkdir("dist", {recursive: true})
await mkdir("dist/icons", {recursive: true})

import manifest from "../manifest.json" with {type: "json"}

// extensions root
await copyFile("manifest.json", "dist/manifest.json")
await copyFile("LICENSE.md", "dist/LICENSE.md")
await copyFile("README.md", "dist/README.md")
await copyFile("background.js", "dist/background.js")

// options
await copyFile("constants.js", "dist/constants.js")
await copyFile("options.html", "dist/options.html")
await copyFile("options.js", "dist/options.js")
await copyFile("options.css", "dist/options.css")

// inject
await copyFile("audioSelector.css", "dist/audioSelector.css")
await copyFile("setPreferredLanguage.js", "dist/setPreferredLanguage.js")

// icons
await copyFile("icons/YtBadgeIcon_48.png", "dist/icons/YtBadgeIcon_48.png")
await copyFile("icons/YtBadgeIcon_64.png", "dist/icons/YtBadgeIcon_64.png")
await copyFile("icons/YtBadgeIcon_128.png", "dist/icons/YtBadgeIcon_128.png")

// remove dev key from manifest for zip
// @ts-ignore
delete manifest.key 
await Bun.write("dist/manifest.json", JSON.stringify(manifest, null, 2))