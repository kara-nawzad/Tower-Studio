// Phase 2 — protect the user's work: autosave, undo/redo, file round-trip,
// configuration-version restore and the new confirmation steps.
import test from "node:test";
import assert from "node:assert/strict";
import { createHeadlessStudio } from "./helpers/headless.mjs";

const WORKSPACE_KEY = "tower-studio.workspace.v1";

// Configuration-version snapshots hold the engineering definition, not the UI
// flow, so restore tests compare everything except the flow block.
const siteWithoutFlow = (site) => {
  const copy = { ...site };
  delete copy.flow;
  return copy;
};
const snapshotSite = (studio) => JSON.parse(JSON.stringify(studio.serializeSite()));

test("autosave writes a versioned payload under tower-studio.workspace.v1", () => {
  const { studio, dom, window } = createHeadlessStudio({ width: 1440, height: 900 });

  window.localStorage.removeItem(WORKSPACE_KEY);
  studio.state.env = "URBAN_ROOFTOP";
  studio.state.tower = "ROOFTOP_POLE";
  studio.state.H = 6;
  studio.normalizeState();

  assert.equal(studio.saveWorkspace(), true);
  const raw = window.localStorage.getItem(WORKSPACE_KEY);
  assert.ok(raw, "the workspace key is written");

  const parsed = JSON.parse(raw);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.site.env, "URBAN_ROOFTOP");
  assert.equal(parsed.site.tower, "ROOFTOP_POLE");
  assert.equal(parsed.site.H, 6);

  // Simulation transients must never be persisted.
  for (const forbidden of [
    "powerSim",
    "cellularSim",
    "rackSim",
    "launch",
    "aiBuild",
    "sweeps",
    "aiDiagnostics",
  ]) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(parsed.site, forbidden),
      false,
      `${forbidden} must not be saved`
    );
  }

  window.localStorage.removeItem(WORKSPACE_KEY);
  dom.window.close();
});

test("autosave and restore survive a storage layer that throws", () => {
  const { studio, dom, window } = createHeadlessStudio({ width: 1440, height: 900 });

  const real = Object.getOwnPropertyDescriptor(window, "localStorage");
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new Error("SecurityError: storage is disabled");
    },
  });

  assert.doesNotThrow(() => studio.saveWorkspace());
  assert.doesNotThrow(() => studio.readWorkspace());
  assert.doesNotThrow(() => studio.clearWorkspace());
  assert.doesNotThrow(() => studio.commitHistory("tower"));
  assert.doesNotThrow(() => studio.undo());

  if (real) Object.defineProperty(window, "localStorage", real);
  dom.window.close();
});

test("a site file round-trips: export, import, identical state", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });

  studio.state.env = "MOUNTAIN_PEAK";
  studio.state.tower = "LATTICE_TUBULAR_3LEG";
  studio.state.H = 45;
  studio.state.rack.vendor = "HUAWEI";
  studio.state.generation = "5G";
  studio.applySmartProfile();
  studio.state.power.batteryType = "LITHIUM";
  studio.state.power.batteryAh = 300;
  studio.state.microwave.topology = "SD";
  studio.state.cellular.sectors[0].txPower = 43;
  studio.normalizeState();

  const before = JSON.parse(JSON.stringify(studio.serializeSite()));
  const file = JSON.parse(studio.buildSiteFile());

  assert.equal(file.kind, "tower-studio/site");
  assert.equal(file.version, 1);
  assert.equal(studio.siteFileIssues(file).length, 0);

  // Wipe the live site, then re-import the file.
  studio.startFresh();
  assert.notDeepEqual(JSON.parse(JSON.stringify(studio.serializeSite())), before);

  assert.equal(studio.importSiteFile(JSON.stringify(file)), true);
  const after = JSON.parse(JSON.stringify(studio.serializeSite()));
  assert.deepEqual(after, before);

  dom.window.close();
});

test("bad site files are rejected with a reason instead of half-applying", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  const good = JSON.parse(studio.buildSiteFile());

  assert.equal(studio.importSiteFile("{ not json"), false);
  assert.equal(studio.state.env, "MOUNTAIN_PEAK", "a bad file must not touch the site");

  const wrongKind = { ...good, kind: "something/else" };
  assert.equal(studio.importSiteFile(JSON.stringify(wrongKind)), false);
  assert.ok(studio.siteFileIssues(wrongKind)[0].includes("Tower Studio site file"));

  const wrongVersion = { ...good, version: 99 };
  assert.equal(studio.importSiteFile(JSON.stringify(wrongVersion)), false);
  assert.ok(studio.siteFileIssues(wrongVersion)[0].includes("version 99"));

  const brokenSite = { ...good, site: { ...good.site, env: "NOT_A_PLACE" } };
  assert.equal(studio.importSiteFile(JSON.stringify(brokenSite)), false);

  // A file with unknown/over-range values is clamped rather than rejected.
  const sloppy = {
    ...good,
    site: { ...good.site, H: 9999, generation: "WAT", cellular: { sectors: [{ azimuth: 9e9 }] } },
  };
  assert.equal(studio.siteFileIssues(sloppy).length, 0);
  assert.equal(studio.importSiteFile(JSON.stringify(sloppy)), true);
  assert.ok(studio.state.H <= 60, "height is clamped to the tower range");
  assert.equal(studio.state.generation, "MIXED", "unknown generation falls back");
  assert.ok(studio.state.cellular.sectors[0].azimuth <= 360);

  dom.window.close();
});

test("undo and redo step through site changes one action at a time", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.startFresh();

  // "Start fresh" is itself undoable, so the baseline is taken after it.
  const start = JSON.stringify(studio.serializeSite());
  assert.equal(studio.canUndo(), true);
  assert.equal(studio.canRedo(), false);

  studio.commitHistory("environment");
  studio.state.env = "URBAN_ROOFTOP";
  studio.applyEnvironmentTowerRule("URBAN_ROOFTOP");
  studio.normalizeState();
  const stepOne = JSON.stringify(studio.serializeSite());
  assert.notEqual(stepOne, start);

  studio.commitHistory("tower");
  studio.state.tower = "ROOFTOP_POLE";
  studio.normalizeState();
  const stepTwo = JSON.stringify(studio.serializeSite());
  assert.notEqual(stepTwo, stepOne);

  studio.undo();
  assert.equal(JSON.stringify(studio.serializeSite()), stepOne, "undo returns one step");
  assert.equal(studio.canRedo(), true);

  studio.undo();
  assert.equal(JSON.stringify(studio.serializeSite()), start);
  assert.equal(studio.canUndo(), false);

  studio.redo();
  assert.equal(JSON.stringify(studio.serializeSite()), stepOne);
  studio.redo();
  assert.equal(JSON.stringify(studio.serializeSite()), stepTwo);
  assert.equal(studio.canRedo(), false);

  // A fresh action clears the redo branch.
  studio.undo();
  studio.commitHistory("grounding");
  studio.state.grounding = false;
  assert.equal(studio.canRedo(), false);

  dom.window.close();
});

test("the undo stack is capped at 50 actions and keeps the newest ones", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.startFresh();

  for (let i = 0; i < 70; i += 1) {
    studio.commitHistory(`action-${i}`);
    studio.state.H = 30 + (i % 20);
    studio.normalizeState();
  }

  let undone = 0;
  while (studio.canUndo() && undone < 200) {
    studio.undo();
    undone += 1;
  }
  assert.equal(undone, 50, "only the last 50 actions are remembered");

  dom.window.close();
});

test("a slider drag is one undo entry, not one per input event", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.startFresh();
  studio.enterMasterStep(1);
  studio.state.tab = "configure";
  studio.renderDrawer();

  const slider = document.querySelector("#tower-height");
  assert.ok(slider, "the height slider is rendered");

  const before = JSON.stringify(studio.serializeSite());
  // focusin opens the transaction, many input events follow, one change closes it.
  slider.dispatchEvent(new dom.window.FocusEvent("focusin", { bubbles: true }));
  for (let value = 30; value <= 40; value += 1) {
    slider.value = String(value);
    slider.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  }
  slider.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  assert.equal(studio.canUndo(), true);

  studio.undo();
  assert.equal(JSON.stringify(studio.serializeSite()), before, "the whole drag undoes at once");

  dom.window.close();
});

test("undo after go-on-air takes the site back off air", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.startFresh();

  studio.commitHistory("go on air");
  studio.launch.onAir = true;
  studio.launch.launchedAt = Date.now();
  assert.equal(studio.launch.onAir, true);

  studio.undo();
  assert.equal(studio.launch.onAir, false, "undo must not leave the site falsely on air");

  dom.window.close();
});

test("restoring a configuration version rebuilds the site it snapshotted", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.startFresh();

  studio.state.env = "RURAL_GREENFIELD";
  studio.state.tower = "GUYED_MAST";
  studio.state.H = 60;
  studio.state.generation = "4G";
  studio.applySmartProfile();
  studio.normalizeState();
  const snapshot = siteWithoutFlow(snapshotSite(studio));

  studio.runCLI("cvms BEFORE-CHANGE");

  // Move the site away from the snapshot.
  studio.state.env = "URBAN_ROOFTOP";
  studio.applyEnvironmentTowerRule("URBAN_ROOFTOP");
  studio.normalizeState();
  assert.notDeepEqual(siteWithoutFlow(snapshotSite(studio)), snapshot);

  assert.equal(studio.restoreCV("BEFORE-CHANGE"), true);
  assert.deepEqual(siteWithoutFlow(snapshotSite(studio)), snapshot);

  // The same restore is available from the CLI.
  studio.state.env = "URBAN_ROOFTOP";
  studio.applyEnvironmentTowerRule("URBAN_ROOFTOP");
  studio.normalizeState();
  const output = studio.runCLI("cvrestore BEFORE-CHANGE");
  assert.match(output, /restored/i);
  assert.deepEqual(siteWithoutFlow(snapshotSite(studio)), snapshot);

  assert.match(studio.runCLI("cvrestore NOPE"), /ERROR/);

  dom.window.close();
});

test("changing profile with manual card edits asks first, and can be cancelled", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.startFresh();
  studio.enterMasterStep(2);
  studio.state.tab = "configure";

  // One hand-fitted edit: remove a card the profile would have fitted.
  studio.state.rack.slots.tdm = false;
  studio.syncManualSlot("tdm");
  assert.equal(studio.manualSlotCount(), 1);

  const beforeVendor = studio.state.rack.vendor;
  studio.requestProfileChange("smart-vendor", "HUAWEI");
  assert.equal(
    studio.state.rack.vendor,
    beforeVendor,
    "the vendor is not switched until the change is confirmed"
  );

  studio.cancelProfileChange();
  assert.equal(studio.state.rack.pendingProfile, null);

  studio.requestProfileChange("smart-vendor", "HUAWEI");
  studio.confirmProfileChange();
  assert.equal(studio.state.rack.vendor, "HUAWEI");
  assert.equal(studio.manualSlotCount(), 0, "applying the profile clears the manual record");

  // With no manual edits the change applies immediately and silently.
  studio.requestProfileChange("smart-vendor", "NOKIA");
  assert.equal(studio.state.rack.vendor, "NOKIA");
  assert.equal(studio.state.rack.pendingProfile, null);

  dom.window.close();
});

test("resetting the cards to profile defaults is a single undoable action", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.startFresh();

  studio.state.rack.slots.tdm = false;
  studio.state.rack.slots.router = false;
  studio.syncManualSlot("tdm");
  studio.syncManualSlot("router");
  assert.equal(studio.manualSlotCount(), 2);

  const before = JSON.parse(JSON.stringify(studio.serializeSite()));
  studio.resetSlotsToProfile();

  assert.equal(studio.manualSlotCount(), 0);
  assert.equal(studio.state.rack.slots.tdm, true);
  assert.equal(studio.state.rack.slots.router, true);

  studio.undo();
  assert.deepEqual(JSON.parse(JSON.stringify(studio.serializeSite())), before);

  dom.window.close();
});

test("AI Architect shows a plan card instead of rebuilding immediately", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.startFresh();

  const before = JSON.stringify(studio.serializeSite());
  studio.requestAIBuild("zagros mountain 5g relay dual generator");

  const card = document.querySelector("#ai-plan-card");
  assert.equal(card.hidden, false, "the plan card is visible");
  assert.match(card.textContent, /Build this site/i);
  assert.match(card.textContent, /5G/);
  assert.equal(JSON.stringify(studio.serializeSite()), before, "nothing is built yet");

  studio.cancelAIBuild();
  assert.equal(card.hidden, true);
  assert.equal(JSON.stringify(studio.serializeSite()), before);

  studio.requestAIBuild("zagros mountain 5g relay dual generator");
  studio.confirmAIBuild();
  assert.notEqual(JSON.stringify(studio.serializeSite()), before, "confirming builds the site");
  assert.equal(card.hidden, true);

  dom.window.close();
});

test("AI Architect says so when it recognises nothing", () => {
  const { studio, document, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.startFresh();

  const before = JSON.stringify(studio.serializeSite());
  studio.requestAIBuild("qqq zzz");

  const card = document.querySelector("#ai-plan-card");
  assert.equal(card.hidden, false);
  assert.match(card.textContent, /did not recognise any site details/i);
  assert.equal(JSON.stringify(studio.serializeSite()), before);

  dom.window.close();
});

test("Ctrl/Cmd+Z is ignored while typing so the browser keeps its text undo", () => {
  const { studio, document, dom, window } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.startFresh();

  studio.commitHistory("grounding");
  studio.state.grounding = false;
  const changed = JSON.stringify(studio.serializeSite());
  assert.equal(studio.canUndo(), true);

  const input = document.querySelector("#ai-architect-input");
  input.focus();
  const event = new dom.window.KeyboardEvent("keydown", {
    key: "z",
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  input.dispatchEvent(event);
  assert.equal(JSON.stringify(studio.serializeSite()), changed, "no undo while typing");
  assert.equal(event.defaultPrevented, false, "the shortcut is not swallowed");

  // Outside a field the shortcut does undo.
  input.blur();
  assert.notEqual(document.activeElement, input);
  const undoEvent = new dom.window.KeyboardEvent("keydown", {
    key: "z",
    metaKey: true,
    bubbles: true,
    cancelable: true,
  });
  document.body.dispatchEvent(undoEvent);
  assert.notEqual(JSON.stringify(studio.serializeSite()), changed);
  assert.equal(studio.state.grounding, true);

  dom.window.close();
  void window;
});

test("the restored-workspace notice can be dismissed or used to start fresh", () => {
  const { studio, dom, window } = createHeadlessStudio({ width: 1440, height: 900 });
  studio.startFresh();

  studio.state.env = "EMERGENCY_DISASTER";
  studio.applyEnvironmentTowerRule("EMERGENCY_DISASTER");
  studio.normalizeState();
  studio.saveWorkspace();
  const saved = JSON.parse(JSON.stringify(studio.serializeSite()));

  // Start fresh clears the autosave as well as the live site.
  studio.startFresh();
  assert.notEqual(studio.state.env, "EMERGENCY_DISASTER");
  assert.equal(window.localStorage.getItem(WORKSPACE_KEY), null);

  window.localStorage.removeItem(WORKSPACE_KEY);
  dom.window.close();

  // A fresh boot restores on entry and shows the notice.
  const second = createHeadlessStudio({ width: 1440, height: 900 });
  second.window.localStorage.setItem(
    WORKSPACE_KEY,
    JSON.stringify({ version: 1, savedAt: new Date().toISOString(), site: saved })
  );
  assert.equal(second.studio.restoreWorkspaceIfPresent(), true);
  assert.equal(second.studio.state.env, "EMERGENCY_DISASTER");
  assert.equal(second.studio.state.restoreNotice, true);

  second.studio.renderDrawer();
  const notice = second.document.querySelector(".restore-notice");
  assert.ok(notice, "the restore notice is rendered");
  assert.match(notice.textContent, /Restored your last site/i);
  assert.match(notice.textContent, /Start fresh/i);

  second.studio.state.restoreNotice = false;
  second.studio.renderDrawer();
  assert.equal(second.document.querySelector(".restore-notice"), null);

  second.window.localStorage.removeItem(WORKSPACE_KEY);
  second.dom.window.close();
});

test("the detail level is remembered on its own key", () => {
  const { studio, dom, window } = createHeadlessStudio({ width: 1440, height: 900 });
  window.localStorage.removeItem("tower-studio.detail.v1");

  assert.equal(studio.state.detail, "GUIDED");
  studio.setDetailLevel("ENGINEER");
  assert.equal(studio.state.detail, "ENGINEER");
  assert.equal(window.localStorage.getItem("tower-studio.detail.v1"), "ENGINEER");
  assert.equal(studio.readDetailLevel(), "ENGINEER");

  studio.setDetailLevel("GUIDED");
  assert.equal(studio.readDetailLevel(), "GUIDED");

  window.localStorage.removeItem("tower-studio.detail.v1");
  dom.window.close();
});
