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
- **Ambient motion is decoration, not a component.** The crop field, motes,
  mist sheets and birds are built into an unregistered group with `raycast`
  disabled, so they never appear in the parts list, never take a click, and
  never cast a shadow — clicking through them still selects the real
  component behind. They reuse existing materials (`MAT.green`, `SMOKE`,
  `MAT.dark`) rather than introducing new colours.
- **Ambient counts per environment** (blades / motes / drifts / birds):
  mountain 0/22/4/0, rural 56/18/3/3, rooftop 0/12/3/2, disaster 0/20/3/2.
  Measured in Chromium as changed pixels between frames 350 ms apart, median
  of five pairs, ambient layer on minus off: phone — mountain 868, rural 994,
  rooftop 3 383, disaster 3 992; laptop — mountain 6 293, rural 7 820,
  rooftop 11 242, disaster 13 704. Rural is the busiest of the two the brief
  compares, at both viewports. Update cost is 0.042 ms per frame for the 73
  rural parts.
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

---

# PASS 2 — DECLUTTER

Pass 1 (above) made the guided flow truthful and complete. It also made it
crowded: on a phone the top bar wrapped, the status strip scrolled sideways, the
step subtitle pushed the first control out of the sheet, the gate strip collapsed
to a dark sliver, and a step could open on thirty controls nothing had
prioritised. Pass 2 is about _what the user sees first_, not about what the app
knows. Nothing was deleted: every control still exists, in the same step, behind
a card or behind Fine-tune.

## 11. The shape of a step now

A step is a short list of **decisions**. Each one is a card:

| Step | 01 Site               | 02 Cabinet        | 03 Power       | 04A Backhaul     | 04B Sectors     | 05 Go on air      |
| ---- | --------------------- | ----------------- | -------------- | ---------------- | --------------- | ----------------- |
| 1    | Environment           | Equipment profile | Power source   | Link type        | Sector          | Gates + go on air |
| 2    | Tower (+ hidden line) | Cabinet type      | Backup battery | Dish size & band | Aim             | CLI terminal      |
| 3    | Height                | Check the cabinet | Test it        | Aim              | Check the cable | —                 |
| 4    | _Fine-tune_           | _Fine-tune_       | _Fine-tune_    | _Fine-tune_      | _Fine-tune_     | _Fine-tune_       |

- **Guided**: exactly one card is open, the first unfinished one, chosen when the
  step is entered. A card that has been answered folds to one summary line plus
  an `EDIT` state chip. Closed card bodies stay in the DOM with `hidden`, so
  nothing is lost and `window.TowerStudio` can still reach every control.
- **Engineer**: every card and Fine-tune are open in one scroll — the old wall of
  controls, unchanged, for the people who asked for it.
- **Continue** at the end of each step is the only navigation inside the sheet.
- "Use recommended" appears on Step 03 (auto N+1 + the Standard bank) and Step
  04A (peak the dish), says "Recommended settings applied" and offers `[ UNDO ]`.
  It is an ordinary history transaction, so `Ctrl/⌘+Z` reverts it too.

The measured effect on how many controls a Guided step opens with (counted as
buttons, selects, checkboxes and sliders inside the sheet, excluding closed
cards, closed `<details>` and the inline glossary buttons):

| Step                  | Before | After | Target |
| --------------------- | -----: | ----: | -----: |
| 01 Site (first run)   |     12 | **8** |   ≤ 10 |
| 01 Site (established) |     15 | **9** |   ≤ 10 |
| 02 Cabinet            |     58 | **7** |   ≤ 10 |
| 03 Power              |     14 | **8** |   ≤ 10 |
| 04A Backhaul          |     22 | **9** |   ≤ 10 |
| 04B Sectors           |     17 | **9** |   ≤ 10 |
| 05 Go on air          |     19 | **4** |   ≤ 10 |

(`tests/pass2-phone.test.mjs` → "C1"; the "before" column was produced by running
the same counter against a worktree of `04a9e2d`.)

## 12. Phone (≤ 767 px)

- **One-row top bar**: logo + one-line wordmark + `TERMINAL` + `⋮`. Hero, AI
  Build, Fit, Detail level, Undo/Redo, Save/Open/Start fresh and Shortcuts all
  live in the menu.
- **Status chip**: the strip is one line, `LIVE MODEL · Rural · 4-leg 56 m ·
6.3 kW` — the first three cells of the same step-aware data. Tapping it opens
  "All numbers" (24 cells, no horizontal scroll, one column); tapping outside or
  Escape closes it.
- **Sheet**: opens at `40dvh` on step entry, so the header and the first decision
  card are both visible. Snap states are peek (44 px grab bar), half (40dvh) and
  full (`100dvh` minus chrome). A collapsed sheet keeps its 44 px grab bar.
- **Header**: step number + title only. The subtitle returns only while a 3D
  object is being inspected.
- **Floating stack**: zoom in / zoom out / fit, 44 px, vertical, bottom-right of
  the 3D area, `--sheet-h` above the sheet at every snap. At full height there is
  no 3D area left, so the stack stands down instead of floating over the panel.
- **AI Architect**: menu-only, opened as a dialog over the scene with a scrim,
  a close button and Escape (Escape works even with the caret in its input).
- **Decision**: the gate strip is **six labelled dots in one row** (CIVIL · EARTH
  · POWER · LINK · RF · ALARMS, each with a drawn dot and PASS/OPEN underneath),
  not the "3/6 ready" chip. It is 44 px tall in the panel header and can never
  collapse: it is one `repeat(6, minmax(0, 1fr))` grid row with `min-height:
var(--tap)`. Each gate is a button that jumps to the step that fixes it.

## 13. Laptop (≥ 1024 px) and the addendum

- **One-row top bar**: logo + wordmark + `LIVE MODEL` chip + Undo/Redo +
  `TERMINAL` + `⋮`. The eyebrow ("INTERACTIVE 3D ENGINEERING SUITE") appears only
  from 1280 px.
- **Step-aware strip**: 4–5 cells, no scrollbar and no arrows, plus "All numbers".

  | Step | Cells                                                      |
  | ---- | ---------------------------------------------------------- |
  | 01   | Environment · Structure · Civil check · Earth resistance   |
  | 02   | Cabinet · Cabinet DC load · Backhaul speed · Live services |
  | 03   | AC source · Total load · Backup hours · Rectifier N+1      |
  | 04A  | Microwave RSL · Fade margin · Backhaul speed · Link status |
  | 04B  | Cellular 3G · Sector status · Last sweep VSWR · Throughput |
  | 05   | Gates passed · Site status · Active alarms                 |

- **Panel**: a full-height left side panel from 1024 px — below the strip, above
  the step bar, `clamp(420px, 32vw, 500px)` wide, one internal scroll. Header:
  step number, title, the six-gate strip, collapse button. Collapsed, a 44 px
  vertical `CONTROLS` tab reopens it. 768–1023 px get the same sheet as a phone,
  centred and capped at 720 px.
- **Step bar**: 44–48 px tall (max 52), five equal columns, short labels on
  phones ("Cabinet", "Aim", "Air") and long labels from 1024 px ("Open cabinet",
  "Aim & Connect", "Go on air"), each with a drawn done / to-do / locked mark.
- **Hint**: shown once, dismissible, remembered in
  `tower-studio.gesture-hint.v1`; afterwards the same sentence is listed in
  Shortcuts & help.
- **Camera**: the frustum offsets still come from the measured panel
  (`chromeMetrics.drawerWidth/drawerHeight/drawerLeft`), re-measured on every
  resize and on every sheet snap.

## 14. Measured layout

There is **no browser binary in this sandbox** (no Chromium, no Playwright
browser download available), so the C2 captures and the L10 screenshots could
not be produced. What is reported instead is the bounding-box arithmetic the
interface is positioned from: `window.TowerStudio.chromeLayout(width, height)`
computes every fixed box from the same `--topbar-* / --hud-* / --nav-* /
--view-* / --panel-* / --sheet-*` tokens the stylesheet uses, and the tests
assert (a) that the stylesheet tokens and the arithmetic agree number for
number, (b) that no two boxes intersect, (c) that every box is inside the
viewport, and (d) the share of the window left to the 3D scene.

Share of the window **not covered by any chrome**, and intersecting box pairs:

| Window    | peek | half | full | side panel |
| --------- | ---- | ---- | ---- | ---------- |
| 360×800   | 82 % | 49 % | 14 % | —          |
| 390×844   | 83 % | 49 % | 13 % | —          |
| 430×932   | 84 % | 50 % | 12 % | —          |
| 768×1024  | 83 % | 49 % | 10 % | —          |
| 1024×768  | —    | —    | —    | 53 %       |
| 1280×800  | —    | —    | —    | 62 %       |
| 1366×768  | —    | —    | —    | **62 %**   |
| 1440×900  | —    | —    | —    | 64 %       |
| 1920×1080 | —    | —    | —    | 70 %       |

- Every one of those windows reports **0 intersecting pairs** (top bar and its
  own children excluded, because a chip inside a bar is not an overlap).
- The phone asks for ≥ 35 % at half and ≥ 70 % at peek: measured 49 % and 82 %.
- The laptop asks for ≥ 50 % free at 1366×768 Guided: measured 62 %.
- L10's full matrix — widths 1024/1280/1366/1440/1920 × heights 720/768/900/1080
  (20 windows), with the panel open and collapsed — is asserted in
  `tests/pass2-laptop.test.mjs` and reports no overlaps and ≥ 40 % free
  everywhere.
- Type: no rule in the stylesheet asks for a font size below **11 px** any more
  (the file has 907 rules; the pass-1 notes recorded 95 text leaves under 11 px
  at 390 px). Sentences — `.control-note`, `.card-note`, `.decision-summary`,
  `.gesture-hint`, `.onboarding-hint`, the drawer subtitle — are 12 px. The
  decorative allowlist for this rule is **empty**: there is no selector left that
  needs an exemption, because the drawn marks (gate dot, step-chip status dot,
  sheet grip) are sized with `width`/`height`, not with type. jsdom does not apply
  the cascade to `getComputedStyle().fontSize`, so this is a static scan of every
  rule rather than a computed scan; that is stricter, not weaker.
- `jsdom has no layout engine`, so the two things it cannot prove are stated
  rather than implied: the sheet's real pixel height and the browser's own text
  wrapping. The arithmetic and the stylesheet agree on the tokens; a human should
  still look at a real phone.

## 15. The hero: full-bleed, not letterboxed

Pass 1 sized the hero artwork to _fit_ inside the stage
(`width: min(94vw, 94vh × aspect)`, `object-fit: contain`) and filled the rest
with a blurred copy of the same picture. On a laptop that left a wide flat-blue
band above and below the illustration, and on a phone a second band below it:
the hero read as a stamp of a photograph floating on a blue field, with four
pins stranded in the middle of it.

The artwork now **covers** the stage at every window shape:

- the box keeps the picture's own ratio (`--hero-aspect: 1.791045`, i.e. the
  1200 × 670 master) so nothing is ever distorted, and is sized with
  `width: max(100vw, 100dvh × aspect) × 1.08` / `height: max(100dvh, 100vw /
aspect) × 1.08` — one picture, edge to edge, cropped by `.hero-stage`;
- the extra 8% is headroom (`--hero-bleed`) for the pointer parallax and the
  tilt, so the edge of the photograph can never slide into view. `app.js` clamps
  the shift to `min(maxShift, slack)` instead of assuming it fits;
- `--hero-focus-x` decides which slice survives the crop. Landscape keeps it
  centred (a 16:9 window loses ~4% off each side); a portrait window keeps a
  narrow strip of the width, so the focus slides to 58–60% and the tower stays
  in frame instead of the empty valley on the left of the picture;
- the blurred `.hero-backdrop` layer is gone — there is no letterbox left to
  fill;
- touch panning on a phone used to drag the picture by up to ±43% of its width
  (the "recentre" gesture from when it was fitted); it now only moves inside the
  bleed margin;
- a pin the crop carries off-screen is hidden (`is-offstage`, measured from the
  visible box, not from the percentages) instead of sitting half-clipped at the
  edge, and a tapped callout whose box would overflow the viewport is nudged
  back in (`--note-nudge`);
- the phone lockup card is narrower (`min(196px, 52vw)`), so it clears the tower
  that the full-bleed crop now puts at 60% of the width.

Measured with `window.TowerStudio.heroLayout(width, height)`:

| Window    | focus | visible slice of the picture (x) | pins in frame             |
| --------- | ----- | -------------------------------- | ------------------------- |
| 390×844   | 60%   | 45.7% – 69.6%                    | tower, shelter            |
| 430×932   | 60%   | 45.7% – 69.5%                    | tower, shelter            |
| 768×1024  | 58%   | 35.5% – 74.3%                    | tower, shelter, generator |
| 844×390   | 50%   | 3.7% – 96.3%                     | all four                  |
| 1024×768  | 50%   | 15.5% – 84.5%                    | all four                  |
| 1366×768  | 50%   | 4.0% – 96.0%                     | all four                  |
| 1920×1080 | 50%   | 4.0% – 96.0%                     | all four                  |
| 2560×1080 | 50%   | 3.7% – 96.3%                     | all four                  |

`covers` is true on all of them: the box is at least as wide as the window and
at least as tall as the window, so there is no band anywhere to see flat blue in.
The two phone assertions live in `tests/pass2-phone.test.mjs`, the laptop ones in
`tests/pass2-laptop.test.mjs`.

---

## 16. What was not verified (pass 2)

1. **No screenshots.** No browser binary is available in this environment, so
   `screenshots/` was not regenerated and nobody — human or model — looked at a
   rendered frame of pass 2. Every claim above is a measurement of the layout
   arithmetic or of the DOM/CSS text.
2. **Real text metrics.** The arithmetic uses approximate advance widths (Barlow
   Condensed ≈ 0.5 em, Space Mono ≈ 0.6 em) for the wordmark and the buttons.
   With the real webfonts loaded the top bar will be a few pixels narrower or
   wider; the 360 px case has ~65 px of slack.
3. **Touch, momentum scrolling, safe-area insets and the iOS URL bar** were not
   exercised. Safe areas are honoured in CSS (`env(safe-area-inset-*)`), but on
   a device this is untested.
4. **The 3D camera offsets** are still only checked as arithmetic: the panel is
   re-measured with `getBoundingClientRect`, which jsdom cannot answer, so the
   `--sheet-h` value in a headless run is 0.

## 17. Decisions taken without asking (pass 2)

- **Gate strip = six labelled dots**, the first of the two options in A6. It
  keeps the six gates permanently visible, keeps the pass/fail vocabulary
  ("PASS"/"OPEN") that the Phase 3 tests guard, and needs no extra tap to answer
  "how ready am I?".
- **Guided uses dropdowns** where a card would otherwise hold five or more pills
  (vendor, generation, link type, dish size, band, sector). The Engineer level
  keeps the button grids. Both routes fire the same action, so the site model is
  untouched.
- **The `<select>`s dispatch through a throw-away button** that carries the same
  `data-action` a real button would: one implementation of every state change,
  one place where history is recorded, so a dropdown can never drift from its
  button.
- **"Nothing is removed" is literal**: a closed card is still in the DOM (hidden),
  every `data-action` still renders, and the Engineer level shows the entire
  control surface in one scroll.
- **The battery presets only map to option pairs the app already had**
  (1×100, 2×150, 4×200 Ah); the default site still loads the Extended bank, so
  no default number moved.
