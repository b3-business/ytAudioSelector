import manifest from "../manifest.json" with {type: "json"}
import packagejson from "../package.json" with {type: "json"}

const version = packagejson.version;
manifest.version = version;

// Write the updated manifest back to the file
await Bun.write("manifest.json", JSON.stringify(manifest, null, 2));
