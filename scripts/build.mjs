import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST_DIR = path.join(ROOT_DIR, "dist");

const REQUIRED_FILES = [
  "index.html",
  "herotower.PNG",
  "herotower-1200.webp",
  "herotower-1678.webp",
  "herotower-2200.webp",
  "herotower-1200.avif",
  "herotower-1678.avif",
  "herotower-2200.avif",
  "src/styles/main.css",
  "src/js/app.js",
  "vendor/three.min.js",
  "vendor/THREE-LICENSE.txt",
  "assets/preview.svg",
];

for (const relativePath of REQUIRED_FILES) {
  const fullPath = path.join(ROOT_DIR, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing required source file: ${relativePath}`);
  }
}

execFileSync(process.execPath, ["--check", path.join(ROOT_DIR, "src/js/app.js")], {
  stdio: "inherit",
});

const indexHtml = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
const localAssetPattern = /(?:href|src)=["'](\.\/[^"']+)["']/g;
for (const match of indexHtml.matchAll(localAssetPattern)) {
  const assetPath = path.resolve(ROOT_DIR, match[1]);
  if (!fs.existsSync(assetPath)) {
    throw new Error(`Broken asset reference in index.html: ${match[1]}`);
  }
}

fs.rmSync(DIST_DIR, { recursive: true, force: true });
fs.mkdirSync(DIST_DIR, { recursive: true });
fs.copyFileSync(path.join(ROOT_DIR, "index.html"), path.join(DIST_DIR, "index.html"));
const HERO_FILES = [
  "herotower.PNG",
  "herotower-1200.webp",
  "herotower-1678.webp",
  "herotower-2200.webp",
  "herotower-1200.avif",
  "herotower-1678.avif",
  "herotower-2200.avif",
];
for (const hero of HERO_FILES) {
  fs.copyFileSync(path.join(ROOT_DIR, hero), path.join(DIST_DIR, hero));
}
fs.cpSync(path.join(ROOT_DIR, "vendor"), path.join(DIST_DIR, "vendor"), { recursive: true });
fs.cpSync(path.join(ROOT_DIR, "src"), path.join(DIST_DIR, "src"), { recursive: true });
fs.cpSync(path.join(ROOT_DIR, "assets"), path.join(DIST_DIR, "assets"), { recursive: true });

console.log("Build completed successfully -> dist/");
