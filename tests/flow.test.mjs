// Phase 3 — guided branching flow: step states, gating, one scrolling panel,
// step 4A/4B, the chip navigator, the gate strip and visible locked reasons.
import test from "node:test";
import assert from "node:assert/strict";
import { createHeadlessStudio } from "./helpers/headless.mjs";

const states = (studio) =>
  Object.fromEntries(studio.allStepStates().map((entry) => [entry.step, entry]));

test("each master step reports done, attention or locked with a reason", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });

  const initial = states(studio);
  assert.equal(initial[1].state, "ATTENTION", "step 01 is not done until a tower is picked");
  assert.equal(initial[2].state, "DONE", "the default profile already populates the cabinet");
  assert.equal(
    initial[4].state,
    "ATTENTION",
    `the backhaul is not aligned yet (${initial[4].state})`
  );
  assert.equal(initial[5].state, "LOCKED");
  assert.match(initial[5].reason, /step 04/i);

  // Completing step 01 marks it done.
  studio.state.onboarding.active = false;
  assert.equal(states(studio)[1].state, "DONE");

  // Emptying the cabinet puts step 02 into attention and locks steps 03-05.
  Object.keys(studio.state.rack.slots).forEach((key) => {
    studio.state.rack.slots[key] = false;
  });
  const emptied = states(studio);
  assert.equal(emptied[2].state, "ATTENTION");
  assert.equal(emptied[3].state, "LOCKED");
  assert.match(emptied[3].reason, /step 02/i);
  assert.equal(emptied[4].state, "LOCKED");
  assert.match(emptied[4].reason, /Fit the cabinet cards in step 02 first\./);

  // Breaking N+1 moves step 05's reason to the power step.
  studio.applySmartProfile();
  studio.state.power.autoRectifiers = false;
  studio.state.power.rectifiers = 1;
  studio.normalizeState();
  const noRedundancy = states(studio);
  assert.equal(noRedundancy[3].state, "ATTENTION");
  assert.equal(noRedundancy[5].state, "LOCKED");
  assert.match(noRedundancy[5].reason, /step 03/i);

  dom.window.close();
});

test("clicking a locked step explains why instead of navigating", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });

  assert.equal(studio.enterMasterStep(5), false);
  assert.equal(studio.state.masterStep, 1, "a locked step must not be entered");

  studio.renderDrawer();
  const notice = document.querySelector(".locked-notice");
  assert.ok(notice, "the locked reason is rendered in the drawer");
  assert.match(notice.textContent, /is locked/i);
  assert.match(notice.textContent, /step 04/i);
  assert.ok(
    notice.querySelector('[data-action="goto-step"]'),
    "the notice offers a shortcut to the blocking step"
  );

  // The shortcut jumps to the step that unblocks it.
  notice.querySelector('[data-action="goto-step"]').click();
  assert.equal(studio.state.masterStep, 4);
  assert.equal(studio.state.lockedNotice, null);

  dom.window.close();
});

test("the nav buttons carry the step state and locked steps stay clickable", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });

  studio.renderDrawer();
  const buttons = [...document.querySelectorAll(".master-step")];
  assert.equal(buttons.length, 5);

  const fifth = buttons[4];
  assert.equal(fifth.classList.contains("is-locked"), true);
  assert.equal(fifth.querySelector(".step-chip").textContent, "Locked");
  assert.equal(fifth.disabled, false, "locked steps stay clickable so they can explain why");
  assert.match(fifth.getAttribute("title"), /step 04/i);

  const second = buttons[1];
  assert.equal(second.classList.contains("is-done"), true);
  assert.equal(second.querySelector(".step-chip").textContent, "Done");

  dom.window.close();
});

test("engineer mode unlocks every step; guided mode gates them", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });

  // A step that cannot be reached in guided mode ...
  studio.setDetailLevel("GUIDED");
  assert.equal(studio.stepState(5).state, "LOCKED");
  assert.equal(studio.enterMasterStep(5), false);

  // ... is reachable in engineer mode.
  studio.setDetailLevel("ENGINEER");
  assert.notEqual(studio.stepState(5).state, "LOCKED");
  assert.equal(studio.enterMasterStep(5), true);
  assert.equal(studio.state.masterStep, 5);

  studio.setDetailLevel("GUIDED");
  dom.window.close();
});

test("the drawer is one scrolling panel with no tabs and no duplicated controls", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.state.onboarding.active = false;
  studio.enterMasterStep(2);
  studio.renderDrawer();

  const tabs = document.querySelector("#drawer .tabs");
  assert.equal(tabs.hidden, true, "the three tabs are replaced by one panel");

  // Guided mode keeps the deep numbers folded behind "More options".
  const headings = [...document.querySelectorAll(".panel-heading h3")].map((node) =>
    node.textContent.trim()
  );
  assert.deepEqual(headings, ["Live numbers", "Configure"]);
  const more = document.querySelector(".more-options > summary");
  assert.ok(more, "the details are folded in Guided mode");
  assert.match(more.textContent, /Specs and details/i);

  studio.setDetailLevel("ENGINEER");
  studio.renderDrawer();
  const engineerHeadings = [...document.querySelectorAll(".panel-heading h3")].map((node) =>
    node.textContent.trim()
  );
  assert.deepEqual(engineerHeadings, ["Live numbers", "Configure", "Specs and details"]);
  assert.equal(document.querySelector(".more-options"), null, "Engineer mode opens everything");
  studio.setDetailLevel("GUIDED");

  const content = document.querySelector("#drawer-content");
  // No control id may appear twice in a single scroll.
  const ids = [...content.querySelectorAll("[id]")].map((node) => node.id);
  assert.equal(new Set(ids).size, ids.length, `duplicate ids in the panel: ${ids.join(", ")}`);

  // The vendor/generation tree appears once, at the top of step 02.
  assert.equal(content.querySelectorAll(".smart-filter").length, 1);
  assert.equal(content.querySelectorAll(".rack-nav").length, 1, "one cabinet navigator");
  assert.equal(content.querySelectorAll(".rack-metrics").length, 1, "one live-numbers block");

  dom.window.close();
});

test("step 01 keeps the user on structure, height, lightning and grounding", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.state.onboarding.active = false;
  studio.enterMasterStep(1);
  studio.renderDrawer();

  const content = document.querySelector("#drawer-content");
  assert.ok(content.querySelector('[data-action="environment"]'), "environment choice");
  assert.ok(content.querySelector('[data-action="tower"]'), "tower choice");
  assert.ok(content.querySelector("#tower-height"), "height slider");
  assert.ok(content.querySelector('[data-action="lightning"]'), "lightning choice");
  assert.ok(content.querySelector("#grounding-toggle"), "grounding toggle");

  // Power has its own step now.
  assert.equal(
    content.querySelector('[data-action="select-power"][data-value="rectifier-plant"]'),
    null,
    "step 01 no longer offers power shortcuts"
  );
  assert.match(content.textContent, /Step 03/i);

  dom.window.close();
});

test("the towers an environment rules out are named, not silently hidden", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.state.onboarding.active = false;
  studio.state.env = "URBAN_ROOFTOP";
  studio.applyEnvironmentTowerRule("URBAN_ROOFTOP");
  studio.normalizeState();
  studio.enterMasterStep(1);
  studio.renderDrawer();

  const content = document.querySelector("#drawer-content");
  const line = content.querySelector(".hidden-line");
  assert.ok(line, "a 'Hidden for <environment>' line is shown");
  assert.match(line.textContent, /Hidden for/i);
  assert.match(line.textContent, /Urban rooftop/i);

  // Every disallowed tower button explains itself in visible text.
  const disabled = [...content.querySelectorAll('[data-action="tower"][disabled]')];
  assert.ok(disabled.length > 0);
  disabled.forEach((button) => {
    assert.ok(button.getAttribute("title"), "the tooltip is kept");
    const lock = button.querySelector(".option-lock");
    assert.ok(lock, `${button.textContent} shows its reason as text`);
    assert.match(lock.textContent, /\S/);
  });

  dom.window.close();
});

test("the equipment profile is chosen in step 02 and only reported in step 04", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.setDetailLevel("ENGINEER");

  studio.enterMasterStep(2);
  studio.renderDrawer();
  let content = document.querySelector("#drawer-content");
  assert.ok(content.querySelector('[data-action="smart-vendor"]'), "step 02 owns the vendor tree");
  assert.ok(content.querySelector('[data-action="smart-generation"]'));
  assert.equal(content.querySelectorAll(".smart-filter").length, 1);

  studio.enterMasterStep(4);
  studio.renderDrawer();
  content = document.querySelector("#drawer-content");
  assert.equal(
    content.querySelector('[data-action="smart-vendor"]'),
    null,
    "step 04 must not offer a second vendor tree"
  );
  assert.equal(content.querySelectorAll(".smart-filter").length, 0);
  const chip = content.querySelector(".profile-chip");
  assert.ok(chip, "step 04 reports the profile chosen in step 02");
  assert.match(chip.textContent, /SET IN STEP 02/i);
  assert.ok(chip.textContent.includes(studio.state.rack.vendor), "the chip names the vendor");

  dom.window.close();
});

test("step 04 is split into 4A backhaul and 4B sectors", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.setDetailLevel("ENGINEER");
  studio.enterMasterStep(4);
  studio.renderDrawer();

  const items = [...document.querySelectorAll(".sub-nav-item")];
  assert.equal(items.length, 2);
  assert.match(items[0].textContent, /4A/);
  assert.match(items[0].textContent, /Backhaul/i);
  assert.match(items[1].textContent, /4B/);
  assert.match(items[1].textContent, /Sectors/i);

  // Switching halves swaps the whole panel.
  assert.equal(studio.state.microwave.system, "MICROWAVE");
  assert.ok(document.querySelector("#drawer-content").textContent.includes("link budget"));

  document.querySelector('[data-action="mw-system"][data-value="CELLULAR"]').click();
  assert.equal(studio.state.microwave.system, "CELLULAR");
  const content = document.querySelector("#drawer-content");
  assert.ok(content.querySelector(".rf-sector-tabs"), "4B shows the sector tabs");
  assert.equal(content.querySelectorAll(".rf-sector-tabs").length, 1);

  dom.window.close();
});

test("step 03 offers a seven-item chip navigator", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.setDetailLevel("ENGINEER");
  studio.enterMasterStep(3);
  studio.renderDrawer();

  const chips = [...document.querySelectorAll(".power-nav button")];
  assert.equal(chips.length, 7, "system, sources, ATS, MDB, DC plant, battery, climate");
  assert.deepEqual(
    chips.map((chip) => chip.textContent.trim().replace(/[[\]\s]/g, "")),
    ["SYSTEM", "SOURCES", "ATS", "MDB", "DCPLANT", "BATTERY", "CLIMATE"]
  );
  assert.equal(document.querySelectorAll(".power-nav").length, 1, "one navigator only");

  dom.window.close();
});

test("a gate strip of six gates appears from step 02 onward", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.state.onboarding.active = false;

  studio.enterMasterStep(1);
  studio.renderDrawer();
  assert.equal(document.querySelector("#drawer-content .gate-strip"), null);

  for (const step of [2, 3, 4]) {
    studio.enterMasterStep(step);
    studio.renderDrawer();
    const gates = document.querySelectorAll("#drawer-content .gate");
    assert.equal(gates.length, 6, `step ${step} shows six gates`);
    for (const gate of gates) {
      assert.match(gate.textContent, /PASS|OPEN/);
      assert.ok(gate.getAttribute("title"), "each gate explains itself");
    }
  }

  // The gates and the acceptance audit can never disagree.
  studio.setDetailLevel("ENGINEER");
  studio.enterMasterStep(5);
  studio.renderDrawer();
  const audit = studio.calculateAcceptance();
  const gateMarks = [...document.querySelectorAll("#drawer-content .gate")].map((gate) =>
    gate.classList.contains("pass")
  );
  assert.equal(
    JSON.stringify(gateMarks),
    JSON.stringify(audit.checks.map((check) => check.pass)),
    "the gate strip and the acceptance audit can never disagree"
  );

  dom.window.close();
});

test("no step renders the same control twice", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.setDetailLevel("ENGINEER");
  studio.state.onboarding.active = false;

  for (const step of [1, 2, 3, 4, 5]) {
    studio.enterMasterStep(step);
    studio.renderDrawer();
    const content = document.querySelector("#drawer-content");
    const ids = [...content.querySelectorAll("[id]")].map((node) => node.id);
    assert.equal(
      new Set(ids).size,
      ids.length,
      `step ${step} renders duplicated ids: ${ids.filter((id, i) => ids.indexOf(id) !== i).join(", ")}`
    );
    for (const selector of [
      ".smart-filter",
      ".rack-nav",
      ".power-nav",
      ".mw-metrics",
      ".mw-meter",
    ]) {
      const found = content.querySelectorAll(selector).length;
      assert.ok(found <= 1, `step ${step} renders ${selector} ${found} times`);
    }
  }

  dom.window.close();
});

test("the go-on-air button says why it is blocked", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.setDetailLevel("ENGINEER");
  studio.enterMasterStep(5);
  studio.renderDrawer();

  const button = document.querySelector('[data-action="go-on-air"]');
  assert.ok(button);
  assert.equal(button.disabled, true, "the default site cannot go on air");
  const reason = button.getAttribute("title");
  assert.ok(reason && reason.length > 10, "the button states its reason");
  assert.match(reason, /Blocked by/i);
  const failing = studio
    .calculateAcceptance()
    .checks.filter((check) => !check.pass)
    .map((check) => check.title);
  failing.forEach((title) => assert.ok(reason.includes(title), `reason names ${title}`));

  dom.window.close();
});

test("every disabled control repeats its reason as visible text", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.setDetailLevel("ENGINEER");

  // Mountain peak locks the Franklin rod and the grounding switch.
  studio.state.env = "MOUNTAIN_PEAK";
  studio.applyEnvironmentTowerRule("MOUNTAIN_PEAK");
  studio.normalizeState();
  studio.enterMasterStep(1);
  studio.renderDrawer();

  const content = document.querySelector("#drawer-content");
  const disabled = [...content.querySelectorAll("button[disabled]")];
  assert.ok(disabled.length > 0, "some controls are disabled on a mountain peak");
  for (const element of disabled) {
    const text = element.textContent;
    assert.match(
      text,
      /LOCKED|MANDATORY|NOT PERMITTED|BLOCKED|Hidden for|hidden for/i,
      `visible reason missing on: ${text.slice(0, 60)}`
    );
  }

  dom.window.close();
});
