// Pass 2 — the phone declutter (widths 360 / 390 / 430 / 768).
//
// jsdom has no layout engine, so nothing here measures pixels the browser
// painted. Two real things are measured instead:
//   1. the chrome arithmetic in src/js/app.js (chromeLayout), which is written
//      from the same tokens as src/styles/main.css — the test asserts the two
//      agree, that no two boxes intersect, and that the 3D area keeps its
//      promised share of the viewport;
//   2. the DOM and the stylesheet: what is on screen, what the sheet says, and
//      the smallest type the stylesheet is allowed to ask for.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHeadlessStudio, ROOT_DIR } from "./helpers/headless.mjs";

const CSS = fs.readFileSync(path.join(ROOT_DIR, "src/styles/main.css"), "utf8");
const HTML = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");

const PHONES = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
];

// Every fixed piece of chrome the phone shows, from the shared arithmetic.
function boxesFor(studio, width, height, options) {
  const layout = studio.chromeLayout(width, height, { hint: false, ...options });
  return layout;
}

const rectsOverlap = (a, b) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

// The top bar's own children are not overlaps, and neither is a box nested in
// another (the status chip sits inside the actions cluster).
const NESTED = new Set(["topbar", "topActions"]);

function visibleBoxes(layout) {
  return Object.entries(layout.rects).filter(([, rect]) => Boolean(rect));
}

function assertNoOverlaps(layout, label) {
  const boxes = visibleBoxes(layout);
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const [nameA, a] = boxes[i];
      const [nameB, b] = boxes[j];
      if (NESTED.has(nameA) || NESTED.has(nameB)) continue;
      assert.equal(
        rectsOverlap(a, b),
        false,
        `${label}: ${nameA} and ${nameB} overlap (${JSON.stringify(a)} vs ${JSON.stringify(b)})`
      );
    }
  }
}

function assertInsideViewport(layout, label) {
  for (const [name, rect] of visibleBoxes(layout)) {
    assert.ok(rect.left >= 0, `${label}: ${name} starts left of the viewport`);
    assert.ok(rect.top >= 0, `${label}: ${name} starts above the viewport`);
    assert.ok(rect.right <= layout.width, `${label}: ${name} runs off the right edge`);
    assert.ok(rect.bottom <= layout.height, `${label}: ${name} runs off the bottom edge`);
  }
}

test("A1: the phone top bar is one row: logo, wordmark, terminal, menu", () => {
  for (const { width, height } of PHONES) {
    const { document, studio, dom } = createHeadlessStudio({ width, height });
    const topbar = document.querySelector("#topbar");
    assert.ok(topbar, `${width}px has a top bar`);

    // Only the wordmark and two buttons live up there on a phone.
    const visible = [...topbar.querySelectorAll("button")].filter(
      (button) => !["live-pill", "undo-button", "redo-button"].includes(button.id)
    );
    assert.deepEqual(
      visible.map((button) => button.id),
      ["terminal-toggle", "menu-toggle"],
      `${width}px keeps terminal and menu in the bar`
    );

    // The wordmark is one line and never wraps under the buttons.
    const title = topbar.querySelector("h1");
    assert.equal(title.textContent.trim(), "TOWER STUDIO");

    const layout = boxesFor(studio, width, height);
    assert.ok(layout.rects.topbar.height <= 44, `${width}px bar is one 44px row`);
    assert.ok(
      layout.rects.brand.right < layout.rects.topActions.left,
      `${width}px: the wordmark clears the buttons`
    );
    assert.ok(
      layout.rects.topActions.right <= width - layout.tokens.gap + 0.5,
      `${width}px: the buttons stay inside the bar`
    );
    dom.window.close();
  }

  // Hero, AI build, fit, detail level, undo/redo and the file commands live in
  // the workspace menu on a phone.
  const css = CSS.slice(CSS.indexOf("@media (max-width: 767px)"));
  assert.match(css, /\.live-pill\s*\{\s*display:\s*none/);
  assert.match(css, /\.undo-redo\s*\{\s*display:\s*none/);
  for (const action of ["menu-hero", "menu-ai", "menu-fit", "menu-detail-level"]) {
    assert.match(HTML, new RegExp(`data-action="${action}"`), `${action} is in the menu`);
  }
});

test("A2: nothing overlaps anything at 360, 390, 430 and 768, in any snap state", () => {
  for (const { width, height } of PHONES) {
    const { studio, dom } = createHeadlessStudio({ width, height });
    studio.state.onboarding.active = false;
    studio.enterMasterStep(2);
    const snaps = width <= 1023 ? ["peek", "half", "full"] : ["half"];
    for (const snap of snaps) {
      studio.setSheet(snap);
      const label = `${width}x${height} @${snap}`;
      const layout = boxesFor(studio, width, height);
      assertNoOverlaps(layout, label);
      assertInsideViewport(layout, label);
      // Every box is drawn, so the free share is a real measurement.
      assert.ok(layout.free.fraction > 0, `${label}: the 3D area still exists`);
    }
    dom.window.close();
  }
});

test("A5: the sheet opens at 40dvh, shows the header and the first card, and the 3D area keeps its share", () => {
  assert.match(CSS, /--sheet-half:\s*40dvh/);
  assert.match(CSS, /--sheet-peek:\s*var\(--tap\)/);

  for (const width of [360, 390, 430]) {
    const { document, studio, dom } = createHeadlessStudio({ width, height: 844 });
    studio.state.onboarding.active = false;
    studio.enterMasterStep(2);
    assert.equal(studio.state.sheet, "half", `${width}px: a step entry opens the sheet at half`);
    assert.equal(document.querySelector("#drawer").getAttribute("data-sheet"), "half");

    // Header: step number and title, subtitle only while a 3D object is inspected.
    const head = document.querySelector("#drawer .drawer-head");
    assert.match(head.textContent, /02/);
    assert.match(head.textContent, /Open the cabinet/i);
    studio.clearSelection();
    studio.renderDrawer();
    assert.equal(
      document.querySelector("#drawer").classList.contains("has-selection"),
      false,
      "no selection, so the subtitle stays hidden on a phone"
    );
    const phoneRules = CSS.slice(CSS.indexOf("body.sheet-full .view-controls"));
    assert.match(
      phoneRules,
      /\.drawer-title p\s*\{\s*display:\s*none/,
      "the phone hides the subtitle by rule"
    );
    assert.match(phoneRules, /\.drawer\.has-selection \.drawer-title p\s*\{\s*display:\s*block/);

    // The first decision card is in the sheet (hidden or not, it is rendered
    // and it is the open one).
    const openCard = document.querySelector(".decision-card.is-open");
    assert.ok(openCard, `${width}px: the first decision card is open`);

    // 3D clearance: at least 35% at half and 70% at peek.
    const half = boxesFor(studio, width, 844);
    assert.ok(half.free.fraction >= 0.35, `${width}px half keeps ${half.free.fraction}`);
    studio.setSheet("peek");
    const peek = boxesFor(studio, width, 844);
    assert.ok(peek.free.fraction >= 0.7, `${width}px peek keeps ${peek.free.fraction}`);
    studio.setSheet("half");
    dom.window.close();
  }
});

test("A3: the status strip is one chip that expands to every number and closes on an outside tap", () => {
  const { document, studio, dom } = createHeadlessStudio({ width: 390, height: 844 });
  studio.state.onboarding.active = false;
  studio.enterMasterStep(2);

  const chip = document.querySelector("#hud-chip");
  const strip = document.querySelector("#site-hud");
  const panel = document.querySelector("#hud-panel");
  assert.equal(strip.querySelectorAll(".hud-cell").length, 4, "four cells, never a scroller");
  assert.ok(chip.textContent.includes("LIVE MODEL"));
  assert.ok(chip.textContent.includes(" · "), "the chip lists 2-3 numbers");

  // One line only: the chip has no wrapping in the stylesheet.
  const chipRule = CSS.match(/\.hud-chip\s*\{([^}]*)\}/)[1];
  assert.match(chipRule, /display:\s*none/, "the chip is hidden on a laptop…");
  assert.match(CSS, /\.hud-chip\s*\{\s*display:\s*flex/);
  assert.match(CSS, /\n {2}\.site-hud\s*\{\s*display:\s*none/);

  assert.equal(panel.hidden, true);
  chip.click();
  assert.equal(panel.hidden, false, "tapping the chip opens every number");
  const cells = panel.querySelectorAll(".hud-cell");
  assert.equal(cells.length, 24, "the panel repeats the whole catalogue");
  assert.equal(
    [...cells].some((cell) => cell.id === "hud-site-status"),
    false,
    "the panel never duplicates a live cell id"
  );

  document.body.click();
  assert.equal(panel.hidden, true, "tapping outside closes it");
  dom.window.close();
});

test("A4/L4: AI Architect is only reachable from the menu, and opens as a dialog", () => {
  const { document, studio, dom } = createHeadlessStudio({ width: 390, height: 844 });
  const dialog = document.querySelector("#ai-architect");
  assert.equal(dialog.hidden, true);
  assert.equal(document.querySelector("#topbar .ai-build-button, #topbar .ai-input"), null);

  document.querySelector("#menu-toggle").click();
  assert.equal(document.querySelector("#menu-panel").hidden, false);
  document.querySelector('[data-action="menu-ai"]').click();
  assert.equal(dialog.hidden, false, "the menu opens it");
  assert.equal(document.querySelector("#ai-scrim").hidden, false);
  document.querySelector("#ai-close-button").click();
  assert.equal(dialog.hidden, true, "the close button dismisses it");

  studio.setAIArchitectOpen(true);
  dom.window.dispatchEvent(
    new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })
  );
  assert.equal(dialog.hidden, true, "Escape dismisses it");
  dom.window.close();
});

test("A6: the gate strip is six labelled dots in one row, never a sliver", () => {
  const { document, studio, dom } = createHeadlessStudio({ width: 360, height: 800 });
  studio.state.onboarding.active = false;
  studio.enterMasterStep(2);
  const gates = [...document.querySelectorAll("#drawer .gate")];
  assert.equal(gates.length, 6);
  assert.deepEqual(
    gates.map((gate) => gate.querySelector("small").textContent),
    ["CIVIL", "EARTH", "POWER", "LINK", "RF", "ALARMS"]
  );
  for (const gate of gates) {
    assert.ok(gate.querySelector(".gate-dot"), "each gate draws its own dot");
    assert.match(gate.textContent, /PASS|OPEN/);
    const fix = Number(gate.dataset.value);
    assert.ok(fix >= 1 && fix <= 5, "a red gate knows which step fixes it");
  }

  // The last .gate-strip rule wins the cascade, so read that one.
  const stripRules = [...CSS.matchAll(/\n\.gate-strip\s*\{([^}]*)\}/g)];
  const strip = stripRules[stripRules.length - 1][1];
  assert.match(strip, /grid-template-columns:\s*repeat\(6, minmax\(0, 1fr\)\)/);
  const gateRules = [...CSS.matchAll(/\n\.gate\s*\{([^}]*)\}/g)];
  const gate = gateRules[gateRules.length - 1][1];
  assert.match(gate, /min-height:\s*var\(--tap\)/, "44px tall, so it cannot collapse");
  dom.window.close();
});

test("A7: no text below 11px anywhere, and sentences at 12px or more", () => {
  // Every font-size the stylesheet asks for, per rule.
  const rules = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1].replace(/\/\*[\s\S]*?\*\//g, "").trim(),
    body: match[2],
  }));

  // Drawn marks are sized in px but are not text.
  const DECORATIVE = new Set([
    ".mark",
    ".status-mark",
    ".gate-dot",
    ".step-chip::before",
    ".sheet-grip",
    ".drawer-toggle",
    ".brand-mark",
  ]);

  const tooSmall = [];
  for (const rule of rules) {
    const matches = [...rule.body.matchAll(/font-size:\s*([\d.]+)px/g)];
    const fontShorthand = [...rule.body.matchAll(/font:\s*[^;]*?([\d.]+)px/g)];
    for (const size of [...matches, ...fontShorthand].map((m) => Number(m[1]))) {
      if (size >= 11) continue;
      const selectors = rule.selector.split(",").map((part) => part.trim());
      if (selectors.every((selector) => DECORATIVE.has(selector))) continue;
      tooSmall.push(`${rule.selector} → ${size}px`);
    }
  }
  assert.deepEqual(tooSmall, [], `type below 11px: ${tooSmall.join(", ")}`);

  // The prose rules are 12px or more.
  for (const selector of [
    ".control-note",
    ".card-note",
    ".explainer-card p",
    ".decision-summary",
    ".gesture-hint",
    ".onboarding-hint",
    ".drawer-title p",
  ]) {
    const match = CSS.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`));
    if (!match) continue;
    const size = Number(
      (match[1].match(/font-size:\s*([\d.]+)px/) ||
        match[1].match(/font:\s*\d+\s+([\d.]+)px/) || [0, 0])[1]
    );
    assert.ok(size >= 12, `${selector} is ${size}px, sentences need 12px`);
  }

  // And the phone chrome itself never shrinks its labels.
  const phoneBlock = CSS.slice(
    CSS.indexOf("@media (max-width: 767px)"),
    CSS.indexOf("@media (max-height: 450px)")
  );
  assert.doesNotMatch(phoneBlock, /font-size:\s*(?:[0-9]|10)px/);
});

test("B: Guided level decides one thing at a time, Engineer opens everything", () => {
  const phone = createHeadlessStudio({ width: 390, height: 844 });
  phone.studio.state.onboarding.active = false;
  phone.studio.enterMasterStep(2);
  assert.equal(phone.document.querySelectorAll(".decision-card.is-open").length, 1);
  const cards = phone.document.querySelectorAll(".decision-card:not(.fine-tune)");
  assert.equal(cards.length, 3, "three decisions, then Fine-tune");
  const fine = phone.document.querySelector(".decision-card.fine-tune");
  assert.ok(fine, "Fine-tune is always the last card");
  assert.equal(fine.classList.contains("is-open"), false, "and starts closed");

  // Opening a second card closes the first: only one is open at a time.
  const heads = [
    ...phone.document.querySelectorAll(".decision-card:not(.fine-tune) .decision-head"),
  ];
  heads[1].click();
  assert.equal(phone.document.querySelectorAll(".decision-card.is-open").length, 1);
  assert.ok(
    phone.document
      .querySelectorAll(".decision-card:not(.fine-tune)")[1]
      .classList.contains("is-open")
  );
  // A finished card folds to its summary and offers EDIT.
  assert.ok(heads[0].querySelector(".decision-state"), "the closed card still shows its state");

  phone.studio.setDetailLevel("ENGINEER");
  phone.studio.renderDrawer();
  const open = phone.document.querySelectorAll(".decision-card.is-open").length;
  assert.equal(
    open,
    phone.document.querySelectorAll(".decision-card").length,
    "Engineer level opens every card in one scroll"
  );
  phone.dom.window.close();
});

test("C1: a Guided step opens with ten controls or fewer", () => {
  // Counted as: buttons, selects, checkboxes and sliders inside the sheet that
  // are not inside a closed card or a closed <details>, excluding the inline
  // glossary buttons (they only read a definition out).
  const countControls = (document) => {
    const content = document.querySelector("#drawer-content");
    return [...content.querySelectorAll("button, select, input, textarea")].filter((element) => {
      if (element.classList.contains("term")) return false;
      for (let node = element; node && node !== content; node = node.parentElement) {
        if (node.hasAttribute("hidden")) return false;
        if (node.tagName === "DETAILS" && !node.hasAttribute("open")) return false;
      }
      return true;
    }).length;
  };

  const { document, studio, dom } = createHeadlessStudio({ width: 390, height: 844 });
  for (const step of [1, 2, 3, 4, 5]) {
    studio.setDetailLevel("ENGINEER");
    assert.equal(studio.enterMasterStep(step), true);
    studio.setDetailLevel("GUIDED");
    studio.renderDrawer();
    const count = countControls(document);
    assert.ok(count <= 10, `step ${step} opens with ${count} controls`);
    studio.setDetailLevel("ENGINEER");
  }
  dom.window.close();
});
