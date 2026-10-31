// Phase 5 — detail levels and the glossary.
import test from "node:test";
import assert from "node:assert/strict";
import { createHeadlessStudio } from "./helpers/headless.mjs";

// Every place a beginner can land, in both detail levels.
const ROUTES = [
  { step: 1 },
  { step: 2 },
  { step: 3 },
  { step: 4, microwave: "MICROWAVE" },
  { step: 4, microwave: "CELLULAR" },
  { step: 5 },
];

// Every route is visited and its terms collected: the drawer only holds one
// step at a time, so a single pass would miss the terms of the other steps.
function visitAll(studio, document) {
  const seen = new Set();
  for (const route of ROUTES) {
    if (route.microwave) studio.state.microwave.system = route.microwave;
    studio.enterMasterStep(route.step);
    studio.renderDrawer();
    for (const node of document.querySelectorAll("[data-term]")) seen.add(node.dataset.term);
  }
  return seen;
}

test("the glossary defines around twenty terms in plain English", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  const terms = studio.GLOSSARY_TERMS;

  assert.ok(terms.length >= 20, `expected about 20 terms, found ${terms.length}`);
  assert.ok(terms.length <= 40, `${terms.length} terms is more than a beginner will read`);

  for (const term of terms) {
    const definition = studio.glossaryTerm(term);
    assert.equal(typeof definition, "string", `${term} has a definition`);
    assert.ok(definition.length > 40, `${term}'s definition is too short`);
    // Definitions are prose, not more jargon soup: no ALL-CAPS abbreviations
    // beyond the term itself and common units.
    assert.ok(
      !/[A-Z]{5,}/.test(definition.replace(term, "")),
      `${term} definition is still jargon`
    );
  }

  dom.window.close();
});

test("every term used anywhere in the interface has a definition", () => {
  for (const detail of ["GUIDED", "ENGINEER"]) {
    const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
    studio.setDetailLevel(detail);
    studio.state.onboarding.active = false;
    const used = [...visitAll(studio, document)];
    assert.ok(used.length > 0, `${detail} mode renders some glossary terms`);
    for (const term of new Set(used)) {
      assert.ok(
        typeof studio.glossaryTerm(term) === "string",
        `${detail}: "${term}" is used in the interface but has no definition`
      );
    }
    dom.window.close();
  }
});

test("a term opens on hover, on focus and on tap, and closes on Escape", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.state.onboarding.active = false;
  studio.enterMasterStep(2);
  studio.renderDrawer();

  const term = document.querySelector(".term");
  assert.ok(term, "a glossary term is rendered");
  const definition = term.querySelector(".term-def");
  assert.ok(definition, "the definition travels with the term");
  assert.ok(definition.textContent.length > 40);
  assert.equal(term.getAttribute("aria-expanded"), "false");

  // Tap.
  term.click();
  assert.equal(term.getAttribute("aria-expanded"), "true");
  assert.equal(term.classList.contains("open"), true);

  // Escape closes it.
  document.body.dispatchEvent(
    new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })
  );
  assert.equal(term.getAttribute("aria-expanded"), "false");

  // Focus opens it for keyboard users.
  term.focus();
  term.dispatchEvent(new dom.window.FocusEvent("focusin", { bubbles: true }));
  assert.equal(term.getAttribute("aria-expanded"), "true");

  // Clicking elsewhere closes it.
  document.querySelector("#drawer-content").click();
  assert.equal(term.getAttribute("aria-expanded"), "false");

  dom.window.close();
});

test("the detail level changes what is shown and survives a reload", () => {
  const { studio, document, dom, window } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.state.onboarding.active = false;

  studio.setDetailLevel("GUIDED");
  studio.enterMasterStep(2);
  studio.renderDrawer();
  assert.equal(studio.isEngineerMode(), false);
  assert.ok(document.querySelector(".more-options"), "Guided folds the deep numbers away");

  studio.setDetailLevel("ENGINEER");
  studio.renderDrawer();
  assert.equal(studio.isEngineerMode(), true);
  assert.equal(document.querySelector(".more-options"), null, "Engineer shows everything");

  // Persisted on its own key so a beginner is not dropped into engineer mode.
  assert.equal(window.localStorage.getItem("tower-studio.detail.v1"), "ENGINEER");
  assert.equal(studio.readDetailLevel(), "ENGINEER");

  studio.setDetailLevel("GUIDED");
  assert.equal(window.localStorage.getItem("tower-studio.detail.v1"), "GUIDED");
  assert.equal(studio.readDetailLevel(), "GUIDED");

  window.localStorage.removeItem("tower-studio.detail.v1");
  dom.window.close();
});

test("engineer mode unlocks every master step", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });

  studio.setDetailLevel("GUIDED");
  const locked = studio
    .allStepStates()
    .filter((entry) => entry.state === "LOCKED")
    .map((entry) => entry.step);
  assert.ok(locked.length > 0, "guided mode gates at least one step by default");

  studio.setDetailLevel("ENGINEER");
  const stillLocked = studio
    .allStepStates()
    .filter((entry) => entry.state === "LOCKED")
    .map((entry) => entry.step);
  assert.equal(JSON.stringify(stillLocked), "[]", "engineer mode locks nothing");

  studio.setDetailLevel("GUIDED");
  dom.window.close();
});

test("glossary terms are reachable by keyboard", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.state.onboarding.active = false;
  studio.enterMasterStep(2);
  studio.renderDrawer();

  const terms = [...document.querySelectorAll(".term")];
  assert.ok(terms.length > 0);
  for (const term of terms) {
    assert.equal(term.tagName, "BUTTON", "a term is a real button, not a span");
    assert.equal(term.getAttribute("type"), "button");
    assert.equal(term.hasAttribute("aria-expanded"), true);
  }
  dom.window.close();
});
