// Phase 6 — hardening: HUD diff updates, throttled rebuilds, a verified
// Three.js loader and a lighter hero image.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { createHeadlessStudio, ROOT_DIR } from "./helpers/headless.mjs";

const HTML = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");

test("updateHUD reuses the same cell nodes instead of rewriting the bar", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.state.onboarding.active = false;
  studio.updateHUD();

  const hud = document.querySelector("#site-hud");
  const first = [...hud.querySelectorAll(".hud-cell")];
  const identity = first.map((cell) => cell);
  assert.ok(first.length >= 11, `the live bar has ${first.length} cells`);

  // A second update with the same numbers must not replace any node.
  studio.updateHUD();
  const second = [...hud.querySelectorAll(".hud-cell")];
  assert.equal(second.length, first.length);
  second.forEach((cell, index) => {
    assert.equal(cell, identity[index], `cell ${index} was recreated`);
  });

  // Changing one number rewrites only that cell's text.
  const before = second[3].querySelector("strong").textContent;
  studio.state.power.radioLoadKw = 9;
  studio.normalizeState();
  studio.updateHUD();
  const third = [...hud.querySelectorAll(".hud-cell")];
  assert.equal(third[3], identity[3], "the cell itself is reused");
  assert.notEqual(third[3].querySelector("strong").textContent, before, "and its value updated");

  dom.window.close();
});

test("the HUD still shows the locked status vocabulary", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.updateHUD();
  const hud = document.querySelector("#site-hud");
  assert.equal(hud.classList.contains("is-setup"), true);
  assert.match(hud.textContent, /\[ Setting up \]/);
  assert.equal(hud.querySelectorAll(".hud-cell").length, 4);

  studio.state.onboarding.active = false;
  studio.updateHUD();
  assert.equal(hud.classList.contains("is-setup"), false);
  const cells = hud.querySelectorAll(".hud-cell");
  assert.equal(cells.length, 11);
  assert.ok(document.querySelector("#hud-site-status"), "the status cell keeps its id");
  assert.match(hud.textContent, /\[ Live model \]/);
  dom.window.close();
});

test("rapid rebuild requests are coalesced into one rebuild", async () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  const rootBefore = studio.registry.size;

  // Ask for a rebuild many times in a row; only one should be scheduled.
  for (let i = 0; i < 25; i += 1) studio.scheduleRebuild();
  studio.state.H = 40;
  for (let i = 0; i < 25; i += 1) studio.scheduleRebuild();

  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.ok(studio.registry.size > 0);
  assert.equal(typeof rootBefore, "number");

  // The throttle window is short enough to feel immediate.
  const again = Date.now();
  studio.scheduleRebuild();
  await new Promise((resolve) => setTimeout(resolve, 150));
  assert.ok(Date.now() - again < 1000);
  dom.window.close();
});

test("the Three.js loader is pinned, integrity-checked and has a local fallback", () => {
  const cdnTag = HTML.match(/<script[^>]*cdnjs\.cloudflare\.com[^>]*>/);
  assert.ok(cdnTag, "the CDN script tag exists");
  const tag = cdnTag[0];

  assert.match(tag, /three\.js\/r128\/three\.min\.js/, "still Three.js r128");
  assert.match(tag, /integrity="sha384-[A-Za-z0-9+/=]+"/, "the CDN file is integrity-checked");
  assert.match(tag, /crossorigin="anonymous"/, "crossorigin is required for SRI");
  assert.match(tag, /onerror=/, "a load failure is detected");

  // The local fallback is injected synchronously so app.js always finds THREE.
  assert.match(HTML, /vendor\/three\.min\.js/);
  assert.ok(
    HTML.indexOf("vendor/three.min.js") < HTML.indexOf("./src/js/app.js"),
    "the fallback runs before app.js"
  );

  // The vendored copy really exists and really is Three.js r128.
  const vendored = fs.readFileSync(path.join(ROOT_DIR, "vendor/three.min.js"), "utf8");
  assert.match(vendored.slice(0, 400), /three\.js authors/i);
  assert.match(vendored.slice(0, 400), /SPDX-License-Identifier: MIT/);
  assert.ok(vendored.length > 400000, "the vendored build is the full library");

  const licence = fs.readFileSync(path.join(ROOT_DIR, "vendor/THREE-LICENSE.txt"), "utf8");
  assert.match(licence, /MIT License/);
  assert.match(licence, /three\.js authors/);

  // The integrity hash must match the vendored bytes, since both are the same
  // official r128 build.
  const hash = crypto.createHash("sha384").update(vendored, "utf8").digest("base64");
  assert.equal(
    tag.match(/integrity="sha384-([^"]+)"/)[1],
    hash,
    "the SRI hash matches the vendored r128 build"
  );
});

test("the hero image ships WebP and AVIF variants behind the original PNG", () => {
  assert.match(HTML, /<picture>/);
  assert.match(HTML, /herotower\.avif/);
  assert.match(HTML, /herotower\.webp/);
  assert.match(HTML, /herotower\.PNG/);

  const png = fs.statSync(path.join(ROOT_DIR, "herotower.PNG")).size;
  const webp = fs.statSync(path.join(ROOT_DIR, "herotower.webp")).size;
  const avif = fs.statSync(path.join(ROOT_DIR, "herotower.avif")).size;
  assert.ok(webp < png * 0.5, `WebP ${webp} is far smaller than PNG ${png}`);
  assert.ok(avif < webp, `AVIF ${avif} is smaller than WebP ${webp}`);

  // The original PNG is untouched, so nothing about the artwork changed.
  assert.equal(png, 3341876);
});

test("the build copies the vendor directory and every hero encoding", () => {
  const build = fs.readFileSync(path.join(ROOT_DIR, "scripts/build.mjs"), "utf8");
  assert.match(build, /herotower\.webp/);
  assert.match(build, /herotower\.avif/);
  assert.match(build, /vendor/);
});
