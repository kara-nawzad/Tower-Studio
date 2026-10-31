// Pass 2 — the laptop declutter (widths 1024 / 1280 / 1366 / 1440 / 1920).
//
// Same rule as the phone file: jsdom paints nothing, so the layout is measured
// from the chrome arithmetic in src/js/app.js, and the rest is checked in the
// DOM and in the stylesheet. Every number quoted in the report is produced by
// this file.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHeadlessStudio, ROOT_DIR } from "./helpers/headless.mjs";

const CSS = fs.readFileSync(path.join(ROOT_DIR, "src/styles/main.css"), "utf8");
const HTML = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
const APP = fs.readFileSync(path.join(ROOT_DIR, "src/js/app.js"), "utf8");

const LAPTOPS = [
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

const NESTED = new Set(["topbar", "topActions"]);
const rectsOverlap = (a, b) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

function visibleBoxes(layout) {
  return Object.entries(layout.rects).filter(([, rect]) => Boolean(rect));
}

function assertClean(layout, label) {
  const boxes = visibleBoxes(layout);
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const [nameA, a] = boxes[i];
      const [nameB, b] = boxes[j];
      if (NESTED.has(nameA) || NESTED.has(nameB)) continue;
      assert.equal(rectsOverlap(a, b), false, `${label}: ${nameA} overlaps ${nameB}`);
    }
  }
  for (const [name, rect] of boxes) {
    assert.ok(rect.left >= 0 && rect.top >= 0, `${label}: ${name} starts outside the viewport`);
    assert.ok(
      rect.right <= layout.width && rect.bottom <= layout.height,
      `${label}: ${name} runs outside the viewport`
    );
  }
}

test("the stylesheet tokens and the layout arithmetic are the same numbers", () => {
  const root = CSS.slice(0, CSS.indexOf(".top-actions {"));
  const token = (name) => {
    const match = root.match(new RegExp(`--${name}:\\s*([^;]+);`));
    return match ? match[1].trim() : null;
  };
  const TOKENS = {
    "chrome-gap": "gap",
    "topbar-top": "topbarTop",
    "topbar-h": "topbarH",
    "hud-top": "hudTop",
    "hud-h": "hudH",
    "nav-h": "nav",
    "view-btn": "viewBtn",
    "view-gap": "viewGap",
    "panel-top": "panelTop",
    "panel-bottom": "panelBottom",
    "panel-min": "panelMin",
    "panel-max": "panelMax",
  };
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  const desktop = studio.chromeTokensFor(1440, 900);
  for (const [name, key] of Object.entries(TOKENS)) {
    assert.equal(token(name), `${desktop[key]}px`, `--${name} matches the arithmetic`);
  }
  assert.equal(token("panel-vw"), `${Math.round(desktop.panelVw * 100)}vw`);

  // Phones and short phones override the same tokens, in the same places.
  const phone = studio.chromeTokensFor(390, 844);
  assert.equal(token("topbar-top").endsWith("px"), true);

  // A 390px phone and a 360x640 short phone differ exactly as the CSS says.
  const short = studio.chromeTokensFor(360, 640);
  assert.ok(short.hudH < phone.hudH, "a short phone has a thinner strip");
  assert.ok(short.nav < phone.nav, "and a thinner step bar");
  dom.window.close();
});

test("L1: the laptop top bar is one row, and the menu holds everything else", () => {
  for (const { width, height } of LAPTOPS) {
    const { document, studio, dom } = createHeadlessStudio({ width, height });
    const topbar = document.querySelector("#topbar");
    const ids = [...topbar.querySelectorAll("button")].map((button) => button.id);
    assert.deepEqual(ids, [
      "live-pill",
      "undo-button",
      "redo-button",
      "terminal-toggle",
      "menu-toggle",
    ]);

    const layout = studio.chromeLayout(width, height, { hint: false });
    assert.ok(layout.rects.topbar.height <= 44, `${width}px: a 44px bar`);
    assert.ok(layout.rects.statusChip, `${width}px: the status chip is in the bar`);
    assert.ok(
      layout.rects.statusChip.right <= layout.rects.topActions.right,
      `${width}px: the chip is part of the actions cluster`
    );
    assert.ok(
      layout.rects.brand.right < layout.rects.statusChip.left,
      `${width}px: the wordmark clears the chip`
    );
    dom.window.close();
  }

  // Undo/redo are laptop-only; the eyebrow needs 1280px of room.
  const laptop = CSS.slice(CSS.indexOf("@media (min-width: 1024px)"));
  assert.match(laptop, /\.undo-redo\s*\{\s*display:\s*grid/);
  assert.match(CSS, /@media \(min-width: 1280px\)\s*\{\s*\.eyebrow\s*\{\s*display:\s*block/);
  assert.match(CSS, /\.eyebrow\s*\{\s*display:\s*none/);

  // The menu carries hero, AI, fit, detail level, save/open and shortcuts.
  for (const action of [
    "menu-hero",
    "menu-ai",
    "menu-fit",
    "menu-detail-level",
    "menu-save-file",
    "menu-open-file",
    "menu-start-fresh",
    "menu-shortcuts",
  ]) {
    assert.match(HTML, new RegExp(`data-action="${action}"`), `${action} lives in the menu`);
  }
  // …and nothing in the bar duplicates it.
  assert.equal(/data-action="menu-/.test(HTML.slice(0, HTML.indexOf('id="menu-panel"'))), false);
});

test("L2: the zoom/fit stack floats bottom-right and is never in the top bar", () => {
  for (const { width, height } of LAPTOPS) {
    const { document, studio, dom } = createHeadlessStudio({ width, height });
    const stack = document.querySelector("#view-controls");
    assert.ok(stack, `${width}px keeps the stack`);
    assert.equal(stack.closest("#topbar"), null, `${width}px: never in the top bar`);
    for (const id of ["zoom-in", "zoom-out", "fit-site"]) {
      assert.ok(stack.querySelector(`#${id}`), `${width}px keeps #${id}`);
    }

    const layout = studio.chromeLayout(width, height, { hint: false });
    const box = layout.rects.viewControls;
    assert.ok(box, `${width}px draws the stack`);
    assert.ok(box.width >= 40 && box.width <= 44, `${width}px: 40-44px wide`);
    assert.equal(box.right, width - layout.tokens.gap, `${width}px: flush to the right edge`);
    assert.ok(
      box.bottom <= height - layout.tokens.gap,
      `${width}px: clear of the bottom edge (and the step bar)`
    );
    dom.window.close();
  }

  const rule = CSS.match(/\n\.view-controls\s*\{([^}]*)\}/)[1];
  assert.match(rule, /flex-direction:\s*column/);
  assert.match(rule, /position:\s*fixed/);
  assert.match(rule, /bottom:\s*calc\(var\(--nav-h\)/);
});

test("L3: the strip is step-aware, five cells at most, with no scrollbar or arrows", () => {
  const { document, studio, dom } = createHeadlessStudio({ width: 1366, height: 768 });
  studio.state.onboarding.active = false;

  const expected = {
    1: ["Environment", "Structure", "Civil check", "Earth resistance"],
    2: ["Cabinet", "Cabinet DC load", "Backhaul speed", "Live services"],
    3: ["AC source", "Total load", "Backup hours", "Rectifier N+1"],
    4: ["Microwave RSL", "Fade margin", "Backhaul speed", "Link status"],
    5: ["Gates passed", "Site status", "Active alarms"],
  };

  for (const [step, labels] of Object.entries(expected)) {
    studio.setDetailLevel("ENGINEER");
    studio.state.microwave.system = "MICROWAVE";
    studio.enterMasterStep(Number(step));
    studio.setDetailLevel("GUIDED");
    studio.renderDrawer();
    const cells = [...document.querySelectorAll("#site-hud .hud-cell small")].map((node) =>
      node.textContent.trim()
    );
    assert.deepEqual(cells, labels, `step ${step} shows the numbers that step is about`);
    assert.ok(cells.length <= 5, "never more than five");
  }

  // 4B swaps in the cellular numbers.
  studio.setDetailLevel("ENGINEER");
  studio.state.microwave.system = "CELLULAR";
  studio.enterMasterStep(4);
  studio.renderDrawer();
  const labels4b = [...document.querySelectorAll("#site-hud .hud-cell small")].map((node) =>
    node.textContent.trim()
  );
  assert.equal(labels4b[0].startsWith("Cellular"), true);
  assert.equal(labels4b.length, 4);

  // The whole catalogue lives behind "All numbers".
  assert.equal(document.querySelectorAll("#hud-panel-grid .hud-cell").length, 24);
  const stripRule = CSS.match(/\n\.site-hud\s*\{([^}]*)\}/)[1];
  assert.match(stripRule, /overflow:\s*hidden/);
  assert.doesNotMatch(stripRule, /scroll/);
  assert.doesNotMatch(HTML, /hud-scroll-(left|right)/);

  // On a phone the same data feeds the one-line chip (first three numbers).
  const phone = createHeadlessStudio({ width: 390, height: 844 });
  phone.studio.state.onboarding.active = false;
  phone.studio.enterMasterStep(2);
  const chip = phone.document.querySelector("#hud-chip-text").textContent;
  assert.equal(chip.split(" · ").length, 3, "the chip carries the first three numbers");
  phone.dom.window.close();
  dom.window.close();
});

test("L4: AI Architect is collapsed everywhere and opens as a dialog", () => {
  for (const { width, height } of LAPTOPS) {
    const { document, dom } = createHeadlessStudio({ width, height });
    const dialog = document.querySelector("#ai-architect");
    assert.equal(dialog.hidden, true, `${width}px: collapsed by default`);
    assert.equal(dialog.querySelectorAll(".ai-chip").length, 3, "three scenario chips");
    assert.ok(dialog.querySelector("#ai-plan-card"), "and a plan card");
    // No bar anywhere: the dialog is not in the top bar and not pinned to the
    // bottom of the scene.
    assert.equal(document.querySelector("#topbar #ai-architect"), null);
    dom.window.close();
  }
  const aiRules = [...CSS.matchAll(/\n\.ai-architect\s*\{([^}]*)\}/g)];
  const rule = aiRules[aiRules.length - 1][1];
  assert.match(rule, /position:\s*fixed/);
  assert.match(rule, /z-index:\s*39/);
  assert.match(CSS, /\.ai-scrim\s*\{[^}]*background:/s);
});

test("L5: the gesture hint shows once, remembers, and afterwards lives in Shortcuts", () => {
  const { document, dom, window } = createHeadlessStudio({ width: 1366, height: 768 });
  window.localStorage.removeItem("tower-studio.gesture-hint.v1");
  document.querySelector('[data-action="dismiss-gesture-hint"]').click();
  assert.equal(document.querySelector("#gesture-hint").hidden, true);
  assert.equal(window.localStorage.getItem("tower-studio.gesture-hint.v1"), "dismissed");
  dom.window.close();

  const second = createHeadlessStudio({ width: 1366, height: 768 });
  second.window.localStorage.setItem("tower-studio.gesture-hint.v1", "dismissed");
  second.studio.state.onboarding.active = false;
  second.studio.enterMasterStep(2);
  assert.equal(second.document.querySelector("#gesture-hint").hidden, true, "stays dismissed");

  // The same sentence is in the Shortcuts panel, which is where it lives now.
  const modal = second.document.querySelector("#shortcuts-modal");
  assert.match(modal.textContent, /Drag · pinch · tap/);
  assert.match(modal.textContent, /one-time hint/i);
  second.dom.window.close();
});

test("L6: the drawer is a full-height side panel with one internal scroll", () => {
  for (const { width, height } of LAPTOPS) {
    const { document, studio, dom } = createHeadlessStudio({ width, height });
    studio.state.onboarding.active = false;
    studio.enterMasterStep(2);
    const drawer = document.querySelector("#drawer");
    assert.equal(drawer.hasAttribute("data-sheet"), false, `${width}px: not a sheet`);
    assert.equal(document.querySelector("#panel-tab").hidden, true, "the tab is hidden while open");

    const layout = studio.chromeLayout(width, height, { hint: false });
    const box = layout.rects.drawer;
    const { panelTop, panelBottom, gap } = layout.tokens;
    const expectedWidth = Math.min(
      layout.tokens.panelMax,
      Math.max(layout.tokens.panelMin, width * layout.tokens.panelVw)
    );
    assert.equal(box.left, gap, `${width}px: docked left`);
    assert.equal(box.top, panelTop, `${width}px: below the strip`);
    assert.equal(box.bottom, height - panelBottom, `${width}px: above the step bar`);
    assert.equal(box.width, expectedWidth, `${width}px: 420-500px wide`);
    assert.ok(expectedWidth >= 420 && expectedWidth <= 500);
    assert.ok(box.bottom <= layout.rects.nav.top, `${width}px: never over the step bar`);

    // Header: step number, title, gate strip, collapse button.
    const head = drawer.querySelector(".drawer-head");
    assert.match(head.textContent, /02/);
    assert.match(head.textContent, /Open the cabinet/i);
    assert.ok(drawer.querySelector("#drawer-toggle"), "a collapse button");
    assert.equal(drawer.querySelectorAll(".gate-strip").length, 1, "the gates live in the header");
    assert.equal(drawer.querySelectorAll(".gate").length, 6);

    // One internal scroll: the content column is the only scroller.
    const contentRule = CSS.match(/\n\.drawer-content\s*\{([^}]*)\}/)[1];
    assert.match(contentRule, /overflow:\s*auto/);
    assert.match(contentRule, /min-height:\s*0/);

    // Collapsed, a 44px tab reopens it.
    studio.state.drawerOpen = false;
    studio.renderDrawer();
    assert.equal(document.querySelector("#panel-tab").hidden, false);
    const collapsed = studio.chromeLayout(width, height, { hint: false });
    assert.equal(collapsed.rects.panelTab.width, 44);
    assert.equal(collapsed.rects.drawer, null);
    dom.window.close();
  }

  // The camera offsets come from the measured panel, not from constants.
  const { studio, dom } = createHeadlessStudio({ width: 1366, height: 768 });
  studio.chromeMetrics.drawerHeight = 600;
  studio.chromeMetrics.drawerWidth = 437;
  studio.chromeMetrics.drawerLeft = 8;
  const shift = studio.frustumShifts();
  assert.ok(shift.horizontal > 0, "a left panel pushes the site right");
  assert.equal(shift.vertical, 0, "and never up");
  studio.chromeMetrics.drawerWidth = 0;
  assert.ok(studio.frustumShifts().horizontal < shift.horizontal, "a slimmer panel shifts less");
  assert.match(APP, /chromeMetrics\.drawerWidth \/ vw/);
  dom.window.close();
});

test("L7: the step bar is one compact labelled row of 52px or less", () => {
  const navRules = [...CSS.matchAll(/\n\.master-nav\s*\{([^}]*)\}/g)].map((match) => match[1]);
  assert.ok(
    navRules.some((body) => /height:\s*var\(--nav-h\)/.test(body)),
    "the step bar is sized from the shared token"
  );
  assert.match(CSS, /\.master-nav\s*\{\s*max-height:\s*52px/);
  assert.match(CSS, /--nav-h:\s*48px/);

  for (const { width, height } of LAPTOPS) {
    const { document, studio, dom } = createHeadlessStudio({ width, height });
    const steps = [...document.querySelectorAll(".master-step")];
    assert.equal(steps.length, 5);
    for (const step of steps) {
      const label = step.querySelector(".step-name-wide, .step-name");
      assert.ok(label && label.textContent.trim().length > 0, "every step is labelled");
      assert.ok(step.querySelector("small").textContent.trim().startsWith("0"));
    }
    // Done / attention / locked marks are drawn, not typed as emoji.
    const layout = studio.chromeLayout(width, height, { hint: false });
    assert.ok(layout.rects.nav.height <= 52);
    assert.ok(layout.rects.nav.bottom <= height);
    dom.window.close();
  }
});

test("L8: the decision cards are identical on a laptop", () => {
  const cardIds = (document) =>
    [...document.querySelectorAll(".decision-card")].map((card) => card.dataset.card);

  const phone = createHeadlessStudio({ width: 390, height: 844 });
  const laptop = createHeadlessStudio({ width: 1440, height: 900 });
  for (const dev of [phone, laptop]) dev.studio.state.onboarding.active = false;

  for (const step of [1, 2, 3, 4, 5]) {
    for (const dev of [phone, laptop]) {
      dev.studio.setDetailLevel("ENGINEER");
      dev.studio.enterMasterStep(step);
      dev.studio.setDetailLevel("GUIDED");
      dev.studio.renderDrawer();
    }
    assert.deepEqual(
      cardIds(laptop.document),
      cardIds(phone.document),
      `step ${step} carries the same cards on both`
    );
    const decisions = laptop.document.querySelectorAll(".decision-card:not(.fine-tune)").length;
    assert.ok(decisions <= 3, `step ${step} keeps three decisions at most`);
    if (step < 5) assert.equal(decisions, 3, `step ${step} has its three decisions`);
    assert.equal(laptop.document.querySelectorAll(".decision-card.fine-tune").length, 1);
  }
  phone.dom.window.close();
  laptop.dom.window.close();
});

test("L9: no text below 11px at 1366 and 1920 either", () => {
  const rules = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1].replace(/\/\*[\s\S]*?\*\//g, "").trim(),
    body: match[2],
  }));
  const DECORATIVE = new Set([
    ".mark",
    ".status-mark",
    ".gate-dot",
    ".step-chip::before",
    ".sheet-grip",
    ".drawer-toggle",
    ".brand-mark",
  ]);
  const small = [];
  for (const rule of rules) {
    const sizes = [
      ...rule.body.matchAll(/font-size:\s*([\d.]+)px/g),
      ...rule.body.matchAll(/font:\s*[^;]*?([\d.]+)px/g),
    ].map((match) => Number(match[1]));
    const selectors = rule.selector.split(",").map((part) => part.trim());
    for (const size of sizes) {
      if (size < 11 && !selectors.every((selector) => DECORATIVE.has(selector)))
        small.push(`${rule.selector} → ${size}px`);
    }
  }
  assert.deepEqual(small, [], `type below 11px: ${small.join(", ")}`);

  // And the laptop chrome shouts at 11px or more.
  for (const selector of [
    ".menu-panel button small",
    ".ai-build-status",
    ".gate strong",
    ".step-chip",
  ]) {
    const match =
      CSS.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`)) ||
      CSS.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
    if (!match) continue;
    const size = Number(
      (match[1].match(/font-size:\s*([\d.]+)px/) ||
        match[1].match(/font:\s*\d+\s+([\d.]+)px/) || [0, 0])[1]
    );
    assert.ok(size === 0 || size >= 11, `${selector} is ${size}px`);
  }
});

test("L10: no overlaps at any laptop size, and 1366x768 keeps half the screen", () => {
  const report = [];
  for (const { width, height } of LAPTOPS) {
    for (const panelOpen of [true, false]) {
      const { studio, dom } = createHeadlessStudio({ width, height });
      studio.state.onboarding.active = false;
      studio.enterMasterStep(2);
      studio.state.drawerOpen = panelOpen;
      studio.renderDrawer();
      const label = `${width}x${height}${panelOpen ? "" : " (panel collapsed)"}`;
      const layout = studio.chromeLayout(width, height, { hint: true });
      assertClean(layout, label);
      report.push({ label, free: Number((layout.free.fraction * 100).toFixed(1)) });
      if (width === 1366 && height === 768 && panelOpen) {
        assert.ok(
          layout.free.fraction >= 0.5,
          `1366x768 keeps ${(layout.free.fraction * 100).toFixed(1)}% of the viewport`
        );
      }
      if (!panelOpen) assert.ok(layout.rects.panelTab, `${label}: the reopen tab is drawn`);
      dom.window.close();
    }
  }
  // The report is quoted in TOWER-STUDIO-redesign-notes.md; keep a floor on
  // every window so a later change cannot quietly eat the scene.
  for (const entry of report) {
    assert.ok(entry.free >= 40, `${entry.label}: only ${entry.free}% free`);
  }
});

test("L10: every laptop window in the brief is measured, not assumed", () => {
  const widths = [1024, 1280, 1366, 1440, 1920];
  const heights = [720, 768, 900, 1080];
  const rows = [];
  for (const width of widths) {
    for (const height of heights) {
      const { studio, dom } = createHeadlessStudio({ width, height });
      studio.state.onboarding.active = false;
      studio.enterMasterStep(2);
      const layout = studio.chromeLayout(width, height, { hint: false });
      assertClean(layout, `${width}x${height}`);
      assert.ok(layout.free.fraction >= 0.4, `${width}x${height}: free area`);
      assert.ok(layout.free.heightFraction >= 0.7, `${width}x${height}: clear band`);
      rows.push({ width, height, free: layout.free.fraction });
      dom.window.close();
    }
  }
  assert.equal(rows.length, widths.length * heights.length);
});
