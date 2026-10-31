import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import * as THREE from "three";
import { createStaticServer } from "../scripts/dev-server.mjs";
import { ROOT_DIR, createHeadlessStudio } from "./helpers/headless.mjs";

test("project structure contains entry HTML, separated CSS/JS, docs, assets, and scripts", () => {
  const expectedPaths = [
    "index.html",
    "src/styles/main.css",
    "src/js/app.js",
    "assets/preview.svg",
    "docs/technical-reference.md",
    "scripts/dev-server.mjs",
    "scripts/build.mjs",
  ];

  for (const rel of expectedPaths) {
    assert.equal(fs.existsSync(path.join(ROOT_DIR, rel)), true, `Expected ${rel} to exist`);
  }

  assert.equal(
    fs.existsSync(path.join(ROOT_DIR, "TowerStudio.html")),
    false,
    "Duplicate TowerStudio.html should not exist"
  );
});

test("header branding displays INTERACTIVE 3D ENGINEERING SUITE without Phase 01-07 developer subtitle", () => {
  const html = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
  const previewSvg = fs.readFileSync(path.join(ROOT_DIR, "assets/preview.svg"), "utf8");

  assert.match(html, /<link\s+rel="stylesheet"\s+href="\.\/src\/styles\/main\.css"/);
  assert.match(html, /<script\s+src="\.\/src\/js\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /<style>/);
  assert.match(html, /three\.js\/r128\/three\.min\.js/);

  assert.match(html, /INTERACTIVE 3D ENGINEERING SUITE/);
  assert.doesNotMatch(html, /Tower Studio workbench/i);
  assert.doesNotMatch(html, /Phase 01[–-]07/i);
  assert.match(previewSvg, /INTERACTIVE 3D ENGINEERING SUITE/);
  assert.doesNotMatch(previewSvg, /WORKBENCH\s*\/\s*PHASE 01/i);
});

test("static dev server serves index.html, CSS, and JS with 200 status codes", async () => {
  const server = createStaticServer(ROOT_DIR);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const htmlRes = await fetch(`${baseUrl}/`);
    assert.equal(htmlRes.status, 200);
    assert.match(htmlRes.headers.get("content-type") || "", /text\/html/);

    const cssRes = await fetch(`${baseUrl}/src/styles/main.css`);
    assert.equal(cssRes.status, 200);
    assert.match(cssRes.headers.get("content-type") || "", /text\/css/);

    const jsRes = await fetch(`${baseUrl}/src/js/app.js`);
    assert.equal(jsRes.status, 200);
    assert.match(jsRes.headers.get("content-type") || "", /text\/javascript/);
  } finally {
    server.closeAllConnections?.();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("gentle first-run onboarding starts in calm New Site Setup and advances to Step 02 Vendor & Cabinet", () => {
  const { dom, document, studio } = createHeadlessStudio({ width: 1440, height: 900 });

  assert.equal(studio.state.onboarding.active, true);
  assert.equal(studio.state.onboarding.towerSelected, false);
  assert.equal(studio.state.masterStep, 1);

  // Calm top HUD in setup mode (no 10 alarming red/green telemetry cells on initial load)
  const livePill = document.getElementById("live-pill");
  assert.equal(livePill.classList.contains("setup"), true);
  assert.equal(livePill.textContent.trim(), "SETTING UP");

  const hud = document.getElementById("site-hud");
  assert.equal(hud.classList.contains("is-setup"), true);
  assert.match(hud.textContent, /\[\s*Setting up\s*\]/);
  assert.equal(hud.querySelectorAll(".hud-cell.red, .hud-cell strong.red").length, 0);
  assert.equal(hud.querySelectorAll(".hud-cell").length, 4);

  // Step 01 focuses purely on Tower Type & Height; tabs are hidden until Step 02
  const tabsBar = document.querySelector("#drawer .tabs");
  assert.equal(tabsBar.hidden, true);
  assert.equal(document.querySelector(".drawer-title h2").textContent, "New site setup");
  assert.ok(
    document.querySelector(".onboarding-hint"),
    "Initial hint should prompt user to pick tower or height"
  );
  assert.equal(document.querySelector('[data-action="onboarding-next"]'), null);

  // Pick an allowed tower card -> reveals glowing [ Next: Select Vendor & Cabinet -> ] button
  const fourLegBtn = document.querySelector(
    '[data-action="tower"][data-value="LATTICE_ANGULAR_4LEG"]'
  );
  assert.ok(fourLegBtn, "4-leg angular lattice tower option should be rendered in Step 01");
  fourLegBtn.click();

  assert.equal(studio.state.tower, "LATTICE_ANGULAR_4LEG");
  assert.equal(studio.state.onboarding.towerSelected, true);
  const nextBtn = document.querySelector('[data-action="onboarding-next"]');
  assert.ok(nextBtn, "Glowing Next button should appear once tower/height is chosen");
  assert.match(nextBtn.textContent, /Next:\s*Select Vendor & Cabinet/);

  // Click Next -> advances smoothly to Step 02 Configure (Vendor & Cabinet) and activates live HUD
  nextBtn.click();
  assert.equal(studio.state.onboarding.active, false);
  assert.equal(studio.state.masterStep, 2);
  assert.equal(studio.state.tab, "configure");
  assert.equal(tabsBar.hidden, false);
  assert.equal(hud.classList.contains("is-setup"), false);
  assert.equal(hud.querySelectorAll(".hud-cell").length, 11);
  assert.ok(document.querySelector('[data-action="smart-vendor"][data-value="ERICSSON"]'));
  assert.ok(document.querySelector('[data-action="smart-vendor"][data-value="HUAWEI"]'));
  assert.ok(document.querySelector('[data-action="smart-vendor"][data-value="NOKIA"]'));

  dom.window.close();
});

test("Custom Multi-Gen curates matching baseband cards and dynamically sums HUD throughput & backhaul", () => {
  const { dom, document, studio } = createHeadlessStudio({ width: 1440, height: 900 });

  // Enter Step 02 Configure
  studio.enterMasterStep(2);
  studio.state.tab = "configure";
  studio.rebuild();

  const customGenBtn = document.querySelector(
    '[data-action="smart-generation"][data-value="CUSTOM"]'
  );
  assert.ok(customGenBtn, "Custom Multi-Gen button should exist in Step 02 Step B");
  customGenBtn.click();

  assert.equal(studio.state.generation, "CUSTOM");
  const chips = document.querySelectorAll('[data-action="custom-gen-toggle"]');
  assert.equal(chips.length, 4, "Should render 2G GSM, 3G WCDMA, 4G LTE, and 5G NR toggle chips");

  // Default custom selection is 2G + 3G on Ericsson -> DUG 20 + DUW 30, 42.2 Mbps, 116 Mbps backhaul
  assert.deepEqual([...studio.state.customGenerations], ["2G", "3G"]);
  assert.equal(studio.state.rack.slots.dug, true, "DUG 20 should be slotted for 2G");
  assert.equal(studio.state.rack.slots.duw, true, "DUW 30 should be slotted for 3G");
  assert.equal(
    studio.state.rack.slots.baseband,
    false,
    "Baseband 6630 should not be slotted for 2G+3G"
  );
  assert.equal(studio.customGenerationMetrics().throughput, "42.2 Mbps");
  assert.equal(studio.customGenerationMetrics().backhaulMbps, 116);

  const hudText2g3g = document.getElementById("site-hud").textContent;
  assert.match(hudText2g3g, /Cellular 2G\+3G42\.2 Mbps/);
  assert.match(hudText2g3g, /Backhaul speed116 Mbps/);

  // Toggle 2G off while 3G remains, verify minimum-1 guard, then toggle 4G on -> 3G + 4G (DUW 30 + Baseband 6630)
  document.querySelector('[data-action="custom-gen-toggle"][data-value="2G"]').click();
  document.querySelector('[data-action="custom-gen-toggle"][data-value="3G"]').click();
  assert.deepEqual([...studio.state.customGenerations], ["3G"]);

  document.querySelector('[data-action="custom-gen-toggle"][data-value="4G"]').click();
  assert.deepEqual([...studio.state.customGenerations], ["3G", "4G"]);
  assert.equal(studio.state.rack.slots.dug, false, "DUG 20 excluded when 2G is unchecked");
  assert.equal(studio.state.rack.slots.duw, true, "DUW 30 active for 3G");
  assert.equal(studio.state.rack.slots.baseband, true, "Baseband 6630 active for 4G");
  assert.equal(studio.customGenerationMetrics().throughput, "342 Mbps");
  assert.equal(studio.customGenerationMetrics().backhaulMbps, 600);
  assert.match(studio.smartProfile().chassis, /DUW 30 digital unit \(WCDMA\) \+ Baseband 6630/);

  const hudText3g4g = document.getElementById("site-hud").textContent;
  assert.match(hudText3g4g, /Cellular 3G\+4G342 Mbps/);
  assert.match(hudText3g4g, /Backhaul speed600 Mbps/);

  // Add 5G NR -> 3G + 4G + 5G (3.34 Gbps cellular, 3.6 Gbps backhaul, MIXED active + passive antennas)
  document.querySelector('[data-action="custom-gen-toggle"][data-value="5G"]').click();
  assert.deepEqual([...studio.state.customGenerations], ["3G", "4G", "5G"]);
  assert.equal(studio.state.rack.slots.baseband, true);
  assert.equal(studio.customGenerationMetrics().throughput, "3.34 Gbps");
  assert.equal(studio.customGenerationMetrics().rfMode, "MIXED");
  assert.match(document.getElementById("site-hud").textContent, /Backhaul speed3\.6 Gbps/);

  // Verify Huawei and Nokia vendor switching preserves Custom Multi-Gen card curation
  document.querySelector('[data-action="smart-vendor"][data-value="HUAWEI"]').click();
  assert.equal(studio.state.rack.vendor, "HUAWEI");
  assert.equal(studio.state.rack.slots.dug, true, "Huawei UMPT control card curated");
  assert.equal(studio.state.rack.slots.duw, true, "Huawei WCDMA card curated");
  assert.equal(studio.state.rack.slots.baseband, true, "Huawei UBBP baseband card curated");

  document.querySelector('[data-action="smart-vendor"][data-value="NOKIA"]').click();
  assert.equal(studio.state.rack.vendor, "NOKIA");
  assert.equal(studio.state.rack.slots.dug, true, "Nokia ASIK control card curated");
  assert.equal(studio.state.rack.slots.duw, true, "Nokia WCDMA extension curated");
  assert.equal(studio.state.rack.slots.baseband, true, "Nokia ABIL capacity card curated");

  dom.window.close();
});

test("top telemetry bar horizontal scroller and responsive rules work at 1440px desktop and 390px mobile", () => {
  const css = fs.readFileSync(path.join(ROOT_DIR, "src/styles/main.css"), "utf8");
  assert.match(css, /\.site-hud\s*\{[\s\S]*?display:\s*flex/);
  assert.match(css, /\.site-hud\s*\{[\s\S]*?overflow-x:\s*auto/);
  assert.match(css, /\.site-hud\s*\{[\s\S]*?scrollbar-width:\s*thin/);
  assert.match(css, /\.hud-cell\s*\{[\s\S]*?flex:\s*0\s+0\s+auto/);
  assert.match(css, /\.site-hud-shell\.can-scroll-right::after/);

  // Test 390px mobile viewport + horizontal HUD overflow & scroll chevrons
  const { dom, window, document, studio } = createHeadlessStudio({ width: 390, height: 844 });
  studio.enterMasterStep(2);

  const shell = document.getElementById("site-hud-shell");
  const hud = document.getElementById("site-hud");
  const leftBtn = document.getElementById("hud-scroll-left");
  const rightBtn = document.getElementById("hud-scroll-right");
  assert.ok(shell && hud && leftBtn && rightBtn);

  // Simulate horizontal overflow on a 390px viewport
  Object.defineProperty(hud, "clientWidth", { value: 350, configurable: true });
  Object.defineProperty(hud, "scrollWidth", { value: 1460, configurable: true });
  hud.scrollLeft = 0;
  studio.syncHUDScroll();

  assert.equal(shell.classList.contains("is-scrollable"), true);
  assert.equal(shell.classList.contains("can-scroll-left"), false);
  assert.equal(shell.classList.contains("can-scroll-right"), true);
  assert.equal(leftBtn.hidden, true);
  assert.equal(rightBtn.hidden, false);

  rightBtn.click();
  studio.syncHUDScroll();
  assert.ok(hud.scrollLeft > 0, "Clicking right chevron should advance horizontal scroll");
  assert.equal(shell.classList.contains("can-scroll-left"), true);
  assert.equal(leftBtn.hidden, false);

  // Switch viewport to 1440px desktop and verify resize recalculates scroller state cleanly
  window.innerWidth = 1440;
  window.innerHeight = 900;
  Object.defineProperty(hud, "clientWidth", { value: 1120, configurable: true });
  window.dispatchEvent(new window.Event("resize"));
  assert.equal(shell.classList.contains("can-scroll-right"), true);

  dom.window.close();
});

test("dual A/C condensing units sit on a raised concrete plinth beside the battery row with zero collisions", () => {
  const { dom, studio } = createHeadlessStudio({ width: 1440, height: 900 });

  for (const envKey of Object.keys(studio.environments)) {
    studio.state.env = envKey;
    studio.state.tower = studio.environments[envKey].defaultTower;
    studio.state.H = studio.towers[studio.state.tower].defaultHeight;
    studio.rebuild();
    studio.scene.updateMatrixWorld(true);

    const pos = studio.getPowerPositions();
    // Both A/C condensers are elevated on the concrete plinth (y = 0.36) beside the battery row along the shelter wall
    assert.equal(pos.ac1[1], 0.36, `${envKey}: AC 1 should be elevated on 0.36m concrete plinth`);
    assert.equal(pos.ac2[1], 0.36, `${envKey}: AC 2 should be elevated on 0.36m concrete plinth`);
    assert.ok(
      pos.ac1[0] > pos.battery[0] + 1.5,
      `${envKey}: AC 1 should sit cleanly to the right of the battery cabinet`
    );
    assert.ok(
      Math.abs(pos.ac1[2] - pos.battery[2]) < 0.35,
      `${envKey}: AC units should align neatly along the shelter wall row instead of out in front of the cable tray`
    );

    const plinthEntry = studio.registry.get("ac-plinth");
    const ac1Entry = studio.registry.get("ac-unit-1");
    const ac2Entry = studio.registry.get("ac-unit-2");
    assert.ok(plinthEntry, `${envKey}: Raised concrete plinth should be registered`);
    assert.ok(ac1Entry && ac2Entry, `${envKey}: Both A/C condensing units should be registered`);

    const acEnvelope = new THREE.Box3()
      .setFromObject(plinthEntry.object)
      .union(new THREE.Box3().setFromObject(ac1Entry.object))
      .union(new THREE.Box3().setFromObject(ac2Entry.object));

    // Check zero intersection with cable gantry and every earth pit
    const gantry = studio.registry.get("cable-gantry");
    if (gantry) {
      const gantryBox = new THREE.Box3().setFromObject(gantry.object);
      assert.equal(
        acEnvelope.intersectsBox(gantryBox),
        false,
        `${envKey}: Dual A/C plinth & units must not intersect cable gantry`
      );
    }

    for (const [id, entry] of studio.registry.entries()) {
      if (id.startsWith("earth-pit")) {
        const pitBox = new THREE.Box3().setFromObject(entry.object);
        assert.equal(
          acEnvelope.intersectsBox(pitBox),
          false,
          `${envKey}: Dual A/C plinth & units must not intersect ${id}`
        );
      }
    }

    // Check A/C envelope stays strictly inside perimeter fence / parapet walls
    const halfFenceX =
      envKey === "URBAN_ROOFTOP" ? 10.6 : envKey === "EMERGENCY_DISASTER" ? 11.6 : 14.6;
    const halfFenceZ =
      envKey === "URBAN_ROOFTOP" ? 8.6 : envKey === "EMERGENCY_DISASTER" ? 9.6 : 11.6;
    assert.ok(
      acEnvelope.max.x < halfFenceX && acEnvelope.min.x > -halfFenceX,
      `${envKey}: A/C plinth X bounds (${acEnvelope.min.x.toFixed(2)}..${acEnvelope.max.x.toFixed(2)}) must clear perimeter fence`
    );
    assert.ok(
      acEnvelope.max.z < halfFenceZ && acEnvelope.min.z > -halfFenceZ,
      `${envKey}: A/C plinth Z bounds (${acEnvelope.min.z.toFixed(2)}..${acEnvelope.max.z.toFixed(2)}) must clear perimeter fence`
    );
  }

  dom.window.close();
});

test("application executes full Phases 01–07 simulation, RF sweep classifier, CLI, and AI Architect", () => {
  const { dom, studio } = createHeadlessStudio({ width: 1280, height: 800 });

  assert.ok(studio, "window.TowerStudio should be initialized");
  assert.equal(dom.window.CellForge, studio, "window.CellForge compatibility alias should match");
  assert.equal(
    dom.window.document.getElementById("loading").classList.contains("hidden"),
    true,
    "Loading overlay should hide after startup"
  );

  // Verify engineering & power models
  const eng = studio.calculate();
  assert.equal(typeof eng.twist, "number");
  const power = studio.calculatePower();
  assert.equal(typeof power.autonomy, "number");

  // Verify master workflow steps 1 through 5
  for (const step of [1, 2, 3, 4, 5]) {
    studio.enterMasterStep(step);
    assert.equal(studio.state.masterStep, step);
  }

  // Verify Phase 05 sweep + Phase 07 RF waveform classifier.
  // The classifier is honest: peak VSWR, fault distance and the confidence-like
  // figure are all derived from the sweep, never hard-coded.
  const sweep = studio.calculateSweep(0);
  const diagnosis = studio.classifyRFWaveform(sweep);
  assert.equal(diagnosis.fault, false);
  assert.equal(diagnosis.distance, null);
  assert.equal(diagnosis.vswr, Number(sweep.max.toFixed(2)));
  assert.ok(diagnosis.headroom > 0 && diagnosis.headroom < 100);
  assert.equal(diagnosis.confidence, diagnosis.headroom);
  assert.equal(
    diagnosis.headroom,
    Number((((1.32 - sweep.max) / 1.32) * 100).toFixed(1)),
    "Headroom must be derived from the measured peak VSWR"
  );

  // Verify Phase 06 CLI + Phase 07 AI Architect parser & NOC Copilot
  const cliOut = studio.executeCLI("lt all");
  assert.match(cliOut, /Managed Object Hierarchy/);
  const copilotOut = studio.executeCLI("ai diagnose");
  assert.ok(copilotOut.length > 0);

  const blueprint = studio.parseAIArchitect(
    "Safeen 4G mountain relay using 1+1 microwave and grid"
  );
  assert.equal(blueprint.config.env, "MOUNTAIN_PEAK");
  assert.equal(blueprint.config.generation, "4G");

  dom.window.close();
});

test("hero tab opens first with left logo/title, living nature layers, inverse 3D parallax, and 4 equipment hotspots", () => {
  const { dom, document, studio } = createHeadlessStudio({ width: 1440, height: 900 });

  const hero = document.getElementById("hero-tab");
  assert.ok(hero, "Hero tab section should exist");
  assert.equal(studio.state.heroOpen, true, "Hero tab should open first on initial load");
  assert.equal(document.body.classList.contains("hero-active"), true);
  assert.equal(hero.classList.contains("is-hidden"), false);

  // Image & compact left branding lockup (cleaned of extra subtitle/paragraph/hint copy)
  const heroImg = hero.querySelector(".hero-image");
  assert.equal(heroImg.getAttribute("src"), "./herotower.PNG");
  const brandCard = document.getElementById("hero-brand-card");
  const lines = [...brandCard.querySelectorAll(".hero-headline-line")].map((el) =>
    el.textContent.trim()
  );
  assert.deepEqual(lines, ["TELECOM TOWER", "INSTALLATION SIMULATOR"]);
  assert.equal(brandCard.querySelector(".hero-brand-mark").textContent.trim(), "TS");
  assert.doesNotMatch(brandCard.textContent, /INTERACTIVE 3D ENGINEERING SUITE/);
  assert.doesNotMatch(brandCard.textContent, /Configure towers, multi-vendor/i);
  assert.doesNotMatch(brandCard.textContent, /Move cursor for 3D depth/i);

  // Living nature layers
  assert.ok(hero.querySelector(".hero-sunlight"));
  assert.ok(hero.querySelector(".hero-sky-drift"));
  assert.ok(hero.querySelector(".hero-lake-shimmer"));
  assert.ok(hero.querySelector(".hero-beacon-pulse"));
  assert.equal(hero.querySelectorAll(".hero-mote").length, 14);

  // Inverse 3D mouse parallax: right -> left (-X), left -> right (+X), up -> down (+Y), down -> up (-Y)
  studio.updateHeroPointer(1300, 450, true);
  assert.ok(studio.heroMotion.currentX < -20, "Mouse right should shift hero artwork left (-X)");
  studio.updateHeroPointer(140, 450, true);
  assert.ok(studio.heroMotion.currentX > 20, "Mouse left should shift hero artwork right (+X)");
  studio.updateHeroPointer(720, 100, true);
  assert.ok(studio.heroMotion.currentY > 12, "Mouse up should shift hero artwork down (+Y)");
  studio.updateHeroPointer(720, 800, true);
  assert.ok(studio.heroMotion.currentY < -12, "Mouse down should shift hero artwork up (-Y)");

  // 4 equipment hotspots with pulsing pins & callout boxes
  const hotspots = [...hero.querySelectorAll(".hero-hotspot")].map((el) => el.dataset.hotspot);
  assert.deepEqual(hotspots, ["tower", "shelter", "generator", "maintenance"]);
  assert.equal(hero.querySelectorAll(".hero-pin").length, 4);
  assert.equal(hero.querySelectorAll(".hero-note").length, 4);

  const genSpot = hero.querySelector('[data-hotspot="generator"]');
  genSpot.click();
  assert.equal(genSpot.classList.contains("is-open"), true);
  assert.equal(studio.heroMotion.activeHotspot, "generator");

  // Enter simulator & re-open Hero tab via topbar HERO button
  document.getElementById("hero-enter-btn").click();
  assert.equal(studio.state.heroOpen, false);
  assert.equal(document.body.classList.contains("hero-active"), false);
  assert.equal(hero.classList.contains("is-hidden"), true);

  document.getElementById("hero-toggle").click();
  assert.equal(studio.state.heroOpen, true);
  assert.equal(document.body.classList.contains("hero-active"), true);

  dom.window.close();
});
