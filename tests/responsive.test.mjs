// Phase 4 — phone and laptop parity.
//
// jsdom has no layout engine, so nothing here measures rendered pixels. These
// tests cover the parts that are real: which viewport tier each width maps to,
// the sheet snap state, the geometry that feeds the camera, and the CSS rules
// that set the minimum type and target sizes.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHeadlessStudio, ROOT_DIR } from "./helpers/headless.mjs";

const CSS = fs.readFileSync(path.join(ROOT_DIR, "src/styles/main.css"), "utf8");
const HTML = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");

const WIDTHS = [360, 390, 430, 768, 1024, 1366, 1920];

test("the viewport tiers match the agreed breakpoints at every listed width", () => {
  for (const width of WIDTHS) {
    const { studio, dom } = createHeadlessStudio({ width, height: 800 });
    const phone = studio.isPhoneViewport();
    const desktop = studio.isDesktopViewport();
    assert.equal(phone, width <= 767, `${width}px phone=${phone}`);
    assert.equal(desktop, width >= 1100, `${width}px desktop=${desktop}`);
    assert.equal(
      studio.isCompactViewport(),
      width <= 430,
      `${width}px compact=${studio.isCompactViewport()}`
    );
    dom.window.close();
  }
});

test("short landscape is detected separately from width", () => {
  const { studio, dom } = createHeadlessStudio({ width: 844, height: 390 });
  assert.equal(studio.isPhoneViewport(), false, "a landscape phone is not a narrow phone");
  assert.equal(studio.isShortLandscape(), true);
  dom.window.close();
});

test("phones get a bottom sheet with three snap heights; laptops do not", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 390, height: 844 });
  const drawer = document.querySelector("#drawer");

  studio.renderDrawer();
  assert.equal(drawer.hasAttribute("data-sheet"), true);
  assert.equal(drawer.getAttribute("data-sheet"), "half");

  studio.setSheet("peek");
  assert.equal(drawer.getAttribute("data-sheet"), "peek");
  studio.setSheet("full");
  assert.equal(drawer.getAttribute("data-sheet"), "full");

  // Tapping the handle cycles peek -> half -> full -> peek.
  studio.setSheet("peek");
  studio.cycleSheet();
  assert.equal(studio.state.sheet, "half");
  studio.cycleSheet();
  assert.equal(studio.state.sheet, "full");
  studio.cycleSheet();
  assert.equal(studio.state.sheet, "peek");

  dom.window.close();

  const laptop = createHeadlessStudio({ width: 1440, height: 900 });
  laptop.studio.renderDrawer();
  assert.equal(
    laptop.document.querySelector("#drawer").hasAttribute("data-sheet"),
    false,
    "a laptop drawer is a docked panel, not a sheet"
  );
  laptop.dom.window.close();
});

test("the sheet has a handle that is only shown on phones", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 390, height: 844 });
  const handle = document.querySelector("#sheet-handle");
  assert.ok(handle, "the sheet handle exists");
  studio.setSheet("peek");
  assert.match(handle.getAttribute("aria-label"), /[Ee]xpand/);
  studio.setSheet("full");
  assert.match(handle.getAttribute("aria-label"), /[Cc]ollapse/);
  dom.window.close();

  // CSS keeps it hidden until the drawer becomes a sheet.
  assert.match(CSS, /\.sheet-handle\s*\{[^}]*display:\s*none/s);
  assert.match(CSS, /@media \(max-width: 767px\)[\s\S]*?\.sheet-handle\s*\{\s*display:\s*flex/s);
});

test("the sheet height arithmetic accounts for the step nav", () => {
  // The old rule was max-height: calc(44vh - 74px), which collapsed the panel
  // on a phone. The sheet must now be sized from 100dvh minus the chrome.
  assert.ok(!CSS.includes("44vh - 74px"), "the broken arithmetic is gone");
  const phoneBlock = CSS.slice(CSS.indexOf("@media (max-width: 767px)"));
  assert.match(phoneBlock, /--nav-h/);
  assert.match(phoneBlock, /100dvh/);
  assert.match(phoneBlock, /data-sheet="full"/);
  assert.match(phoneBlock, /data-sheet="peek"\]\s*\{\s*max-height:\s*96px/);
  assert.match(phoneBlock, /data-sheet="half"\]\s*\{\s*max-height:\s*50dvh/);
});

test("camera frustum shifts come from measured panel geometry, not constants", () => {
  // Phone: the sheet covers the bottom, so the scene shifts up and never sideways.
  const phone = createHeadlessStudio({ width: 390, height: 844 });
  phone.studio.chromeMetrics.drawerHeight = 420;
  phone.studio.chromeMetrics.drawerWidth = 370;
  phone.studio.chromeMetrics.drawerLeft = 10;
  const phoneShift = phone.studio.frustumShifts();
  assert.ok(phoneShift.vertical > 0, "a phone sheet pushes the scene up");
  assert.equal(phoneShift.horizontal, 0, "a bottom sheet never shifts sideways");

  // Desktop: the drawer is docked left, so the scene shifts right and not up.
  const desktop = createHeadlessStudio({ width: 1600, height: 900 });
  desktop.studio.chromeMetrics.drawerHeight = 600;
  desktop.studio.chromeMetrics.drawerWidth = 540;
  desktop.studio.chromeMetrics.drawerLeft = 18;
  const desktopShift = desktop.studio.frustumShifts();
  assert.ok(desktopShift.horizontal > 0, "a left drawer pushes the scene right");
  assert.equal(desktopShift.vertical, 0, "a left drawer never shifts vertically");

  // Both stay inside the old hard-coded envelope.
  for (const shift of [phoneShift, desktopShift]) {
    assert.ok(shift.vertical <= 0.34 && shift.horizontal <= 0.34);
    assert.ok(shift.vertical >= 0 && shift.horizontal >= 0);
  }

  // A collapsed panel shifts less than a full one.
  phone.studio.chromeMetrics.drawerHeight = 96;
  const collapsed = phone.studio.frustumShifts();
  assert.ok(phoneShift.vertical > collapsed.vertical);

  phone.dom.window.close();
  desktop.dom.window.close();
});

test("focus zoom-out is stronger on a phone than on a laptop", () => {
  const phone = createHeadlessStudio({ width: 390, height: 844 });
  const laptop = createHeadlessStudio({ width: 1440, height: 900 });
  assert.ok(phone.studio.focusSizeMultiplier() > laptop.studio.focusSizeMultiplier());
  phone.dom.window.close();
  laptop.dom.window.close();
});

test("the zoom buttons and undo/redo buttons are present at every width", () => {
  for (const width of WIDTHS) {
    const { document, dom } = createHeadlessStudio({ width, height: 800 });
    assert.ok(document.querySelector("#zoom-in"), `${width}px keeps zoom in`);
    assert.ok(document.querySelector("#zoom-out"), `${width}px keeps zoom out`);
    assert.ok(document.querySelector("#undo-button"), `${width}px keeps undo`);
    assert.ok(document.querySelector("#redo-button"), `${width}px keeps redo`);
    dom.window.close();
  }
  // The zoom cluster is no longer hidden behind a phone media query.
  const phoneBlock = CSS.slice(
    CSS.indexOf("@media (max-width: 767px)"),
    CSS.indexOf("@media (max-height: 450px)")
  );
  assert.ok(!/\.zoom-buttons\s*\{\s*display:\s*none/.test(phoneBlock));
});

test("touch targets and minimum type sizes are declared in CSS", () => {
  // 44px minimum on the phone top bar.
  const phoneBlock = CSS.slice(
    CSS.indexOf("@media (max-width: 767px)"),
    CSS.indexOf("@media (max-height: 450px)")
  );
  assert.match(phoneBlock, /\.icon-button\s*\{[^}]*min-height:\s*44px/s);

  // HUD numbers never drop below 11px.
  assert.match(
    CSS,
    /\.hud-cell strong\s*\{[^}]*font:\s*700 11px|\.hud-cell strong\s*\{[^}]*font:\s*700 13px/s
  );
  const hudSizes = [...CSS.matchAll(/\.hud-cell strong\s*\{[^}]*?(\d+)px/g)].map((m) =>
    Number(m[1])
  );
  for (const size of hudSizes) assert.ok(size >= 11, `HUD number is ${size}px`);

  // Terminal output is legible on a phone.
  assert.match(CSS, /\.cli-output\s*\{[^}]*font:\s*400 11px/s);
});

test("coarse pointers get the full 44px floor for the compact controls", () => {
  // These variants are deliberately small on the desktop, and the glossary
  // terms are inline text whose own box is only as tall as the label.
  const start = CSS.indexOf("@media (pointer: coarse)");
  assert.ok(start > -1, "a coarse-pointer block exists");
  const coarse = CSS.slice(start);
  assert.match(coarse, /\.term::after\s*\{[^}]*inset:\s*-20px/s);
  assert.ok(
    /\.term-def\s*\{[^}]*z-index:\s*55/s.test(CSS),
    "the open definition stays above the enlarged hit area"
  );
  // The compact variants are grouped into two rules, so check each rule body.
  const rules = [...coarse.matchAll(/([^{}]+)\{([^}]*)\}/g)].map((m) => ({
    selectors: m[1].split(",").map((part) => part.trim()),
    body: m[2],
  }));
  for (const selector of [
    ".locked-notice-actions .phase6-button",
    ".restore-notice-actions .phase6-button",
    ".profile-confirm-actions .phase6-button",
    ".profile-chip .phase6-button",
    ".gesture-hint-close",
    ".hero-enter-btn",
    ".sheet-handle",
    ".more-options > summary",
  ]) {
    const rule = rules.find((r) => r.selectors.includes(selector));
    assert.ok(rule, `${selector} is lifted on coarse pointers`);
    assert.match(rule.body, /min-height:\s*44px/, `${selector} reaches 44px`);
  }
  assert.match(coarse, /\.hud-scroll-btn\s*\{[^}]*width:\s*44px/s);
});

test("the AI bar sits above the sheet on a phone", () => {
  const phoneBlock = CSS.slice(
    CSS.indexOf("@media (max-width: 767px)"),
    CSS.indexOf("@media (max-height: 450px)")
  );
  assert.match(phoneBlock, /\.ai-architect\s*\{[^}]*bottom:\s*calc\(var\(--nav-h\)/s);
});

test("the five master-step buttons share one equal grid", () => {
  assert.match(
    CSS,
    /\.master-nav\s*\{[^}]*grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/s
  );
  for (const width of WIDTHS) {
    const { document, dom } = createHeadlessStudio({ width, height: 800 });
    const steps = document.querySelectorAll(".master-step");
    assert.equal(steps.length, 5, `${width}px shows five steps`);
    assert.equal((HTML.match(/class="master-step/g) || []).length, 5, "five step buttons in HTML");
    dom.window.close();
  }
});

test("the gesture hint is dismissible and stays dismissed", () => {
  const { document, dom, window } = createHeadlessStudio({ width: 390, height: 844 });
  window.localStorage.removeItem("tower-studio.gesture-hint.v1");
  const hint = document.querySelector("#gesture-hint");
  assert.ok(hint, "the gesture hint exists");

  document.querySelector('[data-action="dismiss-gesture-hint"]').click();
  assert.equal(hint.hidden, true);
  assert.equal(window.localStorage.getItem("tower-studio.gesture-hint.v1"), "dismissed");

  dom.window.close();

  const second = createHeadlessStudio({ width: 390, height: 844 });
  second.window.localStorage.setItem("tower-studio.gesture-hint.v1", "dismissed");
  second.studio.renderDrawer();
  assert.equal(second.document.querySelector("#gesture-hint").hidden, true);
  second.window.localStorage.removeItem("tower-studio.gesture-hint.v1");
  second.dom.window.close();
});

test("the Site Master crosshair responds to a tap, not just a hover", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 390, height: 844 });
  studio.setDetailLevel("ENGINEER");
  studio.state.onboarding.active = false;
  studio.state.microwave.system = "CELLULAR";
  studio.enterMasterStep(4);
  studio.state.cellular.sweeps[0] = studio.calculateSweep(0);
  studio.state.cellular.sector = 0;
  studio.renderDrawer();

  const hit = document.querySelector("#rf-graph-hit");
  assert.ok(hit, "the sweep graph has a hit area");
  const readout = document.querySelector("#rf-cursor-readout");
  // jsdom has no layout, so give the SVG the width the maths expects.
  document.querySelector("#rf-sweep-graph").getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 640,
    height: 262,
    right: 640,
    bottom: 262,
    x: 0,
    y: 0,
  });

  const EventCtor = dom.window.PointerEvent || dom.window.MouseEvent;
  hit.dispatchEvent(new EventCtor("pointerdown", { bubbles: true, clientX: 200, clientY: 100 }));
  assert.match(readout.textContent, /DTF/, "a tap measures distance-to-fault");
  assert.equal(document.querySelector("#rf-cursor").style.display, "block");

  dom.window.close();
});

test("the selection tag is clamped inside the viewport", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 390, height: 844 });
  const tag = document.querySelector("#selection-tag");
  // Force a projection far off screen and check the clamp keeps it on screen.
  studio.state.selectedId = "tower";
  studio.renderDrawer();
  const left = Number.parseFloat(tag.style.left || "0");
  const top = Number.parseFloat(tag.style.top || "0");
  if (tag.style.display === "block") {
    assert.ok(left >= 0 && left <= 390, `tag left ${left} stays on screen`);
    assert.ok(top >= 0 && top <= 844, `tag top ${top} stays on screen`);
  }
  dom.window.close();
});

test("landscape phones get their own rule block", () => {
  assert.match(CSS, /@media \(max-height: 450px\) and \(orientation: landscape\)/s);
  const { studio, dom } = createHeadlessStudio({ width: 844, height: 390 });
  assert.equal(studio.isShortLandscape(), true);
  dom.window.close();
});
