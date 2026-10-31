# Changelog

All notable changes to **Tower Studio** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — Guided Flow Redesign (Phases 0–7)

A ground-up reorganization of the Tower Studio interface into a **guided, branching
workflow** that a first-time user can follow, while staying numerically and
terminologically credible to senior telecom engineers. Phone and laptop are treated
as equal priorities. The 3D scene, the color palette, the typography, the default
engineering numbers, and the public `window.TowerStudio` API are unchanged.

### Added

- **Guided branching flow (Phase 3):** Five master steps (`01 Site`, `02 Open
cabinet`, `03 Power`, `04 Aim & Connect` → `4A Backhaul` / `4B Sectors`,
  `05 Go on air`). Each step shows its own panel, marks itself
  **Done** or **Needs attention**, and keeps later steps **locked** until the
  prerequisites are satisfied — every locked control carries a visible text reason
  next to it (not only a `title` tooltip, which never shows on touch devices).
- **Detail levels (Phase 5):** A `Guided` / `Engineer` switch. `Guided` collapses
  the _Specs and details_ sections behind a `More options` fold and hides
  low-level rows; `Engineer` shows everything inline. The choice persists in
  `localStorage` under `tower-studio.detail.v1`.
- **Plain-language glossary (Phase 5):** 28 terms (VSWR, DTF, RSL, fade margin,
  N+1, autonomy, ATS, earth loop, dead load, wind area, torsion, soil bearing,
  backhaul, XPIC, space diversity, sector, baseband, patch cable, alarm highway,
  on air, configuration version, DC load, CLI, MO, dBi, dBm, E1, HVAC) rendered as
  dotted-underline buttons. Tap, hover, or keyboard focus opens a definition
  popover; `Esc` closes it.
- **Site files (Phase 2):** Save/load/export the whole site as a versioned JSON
  file (`kind: "tower-studio/site"`, `version: 1`), with a compatibility-version
  stamp used for honest restore messaging.
- **Undo / redo (Phase 2):** 50-step history (`HISTORY_LIMIT`) with keyboard
  shortcuts, wired to the same normalization pipeline as any other state change.
- **Autosave (Phase 2):** Debounced (400 ms) `localStorage` persistence under
  `tower-studio.workspace.v1`, with a restore notice shown on reload.
- **Confirmation flow (Phase 2):** Destructive actions (start fresh, load a file,
  restore a version) now ask first instead of discarding work silently.
- **Responsive pass (Phase 4):** One scrolling panel on phone, `≥ 44 × 44 px` tap
  targets, font sizes raised above the legibility floor, and camera framing offsets
  derived from the real drawer/sheet geometry instead of the hard-coded
  `0.34 / 0.17 / 0.12` frustum shifts.
- **Offline Three.js fallback (Phase 6):** The r128 CDN tag is pinned with an SRI
  `integrity` hash; if it fails, a local `vendor/three.min.js` (byte-identical
  official build, MIT — see `vendor/THREE-LICENSE.txt`) is loaded synchronously.
- **Modern hero encodings (Phase 6):** `herotower.webp` (394 kB) and
  `herotower.avif` (224 kB) served through `<picture>`, with the original
  `herotower.PNG` retained unchanged as the final fallback.
- **Test suites:** `tests/flow.test.mjs`, `tests/responsive.test.mjs`,
  `tests/glossary.test.mjs`, `tests/hardening.test.mjs`, and the shared
  `tests/helpers/headless.mjs` harness (real `matchMedia` evaluation over
  `innerWidth` / `innerHeight`).

### Changed

- **Effective radio DC load (Phase 1.8):** Radio draw is now the honest
  effective figure rather than nameplate. Ericsson default: radio load `3` →
  `3.605` (radio factor `1`, TX factor `1`); rack load `0.560`.
- **Truthful labels (Phase 1):** Controls now say what they actually do; the CLI
  and AI surfaces state plainly that the AI is local, rule-based, and has no API
  key or network access.
- **HUD updates (Phase 6):** `updateHUD()` diffs and reuses its cell nodes instead
  of rewriting the bar's `innerHTML` on every frame; only changed label / value /
  class / id / `data-live` attributes are written.
- **Rebuild scheduling (Phase 6):** `scheduleRebuild()` is a leading-edge 80 ms
  throttle (`REBUILD_THROTTLE_MS`), so dragging a slider coalesces many requests
  into one scene rebuild.

### Removed

- Dead code and unreachable branches identified during the Phase 1 audit.
- **All sounds.** The ATS contactor click, the on-air frequency-lock chime and
  the microwave alignment tone are gone, together with the Web Audio context,
  oscillators and gain nodes. Every power event that used to make a noise still
  runs exactly as before — only the noise was deleted.

### Fixed after review

- **Hero sharpness and framing.** The artwork shipped as a single 1600 px file
  stretched to 108 % of the viewport with `object-fit: fill`, which both blurred
  it on a large screen and cropped most of it away on a phone. It now ships in
  three widths (1200 / 1678 / 2200) in AVIF _and_ WebP behind the untouched PNG,
  so the browser downloads a picture at or above its rendered size, and the box
  is fitted at 94 % with the artwork's own aspect ratio — the whole scene is
  visible and undistorted on every screen. A defocused copy of the picture fills
  the letterbox instead of empty paper.
- **Living hero.** Added drifting cloud shadows over the ground, two counter-
  running lake swells with sun glitter, three wind gusts, 21 grass blades along
  the bottom edge that bend with the gusts, and six drifting seeds — all CSS, all
  disabled under `prefers-reduced-motion`.
- **Manual builds are staged like AI builds.** Changing the environment, the
  tower type, the tower height (on release) or the dish topology now plays the
  same piece-by-piece assembly the AI architect used: terrain and mast first,
  then the cabinet and power routes, then the antennas, over 1.8 s. It is
  staging only — no state is touched and nothing launches — and
  `prefers-reduced-motion` skips it.
- **One typeface set.** `<code>`, `<kbd>`, `<samp>` and `<pre>` were falling back
  to the browser's monospace; the step 04 Backhaul/Sectors chips, the AI search
  field, the AI blueprint chips and the drawer toggle all carried emoji that
  rendered in the system colour font. Every one of them is now drawn in CSS or
  set in Barlow, Barlow Condensed or Space Mono, and the PASS/FAIL, alarm and
  acceptance ticks and crosses are drawn with borders instead of typed glyphs.

### Tooling

- `vendor/**` is excluded from ESLint and Prettier (third-party, unmodified).
- `scripts/build.mjs` now requires and copies `herotower.webp`, `herotower.avif`,
  `vendor/three.min.js`, and `vendor/THREE-LICENSE.txt`.

## [1.0.0] - 2026-10-25

### Added

- **Phase 01 — Civil, Environment & Towers:** Four engineered site environments (_Mountain Peak_, _Urban Rooftop_, _Rural Greenfield_, _Emergency COW_) and seven parametric 3D tower structures with structural twist checks, perimeter security fencing, copper bonding, inspection earth pits, and lightning protection.
- **Phase 02 — AC/DC Power, Backup & Climate:** Commercial utility grid, single and dual alternating diesel generators, 3-input ATS, MDB with SPD protection, −48 V DC bus, N+1 3 kW rectifiers, VRLA/Lithium battery autonomy calculator, dual-split A/C control, and interactive blackout failover simulation.
- **Phase 03 — Multi-Vendor 19-Inch Cabinet & Alarm Highway:** Interactive indoor and IP55 outdoor enclosures for Ericsson, Huawei, and Nokia with hinged 3D doors, pickable rack modules, animated Router-to-TDM E1 circuit-emulation patch cable, and external alarm path tracer (`OVP → SAU3 → SCU → SHU → Master DUG 20 → NOC`).
- **Phase 04 — Microwave Backhaul & XPIC:** Five physical link topologies (`1+0`, `1+1 HSB`, `1+1 Space Diversity`, `2+0 XPIC`, `4+0 XPIC`), 0.3–2.4 m dishes across 7–38 GHz bands, azimuth alignment slider, virtual ODU multimeter, RSL/fade-margin link budget, and Auto-Peak.
- **Phase 05 — Smart Filtering, Cellular Sectors & Virtual Site Master:** Hierarchical vendor/generation profiles (`2G`, `3G`, `4G LTE`, `5G NR`, `Mixed-Mode`), three-sector RF workspace (azimuth, electrical RET downtilt, TX power, bandwidth), and 601-point VSWR / Distance-to-Fault sweep analyzer.
- **Phase 06 — Multi-Vendor CLI, Carrier Acceptance & Launch:** Docked terminal supporting Ericsson Moshell/IPOS, Huawei BBU5900 MML, and Nokia AirScale commands, live six-gate Carrier Acceptance Audit, and animated Go On Air launch sequence with Web Audio frequency-lock chime.
- **Phase 07 — Offline AI Suite (Zero API Keys):** Local natural-language AI Architect command bar with three preset scenarios and 3-second staged 3D assembly, local Neural RF Waveform Classifier, and Guided NOC Copilot (`ai diagnose`) with three automated remediation workflows.
- **Open-Source Repository Standardization:** Separated HTML/CSS/JS structure (`index.html`, `src/styles/main.css`, `src/js/app.js`), documentation suite (`README.md`, `docs/`), MIT `LICENSE`, `CONTRIBUTING.md`, GitHub issue/PR templates, ESLint + Prettier + EditorConfig quality tooling, automated Node test suite, and GitHub Actions CI workflow.
- **UX & 3D Compound Refinements:** Updated top-left suite branding (`INTERACTIVE 3D ENGINEERING SUITE`), calm progressive first-run onboarding (`New Site Setup` with guided Step 01 → Step 02 transition), `Custom Multi-Gen` toggle chips (`2G GSM`, `3G WCDMA`, `4G LTE`, `5G NR`) with automatic multi-vendor baseband curation and combined throughput/backhaul scaling, smooth horizontal top telemetry scroller with fade masks and chevron controls, and relocated dual outdoor A/C condensing units onto a raised concrete plinth beside the shelter wall with twin copper refrigerant lines.
