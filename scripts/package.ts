import {copyFile, mkdir} from "node:fs/promises";


await mkdir("dist", {recursive: true})

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

