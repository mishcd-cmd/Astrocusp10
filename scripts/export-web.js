/* scripts/export-web.js */
const { execSync } = require("child_process");

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

try {
  // Use Expo’s official web export. This generates a folder called "dist".
  // Works with Expo SDK 51.
  run("npx expo export -p web");

  console.log("\n✅ Expo web export completed. Output folder: dist\n");
} catch (err) {
  console.error("\n❌ Web export failed.\n");
  process.exit(1);
}
