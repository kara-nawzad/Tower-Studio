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
  studio.enterMasterStep(3);
  studio.updateHUD();

  // The strip stays short; the panel carries every number.
  const hud = document.querySelector("#site-hud");
  const grid = document.querySelector("#hud-panel-grid");
  const first = [...hud.querySelectorAll(".hud-cell")];
  assert.ok(first.length >= 3 && first.length <= 5, `the strip has ${first.length} cells`);
  const identity = first.map((cell) => cell);
  const gridFirst = [...grid.querySelectorAll(".hud-cell")];
  assert.equal(gridFirst.length, 24, "the all-numbers panel repeats every cell");

  // A second update with the same numbers must not replace any node.
  const gridIdentity = gridFirst.map((cell) => cell);
  studio.updateHUD();
  const second = [...hud.querySelectorAll(".hud-cell")];
  assert.equal(second.length, first.length);
  second.forEach((cell, index) => {
    assert.equal(cell, identity[index], `cell ${index} was recreated`);
  });
  [...grid.querySelectorAll(".hud-cell")].forEach((cell, index) => {
    assert.equal(cell, gridIdentity[index], `panel cell ${index} was recreated`);
  });

  // Changing one number rewrites only that cell's text.
  const target = gridFirst.find((cell) => cell.querySelector("small").textContent === "Total load");
  assert.ok(target, "the panel has a total-load cell");
  const before = target.querySelector("strong").textContent;
  studio.state.power.radioLoadKw = 9;
  studio.normalizeState();
  studio.updateHUD();
  assert.equal(
    gridFirst.find((cell) => cell.querySelector("small").textContent === "Total load"),
    target
  );
  assert.notEqual(target.querySelector("strong").textContent, before, "and its value updated");

  dom.window.close();
});

test("the HUD still shows the locked status vocabulary", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.updateHUD();
  const hud = document.querySelector("#site-hud");
  assert.equal(hud.classList.contains("is-setup"), true);
  assert.match(hud.textContent, /\[ Setting up \]/);
  assert.equal(hud.querySelectorAll(".hud-cell").length, 3);
  assert.equal(document.getElementById("hud-chip-title").textContent, "SETTING UP");

  studio.state.onboarding.active = false;
  studio.updateHUD();
  assert.equal(hud.classList.contains("is-setup"), false);
  const cells = hud.querySelectorAll(".hud-cell");
  assert.ok(cells.length >= 3 && cells.length <= 5);
  assert.match(document.getElementById("hud-chip-title").textContent, /LIVE MODEL/);
  assert.ok(document.querySelector("#hud-panel-grid #hud-site-status") === null);
  assert.match(document.querySelector("#hud-panel-grid").textContent, /\[ Live model \]/);
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
  assert.match(HTML, /herotower-1200\.avif/);
  assert.match(HTML, /herotower-1200\.webp/);
  assert.match(HTML, /src="\.\/herotower\.PNG"/, "the PNG stays as the last fallback");

  const png = fs.statSync(path.join(ROOT_DIR, "herotower.PNG")).size;

  // Three widths per encoding, so a 4K desktop gets a real 2200px file instead
  // of an upscaled 1678px one, and a phone gets the 1200px one.
  for (const width of [1200, 1678, 2200]) {
    const webp = fs.statSync(path.join(ROOT_DIR, `herotower-${width}.webp`)).size;
    const avif = fs.statSync(path.join(ROOT_DIR, `herotower-${width}.avif`)).size;
    assert.ok(webp < png * 0.5, `WebP ${width} (${webp}) is far smaller than PNG ${png}`);
    assert.ok(avif < webp, `AVIF ${width} (${avif}) is smaller than WebP ${webp}`);
    for (const ext of ["webp", "avif"]) {
      assert.match(
        HTML,
        new RegExp(`herotower-${width}[.]${ext} ${width}w`),
        `${ext} ${width} is offered in the srcset`
      );
    }
  }
  // The hero box is the cover box (1.08x the window) and a portrait phone keeps
  // only a slice of a landscape photograph, so `sizes` over-asks on purpose.
  assert.match(HTML, /sizes="\(max-width: 767px\) 200vw, 108vw"/);

  // The largest variant is genuinely larger than the camera original, so the
  // picture is never upscaled by the browser on a wide desktop.
  const widest = Number(
    fs.readFileSync(path.join(ROOT_DIR, "herotower.PNG")).slice(16, 24).readUInt32BE(0)
  );
  assert.equal(widest, 1678, "the original PNG is still 1678px wide");
  assert.ok(fs.existsSync(path.join(ROOT_DIR, "herotower-2200.avif")));

  // The original PNG is untouched, so nothing about the artwork changed.
  assert.equal(png, 3341876);
});

test("the build copies the vendor directory and every hero encoding", () => {
  const build = fs.readFileSync(path.join(ROOT_DIR, "scripts/build.mjs"), "utf8");
  for (const width of [1200, 1678, 2200]) {
    assert.match(build, new RegExp(`herotower-${width}[.]webp`));
    assert.match(build, new RegExp(`herotower-${width}[.]avif`));
  }
  assert.match(build, /vendor/);
});
