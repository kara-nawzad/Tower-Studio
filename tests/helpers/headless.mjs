// Shared headless harness: boots index.html + src/js/app.js inside JSDOM with a
// mocked WebGL renderer so the DOM, state and engineering models can be asserted
// without a real GPU.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import * as THREE from "three";

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// Appended to app.js before evaluation. app.js is a strict-mode script, so its
// top-level consts are local to the eval; this snippet copies the values we want
// to guard onto window.__guard without touching the shipped source.
const GUARD_PROBE = `
window.__guard = (() => {
  const meshInfo = (m) => ({
    type: m.type,
    color: m.color ? m.color.getHexString() : null,
    opacity: m.opacity,
    transparent: m.transparent,
    side: m.side,
    depthWrite: m.depthWrite,
  });
  const lights = [];
  scene.traverse((o) => {
    if (o.isLight) {
      lights.push({
        type: o.type,
        color: o.color.getHexString(),
        intensity: o.intensity,
        groundColor: o.groundColor ? o.groundColor.getHexString() : null,
        position: o.position.toArray(),
        castShadow: !!o.castShadow,
        mapSize: o.shadow ? [o.shadow.mapSize.x, o.shadow.mapSize.y] : null,
        shadowCamera: o.shadow
          ? {
              left: o.shadow.camera.left,
              right: o.shadow.camera.right,
              top: o.shadow.camera.top,
              bottom: o.shadow.camera.bottom,
              near: o.shadow.camera.near,
              far: o.shadow.camera.far,
            }
          : null,
        bias: o.shadow ? o.shadow.bias : null,
      });
    }
  });
  return {
    MAT: Object.fromEntries(Object.entries(MAT).map(([k, m]) => [k, meshInfo(m)])),
    LED: Object.fromEntries(Object.entries(LED).map(([k, m]) => [k, meshInfo(m)])),
    LINES: {
      EDGE: meshInfo(EDGE),
      FENCE_LINE: meshInfo(FENCE_LINE),
      COPPER_LINE: meshInfo(COPPER_LINE),
      PROTECTION_ESE: meshInfo(PROTECTION_ESE),
      PROTECTION_FRANKLIN: meshInfo(PROTECTION_FRANKLIN),
      SMOKE: meshInfo(SMOKE),
      RACK_CYAN: meshInfo(RACK_CYAN),
      RACK_GLOW: meshInfo(RACK_GLOW),
      RACK_PATH: meshInfo(RACK_PATH),
      RACK_YELLOW: meshInfo(RACK_YELLOW),
    },
    TOWERS,
    ENVIRONMENTS,
    camera: {
      type: camera.type,
      near: camera.near,
      far: camera.far,
      zoom: camera.zoom,
      left: camera.left,
      right: camera.right,
      top: camera.top,
      bottom: camera.bottom,
    },
    cameraInitial: {
      theta: cameraGoal.theta,
      phi: cameraGoal.phi,
      size: cameraGoal.size,
      target: cameraGoal.target.toArray(),
    },
    lights,
    renderer: {
      shadowMapEnabled: renderer.shadowMap.enabled,
      shadowMapType: renderer.shadowMap.type,
      outputEncoding: renderer.outputEncoding,
    },
  };
})();
`;

export function createHeadlessStudio({
  width = 1440,
  height = 900,
  guard = false,
  reducedMotion = false,
  // A stand-in for window.AudioContext. jsdom has no Web Audio at all, which is
  // the point of one of the sound tests, but the palette needs something that
  // records the nodes it is asked to build.
  audioContext = null,
  // Seed localStorage before the app boots, for the preferences it remembers.
  storage = null,
} = {}) {
  const html = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");
  const appJs = fs.readFileSync(path.join(ROOT_DIR, "src/js/app.js"), "utf8");

  const dom = new JSDOM(html, {
    url: "http://localhost:3000/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });

  const { window } = dom;
  window.innerWidth = width;
  window.innerHeight = height;
  // jsdom has no real media engine, and a stub that always matches would make
  // every viewport query true. Evaluate the simple queries the app actually
  // uses against innerWidth / innerHeight.
  window.matchMedia = (query) => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const test = String(query || "")
      .toLowerCase()
      .split(" and ")
      .map((clause) => clause.trim().replace(/^[(\s]+|[)\s]+$/g, ""))
      .map((clause) => {
        const [rawFeature, rawValue] = clause.split(":").map((part) => part.trim());
        const value = (rawValue || "").replace("px", "");
        if (rawFeature === "max-width") return width <= Number(value);
        if (rawFeature === "min-width") return width >= Number(value);
        if (rawFeature === "max-height") return height <= Number(value);
        if (rawFeature === "min-height") return height >= Number(value);
        if (rawFeature === "orientation")
          return value === "landscape" ? width >= height : height >= width;
        // No pointer or motion model in jsdom; report the desktop defaults.
        if (rawFeature === "pointer") return value === "fine";
        if (rawFeature === "prefers-reduced-motion")
          return reducedMotion ? value === "reduce" : value === "no-preference";
        return false;
      });
    return {
      media: String(query || ""),
      matches: test.every(Boolean),
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    };
  };
  window.requestAnimationFrame = () => 1;
  window.cancelAnimationFrame = () => {};
  window.HTMLCanvasElement.prototype.getContext = () => null;
  window.HTMLElement.prototype.scrollBy = function scrollBy(opts) {
    if (typeof opts === "object" && opts !== null) {
      this.scrollLeft = (this.scrollLeft || 0) + (opts.left || 0);
    }
  };

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

  if (audioContext) window.AudioContext = audioContext;
  if (storage) {
    for (const [key, value] of Object.entries(storage)) window.localStorage.setItem(key, value);
  }

  window.THREE = { ...THREE, WebGLRenderer: MockWebGLRenderer };
  window.eval(guard ? `${appJs}\n${GUARD_PROBE}` : appJs);

  return { dom, window, document: window.document, studio: window.TowerStudio };
}
