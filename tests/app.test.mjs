import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import * as THREE from "three";
import { createStaticServer } from "../scripts/dev-server.mjs";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

test("index.html links external stylesheet and application script cleanly", () => {
  const html = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
  assert.match(html, /<link\s+rel="stylesheet"\s+href="\.\/src\/styles\/main\.css"/);
  assert.match(html, /<script\s+src="\.\/src\/js\/app\.js"><\/script>/);
  assert.doesNotMatch(html, /<style>/);
  assert.match(html, /three\.js\/r128\/three\.min\.js/);
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

test("application boots cleanly in headless DOM + Three.js and executes Phases 01–07", () => {
  const html = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
  const appJs = fs.readFileSync(path.join(ROOT_DIR, "src/js/app.js"), "utf8");

  const dom = new JSDOM(html, {
    url: "http://localhost:3000/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });

  const { window } = dom;
  window.innerWidth = 1280;
  window.innerHeight = 800;
  window.matchMedia = () => ({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  window.requestAnimationFrame = () => 1;
  window.cancelAnimationFrame = () => {};
  window.HTMLCanvasElement.prototype.getContext = () => null;

  class MockWebGLRenderer {
    constructor() {
      this.shadowMap = { enabled: false, type: null, autoUpdate: false, needsUpdate: false };
      this.outputEncoding = null;
    }
    setPixelRatio() {}
    setSize() {}
    render() {}
    dispose() {}
  }

  window.THREE = { ...THREE, WebGLRenderer: MockWebGLRenderer };
  window.eval(appJs);

  const studio = window.TowerStudio;
  assert.ok(studio, "window.TowerStudio should be initialized");
  assert.equal(window.CellForge, studio, "window.CellForge compatibility alias should match");
  assert.equal(
    window.document.getElementById("loading").classList.contains("hidden"),
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

  // Verify Phase 05 sweep + Phase 07 RF waveform classifier
  const sweep = studio.calculateSweep(0);
  const diagnosis = studio.classifyRFWaveform(sweep);
  assert.equal(diagnosis.fault, false);
  assert.equal(diagnosis.confidence, 99.1);

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
