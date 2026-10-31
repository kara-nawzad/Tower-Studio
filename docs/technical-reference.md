# TOWER STUDIO

Open **`index.html`** in a modern browser (or serve the repository root over HTTP). The application is a build-free Three.js workbench structured with `index.html`, `src/styles/main.css`, and `src/js/app.js`; Three.js r128 and the editorial fonts load from CDNs. All Phase 7 AI parsing, inference, and triage is local and offline, with no external AI dependency or API key.

## Phase 01 — Civil, environment & towers

- Four engineered environments: mountain peak, urban rooftop, rural greenfield, and emergency COW deployment.
- Seven parametric structures with environment and height constraints enforced in application state.
- Raised C30/37 plinths, anchor cages, double-nut leveling, lattice bracing, ladders, monopole flanges, rooftop I-beam dunnage, guy anchors, and COW outriggers.
- Chain-link security fencing, barbed-wire outriggers, 70 mm² copper bonding, a bonded access gate, inspection earth pits, and lightning-protection volumes.

| Environment        | Allowed structures                                           | Height limits             |
| ------------------ | ------------------------------------------------------------ | ------------------------- |
| Mountain Peak      | 3-leg tubular lattice; 4-leg angular lattice                 | 30–60 m                   |
| Urban Rooftop      | RTT/DRAME on dunnage; parapet pole                           | 3–15 m; 3–6 m             |
| Rural Greenfield   | Angular lattice; tubular lattice; light monopole; guyed mast | 30–60 m; 18–30 m; 40–80 m |
| Emergency Disaster | Telescopic COW truck                                         | 15–25 m                   |

Mountain sites force **Active ESE** lightning protection, **four Cadweld earth pits**, and fence/ground bonding.

## Phase 02 — Power, backup & climate

The modeled power chain is:

```text
Grid / Generator 1 / Generator 2 → ATS → MDB → Rectifiers → -48V DC bus → Radios
                                      MDB → A/C board → Dual split air conditioners
```

### Equipment

- 380V / 220V commercial utility feed through cable guide position 17.
- Primary diesel generator with starter battery, exhaust, vibration, fuel line, and concrete plinth.
- Second generator unlocked by **Dual Generator Off-Grid** mode, with 12-hour source rotation.
- Three-input / one-output ATS with relay or PLC control and single-source interlocking.
- MDB with transparent inspection window, Class B+C SPDs, and three protected branches.
- Dual-split climate controller, indoor evaporators, outdoor condensers, and animated fans.
- Procedural 3 kW rectifier modules, PCF, PDU, PFU, BFU, and copper DC busbars.
- One, two, or four battery strings; each string contains four 12V blocks in series. Capacity and VRLA/Lithium chemistry are configurable.
- Nominal 1,000 L bulk diesel tank with containment and Alarm #7 level monitoring.

Rooftop configurations place diesel generation and bulk fuel at ground level rather than adding unverified generator loads to the roof.

### Plain-English inspection

Click any power component or use the power navigator in the drawer. **Overview** explains:

1. What is it?
2. What does it do?
3. Why does the tower need it?

**Configure** reveals only the selected subsystem's controls. **Specs** provides its live technical data sheet.

### Rectifier N+1

```text
N = ceil((radio + cabinet + ODU DC load) ÷ 3 kW)
Recommended installed modules = N + 1
```

For example, a 5 kW radio-only load requires two working modules and one redundant module: **three installed**. The live calculator also includes populated cabinet cards and every active microwave ODU. The failover test removes one module and verifies that the remaining modules still satisfy N without a DC-bus voltage drop.

### Battery autonomy

Autonomy uses the configured string count, Ah rating, chemistry-dependent usable depth, current state of charge, and live DC load. The default 4 × 200Ah VRLA bank provides approximately **10.2 hours at a 3 kW radio-only load**, or **8.5 hours with the default Phase 3 cabinet and one Phase 4 ODU populated**. Batteries float directly on the DC bus, giving a **0.000 ms** backup transfer.

### Dual-split climate control

- One unit normally operates while the other rests.
- Duty alternates every **4 hours**.
- Above **35°C**, Alarm #6 forces **both units** on together at maximum input power.
- A/C loads pause during the battery-only generator-start window because no whole-site AC inverter is modeled; the DC radios remain online.

## Blackout test

Select a power component and press **`SIMULATE POWER BLACKOUT`**:

1. Utility voltage immediately drops to 0 V and **Loss of Mains** becomes active.
2. The DC load transfers to the battery in 0.000 ms.
3. Generator 1 cranks with vibration and exhaust, then stabilizes.
4. After **15 seconds**, the ATS transfers the AC load to Generator 1.
5. The HUD reports total load, autonomy, N+1 status, source, fuel rate, battery current, and alarms.
6. **`RESTORE GRID`** returns the ATS to utility and runs the generator through cooldown.

The blackout button is disabled in dual-generator off-grid mode because that architecture has no commercial utility feed.

## Phase 03 — Cabinet, 19-inch rack & alarm highway

The fixed five-step navigator keeps all cabinet work inside **Step 02 · Open cabinet**. The other steps open the civil site, power system, microwave transmission workspace, and site report.

### Vendor housings

| Ecosystem | Indoor                                                  | Outdoor / exposed rooftop             |
| --------- | ------------------------------------------------------- | ------------------------------------- |
| Ericsson  | RBS 6201 · 1800 × 600 × 400 mm, four shelves, mesh door | RBS 6102 · IP55 double-door enclosure |
| Huawei    | BTS3900 modular cabinet                                 | BTS3900A · IP55                       |
| Nokia     | AirScale 3U subrack in a 19-inch integration rack       | AirScale IP55 outdoor rack            |

An urban rooftop without a shelter always normalizes to an **outdoor IP55** housing. The Indoor control is disabled and application-side state guards reject an invalid indoor selection.

### Interactive rack elevation

- **Top 1U:** FAU with four top-exhaust fans.
- **Shelf 1 · 6U:** up to twelve RUS / RUG / RUW radio positions.
- **Shelf 2 · 3U:** Baseband 6630, DUG 20 01, DUW 30 01, SCU, SHU, and SAU3.
- **Shelf 3 · 3U:** PCF / PCU / PSU / PDU / PFU / BFU power shelf.
- **Shelf 4 · 4U:** Router 6471, TDM 1001, and MINI-LINK AMM 2P / 6P.
- **Base tray:** four 12V blocks per 48V string and the Master Ground Bar.

The 3D door swings on physical hinges. Every module can be picked in the open cabinet or selected through the touch-friendly elevation. Overview cards use plain English; Configure manages the vendor, housing, radio population, and installed slots; Specs shows technical data.

Installed card power is added to the Phase 2 DC bus. Slot changes therefore update **total kW, backup hours, rectifier N+1 demand, service capacity, and backhaul Gbps** together.

### Yellow circuit-emulation patch

With Router 6471 and TDM 1001 installed, **Connect Router to TDM Cable** draws an animated yellow Ethernet lead from **Router Port 2** to **TDM Port 1B**. Both port LEDs turn green when the physical patch completes:

> Circuit Emulation Link UP (8x E1 lines active for 2G voice).

Removing either card opens the link and removes its phantom port/cable state.

### External alarm path

**Trace External Alarm Path** sends glowing cyan pulses through the exact sequence:

```text
OVP Box → SAU3 → SCU → SHU → Master DUG 20 → NOC
```

The infographic explains that door, fuel, and generator dry contacts are surge-protected, digitized, processed, routed, and reported to the NOC. Removing any required station disables the tracer rather than displaying a false valid path.

### Rack ergonomics

- Desktop drawers stay left-anchored and at most **540px** wide, with the cabinet composed in the clear right viewport.
- At **390–430px**, the drawer is capped at or below **44vh** and begins below the upper **56%** cabinet viewport.
- Rack tabs, slot pills, action buttons, and master steps have at least **44 × 44px** touch targets.
- Decorative mesh outlines are excluded from raycasts, preventing them from stealing narrow 1U card picks.

## Phase 04 — Microwave backhaul, dish topologies & XPIC

Transmission remains inside the fixed five-step shell under **Step 04 · Aim & Connect**. Its two-button selector chooses **Microwave Backhaul** or **Cellular Sectors**. Both workspaces retain their own configuration; neither adds a sixth master step.

### Physical link topologies

The baseline full-duplex backhaul capacity is 1 Gbps before the selected topology multiplier.

| Topology            | Procedural arrangement                                  | Capacity |                  Topology loss |
| ------------------- | ------------------------------------------------------- | -------: | -----------------------------: |
| 1+0 Standalone      | One dish and one ODU                                    |       1× |                           0 dB |
| 1+1 HSB             | One dish, two ODUs, asymmetrical T-junction             |       1× |  Main −1.5 dB; standby −7.0 dB |
| 1+1 Space Diversity | Two vertically separated dishes, 3–6 m apart            |       1× |                           0 dB |
| 2+0 XPIC            | One dual-polar dish, two ODUs/modems and OMT            |       2× |                           0 dB |
| 4+0 XPIC            | One dual-polar dish, four ODUs/modems and two splitters |       4× | −3.0 dB per symmetrical branch |

Space Diversity is blocked when the structure lacks vertical clearance for the requested separation. Its inspector explains how the second dish mitigates multipath fading over water, desert plains, and valleys.

### Dish gain, mounts, and RSL

Diameters are **0.3, 0.6, 1.2, 1.8, and 2.4 m**; bands are **7, 15, 23, and 38 GHz**. Gain uses the requested efficiency model, with diameter in metres and frequency in hertz:

```text
gain(dBi) = 10 × log10(0.6 × (π × D × f ÷ c)²)
c = 299,792,458 m/s
```

Dishes up to 1.8 m use an integrated rear-hub ODU with **0 dB** mounting/waveguide loss. The 2.4 m dish uses a separate ODU bracket and flexible brass waveguide with **3.0 dB** loss.

The multimeter's aligned RSL is referenced to a 0.6 m / 15 GHz dish. Diameter and band change it by the gain difference, followed by mounting and topology losses:

```text
RSL = alignment RSL + gain(D, f) − gain(0.6 m, 15 GHz)
      − mount loss − topology loss
fade margin = RSL − (−85 dBm) = RSL + 85
```

This is an interactive relative link-budget/alignment model, not a substitute for a path-profile, availability, rain-fade, or obstruction study.

### Azimuth alignment and link lock

The **0–360°** slider rotates the actual dish and beam while the virtual ODU-port multimeter updates without replacing the active slider.

| Circular azimuth error | Multimeter | Reference RSL | Beam/link state                                             |
| ---------------------- | ---------: | ------------: | ----------------------------------------------------------- |
| ±10°                   |      0.6 V |       −78 dBm | Faint flickering amber beam                                 |
| ±2°                    |      1.8 V |       −58 dBm | Stronger approaching-target reading                         |
| Locked on target       |      2.4 V |       −48 dBm | Solid amber beam, green flashing **LINK LOCKED**, peak tone |

Readings interpolate between the checkpoints; larger misalignment enters a weak 0.5 V / −88 dBm state before gain and topology adjustments. **Auto-Peak** provides a deterministic target-alignment action. Audio begins only after user interaction and respects browser Web Audio restrictions.

### XPIC, IF coax, and grounding

**Enable XPIC Dual-Polarization** adds the vertical/horizontal OMT and cross-connected cancellation hardware. On non-XPIC topologies it immediately doubles capacity and presents a four-modem bank. Explicit 2+0 and 4+0 configurations retain their specified two/four-modem and 2×/4× behavior.

Black **10 mm IF coax** runs from the MINI-LINK AMM / Router 6471 area through the tower ladder to each ODU. A copper feeder grounding kit clamps the upper coax and bonds downward into the steel mast. Dish, ODU, splitter, SD bracket, OMT/modem, coax, and grounding-kit inspectors use plain English and live technical specs.

Every ODU adds **45 W** to the live DC load, so topology and XPIC changes also update rectifier N+1 sizing, battery autonomy, total load, and the HUD. The HUD exposes **backhaul speed, RSL, and fade margin** alongside the existing civil and power telemetry.

### Transmission ergonomics

- Real mesh picking is validated for the parabolic dish, rear ODU, and asymmetrical HSB splitter; decorative beams and cable pulses do not steal picks.
- At desktop widths, the drawer remains left-anchored at **540px** and dishes are composed in the clear right viewport.
- At **390–430px**, the drawer stays below the upper **56%** tower viewport, remains at or under **44vh**, has no horizontal overflow, and keeps buttons, dish pills, and sliders at least **44 × 44px**.
- Reduced-motion mode disables CSS lock flashing and beam-pulse movement while preserving the live readings.

## Phase 05 — Smart filtering, cellular sectors & RF testbench

### Vendor → Generation decision tree

Steps **02 · Open cabinet** and **04 · Aim & Connect** share the same hierarchical equipment filter:

- **Vendors:** Ericsson, Huawei, and Nokia.
- **Generations:** 2G Voice, 3G Web, 4G LTE, 5G NR, and Mixed-Mode.

The selected generation curates the downstream rack cards, radios, transmission equipment, rectifier population, antennas, and RF cabling. **Mixed-Mode is the default compatibility profile**: it preserves the validated Phase 3 rack population and six installed radio positions. Choosing an explicit generation applies its curated profile instead of merely relabeling the existing hardware.

| Vendor / generation | Cabinet and transmission profile                                         | Cellular RF profile                                            |
| ------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Ericsson 2G         | DUG 20, Router 6471, TDM 1001 with 8×E1, MINI-LINK AMM 2P, and rectifier | Passive 65° panels, TMAs, 7/8-inch coax, and feeder earth kits |
| Ericsson 5G         | Baseband 6630, Router 6471 with 10G SFP+, and N+1 rectifiers             | AIR 6449 64T64R AAUs with duplex eCPRI fiber                   |
| Huawei 4G / 5G      | BBU5900 with UMPT/UBBP and RTN 950A                                      | Curated active radios; AAU5613 for 5G                          |
| Nokia 5G            | AirScale Subrack with ASIK/ABIL                                          | AirScale MAA 64T64R AAUs                                       |

### Three-sector cellular workspace

**Cellular Sectors** smoothly frames the complete upper mounting ring. **Alpha, Beta, and Gamma** are spaced 120° apart, with default azimuths of **30°, 150°, and 270°**. Each sector has independent controls for:

- Azimuth: **0–360°**.
- Electrical RET downtilt: **0–10°**.
- TX power: **43–49 dBm**.
- Channel bandwidth: **20, 40, or 100 MHz**.
- On-Air state.

On-Air sectors display translucent directional RF volumes with a **65° horizontal beamwidth** and narrow vertical beamwidth. RET steers the radiation volume downward without pretending to rotate the physical panel on its bracket.

4G/5G profiles use the curated active-radio hardware. In 5G, yellow single-mode **duplex eCPRI fiber** connects baseband SFP areas to exposed AAU lower SFP service loops; the RF path has **zero coax loss**. Legacy 2G/3G profiles use thick black corrugated **7/8-inch coax**, with each TMA directly below its passive panel. Coax enters the TMA from below, a short jumper connects upward to the panel, and copper feeder-earth clamps bond with grounding wires pointing strictly downward.

### Virtual Site Master

Select **Run RF Cable & Antenna Sweep** to simulate a handheld cable-and-antenna analyzer. The interactive SVG combines reflection and distance-to-fault information over **0–60 m**, with pointer inspection and a live distance/VSWR readout.

- **Healthy line:** the trace remains below 1.20 and reports **`VSWR: 1.14 [PASS]`** against the ≤1.32 standard.
- **Waterlogged connector / cable kink:** a sharp red reflection appears at exactly **21.3 m**, reporting **`VSWR: 2.27 [FAIL - High Reflection!]`**.
- The fault explanation describes impedance mismatch, reflected transmit power, water ingress, and the resulting risk of power-amplifier protection or shutdown.

AAUs, passive panels, TMAs, duplex-fiber runs, coax runs, feeder earth kits, and the Site Master are real raycast-pickable objects. Their inspectors explain the equipment in plain English and expose live RF specifications. Decorative RF volumes and animated pulses do not intercept equipment picks.

### Cellular telemetry and ergonomics

The HUD reports the selected cellular generation and exact nominal throughput: **2G 200 kbps, 3G 42 Mbps, 4G 300 Mbps, and 5G 3.0 Gbps**. Curated radio loads continue to feed the shared DC-load, battery-autonomy, and rectifier-N+1 calculations.

- Desktop keeps the drawer left-anchored at **540px**, with all three sectors composed in the clear right viewport.
- At **390–430px**, the drawer remains below the upper **56%** tower viewport and at or under **44vh**, without horizontal overflow.
- Mobile buttons, sector pills, sliders, and master steps retain at least **44 × 44px** targets.
- Reduced-motion mode preserves the RF state and readings without decorative beam pulsing.

## Phase 06 — Multi-vendor CLI, site acceptance & on-air launch

Phase 6 lives entirely inside **Step 05 · Go on air**. The five-step navigator is unchanged. Step 05 composes the cellular sectors and microwave hop together for final inspection, while Steps 01–04 retain their existing workspaces.

### Docked multi-vendor terminal

Open the console from Step 05 or use the HUD **TERMINAL** button from any step. The HUD button enters Step 05, docks the terminal in the existing drawer, and scrolls it into view. **CLOSE** hides the console without leaving the acceptance workspace.

The prompt, quick-command bar, and responses follow the vendor selected in Step 02:

- **Ericsson:** Moshell-style radio commands plus Router 6471 IPOS inspection.
- **Huawei:** BBU5900 MML commands.
- **Nokia:** AirScale CLI status and alarm inspection.

Commands read the same live civil, rack, power, microwave, cellular, and alarm state used by the 3D model and HUD. They do not issue network requests or configure a physical device. Use the quick-command buttons, or type into the 44px input bar and press **RUN**/Enter. Up/Down recalls recent input; output auto-scrolls to the latest response.

Common commands are **`help`** and **`clear`**. Output is capped at 300 lines and input history at 50 commands. Ericsson configuration-version storage is capped at 20 session-only snapshots.

### Ericsson CLI reference

| Command             | Live response                                                                                                                                                               |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lt all`            | Scans the MO hierarchy: cabinet, baseband, installed slots, all three sector azimuth/RET/TX/bandwidth states, and microwave topology, diameter, lock, RSL, and fade margin. |
| `cabx`              | Sector 1/2/3 VSWR, maximum reflection, internal cabinet temperature, and four temperature-dependent fan-group RPM readings. A simulated feeder fault reports 2.27.          |
| `alt` / `al`        | Active power, battery, cabinet-door, and VSWR alarms with first-observed timestamps and severities.                                                                         |
| `st ru`             | Enabled/Active or disabled state of each active radio unit.                                                                                                                 |
| `st cel`            | Operational state of all three cells.                                                                                                                                       |
| `st ret`            | RET state and live electrical downtilt for each sector.                                                                                                                     |
| `st tma`            | TMA presence and operational state in legacy/mixed RF profiles.                                                                                                             |
| `cvms <name>`       | Captures a plain-state Configuration Version snapshot and reports `CV <name> created successfully and set as STARTABLE`. Previous snapshots become archived.                |
| `cvls`              | Lists saved CV names, STARTABLE/ARCHIVED state, and UTC creation timestamps.                                                                                                |
| `show port`         | Router 6471 WAN, CES-to-TDM, and LAN states, including live backhaul lock/RSL and yellow-patch dependency.                                                                  |
| `show hardware`     | Cabinet/module inventory with simulated part numbers, stable serial numbers, and hardware revisions.                                                                        |
| `show system alarm` | Router 6471 master alarm audit and attached-unit inventory.                                                                                                                 |

CV names use 1–32 letters, digits, dots, underscores, or hyphens. Snapshots include engineering configuration, not terminal history or transient audio/animation objects. They are session-only simulations and are not persistent device backups.

### Huawei MML reference

| Command      | Live response                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `LST ALM:;`  | UMPT/BBU controller active-alarm list with MML return code and timestamps.                                         |
| `DSP CELL:;` | Three cells, generation-dependent carrier frequency, configured bandwidth, and operational state.                  |
| `DSP BRD:;`  | BBU5900 subrack board inventory across slots 0–7, including UMPT, UBBP, RTN 950A, fan, power, and empty positions. |
| `LST RRU:;`  | Three remote radios, curated AAU model, health, and optical CPRI link state.                                       |

### Nokia CLI reference

| Command           | Live response                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| `show bts status` | AirScale ASIK/ABIL and installed-module health, active carriers, operational state, and PTP/SyncE lock or holdover. |
| `show alarms`     | Active AirScale/site alarms with timestamps and severities.                                                         |

### Carrier Site Acceptance Audit

Step 05 **Overview** renders the Pages 194–195 pre-flight punch-list. Every row recalculates from live state and shows a green **✓** or red **✗**, the measured value, and a remediation explanation.

| Gate                 | Acceptance rule                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Civil & Foundation   | Calculated structural deflection ≤ 0.50° under the site wind model.                                                             |
| Earthing & Lightning | Bonded ground resistance < 5.0 Ω with verified Cadweld pits or rooftop building-earth test links.                               |
| Power & Life Support | −48V DC plant, closed rectifier branch, healthy failover capacity, and N+1 modules.                                             |
| Backhaul Link        | Microwave locked with RSL ≥ −55 dBm and fade margin ≥ 30 dB.                                                                    |
| RF Line Sweeps       | All three sector feeder/antenna lines have worst-case VSWR ≤ 1.32.                                                              |
| Alarm Telemetry      | Zero unacknowledged critical/major alarms. Minor maintenance advisories such as an open cabinet door remain visible in the CLI. |

The initial microwave azimuth is intentionally misaligned; use **Auto-Peak** in Step 04 before expecting a six-of-six acceptance result. A cable fault, removed grounding, inadequate rectifier redundancy, structural failure, or critical power/RF alarm disables **GO ON AIR**. The action guard also exists in application state, so invoking the launch function programmatically cannot bypass a failed gate.

### Interactive Go On Air sequence

When all six gates pass, **GO ON AIR** performs a simulated operational launch:

1. A four-note electronic frequency-lock chime plays through the existing user-initiated Web Audio context.
2. All three sectors become active. Fifteen shared-geometry translucent wavefronts propagate outward in five rhythmic phases per sector, following each sector's configured azimuth and RET downtilt.
3. The locked microwave vector changes to full-strength radiant amber with a brighter halo and continuing link pulses.
4. The existing tower aviation lamp pulses aviation red with a translucent beacon glow.
5. The action becomes **`[ ON AIR — SITE OPERATIONAL ]`**.
6. A solid emerald HUD cell reports **`[ ON AIR — OPERATIONAL ] • total kW • backup hours • cellular throughput Gbps`**, and the top status pill changes to **ON AIR · SITE OPERATIONAL**.

A subsequent acceptance failure suspends On-Air mode and identifies the failed gate. Reduced-motion mode retains the operational state with static wavefronts and beacon emphasis instead of rhythmic movement.

### Terminal and launch ergonomics

- Desktop retains the left-anchored **540px** drawer and clear right-hand site composition.
- At **390px and 430px**, every drawer is capped at or below **44vh**, including Step 05 with the terminal and AI Copilot docked, so the upper **56%** remains clear.
- The terminal uses internal output scrolling and no horizontal page overflow.
- Quick commands, CLOSE, RUN, input, launch, tabs, and master steps provide at least **44 × 44px** mobile targets.
- Pulse geometry and materials are shared, raycast-disabled, and disposed through the existing scene lifecycle. Animation uses the existing requestAnimationFrame loop; no polling interval or per-command event listener is created.
- Audio nodes disconnect after the chime. Terminal output, input history, CV snapshots, and alarm timestamps are bounded or cleaned when no longer active.

## Phase 07 — Offline AI architect, RF diagnostics & guided NOC triage

Phase 7 adds intelligence to the existing workbench without adding a workflow step. The five-step navigator remains unchanged: the **AI Architect** floats beneath the header, **AI Waveform Diagnostic** lives in **Step 04 · Site Master**, and **AI Copilot** lives in the **Step 05** docked terminal. `window.CellForge = window.TowerStudio` remains available for compatibility.

All Phase 7 parsing, classification, correlation, and remediation logic runs locally in browser JavaScript. There are **no AI service requests, API keys, paid APIs, model downloads, cookies, or remote inference**. Identical state and input produce identical output.

### Module 7A — AI Architect command bar

Use the search-style prompt and **AI BUILD**, or select a quick-start chip. **AI BUILD replaces the current working site** with the parsed reference configuration; save an Ericsson `cvms <name>` snapshot first if the current configuration is needed later in the session.

| Chip                               | Resulting blueprint                                                                                                                                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Zagros Mountain 5G Relay**       | Off-grid Mount Safeen; 45 m tubular lattice; 5G NR 64T64R AAUs / 3.5 GHz; dual alternating generators with the existing 12-hour rotation; mandatory Active ESE and Cadweld grounding; aligned 2+0 XPIC backhaul. |
| **Urban Rooftop 4G/5G C-RAN**      | 9 m rooftop RTT/DRAME on non-penetrating dunnage and ballast; Ericsson Mixed-Mode with Baseband 6630; commercial grid; enforced outdoor IP55 housing; single-mode duplex eCPRI to the AAUs.                      |
| **Emergency Border Outpost (COW)** | 20 m telescopic COW mast and outriggers; online Generator 1 representing the onboard diesel source without utility dependency; 4G service; aligned 1+0 standalone microwave.                                     |

The architect uses the same civil, power, rack, microwave, cellular, acceptance, and launch builders as manual configuration. It starts each blueprint from a clean reference power state (100% battery SOC, 1,000 L nominal fuel, and 24°C), then automatically aligns the microwave target. It does **not** bypass engineering normalization or the six-gate launch guard.

#### Local intent vocabulary

| Intent      | Recognized local keywords and behavior                                                                                                                                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Environment | `mountain`, `safeen`, or `zagros` → Mountain Peak; `rooftop`, `roof`, `urban`, or `c-ran` → Urban Rooftop; `desert`, `rural`, or `greenfield` → Rural Greenfield; `cow`, `border`, `emergency`, or `disaster` → Emergency COW.                        |
| Generation  | `2g`, `3g`, `4g`, `5g`, and `mixed`; mentioning multiple generations also selects Mixed-Mode and reapplies the curated rack/RF profile.                                                                                                               |
| Power       | `dual` or `alternating` → dual-generator off-grid; `generator`, `genset`, or `diesel` without a grid → single online generator; `grid` / commercial utility → grid with standby; `battery`, `lithium`, or `vrla` → battery chemistry/capacity intent. |
| Microwave   | `xpic` → 2+0 XPIC; `space diversity` → 1+1 SD; `1+1` → 1+1 HSB; `standalone` / `1+0` → one-dish standalone.                                                                                                                                           |

Unrecognized words are ignored. Missing intents inherit the selected environment's safe blueprint defaults. For example:

```text
Desert mixed 4G/5G relay with space diversity 1+1, lithium battery and dual generators
Urban rooftop 5G C-RAN with commercial grid, battery and XPIC
Safeen 4G mountain relay using 1+1 microwave and grid
```

#### Three-second assembly sequence

The sequence is driven by the existing `requestAnimationFrame` loop, not by a chain of timers:

| Elapsed time | Visible action                                                                                                                            |
| -----------: | ----------------------------------------------------------------------------------------------------------------------------------------- |
|    **0.0 s** | Build the terrain and equipment pad; reset the camera to the validated clear operational framing.                                         |
|    **0.8 s** | Assemble the tower, COW/outriggers where applicable, and lightning terminal.                                                              |
|    **1.6 s** | Open the cabinet, slide the rack cards into their shelves, route power, and start the curated yellow patch when Router + TDM are present. |
|    **2.4 s** | Reveal cellular and microwave antennas; align the hop and show the amber microwave-lock state.                                            |
|    **3.0 s** | Run the existing guarded launch, play the frequency-lock chime, flash the emerald HUD, and report **`[ ON AIR — OPERATIONAL ]`**.         |

Reduced-motion mode retains these state checkpoints but removes the assembly interpolation and HUD flashing. A failed acceptance gate produces a red **ACCEPTANCE HOLD** instead of a false On-Air result. A later RF, grounding, power, civil, alarm, or backhaul failure still suspends On-Air mode and updates the architect status.

### Module 7B — Neural RF Waveform Classifier

In **Step 04 → Cellular Sectors → Virtual Site Master**, select **AI Waveform Diagnostic**. The classifier samples the selected sector's deterministic **601-point** curve. If a sweep has already been acquired it uses that exact result; otherwise it evaluates the current healthy/fault scenario directly. No training or network inference occurs—the “neural” diagnostic is an explainable local rule classifier over reflection peaks and discontinuity regions.

| Scenario                   | Confidence | Local diagnostic                                                                                                                                                                                                    |
| -------------------------- | ---------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Healthy                    |  **99.1%** | Normal line; nominal **VSWR 1.14 below 1.32**; **no discontinuities**.                                                                                                                                              |
| Water ingress / cable kink |  **96.8%** | High-reflectance discontinuity at **21.3 m**, **VSWR 2.27**, one discontinuity region, and a capacitive-shunt/water-ingress signature. Inspect for a **pinched dielectric** or failed **7/16 DIN weatherproofing**. |

The result appears in an emerald healthy card or red fault card next to the interactive DTF graph. Re-running a sweep, changing the fault scenario, or changing the curated vendor/generation profile invalidates stale AI diagnostic state. Classification does not mark a failed line as accepted: the normal Phase 6 RF gate remains red and blocks or suspends launch.

### Module 7C — Guided NOC Copilot

Open the Step 05 terminal and select **AI Copilot**, or type **`ai diagnose`** in any vendor mode. The executive report correlates:

- Active alarm codes, severity, source, and first-observed timestamps.
- AC source, DC-bus voltage, rectifier population, battery SOC/energy, live DC load, and backup horizon.
- Three-sector VSWR and the 21.3 m discontinuity when present.
- Microwave lock/fade state and cabinet vendor, housing, IP rating, door telemetry, and rack load.

The report identifies the leading root cause, service impact, and backup horizon, then presents three buttons. When triage is active, the same choices are typeable as **`1`**, **`2`**, and **`3`**.

| Choice                                   | Guided action and state change                                                                                                                                                                                                                                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1 · Start Generator 1**                | Starts the existing crank/vibration/exhaust sequence while the battery holds the DC bus with **0.000 ms** interruption. The ATS transfers after the 15-second stabilization sequence; Generator 1 becomes the active source and **Loss of Mains / Battery Discharging** clears while the utility remains absent. |
| **2 · Battery math + throttle carriers** | Prints the usable-energy, remaining-energy, current, and before/after autonomy equations plus a battery-discharge SVG curve. Nonessential sectors 2 and 3 are throttled to **43 dBm / 20 MHz**, sector 1 retains full essential coverage, and the radio-load model is reduced to extend autonomy.                |
| **3 · Locate 21.3 m cable repair**       | Rebuilds **Step 04 · Cellular Sectors** in Configure mode, places a pulsing 3D marker at the 21.3 m position along the actual RF cable curve, smoothly moves the camera to it, and scrolls Site Master into view for weatherproofing/dielectric repair and a repeat sweep.                                       |

Option 2 uses the shared power model:

```text
Usable energy = strings × Ah/string × 48 V × chemistry usable fraction
Remaining energy = usable energy × SOC
Battery current = DC load ÷ 48 V
Autonomy hours = remaining kWh ÷ DC kW
```

The choices remain visible above the scrollable terminal output. Returning to Step 05 after camera-guided repair restores the same terminal session and bounded command history.

### Phase 7 controls, ergonomics, and diagnostics

- Desktop opens the AI bar by default. At mobile widths it starts as a compact **AI** toggle; **×** dismisses the expanded bar and **AI** reopens it. Dismissal does not cancel an in-progress build.
- The AI panel and every mobile drawer are capped at or below **44vh**. The drawer preserves the upper **56%** scene at 390–430px, and the desktop drawer remains left-anchored at **540px**.
- AI chips, close/reopen controls, Copilot, triage choices, buttons, pills, and sliders retain at least **44 × 44px** mobile targets. There is no horizontal page overflow.
- AI assembly uses existing scene builders and geometry disposal. No polling interval, external worker, per-build event listener, or unbounded AI history is created. Existing 300-line output, 50-command input, and 20-CV limits remain unchanged.
- Reduced-motion users keep deterministic AI states without decorative assembly interpolation, HUD flashing, marker pulsing, or smooth-camera travel.

For local diagnostics, the existing public compatibility surface also exposes:

```text
TowerStudio.parseAIArchitect(prompt)
TowerStudio.startAIBuild(prompt)
TowerStudio.classifyRFWaveform(sweepResult)
TowerStudio.executeCLI("ai diagnose")
TowerStudio.applyTriageChoice(1 | 2 | 3)
TowerStudio.aiBuild
TowerStudio.triage
```

A useful manual acceptance pass is: build all three chips; parse a custom multi-intent prompt; confirm the five assembly checkpoints; classify healthy and faulty 601-point traces; run all three Copilot choices after a blackout and RF fault; verify a new RF/grounding failure suspends launch; and repeat the five steps at 390px and 430px with the browser console open.

## Guided flow, detail levels & glossary

The interface is organized as five master steps with an explicit gate between them:

| Step | Label             | Done when                                                                  | Locked until             |
| ---- | ----------------- | -------------------------------------------------------------------------- | ------------------------ |
| 01   | **Site**          | The site setup walkthrough is finished                                     | Never — always open      |
| 02   | **Open cabinet**  | At least one card is fitted                                                | Never                    |
| 03   | **Power**         | Rectifier N+1 **and** failover checks both pass                            | Step 02 is done          |
| 04   | **Aim & Connect** | Microwave: the link is locked. Cellular: at least one sector sweep has run | Step 02 is done          |
| 05   | **Go on air**     | The site is on air                                                         | Steps 03 **and** 04 done |

Step 04 branches into **4A Backhaul** (microwave dishes and link budget) and
**4B Sectors** (cellular RF and line sweeps); only the selected branch's controls
render. The six carrier acceptance gates surface from step 02 onward, so nothing
can pass in the strip and fail in the audit.

A step renders as **Done**, **Needs attention**, or **Locked**. Locked steps and
disabled controls always print their reason as visible text next to the control
(the `title` attribute is kept, but is not sufficient on touch devices).

### Detail levels

`Guided` (default) folds the _Specs and details_ sections behind a
`More options` `<details>` and prefers plain wording. `Engineer` renders every row
inline with full units. The choice is stored in `localStorage` under
`tower-studio.detail.v1` and read by `isEngineerMode()`.

### Glossary keys

`GLOSSARY` maps 28 uppercase keys to one-sentence definitions; `Term(key, label)`
renders them as a `<button class="term">` with a `.term-def` popover:

```text
VSWR · DTF · RSL · FADE MARGIN · N+1 · AUTONOMY · ATS · EARTH LOOP · DEAD LOAD ·
WIND AREA · TORSION · SOIL BEARING · BACKHAUL · XPIC · SPACE DIVERSITY · SECTOR ·
BASEBAND · PATCH CABLE · ALARM HIGHWAY · ON AIR · CONFIGURATION VERSION · DC LOAD ·
CLI · MO · dBi · dBm · E1 · HVAC
```

The six acceptance gates are annotated with a representative term through
`GATE_TERMS`: civil → `TORSION`, earthing → `EARTH LOOP`, power → `N+1`,
backhaul → `BACKHAUL`, rf → `VSWR`, alarms → `ALARM HIGHWAY`.

### Runtime constants

```text
WORKSPACE_STORAGE_KEY  = "tower-studio.workspace.v1"   # autosave
DETAIL_STORAGE_KEY     = "tower-studio.detail.v1"      # Guided / Engineer
SITE_FILE_KIND         = "tower-studio/site"           # exported JSON
SITE_FILE_VERSION      = 1
HISTORY_LIMIT          = 50                            # undo / redo depth
AUTOSAVE_DELAY         = 400                           # ms, debounce
REBUILD_THROTTLE_MS    = 80                            # ms, leading edge
GESTURE_HINT_KEY       = "tower-studio.gesture-hint.v1"
```

### Live HUD contract

`updateHUD()` builds a plain cell list and hands it to `renderHUDCells()`:

- **Setup mode — 4 cells:** `[ Setting up ]`, Environment, Structure, guided-setup
  hint.
- **Live mode — 11 cells:** status (`#hud-site-status`, `[ Live model ]` or
  `[ On air ] • … kW • … h • … Gbps`), Environment, Structure, Total load,
  Backup hours, Backhaul speed, Cellular generation, Microwave RSL, Fade margin,
  Rectifier N+1, AC source.
- **Live mode with an active event or alarms — 14 cells:** the 11 above plus Fuel
  consumption, Battery discharge, and `Active alarms · n`.

Cells are reused across updates; only changed label / value / class / id /
`data-live` attributes are written.

## Controls

- **Five master steps:** Site, Open cabinet, Power, Aim & Connect (4A Backhaul / 4B Sectors), and Go on air.
- **Drag** to orbit; **wheel/pinch** to zoom.
- **Click** civil, power, rack, microwave, antenna, TMA, or RF cabling equipment to inspect it.
- Click the cabinet door to swing it open or closed; click internal cards to zoom into their inspectors.
- Selecting an earth pit opens its lid and reveals the 2.4 m electrode.
- **FIT SITE** restores the composed view; **Escape** clears selection.
- **TERMINAL** opens or closes the vendor-aware Step 05 CLI console.
- **AI BUILD** assembles the prompt/chip blueprint; **× / AI** dismisses or reopens the architect bar.
- **AI Waveform Diagnostic** classifies the selected sector in Step 04.
- **AI Copilot** or `ai diagnose` opens guided NOC triage; use the three buttons or type `1`, `2`, or `3`.
- Desktop uses a side drawer and mobile a bottom sheet; both render the same single scrolling panel for the active step.
- **Guided / Engineer** switches the detail level; the choice is remembered per browser.
- Dotted-underline terms open a definition popover on tap, hover, or keyboard focus; **Escape** closes it.
- **Undo / redo** walk a 50-step history; the site autosaves 400 ms after the last change.
- Saving, loading, and starting fresh all ask for confirmation before discarding work.

## Engineering basis

Civil cards expose dead weight, wind area, torsion, overturning moment, soil-bearing assumptions, and grounding checks. Power cards expose AC/DC loads, rectifier capacity, battery energy and autonomy, generator fuel rate, source state, climate state, and alarms. Rack cards expose slot population, module DC draw, optical and E1 capacity, router throughput, housing ingress, and alarm-path state. Microwave cards expose topology, dish gain, mounting and topology losses, alignment voltage, RSL, fade margin, XPIC capacity, and ODU DC draw. Cellular cards expose sector azimuth, RET, TX power, bandwidth, active-radio or passive-antenna architecture, feeder type, and RF loss.

The Site Master is an interactive **simulation**, not a calibrated measurement instrument. Its healthy and damaged traces are deterministic teaching scenarios. These are **preliminary simulator checks, not construction-certified designs**. Deployment requires project-specific electrical, structural, geotechnical, RF-safety, fire-safety, and local-code review by qualified engineers.
