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
3. Add its procedural 3D geometry builder inside `buildStructure()` and register pickable components via `register(meshOrGroup, metadata)`.
4. Update `towerDisallowedReason()` so incompatible environments display a clear engineering explanation.

### 2. Adding a 19-Inch Rack Module or Generation Profile (Step 02 & Step 05)

1. Add the card's DC power consumption (in kW) to `RACK_SLOT_POWER`.
2. Add plain-English overview and spec descriptions to `RACK_CONTENT`.
3. Update `SMART_GENERATIONS` if the card belongs to a curated `2G`, `3G`, `4G`, `5G`, or `MIXED` profile.
4. Render its 3D shelf geometry inside `buildRack()` and register it so clicking the card opens its inspector.

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

Add new test cases in [`tests/app.test.mjs`](../tests/app.test.mjs) using Node's built-in `node:test` and `node:assert/strict` modules. The test suite boots `index.html` and `src/js/app.js` inside `jsdom` with `three`, allowing you to call `window.TowerStudio` methods directly and assert engineering outputs.
