// Owner follow-up pass: one typeface set, no audio, a sharper and calmer hero,
// staged assembly for manual builds and ambient life in every environment.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHeadlessStudio, ROOT_DIR } from "./helpers/headless.mjs";

const HTML = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
const CSS = fs.readFileSync(path.join(ROOT_DIR, "src/styles/main.css"), "utf8");
const JS = fs.readFileSync(path.join(ROOT_DIR, "src/js/app.js"), "utf8");

// Anything outside the project's own three families renders from a system or
// colour font, which is exactly what the owner asked to remove.
const EMOJI = /[\u2190-\u21FF\u2300-\u23FF\u2460-\u24FF\u25A0-\u27BF\u{1F000}-\u{1FAFF}]/u;
const TYPED_MARKS = /["'`>](✓|✗|⚠|🎯|📡|✨|🔍|⚡|🚨|🏙)["'`<\s]/u;

test("the interface never asks for a font the project does not ship", () => {
  // Every family reference resolves to one of the three custom properties.
  const families = [...CSS.matchAll(/font-family:\s*([^;}]+)/g)].map((m) => m[1].trim());
  for (const family of families) {
    assert.match(
      family,
      /var\(--(heading|body|mono)\)|inherit|initial|unset|revert/,
      `unexpected font stack: ${family}`
    );
  }
  // The UA stylesheet points <code> at the browser's own monospace, so it has
  // to be re-pointed explicitly.
  assert.match(CSS, /code,\s*\nkbd,\s*\nsamp,\s*\npre\s*\{[^}]*font-family:\s*var\(--mono\)/s);
  // Canvas-drawn labels use the project mono face too.
  assert.ok(!/context\.font\s*=\s*"[^"]*\bmonospace"/.test(JS) || /Space Mono/.test(JS));
});

test("status marks are drawn in CSS instead of typed as glyphs", () => {
  assert.match(CSS, /\.mark-ok::before/);
  assert.match(CSS, /\.mark-no::before/);
  assert.match(CSS, /\.mark-warn::before/);
  assert.ok(!TYPED_MARKS.test(JS), "no tick/cross/warning glyph is typed into the markup");
  // Step 04 branch buttons carry a drawn dot and diamond rather than an emoji.
  assert.match(CSS, /\.mw-system-toggle button::before/);
  assert.match(CSS, /\.mw-system-toggle button\[data-value="CELLULAR"\]::before/);
  // The AI magnifier is drawn too.
  assert.match(CSS, /\.ai-search::before/);
});

test("no colour emoji is left in the markup or the drawer strings", () => {
  for (const [name, source] of [
    ["index.html", HTML],
    ["src/js/app.js", JS],
    ["src/styles/main.css", CSS],
  ]) {
    const hits = [...source.matchAll(new RegExp(EMOJI.source, "gu"))].map((m) => m[0]);
    // Arrows and simple punctuation the project fonts already cover are fine.
    const blocking = hits.filter((c) => c.codePointAt(0) > 0x2199 && c !== "→" && c !== "×");
    assert.deepEqual(blocking, [], `${name} still renders ${blocking.join(" ")}`);
  }
});

test("the studio is silent: no Web Audio anywhere in the app", () => {
  for (const token of [
    "AudioContext",
    "createOscillator",
    "createGain",
    "playContactor",
    "playFrequencyLockChime",
    "updateMicrowaveTone",
    "stopMicrowaveAudio",
  ]) {
    assert.ok(!JS.includes(token), `${token} should be gone`);
  }
  // …and it still runs: the power events that used to click and chime are fine.
  const { studio } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.state.onboarding.active = false;
  studio.startBlackout();
  assert.equal(studio.powerSimulation.phase, "BATTERY_BRIDGE");
  studio.restoreGrid();
  assert.equal(studio.powerSimulation.phase, "NORMAL");
});

test("the drawer renders without a missing helper after the audio removal", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.state.onboarding.active = false;
  studio.enterMasterStep(3);
  studio.renderDrawer();
  const text = document.querySelector("#drawer-content").textContent;
  assert.match(text, /SIMULATE POWER BLACKOUT/);
  assert.match(text, /NO ACTIVE POWER ALARMS/);
  dom.window.close();
});
