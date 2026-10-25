# Architecture Overview

Tower Studio is a **client-side 3D telecommunications site-engineering workbench**. It runs directly in modern web browsers without requiring a backend server, database, or external AI API.

---

## High-Level Structure

| Layer                  | File                                              | Responsibility                                                                                                                                                                   |
| ---------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Markup Shell           | [`index.html`](../index.html)                     | Top bar, HUD container, AI Architect command bar, 3-tab engineering drawer (`Overview`, `Configure`, `Specs`), and 5-step master navigation bar                                  |
| Visual Design          | [`src/styles/main.css`](../src/styles/main.css)   | Editorial CAD color palette, responsive layout (left-anchored 540 px desktop drawer; ≤ 44vh mobile bottom sheet), ≥ 44 × 44 px touch targets, and `prefers-reduced-motion` rules |
| Simulation & 3D Engine | [`src/js/app.js`](../src/js/app.js)               | Engineering catalogs, application state, Three.js scene/mesh builders, raycast object picking, drawer renderers, multi-vendor CLI, and offline Phase 07 AI engines               |
| Dev & Build Tooling    | [`scripts/`](../scripts/) & [`tests/`](../tests/) | Local HTTP server (`dev-server.mjs`), static bundle validator (`build.mjs`), and headless DOM + Three.js verification suite (`app.test.mjs`)                                     |

---

## State & Calculation Pipeline

All 3D visuals, HUD readouts, drawer specifications, and CLI outputs derive from one shared in-memory state model in `src/js/app.js`:

```text
User Input / CLI / AI Architect
              │
              ▼
   State Normalization Guards
   (Environment ↔ Tower, Rooftop IP55, N+1, Space Diversity clearance)
              │
              ▼
   Deterministic Calculators
   ├── calculateEngineering()   → Structural weight, wind area, twist, earthing Ω
   ├── calculateRack()          → Slot kW draw, E1/optical capacity, patch & alarm highway
   ├── calculateMicrowave()     → Dish gain (dBi), RSL (dBm), fade margin, XPIC Gbps
   ├── calculatePower()         → Total AC/DC kW, rectifier N+1, battery autonomy hours
   ├── calculateSweep()         → 601-point VSWR & Distance-to-Fault curve per sector
   └── calculateAcceptance()    → 6-gate Carrier Site Acceptance pass/fail evaluation
              │
              ├──► Three.js Scene Builders (`rebuildSite()` + `requestAnimationFrame` loop)
              ├──► Engineering Drawer & Live HUD (`renderDrawer()`, `updateHUD()`)
              └──► Multi-Vendor CLI & AI NOC Copilot (`executeCLI()`, `runAICopilot()`)
```

---

## 3D Rendering & Raycast Picking

- **Orthographic CAD Framing:** Uses `THREE.OrthographicCamera` shifted horizontally on wide viewports (`≥ 1100 px`) and vertically on mobile (`< 760 px`) so the 3D tower is centered in the unobstructed viewport region rather than hidden behind the drawer.
- **Component Registry:** Interactive 3D equipment groups register metadata in a `registry` `Map`. Pointer clicks raycast only against registered pickable meshes; decorative wireframes, RF cones, and animated pulses disable raycasting so narrow 1U rack cards remain easy to select.
- **Deterministic Offline AI (Phase 07):**
  - _AI Architect (`parseAIArchitect`, `startAIBuild`):_ Regex/keyword intent parser driving a 3.0-second `requestAnimationFrame` staged assembly.
  - _Waveform Classifier (`classifyRFWaveform`):_ Local rule classifier evaluating peak VSWR and discontinuity spans across 601 samples.
  - _NOC Copilot (`runAICopilot`, `applyTriageChoice`):_ Correlates live alarms, power horizon, and feeder faults into three guided remediation actions.

---

## Public Diagnostic API

For debugging and automated testing, `src/js/app.js` attaches its runtime API to `window.TowerStudio` (with `window.CellForge` kept as a backward-compatible alias). See [`docs/technical-reference.md`](./technical-reference.md) for the complete list of exposed methods and formulas.
