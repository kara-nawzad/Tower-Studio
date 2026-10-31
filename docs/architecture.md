# Architecture Overview

Tower Studio is a **client-side 3D telecommunications site-engineering workbench**. It runs directly in modern web browsers without requiring a backend server, database, or external AI API.

---

## High-Level Structure

| Layer                  | File                                              | Responsibility                                                                                                                                                                                                    |
| ---------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Markup Shell           | [`index.html`](../index.html)                     | Top bar, HUD container, AI Architect command bar, single scrolling engineering panel, and 5-step master navigation bar. Loads Three.js r128 from the CDN with an SRI hash and falls back to `vendor/three.min.js` |
| Visual Design          | [`src/styles/main.css`](../src/styles/main.css)   | Editorial CAD color palette, responsive layout (desktop side drawer; mobile bottom sheet), ≥ 44 × 44 px touch targets, `prefers-reduced-motion` rules, and the glossary popover / `More options` fold styles      |
| Simulation & 3D Engine | [`src/js/app.js`](../src/js/app.js)               | Engineering catalogs, application state, guided flow controller, Three.js scene/mesh builders, raycast object picking, panel renderers, multi-vendor CLI, and offline Phase 07 AI engines                         |
| Dev & Build Tooling    | [`scripts/`](../scripts/) & [`tests/`](../tests/) | Local HTTP server (`dev-server.mjs`), static bundle validator (`build.mjs`), and headless DOM + Three.js suites (`app`, `flow`, `responsive`, `glossary`, `hardening`)                                            |

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
   Guided Flow Controller
   (step gating, done / attention / locked reasons, detail level)
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
              ├──► Three.js Scene Builders (`rebuildSite()`, throttled by `scheduleRebuild()`)
              ├──► Engineering Panel & Live HUD (`renderPanel()`, `updateHUD()`)
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

## Guided Flow & Detail Levels

The interface is a **branching wizard**, not a flat control wall:

```text
01 Site ──► 02 Open cabinet ──► 03 Power ──► 04 Aim & Connect ──► 05 Go on air
  │            │             │            │            │
  └── each step evaluates its own prerequisites and renders one of:
        Done · Needs attention · Locked (with a visible reason string)
```

- **Branch hiding:** a step only renders the controls that apply to the current
  branch. A rooftop site never asks for soil bearing; a `1+0` microwave link never
  asks for XPIC pairing; a site with no IP55 outdoor cabinet never asks about solar
  load on the enclosure.
- **Locking:** later steps stay locked until the earlier ones pass. The lock is
  enforced in `enterMasterStep()` and the reason is printed as text beside the
  control, because `title` tooltips do not appear on touch devices.
- **Detail levels:** `Guided` folds the `Specs and details` sections behind a
  `More options` `<details>` and keeps copy plain; `Engineer` renders every row
  inline with full units. `isEngineerMode()` is the single source of truth.
- **Glossary:** `GLOSSARY` holds 28 short definitions. `Term(key, label)` renders a
  `<button class="term">` whose `.term-def` popover is opened by click, hover
  (pointer devices only) or keyboard focus, and closed by `Esc` or an outside
  click.

## Performance & Hardening

- **HUD diffing:** `updateHUD()` builds a plain `cells[]` description and hands it
  to `renderHUDCells()`, which keeps a `WeakMap` of the last rendered state per HUD
  element. Nodes are reused and only changed label / value / class / id /
  `data-live` attributes are written, so status text no longer flickers or
  re-triggers layout on every frame. A full re-render happens only when the
  `mode:count` signature changes.
- **Throttled rebuilds:** `scheduleRebuild()` is a leading-edge 80 ms throttle
  (`REBUILD_THROTTLE_MS`). Dragging a slider produces one rebuild per frame budget
  instead of one per input event.
- **Offline-capable 3D:** the CDN `<script>` for Three.js r128 carries
  `integrity="sha384-…"`, `crossorigin="anonymous"` and `referrerpolicy`; an
  `onerror` handler flags failure and a synchronous `vendor/three.min.js`
  `document.write` takes over before `app.js` runs. The vendored file is
  byte-identical to the CDN build (asserted by recomputing the hash in
  `tests/hardening.test.mjs`).
- **Hero encodings:** AVIF (224 kB) → WebP (394 kB) → PNG, so the first paint does
  not pay for a 3.2 MB download.

---

## Public Diagnostic API

For debugging and automated testing, `src/js/app.js` attaches its runtime API to `window.TowerStudio` (with `window.CellForge` kept as a backward-compatible alias). See [`docs/technical-reference.md`](./technical-reference.md) for the complete list of exposed methods and formulas.
