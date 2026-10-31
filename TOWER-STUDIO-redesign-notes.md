# Tower Studio — Interface Redesign Notes

These notes accompany the guided-flow redesign of Tower Studio (branch
`arena/738aec6d-tower-studio`, base commit `18d106d`). They record what changed,
why, what was measured, and — just as importantly — what was **not** verified.

Red lines that were held throughout:

- every colour token and hard-coded colour, all three font families, the 2 px ink
  borders, hard-offset shadows and the cream/paper look are untouched;
- the 3D scene (geometry, dimensions, positions, materials, lights, renderer and
  shadow settings, every builder, every registry id) is untouched — the per-viewport
  camera framing is now derived from real drawer/sheet geometry instead of the
  hard-coded `0.34 / 0.17 / 0.12` frustum shifts, which was explicitly allowed;
- default-state engineering numbers are identical except for the two documented
  deltas in §6;
- the public API on `window.TowerStudio` (and the `window.CellForge` alias) still
  exposes every name it did before;
- no new runtime dependency: vanilla JS in one `src/js/app.js`, CSS in
  `src/styles/main.css`, `index.html` still opens directly from disk, Three.js
  r128 still comes from the CDN (now with an SRI pin and a local fallback);
- every disabled or locked control states its reason as **visible text**, not only
  in a `title` tooltip.

---

## 1. Commit map

| #   | Commit          | Phase      | What it did                                                                                                                                                                 |
| --- | --------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | `dd1a554`       | checkpoint | pre-redesign snapshot used as the "before" baseline                                                                                                                         |
| 1   | `c394ef3`       | Phase 0    | test harness + red-line guards (tokens, 3D palette, catalogue, camera, registry sizes, default numbers)                                                                     |
| 2   | `6e7f4e1`       | Phase 1    | truthfulness pass: vendor naming, alarm-station naming, fuel estimate, honest AI/CLI copy, dead-code removal                                                                |
| 3   | `0c65ab4`       | Phase 1.8  | effective radio DC load (radio count and sector TX power now move the number)                                                                                               |
| 4   | `59d6127`       | Phase 2    | autosave, undo/redo (50 steps), site files, CV restore, confirmations                                                                                                       |
| 5   | `11b4cff`       | Phase 3    | guided branching flow: 5 master steps, done/attention/locked, GUIDED vs ENGINEER gating, one scrolling panel, 4A Backhaul / 4B Sectors, 7-item chip navigator, 6-gate strip |
| 6   | `079dbcf`       | Phase 4    | responsive pass: `matchMedia` tiers, phone bottom sheet, geometry-driven camera, 44 px targets                                                                              |
| 7   | `47d29a8`       | Phase 5    | detail levels (Guided / Engineer) + 28-term plain-English glossary                                                                                                          |
| 8   | `03ede7c`       | Phase 6    | hardening: HUD diff updates, 80 ms rebuild throttle, SRI-pinned Three.js with an offline `vendor/` fallback, AVIF/WebP hero                                                 |
| 9   | _(this commit)_ | Phase 7    | coarse-pointer touch fixes found in the browser, screenshots, these notes                                                                                                   |

Each phase was committed only after `npx eslint .`, `npx prettier --check .`,
`npm test` and `npm run build` were all clean.

---

## 2. Before / after screen map

Screenshots were captured in headless Chromium 153 (`@sparticuz/chromium` +
`puppeteer-core`, SwiftShader via ANGLE) against a local dev server. Storage
keys were pinned per capture (`setDetailLevel`, `enterMasterStep`, onboarding
cleared) so the frames are comparable.

| Width      | Before (baseline `18d106d`)              | After · Guided                             | After · Engineer                             |
| ---------- | ---------------------------------------- | ------------------------------------------ | -------------------------------------------- |
| 360 × 780  | `screenshots/baseline/baseline-360.jpg`  | `screenshots/final/step01-360-guided.jpg`  | `screenshots/final/step01-360-engineer.jpg`  |
| 390 × 780  | `screenshots/baseline/baseline-390.jpg`  | `screenshots/final/step01-390-guided.jpg`  | `screenshots/final/step01-390-engineer.jpg`  |
| 768 × 900  | `screenshots/baseline/baseline-768.jpg`  | `screenshots/final/step01-768-guided.jpg`  | `screenshots/final/step01-768-engineer.jpg`  |
| 1024 × 800 | `screenshots/baseline/baseline-1024.jpg` | `screenshots/final/step01-1024-guided.jpg` | `screenshots/final/step01-1024-engineer.jpg` |
| 1366 × 900 | `screenshots/baseline/baseline-1366.jpg` | `screenshots/final/step01-1366-guided.jpg` | `screenshots/final/step01-1366-engineer.jpg` |
| 1920 × 900 | `screenshots/baseline/baseline-1920.jpg` | `screenshots/final/step01-1920-guided.jpg` | `screenshots/final/step01-1920-engineer.jpg` |

Two extra frames show the fold difference on a later step:
`screenshots/final/step03-390-guided.jpg` vs `step03-390-engineer.jpg`, and
`step03-1366-guided.jpg` vs `step03-1366-engineer.jpg`.

**How to read them.** The "before" columns are the drawer as it shipped: three
tabs (`[ OVERVIEW ] [ CONFIGURE ] [ SPECS ]`) with every control of every phase
in one scrolling list. The "after" columns are one step at a time: a step
navigator, a six-gate strip, the step's own controls, and — in Guided — the
`+ Specs and details` fold that hides the deep rows until you ask for them.

**Baseline captures needed one caveat:** the sandbox blocks `cdnjs.cloudflare.com`,
so the pristine baseline had no Three.js at all. For a fair picture the baseline
captures were taken with the CDN request intercepted and answered with the same
`vendor/three.min.js` bytes, otherwise every "before" frame would have shown a
dead canvas rather than a design difference.

---

## 3. Label changes

Representative list — the changes that alter what the UI **claims**, not every
string that moved.

| Where             | Before                                     | After                                                                                                                                                                                                                                                                                                                                      | Why                                                                                                        |
| ----------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Step navigator    | Drawer tabs `OVERVIEW / CONFIGURE / SPECS` | `01 Site · 02 Open cabinet · 03 Power · 04 Aim & Connect · 05 Go on air`                                                                                                                                                                                                                                                                   | The old tabs hid the fact that the work has an order                                                       |
| Step 04           | one mixed microwave + cellular panel       | chips `4A Backhaul — Microwave dishes & link budget` and `4B Sectors — Cellular RF & line sweeps`                                                                                                                                                                                                                                          | The two branches are alternatives; showing both at once implied both applied                               |
| Step badges       | none                                       | `Done` / `Needs attention` / `Locked` + a sentence, e.g. "Fit at least one card in the cabinet in step 02 first."                                                                                                                                                                                                                          | A locked control with no reason reads as a bug                                                             |
| RF sweep badge    | `VSWR: 1.14 [PASS]` (hard-coded)           | `VSWR: 1.17 [PASS]` (read from the sweep)                                                                                                                                                                                                                                                                                                  | The printed value was a constant, not a measurement                                                        |
| Sweep explanation | "Impedance mismatch detected at 21.3m."    | "…detected at 21.3 m." with the distance taken from the sweep                                                                                                                                                                                                                                                                              | Same reason                                                                                                |
| AI classifier     | `Confidence: 99.1%`                        | `Headroom: 11.6% below the 1.32 limit` (fault case: `Peak contrast: …% above the 1.32 limit`)                                                                                                                                                                                                                                              | A rule-based classifier claiming 99.1% confidence overstates itself; the number is now the honest headroom |
| AI surfaces       | implied inference                          | "LOCAL 601-POINT INFERENCE · … · NO NETWORK OR MODEL DOWNLOAD"                                                                                                                                                                                                                                                                             | Say plainly that there is no API key and no model                                                          |
| Microwave specs   | `INDOOR: MINI-LINK AMM / Router 6471`      | derived from the fitted vendor's slot names                                                                                                                                                                                                                                                                                                | The line lied on Huawei and Nokia sites                                                                    |
| Alarm path        | fixed Ericsson unit names                  | names taken from the installed vendor (SAU 3 / SCU / SHU …)                                                                                                                                                                                                                                                                                | Same reason                                                                                                |
| Detail level      | none                                       | menu row `Detail level: Guided — Show the essentials` / `Engineer — Show every control`                                                                                                                                                                                                                                                    | Lets a beginner hide the rows they do not need                                                             |
| Specs section     | always open                                | `+ Specs and details` fold in Guided, inline in Engineer                                                                                                                                                                                                                                                                                   | Same reason                                                                                                |
| Jargon            | unexplained                                | 28 dotted-underline terms (VSWR, DTF, RSL, fade margin, N+1, autonomy, ATS, earth loop, dead load, wind area, torsion, soil bearing, backhaul, XPIC, space diversity, sector, baseband, patch cable, alarm highway, on air, configuration version, DC load, CLI, MO, dBi, dBm, E1, HVAC) open a one-line definition on tap, hover or focus | Beginner-friendly without dumbing the numbers down                                                         |
| Acceptance gates  | buried in the audit panel                  | six chips from step 02 onward: Civil & Foundation, Earthing & Lightning, Power & Life Support, Backhaul Link, RF Line Sweeps, Alarm Telemetry — each `PASS` or `OPEN`                                                                                                                                                                      | The same six checks the carrier audit uses, shown early                                                    |

---

## 4. Audit traceability

The read-only audit items 9.1–9.7 and the Section 10 acceptance list map onto the
phases as follows. Item wording is restated from the fix that closed it; where the
original wording was more specific, the fix is the record.

| Item           | Finding (as implemented)                                                                                                                                 | Closed by                                 | Verified by                                                 |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------- |
| 9.1            | Controls and panels said things the engine did not do (hard-coded sweep values, vendor names on the wrong vendor, unit names that never change)          | Phase 1 `6e7f4e1`                         | `tests/vendor-catalogue.test.mjs`                           |
| 9.2            | The offline AI overstated itself ("Confidence: 99.1%", no statement that it is local and rule-based)                                                     | Phase 1 `6e7f4e1`                         | `tests/app.test.mjs`, `tests/vendor-catalogue.test.mjs`     |
| 9.3            | The DC load ignored how many radios are fitted and how hard the sectors transmit                                                                         | Phase 1.8 `0c65ab4`                       | `tests/guards.test.mjs` (default numbers) + the delta in §6 |
| 9.4            | Work could be lost silently: no autosave, no undo, no file export, no confirmation                                                                       | Phase 2 `59d6127`                         | `tests/workspace.test.mjs` (16 tests)                       |
| 9.5            | Flat control wall: no order, no step state, later steps reachable with nothing built, branch controls shown for branches not taken                       | Phase 3 `11b4cff`                         | `tests/flow.test.mjs` (14 tests)                            |
| 9.6            | Phone treated as an afterthought: fixed camera offsets, sheet arithmetic that ignored the step nav, targets under 44 px, type below the legibility floor | Phase 4 `079dbcf` (+ Phase 7 touch fixes) | `tests/responsive.test.mjs` (16 tests)                      |
| 9.7            | One density for everyone: deep specs next to beginner copy, jargon never explained                                                                       | Phase 5 `47d29a8`                         | `tests/glossary.test.mjs` (6 tests)                         |
| §10 acceptance | Performance and resilience: HUD rewritten every frame, rebuild per input event, single CDN dependency, 3.2 MB hero                                       | Phase 6 `03ede7c`                         | `tests/hardening.test.mjs` (6 tests)                        |

Section 10 also asked for the before/after sizes (§5), the number deltas (§6) and
the per-width checklist (§7) — all below.

---

## 5. Baseline vs final: size

| File                  | Before                  | After                    | Δ            |
| --------------------- | ----------------------- | ------------------------ | ------------ |
| `index.html`          | 10,630 B / 273 lines    | 15,677 B / 407 lines     | +5,047 B     |
| `src/js/app.js`       | 371,692 B / 9,281 lines | 443,026 B / 11,286 lines | +71,334 B    |
| `src/styles/main.css` | 72,025 B / 3,614 lines  | 88,404 B / 4,393 lines   | +16,379 B    |
| `scripts/build.mjs`   | 1,621 B                 | 1,868 B                  | +247 B       |
| tests                 | 1 file, 9 tests         | 8 files, 88 tests        | +79 tests    |
| `dist/`               | 3,803,673 B             | 5,124,111 B              | +1,320,438 B |

`dist/` grew because it now carries two extra hero encodings (619 kB) and the
603 kB offline Three.js — both are payload the old build downloaded anyway, from
someone else's server, at every page load.

Over the wire (gzip, code only: `index.html` + `app.js` + `main.css`):

|                 | Before                                                        | After                                                                | Δ                                                  |
| --------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| gzip total      | 116,512 B                                                     | 143,272 B                                                            | +26,760 B (+23.0 %)                                |
| hero image      | 3,341,876 B PNG (3,238,120 B gzipped — PNG barely compresses) | 224,490 B AVIF / 394,634 B WebP                                      | −93 % / −88 %                                      |
| **first paint** | **3,458,388 B**                                               | **367,762 B** (AVIF) · 537,906 B (WebP) · 3,485,148 B (PNG fallback) | **−89.4 %** on a modern browser, +0.8 % worst case |

If the CDN is unreachable, `vendor/three.min.js` (603,445 B raw, 148,737 B gzipped)
is served from the same origin instead — which is exactly what happened in every
capture in §2.

---

## 6. Baseline vs final: numbers

The default-state outputs of `calculateEngineering`, `calculatePower`,
`calculateRack`, `calculateMicrowave`, `calculateAcceptance`, the three sector
sweeps, `classifyRFWaveform`, `siteAlarms`, `powerAlarms`, `dishGainDbi`,
`transmissionSceneMode` and the per-environment 3D registry sizes were dumped
from both trees and diffed field by field: **3,793 values compared, 29 differ**,
and the registry lines are byte-identical. Every difference is one of two
deliberate changes plus their knock-ons.

**Delta 1 — audit 9.2, Phase 1: the AI classifier no longer invents numbers.**
`classifyRFWaveform(calculateSweep(0))` on the pristine default site:

| Field        | Before                                                     | After                                                                            |
| ------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `confidence` | `99.1`                                                     | `11.6` (the headroom)                                                            |
| `vswr`       | `1.14` (hard-coded)                                        | `1.167` (the true peak of the sweep)                                             |
| `headroom`   | —                                                          | `11.6` (new)                                                                     |
| `message`    | "Normal line · VSWR 1.14 below 1.32 · no discontinuities." | "Normal line · peak VSWR 1.17 below 1.32 · 11.6% headroom · no discontinuities." |

The fault branch changed the same way (`confidence` was a hard-coded `96.8`,
`vswr` a hard-coded `2.27`, `distance` a hard-coded `21.3`; all three are now read
from the sweep, with a new `contrast` field).

**Delta 2 — audit 9.3, Phase 1.8: the radio DC load is the effective load.**
`calculatePower()` on the pristine default site gains four fields; the headline
`dcLoad` is unchanged because both derating factors are 1 at the default state:

| Field                | Before  | After                                                                           |
| -------------------- | ------- | ------------------------------------------------------------------------------- |
| `radioLoad`          | —       | `3` kW (was folded into the total unnamed)                                      |
| `radioLoadReference` | —       | `3` kW                                                                          |
| `radioFactor`        | —       | `1`                                                                             |
| `txFactor`           | —       | `1`                                                                             |
| `rackLoad`           | `0.56`  | `0.56` (unchanged)                                                              |
| `dcLoad`             | `3.605` | `3.605` (unchanged at defaults; now moves with radio count and sector TX power) |

**Knock-ons (not deltas, just consequences).**

- `sweeps[n].max` is rounded to three decimals for display (`1.166841181` → `1.167`)
  and each sweep now exposes `peak { distance, vswr }`, which the classifier reads.
- `smartProfile().labels` gained the ten per-slot vendor strings used by the
  truthful spec rows.
- `calculatePower.climate.cycleRemaining` differs in the ninth decimal
  (`3.999919204` → `3.999921604`) — the simulation clock is sampled a few
  microseconds later, not a behaviour change.

Everything else — twist, wind area, soil bearing, earth resistance, dish gain,
RSL, fade margin, autonomy, battery current, fuel rate, the six acceptance gates,
all alarm lists and all 3D registry counts — is identical.

---

## 7. Per-width checklist (measured in Chromium, not asserted in jsdom)

jsdom has no layout, so every geometry claim below comes from the headless
Chromium run, not from the unit tests.

| Check                                               | 360     | 390     | 768     | 1024     | 1366     | 1920     |
| --------------------------------------------------- | ------- | ------- | ------- | -------- | -------- | -------- |
| No horizontal overflow (`scrollWidth ≤ innerWidth`) | ✅      | ✅      | ✅      | ✅       | ✅       | ✅       |
| Canvas fills the viewport                           | 360×780 | 390×780 | 768×900 | 1024×800 | 1366×900 | 1920×900 |
| HUD cells (live mode)                               | 11      | 11      | 11      | 11       | 11       | 11       |
| Glossary terms on step 01                           | 4       | 4       | 4       | 4        | 4        | 4        |
| `More options` folds — Guided / Engineer            | 1 / 0   | 1 / 0   | 1 / 0   | 1 / 0    | 1 / 0    | 1 / 0    |
| Interactive elements with a box under 44 px         | 2*      | 2*      | —       | —        | —        | —        |
| Three.js loaded                                     | vendor  | vendor  | vendor  | vendor   | vendor   | vendor   |
| Console errors                                      | 2†      | 2†      | 2†      | 2†       | 2†       | 2†       |

\* On the phone widths the only remaining sub-44 px **boxes** are the native
checkbox (13×13 inside a 66–106 px label, so the row is the real target) and the
inline `.term` buttons, whose box is the label's line height (9–13 px). Their
**hit area** is grown to 47 px with an out-of-flow `.term::after` under
`@media (pointer: coarse)`; measured with `elementFromPoint`, the hit region spans
−24 px to +22 px around a 9 px box, and the open definition (`z-index: 55`) still
sits above it and stays clickable. Layout is provably unaffected: element heights
and tops are identical to the pixel before and after the rule is added.

† Both errors are the sandbox blocking `fonts.googleapis.com` and
`cdnjs.cloudflare.com`. The second one is the feature working as designed: the
SRI-pinned CDN tag fails, `window.__threeCdnFailed` is set, and
`./vendor/three.min.js` loads instead. See §8.

Before the Phase 7 touch fixes, the same measurement found 8–10 sub-44 px
elements on the phone (`.gesture-hint-close` 40×34, `.sheet-handle` 30 px tall,
`.hud-scroll-btn` 28 px wide, `.phase6-button` 32–38 px, `.more-options summary`
40 px, `.hero-enter-btn` 39 px). All of those are now lifted to the 44 px floor on
coarse pointers.

---

## 8. What was **not** verified

Stated plainly, because the screenshots are evidence of what ran, not of how it
looks to a person:

1. **Nobody looked at the screenshots.** They were captured and checked
   statistically (every frame: 12k–227k distinct colours, standard deviation
   7.5k–20k in the 3D half of the frame — i.e. real rendered content, not a blank
   canvas), but this agent has no vision. A human should open
   `screenshots/final/` before trusting the layout claims.
2. **Typography in the captures is not the real typography.** Google Fonts is
   blocked in the sandbox, so Barlow / Barlow Condensed / Space Mono fell back to
   the system stack. Every metric in §7 is therefore measured with fallback
   metrics; line lengths and label wrapping will differ slightly in production.
3. **No GPU.** Rendering used SwiftShader (software Vulkan). It proves the WebGL
   path works and produces pixels; it says nothing about frame rate on real
   hardware, and antialiasing/shadow quality will differ.
4. **No real device.** Touch behaviour was exercised through Chromium's touch
   emulation with `pointer: coarse`, not on a phone or tablet. Pinch-zoom,
   momentum scrolling, safe-area insets and the iOS URL bar were never tested.
5. **No performance profiling.** The HUD diffing and the 80 ms rebuild throttle
   are verified by unit test (node reuse, coalesced rebuild count), not by a frame
   budget measured on hardware.
6. **Micro-labels are still small.** At 390 px, 95 of 152 text leaves render below
   11 px (59 at 8 px, 15 at 7 px, 5 at 6 px — the "STEP 01" chips and the metric
   eyebrows). These are the uppercase mono labels that are part of the protected
   design language, and the Phase 4 floor (11 px) was set for _value_ text (HUD
   numbers, CLI output), which does meet it. **This is a known limitation, not a
   pass**: on a phone the eyebrows are hard to read, and raising them is a design
   decision for the owner, not a mechanical fix, because they are load-bearing for
   the CAD look.
7. **jsdom cannot check layout.** All CSS geometry claims come from the Chromium
   run in §7; the unit tests only assert that the CSS text contains the rules.
8. **The AI and CLI honesty changes are copy-level.** They were verified as
   strings and formulas; no claim is made that the local classifier is _accurate_
   in an engineering sense — only that it no longer prints numbers it did not
   compute.

---

## 9. Decisions taken without asking

Recorded so they can be reversed deliberately:

- **Step names kept the product's voice** (`Open cabinet`, `Aim & Connect`,
  `Go on air`) rather than being renamed to generic wizard words; the numbers
  (`01`–`05`) are what carry the order.
- **Guided is the default detail level.** An engineer switches once; the choice is
  remembered per browser (`tower-studio.detail.v1`).
- **Locked steps do not navigate.** Clicking a locked step writes the reason into
  the panel and offers a `[ GO TO STEP 0n ]` button, so the user is never
  teleported somewhere without an explanation.
- **The fold, not deletion.** Guided hides the deep rows behind `More options`
  rather than removing them, so no engineering data is unavailable in either mode.
- **Inline terms keep their place.** The glossary uses inline dotted-underline
  buttons inside the existing labels (hit area expanded out-of-flow) instead of a
  separate "?" column, which would have doubled every label row on a phone.
- **The vendored Three.js is committed.** 603 kB in `vendor/` buys a site that
  still works when the CDN is blocked; `vendor/THREE-LICENSE.txt` carries the MIT
  notice and `vendor/**` is excluded from ESLint and Prettier.
- **The original `herotower.PNG` is untouched** (a test asserts its exact byte
  size) and remains the last `<picture>` fallback.

---

## 10. Pushing and opening a PR

Nothing has been pushed. The branch is `arena/738aec6d-tower-studio`, 9 commits
ahead of `main`.

```bash
# push the branch
git push origin arena/738aec6d-tower-studio

# open a pull request into main
gh pr create \
  --base main \
  --head arena/738aec6d-tower-studio \
  --title "Guided branching flow for Tower Studio (beginner-first, engineer-credible)" \
  --body "See TOWER-STUDIO-redesign-notes.md for the commit map, before/after sizes, the two documented number deltas, the per-width checklist and the list of what was not visually verified."

# or, once the PR exists
gh pr merge <pr-number> --merge      # or --squash / --rebase
```

Before merging, the one thing worth doing first is a human look at
`screenshots/final/` on a real phone and a real laptop, with the network
available — that is the gap the automated pass cannot close.
