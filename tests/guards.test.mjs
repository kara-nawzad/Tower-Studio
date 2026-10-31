// Red-line guard tests.
//
// These tests exist so that the parts of Tower Studio the owner explicitly loves
// cannot be changed accidentally while the interface is reorganised:
//   * the cream/paper colour tokens and the three font families,
//   * the 3D material palette, the tower/environment catalogue and the camera,
//     renderer and lighting constants,
//   * the number of registered 3D objects per environment,
//   * the default-state engineering numbers.
//
// If one of these fails, the change was deliberate: update the expected value and
// record the delta in TOWER-STUDIO-redesign-notes.md.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { ROOT_DIR, createHeadlessStudio } from "./helpers/headless.mjs";

const CSS_PATH = path.join(ROOT_DIR, "src/styles/main.css");
const JS_PATH = path.join(ROOT_DIR, "src/js/app.js");

// Values produced inside the JSDOM realm have a different Object prototype, so
// they are round-tripped through JSON before a strict deep comparison.
const plain = (value) => JSON.parse(JSON.stringify(value));

function readRootBlock(css) {
  const start = css.indexOf(":root {");
  assert.notEqual(start, -1, "main.css must define a :root block");
  const end = css.indexOf("}", start);
  const body = css.slice(start + ":root {".length, end);
  const tokens = {};
  for (const line of body.split("\n")) {
    const m = line.match(/^\s*(--[a-z-]+):\s*(.+?);\s*$/);
    if (m) tokens[m[1]] = m[2].trim();
  }
  return tokens;
}

test("design tokens: every :root custom property and the three font families are locked", () => {
  const css = fs.readFileSync(CSS_PATH, "utf8");
  const tokens = readRootBlock(css);

  assert.deepEqual(tokens, {
    "--paper": "#fbfbf9",
    "--white": "#ffffff",
    "--ink": "#0f172a",
    "--muted": "#64748b",
    "--line": "#cbd5e1",
    "--amber": "#facc15",
    "--green": "#10b981",
    "--blue": "#2563eb",
    "--orange": "#f97316",
    "--red": "#dc2626",
    "--heading": '"Barlow Condensed", sans-serif',
    "--body": '"Barlow", system-ui, sans-serif',
    "--mono": '"Space Mono", monospace',
  });

  // The three families must stay wired to the same CSS variables everywhere.
  assert.equal((css.match(/var\(--heading\)/g) || []).length >= 1, true);
  assert.equal((css.match(/var\(--body\)/g) || []).length >= 1, true);
  assert.equal((css.match(/var\(--mono\)/g) || []).length >= 1, true);
  // Every font-family declaration must use one of the three tokens.
  for (const decl of css.match(/font-family:[^;]+;/g) || []) {
    assert.match(decl, /font-family:\s*var\(--(heading|body|mono)\);/);
  }
  // And they must still be declared exactly once each.
  for (const family of ["Barlow Condensed", "Barlow", "Space Mono"]) {
    const hits = css.match(new RegExp(`"${family}"`, "g")) || [];
    assert.equal(hits.length, 1, `${family} should be declared exactly once`);
  }
});

test("3D palette, catalogues and camera/renderer/light constants are locked", () => {
  const source = fs.readFileSync(JS_PATH, "utf8");
  const { window, dom } = createHeadlessStudio({ width: 1440, height: 900, guard: true });
  const g = plain(window.__guard);

  // --- materials: name -> "hex" or "hex/opacity/t" (+ "/d" for double side) ---
  const compact = (o) =>
    Object.fromEntries(
      Object.entries(o).map(([k, v]) => [
        k,
        v.transparent ? `${v.color}/${v.opacity}/t${v.side ? "/d" : ""}` : v.color,
      ])
    );

  assert.deepEqual(compact(g.MAT), {
    ink: "1e293b",
    steel: "475569",
    galvanized: "94a3b8",
    lightSteel: "cbd5e1",
    concrete: "d6d3d1",
    concreteLight: "e7e5e4",
    ballast: "a8a29e",
    rubber: "292524",
    gravel: "d8d2c4",
    soil: "e5d6b8",
    mountain: "b9b5ad",
    rockA: "8d8b86",
    rockB: "aaa69e",
    dirt: "d6be96",
    copper: "b87333",
    brass: "c69c3c",
    green: "10b981",
    blue: "2563eb",
    amber: "facc15",
    orange: "f97316",
    red: "dc2626",
    white: "f8fafc",
    dark: "0f172a",
    glass: "93c5fd/0.55/t",
    tire: "1c1917",
    building: "e2e8f0",
  });

  assert.deepEqual(compact(g.LED), {
    green: "10b981",
    red: "dc2626",
    amber: "facc15",
    blue: "2563eb",
    off: "334155",
  });

  assert.deepEqual(compact(g.LINES), {
    EDGE: "0f172a/0.78/t",
    FENCE_LINE: "64748b/0.72/t",
    COPPER_LINE: "b87333",
    PROTECTION_ESE: "facc15/0.035/t/d",
    PROTECTION_FRANKLIN: "2563eb/0.055/t/d",
    SMOKE: "94a3b8/0.24/t",
    RACK_CYAN: "22d3ee/0.95/t",
    RACK_GLOW: "67e8f9/0.18/t",
    RACK_PATH: "06b6d4/0.34/t",
    RACK_YELLOW: "fde047",
  });

  // --- camera construction ---
  assert.equal(g.camera.type, "OrthographicCamera");
  assert.equal(g.camera.near, 0.1);
  assert.equal(g.camera.far, 600);
  assert.equal(g.camera.zoom, 1);
  assert.deepEqual(
    [g.camera.left, g.camera.right, g.camera.top, g.camera.bottom],
    [-20, 20, 20, -20],
    "Orthographic frustum construction args must stay -20/20/20/-20"
  );
  assert.match(source, /const camera = new T\.OrthographicCamera\(-20, 20, 20, -20, 0\.1, 600\);/);

  // --- orbit setup: literal start pose for both current and goal ---
  const poseLiteral = "theta: 0.82, phi: 0.93, size: 31, target: V3(0, 15, 0)";
  assert.equal(
    (source.match(new RegExp(poseLiteral.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || [])
      .length,
    2,
    "cameraCurrent and cameraGoal must both keep the literal start pose"
  );
  assert.match(source, /160 \* Math\.sin\(cameraCurrent\.phi\)/);
  assert.match(source, /160 \* Math\.cos\(cameraCurrent\.phi\)/);
  assert.match(source, /const ease = 1 - Math\.pow\(0\.002, dt\);/);
  // Zoom / pinch clamps: 0.32 .. 150 appear on every clamp call.
  const zoomClamps = source.match(/clamp\([^;]*?0\.32, 150\)/g) || [];
  assert.equal(zoomClamps.length, 4, "pinch, wheel, zoom-out and zoom-in must keep 0.32..150");

  // --- renderer + lights ---
  assert.deepEqual(g.renderer, {
    shadowMapEnabled: true,
    shadowMapType: 2, // T.PCFSoftShadowMap
    outputEncoding: 3001, // T.sRGBEncoding
  });
  assert.deepEqual(g.lights, [
    {
      type: "HemisphereLight",
      color: "ffffff",
      intensity: 0.9,
      groundColor: "d6cdbd",
      position: [0, 1, 0],
      castShadow: false,
      mapSize: null,
      shadowCamera: null,
      bias: null,
    },
    {
      type: "DirectionalLight",
      color: "fff7e8",
      intensity: 0.82,
      groundColor: null,
      position: [38, 72, 32],
      castShadow: true,
      mapSize: [2048, 2048],
      shadowCamera: { left: -75, right: 75, top: 100, bottom: -45, near: 1, far: 240 },
      bias: -0.00035,
    },
  ]);

  // --- catalogues ---
  assert.deepEqual(Object.keys(g.TOWERS), [
    "LATTICE_TUBULAR_3LEG",
    "LATTICE_ANGULAR_4LEG",
    "ROOFTOP_RTT_DRAME",
    "ROOFTOP_POLE",
    "MONOPOLE_LIGHT_DUTY",
    "GUYED_MAST",
    "COW_TELESCOPIC_TRUCK",
  ]);
  const towerSummary = Object.fromEntries(
    Object.entries(g.TOWERS).map(([k, v]) => [
      k,
      [
        v.name,
        v.short,
        ...v.range,
        v.defaultHeight,
        v.kgPerM,
        v.fixedWeight,
        v.areaPerM,
        v.cd,
        v.twistAtMax,
        v.maxTwist,
        v.section,
      ].join("|"),
    ])
  );
  assert.deepEqual(towerSummary, {
    LATTICE_TUBULAR_3LEG:
      "3-leg tubular lattice|TUBULAR 3-LEG|30|60|45|82|430|0.46|0.8|0.46|0.5|CHS 168.3 × 6.3 mm · S355",
    LATTICE_ANGULAR_4LEG:
      "4-leg angular lattice|ANGULAR 4-LEG|30|60|45|116|620|0.62|1.25|0.48|0.5|L 90 × 90 × 8 mm · S355",
    ROOFTOP_RTT_DRAME:
      "Rooftop RTT / DRAME|ROOFTOP RTT|3|15|9|91|680|0.52|1.15|0.28|0.5|L 75 × 75 × 6 mm · S355",
    ROOFTOP_POLE:
      "Rooftop parapet pole|ROOFTOP POLE|3|6|6|22|48|0.17|1|0.62|1|CHS 114.3 × 5 mm · galvanized",
    MONOPOLE_LIGHT_DUTY:
      "Light-duty monopole|MONOPOLE|18|30|24|104|390|0.78|0.9|0.42|0.5|Tapered hollow S355 shaft",
    GUYED_MAST:
      "Guyed lattice mast|GUYED MAST|40|80|60|43|510|0.38|1|0.86|1|CHS 88.9 × 4 mm · S355",
    COW_TELESCOPIC_TRUCK:
      "Telescopic COW truck|EMERGENCY COW|15|25|20|31|740|0.24|0.85|0.73|1|Nested galvanized telescopic sections",
  });

  assert.deepEqual(Object.keys(g.ENVIRONMENTS), [
    "MOUNTAIN_PEAK",
    "URBAN_ROOFTOP",
    "RURAL_GREENFIELD",
    "EMERGENCY_DISASTER",
  ]);
  const envSummary = Object.fromEntries(
    Object.entries(g.ENVIRONMENTS).map(([k, v]) => [
      k,
      [
        v.name,
        v.wind,
        v.ice,
        v.bearing,
        v.soil,
        v.earthBase,
        v.allowed.join("+"),
        v.defaultTower,
        v.mandatoryESE,
        v.mandatoryGrounding,
        v.foundation,
      ].join("|"),
    ])
  );
  assert.deepEqual(envSummary, {
    MOUNTAIN_PEAK:
      "Mountain Peak|160|Severe · 25 mm|450|Rock / engineered backfill|2.1|LATTICE_TUBULAR_3LEG+LATTICE_ANGULAR_4LEG|LATTICE_TUBULAR_3LEG|true|true|Rock-anchored C30/37 plinths",
    URBAN_ROOFTOP:
      "Urban Rooftop|120|None||Concrete roof / structural frame|0.8|ROOFTOP_RTT_DRAME+ROOFTOP_POLE|ROOFTOP_RTT_DRAME|false|false|Non-penetrating grillage + ballast",
    RURAL_GREENFIELD:
      "Rural Greenfield|130|Light · 10 mm|180|Compacted soil · verify geotech|3.4|LATTICE_ANGULAR_4LEG+LATTICE_TUBULAR_3LEG+MONOPOLE_LIGHT_DUTY+GUYED_MAST|LATTICE_ANGULAR_4LEG|false|false|Reinforced concrete spread foundations",
    EMERGENCY_DISASTER:
      "Emergency COW|100|None|120|Compacted dirt / temporary outpost|4.6|COW_TELESCOPIC_TRUCK|COW_TELESCOPIC_TRUCK|false|false|Four outrigger pads on compacted ground",
  });

  dom.window.close();
});

test("camera framing after fitSite() is locked for the default site", () => {
  const { window, dom } = createHeadlessStudio({ width: 1440, height: 900, guard: true });
  // fitSite(true) already ran during boot; record the resulting pose so a future
  // change to the size multipliers has to be deliberate.
  assert.deepEqual(plain(window.__guard.cameraInitial), {
    theta: 0.82,
    phi: 0.93,
    size: 33.165000000000006,
    target: [0, 16.65, 0],
  });
  dom.window.close();
});

test("registered 3D object count is locked for every environment", () => {
  const expected = {
    MOUNTAIN_PEAK: 84,
    URBAN_ROOFTOP: 76,
    RURAL_GREENFIELD: 86,
    EMERGENCY_DISASTER: 78,
  };

  for (const [env, count] of Object.entries(expected)) {
    const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });
    studio.state.env = env;
    studio.state.tower = studio.environments[env].defaultTower;
    studio.state.H = studio.towers[studio.state.tower].defaultHeight;
    studio.rebuild();
    assert.equal(studio.registry.size, count, `${env} registry size changed`);
    dom.window.close();
  }
});

test("default-state engineering outputs are locked", () => {
  const { studio, dom } = createHeadlessStudio({ width: 1440, height: 900 });

  assert.deepEqual(plain(studio.calculate()), {
    deadWeight: 4120,
    deadLoad: 40.403398,
    windArea: 25.3,
    q120: 0.681,
    sitePressure: 1.211,
    twist: 0.28,
    twistPass: true,
    overturning: 605,
    earthPits: 4,
    resistance: 2.1,
    resistancePass: true,
    soilBearing: 450,
    foundation: "Rock-anchored C30/37 plinths",
  });

  const power = plain(studio.calculatePower());
  // climate.cycleRemaining is derived from performance.now() and is excluded on
  // purpose; every other power number at the default site is asserted.
  const { climate, ...powerRest } = power;
  const { cycleRemaining, ...climateRest } = climate;
  assert.ok(cycleRemaining > 3.9 && cycleRemaining <= 4, "A/C duty cycle should start near 4 h");
  assert.deepEqual(plain(climateRest), {
    highTemp: false,
    dutyUnit: 1,
    active: [1],
    available: true,
  });
  assert.deepEqual(plain(powerRest), {
    dcLoad: 3.605,
    rackLoad: 0.56,
    microwaveLoad: 0.045,
    required: 2,
    installed: 3,
    available: 3,
    failed: 0,
    rectifierOnline: true,
    batteryDischarging: false,
    acLoad: 6.285106382978723,
    totalLoad: 6.285106382978723,
    nominalEnergy: 38.4,
    usableEnergy: 30.72,
    remainingEnergy: 30.72,
    autonomy: 8.521497919556172,
    batteryCurrent: 0,
    generatorActive: false,
    fuelRate: 0,
    estimatedFuelRate: 2.811234042553192,
    n1Pass: true,
    failoverPass: true,
    redundancyRemaining: 1,
    moduleLoad: 1.2016666666666667,
    moduleCurrent: 22.253086419753085,
    dcBusVoltage: -54,
    fuelRuntime: 277.45822232986194,
    transferRemaining: 0,
    states: { GEN1: "STOPPED", GEN2: "STOPPED" },
  });

  const rack = plain(studio.calculateRack());
  assert.deepEqual(rack, {
    loadKw: 0.56,
    backhaulGbps: 30,
    e1Lines: 8,
    voiceCalls: 96,
    opticalPorts: 15,
    wcdmaMbps: 48,
    radioCount: 6,
    housing: {
      model: "RBS 6201",
      vendor: "ERICSSON",
      outdoor: false,
      ip: "INDOOR",
      width: 0.6,
      height: 1.8,
      depth: 0.4,
      doubleDoor: false,
      description:
        "1800 × 600 × 400 mm indoor steel rack with four shelves and open mesh front door.",
    },
    patchReady: true,
    patchUp: false,
    alarmPathReady: true,
  });

  assert.deepEqual(plain(studio.calculateMicrowave()), {
    topology: {
      label: "1+0 Standalone",
      detail: "1 dish · 1 ODU · tail site",
      dishes: 1,
      odus: 1,
      modems: 1,
      multiplier: 1,
      loss: 0,
      splitters: 0,
      xpic: false,
    },
    gain: 37.27294608794706,
    referenceGain: 37.27294608794706,
    mountType: "INTEGRATED",
    mountLoss: 0,
    topologyLoss: 0,
    totalLoss: 0,
    alignmentError: 12,
    voltage: 0.5,
    alignmentRsl: -88,
    rsl: -88,
    fadeMargin: -3,
    locked: false,
    approaching: false,
    beamStrength: 0.03,
    xpicActive: false,
    capacityMbps: 1000,
    oduCount: 1,
    modemCount: 1,
    powerKw: 0.045,
    dishCount: 1,
    splitterCount: 0,
  });

  const acceptance = studio.calculateAcceptance();
  assert.equal(acceptance.pass, false);
  assert.deepEqual(plain(acceptance.checks.map((c) => `${c.id}|${c.pass}|${c.value}`)), [
    "civil|true|0.28° deflection · limit ≤ 0.50°",
    "earthing|true|2.1 Ω · target < 5.0 Ω",
    "power|true|-48V DC · 3 installed / 3 required",
    "backhaul|false|-88.0 dBm RSL · -3.0 dB fade",
    "rf|true|3 sectors · worst VSWR 1.17 · limit ≤ 1.32",
    "alarms|true|0 unacknowledged critical/major · 0 total",
  ]);
  assert.deepEqual(plain(acceptance.criticalAlarms), []);

  // RF sweeps: the whole 601-point curve for each sector is hashed so a change to
  // the sweep model is caught without embedding 1800 numbers in this file.
  for (const sector of [0, 1, 2]) {
    const sweep = plain(studio.calculateSweep(sector));
    const digest = crypto
      .createHash("sha256")
      .update(JSON.stringify(sweep.points.map((p) => [p.distance, p.vswr])))
      .digest("hex")
      .slice(0, 16);
    assert.equal(sweep.fault, false, `sector ${sector} should start fault-free`);
    assert.equal(
      digest,
      {
        0: "d2b9354a0fbfa011",
        1: "a0001f12d671f5d2",
        2: "b0e5675276be9e3a",
      }[sector],
      `sector ${sector} VSWR sweep curve changed`
    );
  }

  dom.window.close();
});
