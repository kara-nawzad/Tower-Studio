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

test("sound is synthesised in the app, not shipped as audio files", () => {
  // Pass 1 removed the Web Audio drone entirely; the studio now has a small
  // opt-out kit instead (palette and behaviour in tests/sound.test.mjs). What
  // must stay true is that it is built from oscillators and one noise buffer:
  // there are no sound assets to download, and no timer keeps anything playing.
  const assets = /[\w-]+\.(mp3|wav|ogg|m4a|aac|flac|opus)/i;
  for (const [name, source] of [
    ["index.html", HTML],
    ["src/js/app.js", JS],
    ["src/styles/main.css", CSS],
  ]) {
    assert.equal(assets.test(source), false, `${name} points at an audio file`);
  }
  assert.equal((JS.match(/new Ctor\(\)/g) || []).length, 1, "one audio context, created on demand");
  assert.equal((JS.match(/setInterval\(/g) || []).length, 0, "nothing runs on a timer");

  // …and the rest of the app still runs with the kit in place.
  const { studio } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.state.onboarding.active = false;
  studio.startBlackout();
  assert.equal(studio.powerSimulation.phase, "BATTERY_BRIDGE");
  studio.restoreGrid();
  assert.equal(studio.powerSimulation.phase, "NORMAL");
  assert.equal(studio.sound.play("tick"), false, "silent where Web Audio is missing");
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

test("manual builds stage the site in like the AI architect does", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.state.onboarding.active = false;
  studio.rebuild();

  // A manual change arms the same staging used by the AI build: the tower comes
  // in first, then the cabinet and power routes, then the antennas.
  assert.equal(studio.startManualAssembly("TOWER STRUCTURE"), true);
  studio.rebuild();
  studio.updateAI(studio.aiBuild.started, 0.016);
  assert.equal(studio.aiBuild.running, true);
  assert.equal(studio.aiBuild.manual, true);
  assert.ok(studio.aiBuild.layers.length >= 4, `${studio.aiBuild.layers.length} staged groups`);
  // The tower starts hidden and grows into place.
  const towerLayer = studio.aiBuild.layers.find((layer) => layer.kind === "tower");
  assert.ok(towerLayer, "the tower is staged");
  assert.equal(towerLayer.object.visible, false, "the tower has not appeared yet");

  // Halfway through, the tower is visible and scaled up but not finished.
  studio.updateAI(studio.aiBuild.started + 400, 0.016);
  assert.equal(towerLayer.object.visible, true);
  assert.ok(
    towerLayer.object.scale.y > 0.02 && towerLayer.object.scale.y <= towerLayer.scale.y + 1e-6
  );

  // At the end everything is restored, nothing launches, and the bar resets.
  studio.updateAI(studio.aiBuild.started + studio.manualAssemblyMs + 20, 0.016);
  assert.equal(studio.aiBuild.running, false);
  assert.equal(studio.aiBuild.manual, false);
  assert.equal(studio.launch.onAir, false, "a manual change never launches the site");
  assert.equal(towerLayer.object.scale.y, towerLayer.scale.y);
  assert.match(document.querySelector("#ai-build-status").textContent, /LOCAL NLP/);
  dom.window.close();
});

test("a reduced-motion preference skips the manual staging entirely", () => {
  const { studio, dom } = createHeadlessStudio({
    width: 1440,
    height: 900,
    reducedMotion: true,
  });
  studio.state.onboarding.active = false;
  assert.equal(studio.startManualAssembly("TOWER STRUCTURE"), false);
  assert.equal(studio.aiBuild.running, false);
  dom.window.close();
});

test("every environment carries ambient life, and rural carries the most", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.state.onboarding.active = false;
  const motion = {};
  for (const env of Object.keys(studio.environments)) {
    studio.state.env = env;
    studio.rebuild();
    // Ambient decoration is not a component: rebuilding it must not change
    // the parts list.
    const before = studio.registry.size;
    studio.rebuild();
    assert.equal(studio.registry.size, before, `${env} gained a registry entry`);
    assert.equal(studio.registry.has("ambient"), false, "ambient is not a part");
    const parts =
      studio.ambientVisuals.blades.length +
      studio.ambientVisuals.motes.length +
      studio.ambientVisuals.drifts.length +
      studio.ambientVisuals.birds.length;
    motion[env] = parts;
    assert.ok(parts > 0, `${env} has something moving in the scene`);
    // Nor in the picker, nor in the shadow pass.
    const sample = [
      ...studio.ambientVisuals.blades,
      ...studio.ambientVisuals.motes,
      ...studio.ambientVisuals.drifts,
    ].map((part) => part.object);
    sample.forEach((object) => {
      assert.equal(object.castShadow, false, "ambient parts cast no shadow");
      assert.equal(object.raycast(), undefined, "ambient parts are not pickable");
    });
  }
  assert.ok(
    motion.RURAL_GREENFIELD >= motion.MOUNTAIN_PEAK,
    `rural ${motion.RURAL_GREENFIELD} vs mountain ${motion.MOUNTAIN_PEAK}`
  );
  // The crop field only grows on the greenfield site.
  studio.state.env = "RURAL_GREENFIELD";
  studio.rebuild();
  assert.ok(studio.ambientVisuals.blades.length >= 40, "the field is planted");
  studio.state.env = "MOUNTAIN_PEAK";
  studio.rebuild();
  assert.equal(studio.ambientVisuals.blades.length, 0, "no crops on the rock peak");
  dom.window.close();
});

test("the ambient layer moves with the wind and stops for reduced motion", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.state.onboarding.active = false;
  studio.state.env = "RURAL_GREENFIELD";
  studio.rebuild();
  const blade = studio.ambientVisuals.blades[0].object;
  const mote = studio.ambientVisuals.motes[0].object;
  const bird = studio.ambientVisuals.birds[0].object;
  const pose = () => [
    blade.rotation.z,
    mote.position.x,
    mote.position.y,
    mote.scale.x,
    bird.position.x,
    bird.position.y,
    bird.rotation.y,
  ];
  studio.updateAmbient(1000, 0.016);
  const first = pose();
  studio.updateAmbient(4000, 0.016);
  const second = pose();
  assert.ok(
    first.some((value, index) => Math.abs(value - second[index]) > 1e-4),
    "the crops lean, the dust drifts and the birds circle"
  );
  // A gust travels: two blades on opposite sides of the field are out of step.
  const ends = [studio.ambientVisuals.blades[0], studio.ambientVisuals.blades[40]];
  assert.ok(Math.abs(ends[0].object.rotation.z - ends[1].object.rotation.z) > 1e-3);

  const still = createHeadlessStudio({
    width: 1440,
    height: 900,
    reducedMotion: true,
  });
  still.studio.state.onboarding.active = false;
  still.studio.state.env = "RURAL_GREENFIELD";
  still.studio.rebuild();
  const quiet = [
    still.studio.ambientVisuals.blades[0].object.rotation.z,
    still.studio.ambientVisuals.motes[0].object.position.x,
    still.studio.ambientVisuals.birds[0].object.position.y,
  ];
  still.studio.updateAmbient(8000, 0.016);
  assert.deepEqual(
    [
      still.studio.ambientVisuals.blades[0].object.rotation.z,
      still.studio.ambientVisuals.motes[0].object.position.x,
      still.studio.ambientVisuals.birds[0].object.position.y,
    ],
    quiet,
    "reduced motion holds the scene still"
  );
  dom.window.close();
  still.dom.window.close();
});

test("every asset the page or the stylesheet points at exists", () => {
  // The hero is full-bleed, so it is no longer drawn from a CSS background: the
  // <picture> element is the only place the artwork is referenced. Check both
  // surfaces — any url() the stylesheet still uses, and every source the
  // markup asks the browser to fetch.
  const urls = [...CSS.matchAll(/url\("([^"]+)"\)/g)].map((match) => match[1]);
  urls.forEach((url) => {
    assert.ok(!url.startsWith("data:"), `${url} should be a file`);
    // The browser resolves a relative url against the stylesheet's own
    // directory (src/styles/), not against the page or the project root.
    const resolved = path.join(ROOT_DIR, "src/styles", url);
    assert.ok(fs.existsSync(resolved), `${url} resolves to ${resolved}, which is missing`);
  });

  const heroSources = [
    ...[...HTML.matchAll(/srcset="([^"]+)"/g)].flatMap((match) =>
      match[1]
        .split(",")
        .map((entry) => entry.trim().split(/\s+/)[0])
        .filter(Boolean)
    ),
    ...[...HTML.matchAll(/src="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((src) => !src.startsWith("http") && !src.startsWith("data:")),
    ...[...HTML.matchAll(/<link[^>]+href="([^"]+)"/g)]
      .map((match) => match[1])
      .filter((href) => !href.startsWith("http")),
  ];
  assert.ok(heroSources.includes("./herotower.PNG"), "the hero PNG fallback is in the markup");
  for (const source of heroSources) {
    // A cache-busting ?v= is not part of the file name.
    const clean = source.replace(/[?#].*$/, "");
    const resolved = path.join(ROOT_DIR, clean.replace(/^\.\//, ""));
    assert.ok(fs.existsSync(resolved), `${source} resolves to ${resolved}, which is missing`);
  }
});
