/* scripts/spa-fallback.js */
const fs = require("fs");
const path = require("path");

const outDir = path.join(process.cwd(), "dist");
const indexHtml = path.join(outDir, "index.html");
const notFoundHtml = path.join(outDir, "404.html");

if (!fs.existsSync(outDir)) {
  console.error("❌ dist/ does not exist. Build did not produce output.");
  process.exit(1);
}

if (!fs.existsSync(indexHtml)) {
  console.error("❌ dist/index.html not found. Build output unexpected.");
  process.exit(1);
}

// Netlify SPA fallback: serve index.html for unknown routes
fs.copyFileSync(indexHtml, notFoundHtml);

console.log("✅ Wrote dist/404.html SPA fallback");
