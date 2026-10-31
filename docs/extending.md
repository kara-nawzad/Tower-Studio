# Extending Tower Studio

This guide shows how to add new hardware models, CLI commands, or offline AI scenarios to Tower Studio while preserving engineering consistency.

---

## Development Workflow

1. Start the local server:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:3000` and inspect `window.TowerStudio` in your browser DevTools console.
3. After making edits in `src/js/app.js` or `src/styles/main.css`, run:
   ```bash
   npm run format
   npm run lint
   npm test
   npm run build
   ```

---

## Common Extension Points in `src/js/app.js`

### 1. Adding a New Tower Structure (Step 01)

1. Add a new entry to the `TOWERS` catalog with height `range`, `defaultHeight`, `maxTwist`, `kgPerM`, `fixedWeight`, `areaPerM`, `cd`, and `section`.
2. Register the structure key inside `ENVIRONMENTS[envKey].allowed` for each compatible site environment.
3. Add its procedural 3D geometry builder inside `buildTower()` and register pickable components via `register(meshOrGroup, metadata)`.
4. Update `towerDisallowedReason()` so incompatible environments display a clear engineering explanation.

### 2. Adding a 19-Inch Rack Module or Generation Profile (Step 02 & Step 05)

1. Add the card's DC power consumption (in kW) to `RACK_SLOT_POWER`.
2. Add **vendor-neutral** plain-English overview and spec descriptions to `RACK_CONTENT`.
   No brand or model name may ever live in `RACK_CONTENT`, because it is shared by
   every vendor.
3. Add the vendor's own name for the card to `VENDOR_SLOT_NAMES` (and the short
   front-panel text to `VENDOR_SLOT_BADGE`). Use a string when every generation
   shares the name, or an object with a `default` plus optional `2G` / `3G` / `4G` /
   `5G` overrides. Where no real product name is certain, use vendor-neutral
   wording such as "Site IP router", "TDM circuit emulation unit", "Microwave
   shelf" or "Digital unit (GSM)".
4. Update `VENDOR_CHASSIS` if the profile needs its own cabinet summary line, and
   `SMART_GENERATIONS` when a whole new generation is introduced.
5. Render its 3D shelf geometry inside `buildRack()` and register it so clicking
   the card opens its inspector.

> `tests/vendor-catalogue.test.mjs` fails if any vendor x generation combination
> shows a competitor's brand or model name anywhere in the drawer or CLI output.

### 2b. Persisted Site State

`serializeSite()` defines what a saved site is. When you add a new setting:

1. Add it to `serializeSite()`.
2. Read and **clamp** it in `normalizeSiteData()`, which is the single validation
   gate for localStorage autosave, undo/redo, `.json` files and `cvrestore`.
3. Restore it in `applySite()`.

Anything you leave out is treated as a simulation transient and is re-derived
after every restore. Never persist `powerSim`, `cellularSim`, `rackSim`,
`launch`, `aiBuild`, sweep traces or terminal scrollback.

New mutating `data-action` values must be listed in `MUTATING_ACTIONS` so they
become undoable, or in `PROFILE_ACTIONS` if they refit the whole card profile
and therefore need the overwrite confirmation.

### 3. Adding a Vendor CLI Command (Step 05)

1. Locate `ericssonCLI()`, `huaweiCLI()`, or `nokiaCLI()` in `src/js/app.js`.
2. Read live values from `st`, `calculateEngineering()`, `calculatePower()`, `calculateRack()`, `calculateMicrowave()`, or `calculateSweep()`—never return stale hardcoded telemetry when live state exists.
3. Optionally add the command string to `cliCommands()` if it should appear as a one-click button in the quick-command bar.

### 4. Adding an Offline AI Architect Scenario or Keyword (Phase 07)

1. **Preset Chip:** Add a reference blueprint object in `AI_BLUEPRINTS` and add a matching `<button class="ai-chip" data-ai-scenario="...">` in `index.html`.
2. **Natural-Language Intent:** Extend the regular expressions inside `parseAIArchitect(prompt)` to map new keywords onto `config` properties, and push a descriptive tag into `intents`.
3. Keep all inference deterministic and local—do not introduce remote API calls or API keys.

---

## Adding Automated Tests

Add new test cases in [`tests/app.test.mjs`](../tests/app.test.mjs) using Node's built-in `node:test` and `node:assert/strict` modules. The test suite boots `index.html` and `src/js/app.js` inside `jsdom` with `three` (see `tests/helpers/headless.mjs`), allowing you to call `window.TowerStudio` methods directly and assert engineering outputs.

Three suites are kept separate on purpose:

- `tests/app.test.mjs` — product behaviour (flow, HUD, hero tab, CLI, AI).
- `tests/guards.test.mjs` — the red lines: colour tokens, fonts, the 3D material
  palette, catalogue tables, camera constants, registry sizes and the
  default-state engineering numbers.
- `tests/vendor-catalogue.test.mjs` — vendor naming honesty and the Phase 1
  truthfulness fixes.
- `tests/workspace.test.mjs` — autosave, undo/redo, site files, CV restore and
  confirmations.
- `tests/flow.test.mjs` — the guided five-step flow: done/attention/locked states,
  the 4A/4B branch, the gate strip and the visible disabled reasons.
- `tests/responsive.test.mjs` — phone/tablet/desktop layout contracts.
- `tests/glossary.test.mjs` — detail levels and the plain-language term popovers.
- `tests/hardening.test.mjs` — HUD node reuse, the rebuild throttle, the Three.js
  SRI + offline fallback, the hero encodings and what `scripts/build.mjs` copies.

Every suite shares `tests/helpers/headless.mjs`, which exposes
`createHeadlessStudio({ width, height })` → `{ studio, document, dom, window }` and
evaluates `matchMedia` queries for real against `innerWidth` / `innerHeight`
(a stub that always returns `matches: true` makes every breakpoint true at once
and hides real bugs).
