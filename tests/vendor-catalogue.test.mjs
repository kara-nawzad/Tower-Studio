// Phase 1 guardrails: vendor naming honesty, always-present alarm hardware,
// truthful RF diagnostics and the behaviour fixes listed in the audit.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { ROOT_DIR, createHeadlessStudio } from "./helpers/headless.mjs";

const VENDORS = ["ERICSSON", "HUAWEI", "NOKIA"];
const GENERATIONS = ["2G", "3G", "4G", "5G", "MIXED", "CUSTOM"];
const RACK_KEYS = [
  "fau",
  "radio",
  "baseband",
  "dug",
  "duw",
  "scu",
  "shu",
  "router",
  "tdm",
  "amm",
  "ovp",
  "sau",
  "power-shelf",
  "battery-tray",
];

// Brand / model tokens that must never appear inside another vendor's cabinet.
const FOREIGN_TOKENS = {
  ERICSSON: [
    /ericsson/i,
    /\bdug\s*20\b/i,
    /\bduw\s*30\b/i,
    /baseband\s*66(?:30|48)/i,
    /router\s*6471/i,
    /\btdm\s*1001\b/i,
    /mini-?link/i,
    /\bamm\s*(?:2p|6p)\b/i,
    /\brbs\s*6\d{3}\b/i,
    /\bair\s*6449\b/i,
    /\b(?:rus|rug|ruw)\b/i,
    /\bsau\s*3?\b/i,
    /\bscu\b/i,
    /\bshu\b/i,
    /\bovp\b/i,
    /moshell/i,
    /pcf\s*\/\s*pcu/i,
  ],
  HUAWEI: [
    /huawei/i,
    /\bumpt/i,
    /\bubbp/i,
    /\bwbbp/i,
    /\bgtmu/i,
    /\bwmpt/i,
    /\brtn\s*950/i,
    /\bbbu\s*5900/i,
    /\bbts\s*3900/i,
    /\baau\s*5613/i,
  ],
  NOKIA: [/\bnokia/i, /\basik/i, /\babil/i, /airscale/i, /\bmaa\b/i, /\bfsmf\b/i, /\besma\b/i],
};

// Everything a user can read about the cabinet for one vendor x generation.
function cabinetTextFor(studio, document) {
  let text = "";
  for (const tab of ["overview", "configure", "specs"]) {
    studio.state.tab = tab;
    studio.renderDrawer();
    const node = document.querySelector("#drawer-content").cloneNode(true);
    // The vendor chooser legitimately names all three ecosystems.
    node.querySelectorAll(".vendor-grid, .smart-vendors").forEach((el) => el.remove());
    text += "\n" + node.textContent;
  }
  for (const key of RACK_KEYS) {
    studio.select(`rack-${key}`, false);
    const node = document.querySelector("#drawer-content").cloneNode(true);
    node.querySelectorAll(".vendor-grid, .smart-vendors").forEach((el) => el.remove());
    text += "\n" + node.textContent;
  }
  // Every command surface, so CLI output is covered too.
  for (const command of [
    "lt all",
    "cabx",
    "alt",
    "al",
    "st ru",
    "st cel",
    "st ret",
    "st tma",
    "cvls",
    "show port",
    "show hardware",
    "show system alarm",
    "LST ALM:;",
    "DSP CELL:;",
    "DSP BRD:;",
    "LST RRU:;",
    "show bts status",
    "show alarms",
    "help",
  ]) {
    text += "\n" + studio.executeCLI(command, false);
  }
  return text;
}

test("no vendor's cabinet ever shows a competitor's brand or model name", () => {
  const { dom, document, studio } = createHeadlessStudio({ width: 1440, height: 900 });

  for (const vendor of VENDORS) {
    for (const generation of GENERATIONS) {
      studio.state.rack.vendor = vendor;
      studio.state.generation = generation;
      studio.applySmartProfile();
      studio.enterMasterStep(2);
      const text = cabinetTextFor(studio, document);
      for (const other of VENDORS) {
        if (other === vendor) continue;
        for (const pattern of FOREIGN_TOKENS[other]) {
          const hit = text.match(pattern);
          assert.equal(
            hit,
            null,
            `${vendor}/${generation} leaks the ${other} token "${hit && hit[0]}"`
          );
        }
      }
    }
  }

  dom.window.close();
});

test("every card name resolves for every vendor and generation", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  for (const vendor of VENDORS) {
    for (const generation of GENERATIONS) {
      studio.state.rack.vendor = vendor;
      studio.state.generation = generation;
      const labels = studio.smartProfile().labels;
      for (const key of Object.keys(studio.state.rack.slots)) {
        assert.equal(
          typeof labels[key],
          "string",
          `${vendor}/${generation}/${key} has no card name`
        );
        assert.ok(labels[key].length > 2, `${vendor}/${generation}/${key} name is empty`);
      }
    }
  }
  dom.window.close();
});

test("site alarm station is present in every profile so the alarm trace never dead-ends", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });

  for (const vendor of VENDORS) {
    for (const generation of GENERATIONS) {
      studio.state.rack.vendor = vendor;
      studio.state.generation = generation;
      studio.applySmartProfile();
      for (const key of ["ovp", "sau", "scu", "shu"]) {
        assert.equal(studio.state.rack.slots[key], true, `${vendor}/${generation}/${key} missing`);
      }
      assert.equal(
        studio.calculateRack().alarmPathReady,
        true,
        `${vendor}/${generation} should leave the alarm highway traceable`
      );
    }
  }

  // Default Mixed-Mode load is unchanged by the alarm station.
  studio.state.rack.vendor = "ERICSSON";
  studio.state.generation = "MIXED";
  studio.applySmartProfile();
  assert.equal(studio.calculateRack().loadKw, 0.56);

  dom.window.close();
});

test("bulk fuel tank uses one nominal capacity everywhere (1,000 L)", () => {
  const source = fs.readFileSync(path.join(ROOT_DIR, "src/js/app.js"), "utf8");
  const docs = fs.readFileSync(path.join(ROOT_DIR, "docs/technical-reference.md"), "utf8");

  assert.doesNotMatch(source, /5,?000\s*L/);
  assert.match(source, /1,000 L Bulk Diesel Fuel Tank/);
  assert.match(source, /\["Usable capacity", "1,000 L nominal"\]/);
  assert.match(source, /\["NOMINAL CAPACITY", "1,000 L"\]/);
  assert.match(source, /fuelRemainingL: 780/);
  assert.doesNotMatch(source, /1,000L/);
  assert.doesNotMatch(docs, /1,000L/);
});

test("clearing the 3D selection keeps the user in the current step", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  for (const step of [2, 3, 4, 5]) {
    studio.enterMasterStep(step);
    studio.state.selectedId = "tower";
    studio.clearSelection();
    assert.equal(studio.state.selectedId, null);
    assert.equal(studio.state.masterStep, step, `Escape in step ${step} must not jump to step 1`);
  }
  dom.window.close();
});

test("changing environment keeps an allowed tower and swaps a disallowed one", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });

  studio.state.env = "RURAL_GREENFIELD";
  studio.state.tower = "LATTICE_ANGULAR_4LEG";
  studio.state.H = 45;
  studio.applyEnvironmentTowerRule("MOUNTAIN_PEAK");
  assert.equal(studio.state.tower, "LATTICE_ANGULAR_4LEG", "allowed tower is preserved");
  assert.equal(studio.state.H, 45, "allowed height is preserved");

  studio.state.tower = "GUYED_MAST";
  studio.state.H = 60;
  studio.applyEnvironmentTowerRule("MOUNTAIN_PEAK");
  assert.equal(studio.state.tower, "LATTICE_TUBULAR_3LEG", "disallowed tower falls back");
  assert.equal(studio.state.H, 45, "fallback uses the new environment's default height");

  // Height is clamped, not reset, when the tower survives the move.
  studio.state.env = "RURAL_GREENFIELD";
  studio.state.tower = "MONOPOLE_LIGHT_DUTY";
  studio.state.H = 30;
  studio.applyEnvironmentTowerRule("RURAL_GREENFIELD");
  assert.equal(studio.state.tower, "MONOPOLE_LIGHT_DUTY");
  assert.equal(studio.state.H, 30);

  dom.window.close();
});

test("space diversity depends on real dish clearance, not tower height alone", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });

  studio.state.env = "URBAN_ROOFTOP";
  studio.state.tower = "ROOFTOP_POLE";
  studio.state.H = 6;
  studio.state.microwave.spacing = 4;
  assert.equal(
    studio.spaceDiversityAllowed(),
    false,
    "A 6 m pole cannot hang a second dish 4 m lower with 1.4 m clearance"
  );

  studio.state.tower = "ROOFTOP_RTT_DRAME";
  studio.state.H = 9;
  assert.equal(studio.spaceDiversityAllowed(), true);

  studio.state.env = "MOUNTAIN_PEAK";
  studio.state.tower = "LATTICE_TUBULAR_3LEG";
  studio.state.H = 45;
  assert.equal(studio.spaceDiversityAllowed(), true);

  // The rule and the drawn geometry must agree.
  studio.state.microwave.spacing = 6;
  studio.state.H = 8;
  studio.state.tower = "MONOPOLE_LIGHT_DUTY";
  assert.equal(
    studio.spaceDiversityAllowed(),
    studio.primaryDishY(2) - 6 >= 1.4,
    "spaceDiversityAllowed() must use the same dish height as buildMicrowave"
  );

  dom.window.close();
});

test("RF classifier derives peak VSWR, fault distance and contrast from the sweep", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });

  const healthy = studio.classifyRFWaveform(studio.calculateSweep(0));
  assert.equal(healthy.fault, false);
  assert.equal(healthy.vswr, Number(studio.calculateSweep(0).max.toFixed(2)));
  assert.equal(healthy.distance, null);
  assert.ok(healthy.headroom > 0 && healthy.headroom < 100);

  studio.state.cellular.fault = true;
  const faulty = studio.classifyRFWaveform(studio.calculateSweep(0));
  assert.equal(faulty.fault, true);
  assert.equal(faulty.distance, studio.calculateSweep(0).faultDistance);
  assert.equal(faulty.vswr, Number(studio.calculateSweep(0).max.toFixed(2)));
  assert.ok(faulty.contrast > 0 && faulty.contrast < 100);
  assert.equal(faulty.confidence, faulty.contrast);

  // The Site Master badge reports the measured numbers, never literals.
  studio.state.cellular.fault = false;
  const sweep = studio.calculateSweep(0);
  assert.equal(sweep.max, Number(sweep.peak.vswr.toFixed(3)));
  assert.equal(sweep.nominal, 1.14);

  dom.window.close();
});

test("AI copilot option 2 throttle can be undone with option 4", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });

  studio.runAICopilot();
  const before = {
    radioLoadKw: studio.state.power.radioLoadKw,
    sectors: studio.state.cellular.sectors.map((sector) => ({ ...sector })),
  };

  studio.applyTriageChoice(2);
  assert.equal(studio.state.cellular.sectors[1].txPower, 43);
  assert.notEqual(studio.state.power.radioLoadKw, before.radioLoadKw);
  assert.ok(studio.triage.throttleBackup, "option 2 must snapshot the settings it changes");

  studio.applyTriageChoice(4);
  assert.equal(studio.state.power.radioLoadKw, before.radioLoadKw);
  studio.state.cellular.sectors.forEach((sector, index) => {
    assert.deepEqual({ ...sector }, before.sectors[index]);
  });
  assert.equal(studio.triage.throttleBackup, null, "restore clears the backup");

  dom.window.close();
});

test("ATS controller mode is explanatory text and no longer selectable", () => {
  const source = fs.readFileSync(path.join(ROOT_DIR, "src/js/app.js"), "utf8");
  assert.doesNotMatch(source, /data-action="ats-mode"/);
  assert.match(source, /ATS_MODE_TEXT/);
  assert.match(source, /class="read-only-row"/);
});

test("hardware inventory serials are stable per slot, not per list index", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });

  studio.state.rack.vendor = "ERICSSON";
  studio.state.generation = "MIXED";
  studio.applySmartProfile();
  const first = studio.executeCLI("show hardware", false);

  // Removing a low slot must not renumber the surviving cards.
  studio.state.rack.slots.fau = false;
  const second = studio.executeCLI("show hardware", false);

  const serials = (output) =>
    output
      .split("\n")
      .slice(1)
      .map((line) => (line.match(/SN (\S+)/) || [])[1])
      .filter(Boolean);

  const before = new Map(
    first
      .split("\n")
      .slice(1)
      .map((line) => [(line.match(/^(\S.*?) \| PN/) || [])[1], (line.match(/SN (\S+)/) || [])[1]])
      .filter(([name]) => name)
  );
  const after = new Map(
    second
      .split("\n")
      .slice(1)
      .map((line) => [(line.match(/^(\S.*?) \| PN/) || [])[1], (line.match(/SN (\S+)/) || [])[1]])
      .filter(([name]) => name)
  );

  for (const [name, serial] of after) {
    assert.equal(serial, before.get(name), `${name} changed serial when another slot was emptied`);
  }
  assert.ok(serials(second).length < serials(first).length);

  dom.window.close();
});

test("Huawei board inventory lists only installed cards", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });

  studio.state.rack.vendor = "HUAWEI";
  studio.state.generation = "MIXED";
  studio.applySmartProfile();
  const output = studio.executeCLI("DSP BRD:;", false);

  assert.doesNotMatch(output, /UPEU/);
  assert.match(output, /Huawei UMPT control card/);
  assert.match(output, /Huawei UBBP baseband card/);
  assert.match(output, /Huawei RTN 950A microwave shelf/);

  studio.state.rack.slots.amm = false;
  const withoutAmm = studio.executeCLI("DSP BRD:;", false);
  assert.doesNotMatch(withoutAmm, /RTN 950A/);

  dom.window.close();
});

test("SMART_GENERATIONS is never mutated at runtime", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });
  const snapshot = JSON.stringify(studio.smartGenerations);

  studio.state.generation = "CUSTOM";
  studio.state.customGenerations = ["2G", "3G", "4G", "5G"];
  studio.applySmartProfile();
  studio.customGenerationMetrics();

  assert.equal(JSON.stringify(studio.smartGenerations), snapshot);
  assert.equal(studio.customGenerationMetrics().throughput, "3.34 Gbps");

  dom.window.close();
});

test("dead CSS classes and dead simulation fields are gone", () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, "src/styles/main.css"), "utf8");
  const source = fs.readFileSync(path.join(ROOT_DIR, "src/js/app.js"), "utf8");

  assert.doesNotMatch(css, /\.empty-note/);
  assert.doesNotMatch(css, /\.mw-note/);
  assert.doesNotMatch(css, /\.drawer\.terminal-mode/);
  assert.doesNotMatch(source, /transferMs/);
  assert.doesNotMatch(source, /wasLocked/);
  assert.doesNotMatch(source, /lastBeep/);
  assert.doesNotMatch(source, /triage\.optimized/);
  // The compatibility alias must survive.
  assert.match(source, /window\.CellForge = window\.TowerStudio;/);
});
