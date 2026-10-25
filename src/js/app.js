"use strict";

if (!window.THREE) {
  const loading = document.getElementById("loading");
  loading.classList.add("error");
  loading.textContent =
    "The Three.js engine could not be loaded. Check your connection and reload Tower Studio.";
  throw new Error("Three.js is unavailable");
}

// -------------------------------------------------------------------------
// Engineering catalogue and state
// -------------------------------------------------------------------------
const T = window.THREE;
const $ = (selector) => document.querySelector(selector);
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 1) => Number(value.toFixed(digits));
const V3 = (x, y, z) => new T.Vector3(x, y, z);

const TOWERS = {
  LATTICE_TUBULAR_3LEG: {
    name: "3-leg tubular lattice",
    short: "TUBULAR 3-LEG",
    detail: "CHS pipes · low drag · Cd 0.8",
    range: [30, 60],
    defaultHeight: 45,
    maxTwist: 0.5,
    kgPerM: 82,
    fixedWeight: 430,
    areaPerM: 0.46,
    cd: 0.8,
    twistAtMax: 0.46,
    section: "CHS 168.3 × 6.3 mm · S355",
  },
  LATTICE_ANGULAR_4LEG: {
    name: "4-leg angular lattice",
    short: "ANGULAR 4-LEG",
    detail: "L-profiles · high deadweight",
    range: [30, 60],
    defaultHeight: 45,
    maxTwist: 0.5,
    kgPerM: 116,
    fixedWeight: 620,
    areaPerM: 0.62,
    cd: 1.25,
    twistAtMax: 0.48,
    section: "L 90 × 90 × 8 mm · S355",
  },
  ROOFTOP_RTT_DRAME: {
    name: "Rooftop RTT / DRAME",
    short: "ROOFTOP RTT",
    detail: "I-beam dunnage · column load path",
    range: [3, 15],
    defaultHeight: 9,
    maxTwist: 0.5,
    kgPerM: 91,
    fixedWeight: 680,
    areaPerM: 0.52,
    cd: 1.15,
    twistAtMax: 0.28,
    section: "L 75 × 75 × 6 mm · S355",
  },
  ROOFTOP_POLE: {
    name: "Rooftop parapet pole",
    short: "ROOFTOP POLE",
    detail: "Galvanized pipe · small cells",
    range: [3, 6],
    defaultHeight: 6,
    maxTwist: 1.0,
    kgPerM: 22,
    fixedWeight: 48,
    areaPerM: 0.17,
    cd: 1.0,
    twistAtMax: 0.62,
    section: "CHS 114.3 × 5 mm · galvanized",
  },
  MONOPOLE_LIGHT_DUTY: {
    name: "Light-duty monopole",
    short: "MONOPOLE",
    detail: "Tapered hollow tube · small footprint",
    range: [18, 30],
    defaultHeight: 24,
    maxTwist: 0.5,
    kgPerM: 104,
    fixedWeight: 390,
    areaPerM: 0.78,
    cd: 0.9,
    twistAtMax: 0.42,
    section: "Tapered hollow S355 shaft",
  },
  GUYED_MAST: {
    name: "Guyed lattice mast",
    short: "GUYED MAST",
    detail: "3 guy levels · high-tensile stays",
    range: [40, 80],
    defaultHeight: 60,
    maxTwist: 1.0,
    kgPerM: 43,
    fixedWeight: 510,
    areaPerM: 0.38,
    cd: 1.0,
    twistAtMax: 0.86,
    section: "CHS 88.9 × 4 mm · S355",
  },
  COW_TELESCOPIC_TRUCK: {
    name: "Telescopic COW truck",
    short: "EMERGENCY COW",
    detail: "Flatbed · 4 mechanical outriggers",
    range: [15, 25],
    defaultHeight: 20,
    maxTwist: 1.0,
    kgPerM: 31,
    fixedWeight: 740,
    areaPerM: 0.24,
    cd: 0.85,
    twistAtMax: 0.73,
    section: "Nested galvanized telescopic sections",
  },
};

const ENVIRONMENTS = {
  MOUNTAIN_PEAK: {
    name: "Mountain Peak",
    title: "Mount Safeen / Haibat Sultan",
    description:
      "Exposed rock outcrop at 1,220 m. Severe ice and 160 km/h gusts demand a stiff lattice structure, active lightning capture and a bonded rock-earth grid.",
    wind: 160,
    ice: "Severe · 25 mm",
    bearing: 450,
    soil: "Rock / engineered backfill",
    earthBase: 2.1,
    allowed: ["LATTICE_TUBULAR_3LEG", "LATTICE_ANGULAR_4LEG"],
    defaultTower: "LATTICE_TUBULAR_3LEG",
    mandatoryESE: true,
    mandatoryGrounding: true,
    foundation: "Rock-anchored C30/37 plinths",
  },
  URBAN_ROOFTOP: {
    name: "Urban Rooftop",
    title: "Downtown commercial building",
    description:
      "Reinforced concrete rooftop with parapets. Loads follow the column grid through I-beam dunnage; rubber pads and ballast protect the waterproof membrane.",
    wind: 120,
    ice: "None",
    bearing: null,
    soil: "Concrete roof / structural frame",
    earthBase: 0.8,
    allowed: ["ROOFTOP_RTT_DRAME", "ROOFTOP_POLE"],
    defaultTower: "ROOFTOP_RTT_DRAME",
    mandatoryESE: false,
    mandatoryGrounding: false,
    foundation: "Non-penetrating grillage + ballast",
  },
  RURAL_GREENFIELD: {
    name: "Rural Greenfield",
    title: "Open agricultural / desert plain",
    description:
      "Flat soil with a gravel security compound. The civil layout supports lattice towers, light monopoles and long-span guyed masts with external anchor blocks.",
    wind: 130,
    ice: "Light · 10 mm",
    bearing: 180,
    soil: "Compacted soil · verify geotech",
    earthBase: 3.4,
    allowed: ["LATTICE_ANGULAR_4LEG", "LATTICE_TUBULAR_3LEG", "MONOPOLE_LIGHT_DUTY", "GUYED_MAST"],
    defaultTower: "LATTICE_ANGULAR_4LEG",
    mandatoryESE: false,
    mandatoryGrounding: false,
    foundation: "Reinforced concrete spread foundations",
  },
  EMERGENCY_DISASTER: {
    name: "Emergency COW",
    title: "Rapid-deployment temporary outpost",
    description:
      "Dirt-road deployment with a road-legal flatbed, telescopic mast and four mechanical stabilizing jacks. No permanent foundation curing time is required.",
    wind: 100,
    ice: "None",
    bearing: 120,
    soil: "Compacted dirt / temporary outpost",
    earthBase: 4.6,
    allowed: ["COW_TELESCOPIC_TRUCK"],
    defaultTower: "COW_TELESCOPIC_TRUCK",
    mandatoryESE: false,
    mandatoryGrounding: false,
    foundation: "Four outrigger pads on compacted ground",
  },
};

const st = {
  env: "MOUNTAIN_PEAK",
  tower: "LATTICE_TUBULAR_3LEG",
  H: 45,
  lightning: "ESE_ACTIVE",
  grounding: true,
  tab: "overview",
  drawerOpen: true,
  masterStep: 1,
  selectedId: null,
  heroOpen: true,
  onboarding: {
    active: true,
    towerSelected: false,
  },
};

st.power = {
  sourceMode: "GRID_WITH_STANDBY",
  atsMode: "DIGITAL_PLC",
  radioLoadKw: 3,
  rectifiers: 2,
  autoRectifiers: true,
  batteryStrings: 4,
  batteryAh: 200,
  batteryType: "VRLA",
  branches: { rectifier: true, climate: true, auxiliary: true },
  climateSetpoint: 24,
};

st.rack = {
  vendor: "ERICSSON",
  location: "INDOOR",
  radioCount: 6,
  slots: {
    fau: true,
    dug: true,
    duw: true,
    baseband: true,
    scu: true,
    shu: true,
    router: true,
    tdm: true,
    amm: true,
    ovp: true,
    sau: true,
  },
};

st.generation = "MIXED";
st.customGenerations = ["2G", "3G"];
st.cellular = {
  sector: 0,
  fault: false,
  sweeps: [null, null, null],
  aiDiagnostics: [null, null, null],
  sectors: [
    { azimuth: 30, downtilt: 2, txPower: 46, bandwidth: 100, onAir: true },
    { azimuth: 150, downtilt: 2, txPower: 46, bandwidth: 100, onAir: true },
    { azimuth: 270, downtilt: 2, txPower: 46, bandwidth: 100, onAir: true },
  ],
};

st.microwave = {
  system: "MICROWAVE",
  topology: "STANDALONE",
  diameter: 0.6,
  frequency: 15,
  azimuth: 42,
  targetAzimuth: 30,
  spacing: 4,
  xpicBoost: false,
};

st.terminal = {
  open: false,
  lines: [],
  cvs: [],
  inputHistory: [],
  historyIndex: -1,
  welcomed: false,
};

const launch = {
  onAir: false,
  launchedAt: 0,
  suspendedReason: "",
};

st.ai = {
  architectOpen: window.innerWidth > 760,
  lastPrompt: "",
};

const aiBuild = {
  running: false,
  completed: false,
  started: 0,
  duration: 3000,
  stage: -1,
  prompt: "",
  config: null,
  intents: [],
  layers: [],
  cards: [],
  powerRoutes: [],
  status: "LOCAL NLP · OFFLINE INFERENCE · ZERO API KEYS",
  flashUntil: 0,
};

const triage = {
  active: false,
  rootCause: null,
  options: [],
  report: "",
  curve: null,
  optimized: false,
  marker: null,
  cameraTarget: null,
  generatorStart: 0,
  lastChoice: null,
};

const microwaveSim = {
  azimuth: st.microwave.azimuth,
  wasLocked: false,
  lastBeep: 0,
};

const cellularSim = {
  running: false,
  started: 0,
  duration: 1400,
  sector: 0,
  cursorDistance: null,
  lastProgress: -1,
};

const rackSim = {
  door: 0,
  doorTarget: 0,
  patchLink: false,
  patchProgress: 0,
  patchStarted: 0,
  patchCompletedNotified: false,
  alarmTraceStart: 0,
  alarmTraceActive: false,
  alarmBadge: false,
};

const powerSim = {
  phase: "NORMAL",
  activeSource: "GRID",
  gridVoltage: 380,
  eventStart: 0,
  generatorCooldownUntil: 0,
  climateEpoch: performance.now(),
  offgridEpoch: performance.now(),
  temperature: 27,
  batterySoc: 100,
  batteryCurrent: 0,
  fuelRemainingL: 780,
  failedRectifier: null,
  transferMs: 0,
  lastHudUpdate: 0,
};

const RACK_CONTENT = {
  cabinet: {
    title: "19-inch Telecom Cabinet & Rack",
    what: "An organized steel home for the site's radio brains, transmission cards, power units, cooling and backup batteries.",
    does: "It holds every card in a known vertical position, protects the electronics, and gives technicians one safe place to inspect the entire site.",
  },
  door: {
    title: "Hinged Cabinet Access Door",
    what: "The protective front cover of the equipment cabinet.",
    does: "It swings open on real hinges so you can reach the 19-inch shelves. Indoor Ericsson racks use open mesh; outdoor enclosures use sealed double doors.",
  },
  fau: {
    title: "FAU · Four-Fan Top Exhaust Unit",
    what: "A 1U cooling unit with four fans at the very top of the rack.",
    does: "It pulls hot air away from the cards and exhausts it out the top, while the SCU watches temperature and adjusts fan speed.",
  },
  radio: {
    title: "6U Radio Shelf · RUS / RUG / RUW",
    what: "The upper equipment shelf with positions for as many as twelve radio units.",
    does: "It organizes the radio hardware that sends and receives the tower's wireless channels. Empty positions leave room for future sectors and bands.",
  },
  baseband: {
    title: "Ericsson Baseband 6630 (5G NR & LTE)",
    what: "The supercomputer brain of the cell site.",
    does: "Takes digital internet data and turns it into radio signals for thousands of smartphones simultaneously. It runs 2G, 3G, 4G, and 5G at the same time and has 15 optical fiber ports.",
    specs: [
      ["FORM", "1U · digital shelf"],
      ["OPTICAL PORTS", "15 × CPRI / eCPRI"],
      ["SERVICE MODE", "5G NR + LTE mixed-mode"],
      ["DC INPUT", "180 W"],
    ],
  },
  dug: {
    title: "Digital Unit for GSM (DUG 20)",
    what: "The classic 2G phone call processor (31mm wide).",
    does: 'Handles up to 96 simultaneous voice calls using traditional copper E1 phone lines. It also acts as the "Master DU" to report site alarms.',
    specs: [
      ["MODEL", "DUG 20 01"],
      ["WIDTH", "31 mm · single slot"],
      ["CAPACITY", "12 TRX · 96 voice calls"],
      ["LEGACY PORTS", "4 × E1"],
      ["DC INPUT", "80 W"],
    ],
  },
  duw: {
    title: "Digital Unit for WCDMA (DUW 30)",
    what: "The 3G mobile data processor (62mm wide — twice as thick!).",
    does: "Processes 3G WCDMA mobile data and connects to the packet network through Ethernet at up to 48 Mbps.",
    why: "3G math is complex; it needs twice as many computer chips and heavy aluminum heat sinks, taking up two full slots.",
    specs: [
      ["MODEL", "DUW 30 01"],
      ["WIDTH", "62 mm · double slot"],
      ["DATA", "48 Mbps · WCDMA"],
      ["CONNECTION", "Ethernet"],
      ["DC INPUT", "120 W"],
    ],
  },
  scu: {
    title: "SCU (Fan Supervisor) & SHU (Enclosure Bus Hub)",
    what: "The cabinet's temperature watcher and cooling controller.",
    does: "The SCU measures temperatures and speeds up the fans when it gets hot. The SHU acts like a network switch, connecting all support cards cleanly without messy wires.",
    specs: [
      ["FUNCTION", "Fan + environmental supervisor"],
      ["CONTROL", "Temperature-dependent fan speed"],
      ["ALARM PATH", "SAU3 → SCU → SHU"],
      ["DC INPUT", "10 W"],
    ],
  },
  shu: {
    title: "SCU (Fan Supervisor) & SHU (Enclosure Bus Hub)",
    what: "A tidy support-hub unit for the cabinet's EC-Bus wiring star.",
    does: "The SCU measures temperatures and speeds up the fans when it gets hot. The SHU acts like a network switch, connecting all support cards cleanly without messy wires.",
    specs: [
      ["FUNCTION", "Support Hub Unit"],
      ["TOPOLOGY", "EC-Bus wiring star"],
      ["ALARM PATH", "SCU → SHU → Master DUG"],
      ["DC INPUT", "10 W"],
    ],
  },
  "power-shelf": {
    title: "3U Power Shelf · PCF / PCU / PSU / PDU / PFU / BFU",
    what: "The cabinet's own protected -48V DC distribution shelf.",
    does: "It receives power from the Phase 2 rectifier plant, filters surges, protects each branch, and connects the battery fuse and low-voltage disconnect.",
  },
  router: {
    title: "Ericsson Router 6471 (Site IP Router)",
    what: "The on-site internet router for the entire tower.",
    does: "Takes incoming 10-Gigabit fiber/microwave backhaul and separates the traffic: sends 5G data to the Baseband, and sends 2G voice to the TDM 1001.",
    specs: [
      ["FORM", "1U · half-width"],
      ["ROUTING", "30 Gbps IP"],
      ["BACKHAUL", "10-Gigabit fiber / microwave"],
      ["PATCH PORT", "Port 2 → TDM Port 1B"],
      ["DC INPUT", "40 W"],
    ],
  },
  tdm: {
    title: "TDM 1001 Circuit Emulation Module",
    what: "A translator between the modern internet and old phone lines.",
    does: "Modern backhaul only speaks IP packets. This card turns those packets back into 8 traditional copper E1 lines so older 2G towers can still make phone calls!",
    specs: [
      ["FORM", "1U · half-width"],
      ["LEGACY OUTPUT", "8 × E1 circuit emulation"],
      ["PATCH PORT", "Port 1B ← Router Port 2"],
      ["LINK", "Yellow Ethernet patch"],
      ["DC INPUT", "20 W"],
    ],
  },
  amm: {
    title: "MINI-LINK AMM 2P / 6P Microwave Shelf",
    what: "The plug-in shelf for the tower's microwave backhaul modules.",
    does: "It connects the cabinet to a wireless microwave dish when fiber is unavailable, carrying IP traffic to and from Router 6471.",
    specs: [
      ["FORM", "Transmission compartment"],
      ["OPTIONS", "AMM 2P / AMM 6P"],
      ["SERVICE", "Microwave IP backhaul"],
      ["DC INPUT", "55 W"],
    ],
  },
  ovp: {
    title: "Over Voltage Protection Box (OVP)",
    what: "A lightning shield for the cabinet's alarm wires.",
    does: "External wires running to the fuel tank and door sensors can catch thousands of volts during a storm. The OVP absorbs lightning surges so the computer chips inside don't vaporize.",
    specs: [
      ["POSITION", "Alarm highway station 1"],
      ["PROTECTION", "External dry-contact surge suppression"],
      ["CONNECTED SENSORS", "Door · fuel · generator"],
      ["DC INPUT", "Passive · 0 W"],
    ],
  },
  sau: {
    title: "Support Alarm Digitizer (SAU3)",
    what: "A sensor card with 6 input and 3 output ports.",
    does: "Reads whether the door is open, the generator is broken, or fuel is low, and turns those physical switches into digital alarm messages.",
    specs: [
      ["POSITION", "Alarm highway station 2"],
      ["INPUTS", "6 dry-contact inputs"],
      ["OUTPUTS", "3 control outputs"],
      ["NEXT STATION", "SCU"],
      ["DC INPUT", "5 W"],
    ],
  },
  "battery-tray": {
    title: "Base Battery Tray & Master Ground Bar",
    what: "The bottom compartment for four 12V battery blocks in each 48V string and the cabinet's main earth connection.",
    does: "It keeps backup batteries low and stable while the Master Ground Bar bonds every cabinet panel and support card to the site earth loop.",
  },
};

const RACK_SLOT_POWER = {
  fau: 0.04,
  dug: 0.08,
  duw: 0.12,
  baseband: 0.18,
  scu: 0.01,
  shu: 0.01,
  router: 0.04,
  tdm: 0.02,
  amm: 0.055,
  ovp: 0,
  sau: 0.005,
};
const CUSTOM_GEN_CATALOG = {
  "2G": { chip: "2G GSM", mbps: 0.2, backhaulMbps: 16, freq: "900 MHz" },
  "3G": { chip: "3G WCDMA", mbps: 42, backhaulMbps: 100, freq: "2100 MHz" },
  "4G": { chip: "4G LTE", mbps: 300, backhaulMbps: 500, freq: "1800 MHz" },
  "5G": { chip: "5G NR", mbps: 3000, backhaulMbps: 3000, freq: "3500 MHz" },
};
const SMART_GENERATIONS = {
  "2G": { label: "2G Voice", throughput: "200 kbps", rfMode: "LEGACY" },
  "3G": { label: "3G Web", throughput: "42 Mbps", rfMode: "LEGACY" },
  "4G": { label: "4G LTE", throughput: "300 Mbps", rfMode: "ACTIVE" },
  "5G": { label: "5G NR", throughput: "3.0 Gbps", rfMode: "ACTIVE" },
  MIXED: { label: "Mixed-Mode", throughput: "3.0 Gbps", rfMode: "MIXED" },
  CUSTOM: { label: "Custom Multi-Gen", throughput: "42.2 Mbps", rfMode: "MIXED" },
};

function normalizeCustomGenerations(list = st.customGenerations) {
  const valid = ["2G", "3G", "4G", "5G"].filter((gen) => Array.isArray(list) && list.includes(gen));
  return valid.length ? valid : ["2G", "3G"];
}

function formatRadioThroughput(mbps) {
  if (mbps < 1) return `${Math.round(mbps * 1000)} kbps`;
  if (mbps < 1000) return `${Number(mbps.toFixed(1))} Mbps`;
  const gbps = mbps / 1000;
  return `${Number(gbps.toFixed(2)) === Number(gbps.toFixed(1)) ? gbps.toFixed(1) : gbps.toFixed(2)} Gbps`;
}

function customGenerationMetrics(list = st.customGenerations) {
  const gens = normalizeCustomGenerations(list);
  const cellularMbps = gens.reduce((sum, gen) => sum + CUSTOM_GEN_CATALOG[gen].mbps, 0);
  const backhaulMbps = gens.reduce((sum, gen) => sum + CUSTOM_GEN_CATALOG[gen].backhaulMbps, 0);
  const hasLegacy = gens.includes("2G") || gens.includes("3G");
  const hasActive = gens.includes("4G") || gens.includes("5G");
  return {
    gens,
    label: gens.join("+"),
    throughput: formatRadioThroughput(cellularMbps),
    cellularMbps,
    backhaulMbps,
    rfMode: hasLegacy && hasActive ? "MIXED" : hasLegacy ? "LEGACY" : "ACTIVE",
    frequencies: gens.map((gen) => CUSTOM_GEN_CATALOG[gen].freq).join(" / "),
  };
}

function smartProfile(vendor = st.rack.vendor, generation = st.generation) {
  const all = Object.keys(RACK_SLOT_POWER);
  const profile = {
    slots: all,
    labels: {},
    chassis: `${vendor} multi-generation 19-inch rack`,
    rfMode: "MIXED",
  };
  if (generation === "MIXED") return profile;
  if (generation === "CUSTOM") {
    const custom = customGenerationMetrics();
    const has2G = custom.gens.includes("2G");
    const has3G = custom.gens.includes("3G");
    const has4G = custom.gens.includes("4G");
    const has5G = custom.gens.includes("5G");
    const slots = ["fau", "router"];
    if (has2G) slots.push("dug", "tdm", "amm");
    if (has3G) {
      slots.push("duw");
      if (!slots.includes("amm")) slots.push("amm");
    }
    if (has4G || has5G) {
      slots.push("baseband");
      if ((vendor === "HUAWEI" || vendor === "NOKIA") && !slots.includes("dug")) {
        slots.push("dug");
      }
    }
    profile.slots = slots;
    profile.rfMode = custom.rfMode;
    if (vendor === "ERICSSON") {
      if (has4G || has5G) {
        profile.labels.router = "Ericsson Router 6471 · 10G SFP+";
        profile.labels.baseband = has5G ? "Ericsson Baseband 6648" : "Ericsson Baseband 6630";
      }
      if (has2G && !has3G && !has4G && !has5G) profile.labels.amm = "MINI-LINK AMM 2P";
    } else if (vendor === "HUAWEI" && (has4G || has5G)) {
      profile.labels = {
        dug: has2G ? "Huawei UMPT + GSM Card" : "Huawei UMPT Control Card",
        baseband: "Huawei UBBP Baseband Card",
        ...(has3G ? { duw: "Huawei UBBP WCDMA Card" } : {}),
        ...(slots.includes("amm") ? { amm: "Huawei RTN 950A Microwave" } : {}),
      };
    } else if (vendor === "NOKIA" && (has4G || has5G)) {
      profile.labels = {
        dug: "Nokia ASIK Control Card",
        baseband: "Nokia ABIL Capacity Card",
        ...(has3G ? { duw: "Nokia ABIL WCDMA Extension" } : {}),
      };
    }
    profile.chassis = `${vendor} Custom (${custom.label}) · ${[
      has2G ? "DUG 20" : "",
      has3G ? "DUW 30" : "",
      has4G ? "Baseband 6630" : "",
      has5G ? "Baseband 6648" : "",
    ]
      .filter(Boolean)
      .join(" + ")}`;
    return profile;
  }
  const legacy = generation === "2G" || generation === "3G";
  profile.rfMode = legacy ? "LEGACY" : "ACTIVE";
  if (generation === "2G") {
    profile.slots = ["fau", "dug", "router", "tdm", "amm"];
    profile.chassis = `${vendor} 2G voice · E1 transmission`;
  } else if (generation === "3G") {
    profile.slots = ["fau", "dug", "duw", "router", "amm"];
    profile.chassis = `${vendor} 3G WCDMA · packet transmission`;
  } else {
    profile.slots = ["fau", "baseband", "router"];
    profile.chassis = `${vendor} ${generation} digital baseband`;
  }
  if (vendor === "ERICSSON" && generation === "2G") {
    profile.labels.amm = "MINI-LINK AMM 2P";
    profile.chassis = "Ericsson DUG 20 · Router 6471 + TDM 1001 · AMM 2P";
  }
  if (vendor === "ERICSSON" && (generation === "4G" || generation === "5G")) {
    profile.labels.router = "Ericsson Router 6471 · 10G SFP+";
    profile.chassis =
      generation === "5G"
        ? "Ericsson Baseband 6630 · Router 6471 10G SFP+"
        : "Ericsson LTE Baseband 6630";
  }
  if (vendor === "HUAWEI" && (generation === "4G" || generation === "5G")) {
    profile.slots = ["fau", "dug", "baseband", "duw", "amm"];
    profile.labels = {
      dug: "Huawei UMPT Control Card",
      baseband: "Huawei UBBP Baseband Card",
      duw: "Huawei UBBP Capacity Card",
      amm: "Huawei RTN 950A Microwave",
    };
    profile.chassis = "Huawei BBU5900 · UMPT + UBBP · RTN 950A";
  }
  if (vendor === "NOKIA" && generation === "5G") {
    profile.slots = ["fau", "dug", "baseband", "duw"];
    profile.labels = {
      dug: "Nokia ASIK Control Card",
      baseband: "Nokia ABIL Capacity Card",
      duw: "Nokia ABIL Capacity Extension",
    };
    profile.chassis = "Nokia AirScale Subrack · ASIK + ABIL";
  }
  return profile;
}

function isRackSlotCurated(key) {
  return (
    !Object.prototype.hasOwnProperty.call(RACK_SLOT_POWER, key) ||
    smartProfile().slots.includes(key)
  );
}

function applySmartProfile() {
  const profile = smartProfile();
  Object.keys(RACK_SLOT_POWER).forEach((key) => {
    st.rack.slots[key] = profile.slots.includes(key);
  });
  if (st.generation === "MIXED") st.rack.radioCount = 6;
  else if (st.generation === "CUSTOM") {
    const gens = normalizeCustomGenerations();
    st.rack.radioCount = (gens.includes("2G") ? 3 : 0) + (gens.includes("3G") ? 3 : 0);
  } else st.rack.radioCount = 0;
  st.cellular.sweeps = [null, null, null];
  st.cellular.aiDiagnostics = [null, null, null];
  cellularSim.running = false;
}

function rackCardLabel(key, fallback) {
  return (smartProfile().labels[key] || fallback).toUpperCase();
}

function rackCardContent(key) {
  const base = RACK_CONTENT[key] || RACK_CONTENT.cabinet;
  const label = smartProfile().labels[key];
  if (!label) return base;
  const control = /UMPT|ASIK/.test(label);
  return {
    ...base,
    title: label,
    what: `The curated ${label} inside the ${smartProfile().chassis}.`,
    does: control
      ? "It controls the baseband shelf, synchronizes the radios and manages software, clocks and site alarms."
      : /RTN/.test(label)
        ? "It provides the vendor-specific microwave transmission interface between the baseband and the outdoor link."
        : "It processes the vendor's digital baseband channels and connects them to the active radio generation.",
  };
}

function cellularGeneration() {
  if (st.generation === "CUSTOM") {
    const custom = customGenerationMetrics();
    return { label: custom.label, throughput: custom.throughput, rfMode: custom.rfMode };
  }
  return SMART_GENERATIONS[st.generation] || SMART_GENERATIONS.MIXED;
}

function aauModel() {
  if (st.rack.vendor === "HUAWEI") return "Huawei AAU5613 Massive MIMO";
  if (st.rack.vendor === "NOKIA") return "Nokia AirScale MAA · 64T64R";
  return "Ericsson AIR 6449 · 64T64R";
}

function rackHousing() {
  const outdoor = st.rack.location === "OUTDOOR";
  if (st.rack.vendor === "HUAWEI")
    return {
      model: outdoor ? "BTS3900A" : "BTS3900",
      vendor: "HUAWEI",
      outdoor,
      ip: outdoor ? "IP55" : "INDOOR",
      width: outdoor ? 0.9 : 0.6,
      height: 1.8,
      depth: outdoor ? 0.7 : 0.45,
      doubleDoor: outdoor,
      description: "Modular telecom cabinet housing BBU subracks and power units.",
    };
  if (st.rack.vendor === "NOKIA")
    return {
      model: outdoor ? "AirScale IP55 Outdoor Rack" : "AirScale Subrack",
      vendor: "NOKIA",
      outdoor,
      ip: outdoor ? "IP55" : "INDOOR",
      width: outdoor ? 0.9 : 0.6,
      height: 1.8,
      depth: outdoor ? 0.7 : 0.45,
      doubleDoor: outdoor,
      description: "3U modular multi-radio AirScale chassis in a 19-inch integration rack.",
    };
  return {
    model: outdoor ? "RBS 6102" : "RBS 6201",
    vendor: "ERICSSON",
    outdoor,
    ip: outdoor ? "IP55" : "INDOOR",
    width: outdoor ? 0.9 : 0.6,
    height: 1.8,
    depth: outdoor ? 0.7 : 0.4,
    doubleDoor: outdoor,
    description: outdoor
      ? "Weatherproof double-door enclosure with internal battery compartment."
      : "1800 × 600 × 400 mm indoor steel rack with four shelves and open mesh front door.",
  };
}

function alarmPathReady() {
  return ["ovp", "sau", "scu", "shu", "dug"].every((key) => st.rack.slots[key]);
}

function calculateRack() {
  const loadKw = Object.entries(RACK_SLOT_POWER).reduce(
    (sum, [key, load]) => sum + (st.rack.slots[key] ? load : 0),
    0
  );
  return {
    loadKw,
    backhaulGbps: st.rack.slots.router
      ? st.generation === "CUSTOM"
        ? Number((customGenerationMetrics().backhaulMbps / 1000).toFixed(2))
        : 30
      : 0,
    e1Lines: st.rack.slots.tdm ? 8 : 0,
    voiceCalls: st.rack.slots.dug ? 96 : 0,
    opticalPorts: st.rack.slots.baseband ? 15 : 0,
    wcdmaMbps: st.rack.slots.duw ? 48 : 0,
    radioCount: st.rack.radioCount,
    housing: rackHousing(),
    patchReady: st.rack.slots.router && st.rack.slots.tdm,
    patchUp:
      rackSim.patchLink && rackSim.patchProgress >= 1 && st.rack.slots.router && st.rack.slots.tdm,
    alarmPathReady: alarmPathReady(),
  };
}

function normalizeRackState() {
  if (!["ERICSSON", "HUAWEI", "NOKIA"].includes(st.rack.vendor)) st.rack.vendor = "ERICSSON";
  st.rack.location = st.rack.location === "OUTDOOR" ? "OUTDOOR" : "INDOOR";
  if (st.env === "URBAN_ROOFTOP") st.rack.location = "OUTDOOR";
  st.rack.radioCount = clamp(Math.round(Number(st.rack.radioCount) || 0), 0, 12);
  Object.keys(RACK_SLOT_POWER).forEach((key) => {
    st.rack.slots[key] = !!st.rack.slots[key];
  });
  if (!st.rack.slots.router || !st.rack.slots.tdm) {
    rackSim.patchLink = false;
    rackSim.patchProgress = 0;
  }
  if (!alarmPathReady()) {
    rackSim.alarmTraceActive = false;
    rackSim.alarmBadge = false;
  }
}

const MICROWAVE_TOPOLOGIES = {
  STANDALONE: {
    label: "1+0 Standalone",
    detail: "1 dish · 1 ODU · tail site",
    dishes: 1,
    odus: 1,
    modems: 1,
    multiplier: 1,
    loss: 0,
    splitters: 0,
    xpic: false,
  },
  HSB: {
    label: "1+1 Hot Standby",
    detail: "1 dish · asymmetric −1.5 / −7 dB",
    dishes: 1,
    odus: 2,
    modems: 2,
    multiplier: 1,
    loss: 1.5,
    splitters: 1,
    xpic: false,
  },
  SD: {
    label: "1+1 Space Diversity",
    detail: "2 dishes · 3–6 m · 0 dB loss",
    dishes: 2,
    odus: 2,
    modems: 2,
    multiplier: 1,
    loss: 0,
    splitters: 0,
    xpic: false,
  },
  XPIC2: {
    label: "2+0 XPIC Dual-Polar",
    detail: "1 dual-pol dish · 2 modems · 2×",
    dishes: 1,
    odus: 2,
    modems: 2,
    multiplier: 2,
    loss: 0,
    splitters: 0,
    xpic: true,
  },
  XPIC4: {
    label: "4+0 XPIC Splitter",
    detail: "1 dual-pol dish · 4 modems · 4× · −3 dB",
    dishes: 1,
    odus: 4,
    modems: 4,
    multiplier: 4,
    loss: 3,
    splitters: 2,
    xpic: true,
  },
};

function dishGainDbi(diameter, frequencyGHz) {
  const c = 299792458;
  return 10 * Math.log10(0.6 * Math.pow((Math.PI * diameter * frequencyGHz * 1e9) / c, 2));
}

function azimuthError(a, b) {
  return Math.abs(((a - b + 540) % 360) - 180);
}

function spaceDiversityAllowed() {
  return st.H >= st.microwave.spacing + 1.5;
}

function formatCapacity(mbps) {
  return mbps >= 1000 ? `${(mbps / 1000).toFixed(1)} Gbps` : `${mbps.toFixed(0)} Mbps`;
}

function calculateMicrowave() {
  const m = st.microwave;
  const topology = MICROWAVE_TOPOLOGIES[m.topology];
  const gain = dishGainDbi(m.diameter, m.frequency);
  const referenceGain = dishGainDbi(0.6, 15);
  const mountType = m.diameter >= 2.4 ? "SEPARATE" : "INTEGRATED";
  const mountLoss = mountType === "SEPARATE" ? 3 : 0;
  const loss = mountLoss + topology.loss;
  const error = azimuthError(m.azimuth, m.targetAzimuth);
  let voltage, alignmentRsl;
  if (error <= 2) {
    voltage = 2.4 - (error / 2) * 0.6;
    alignmentRsl = -48 - (error / 2) * 10;
  } else if (error <= 10) {
    voltage = 1.8 - ((error - 2) / 8) * 1.2;
    alignmentRsl = -58 - ((error - 2) / 8) * 20;
  } else {
    voltage = 0.5;
    alignmentRsl = -88;
  }
  const xpicActive = topology.xpic || m.xpicBoost;
  const baseBackhaulMbps =
    st.generation === "CUSTOM" ? customGenerationMetrics().backhaulMbps : 1000;
  const capacityMbps =
    baseBackhaulMbps * (topology.xpic ? topology.multiplier : m.xpicBoost ? 2 : 1);
  const oduCount = m.xpicBoost ? Math.max(2, topology.odus) : topology.odus;
  const modemCount = m.xpicBoost && !topology.xpic ? 4 : topology.modems;
  const rsl = alignmentRsl + gain - referenceGain - loss;
  return {
    topology,
    gain,
    referenceGain,
    mountType,
    mountLoss,
    topologyLoss: topology.loss,
    totalLoss: loss,
    alignmentError: error,
    voltage,
    alignmentRsl,
    rsl,
    fadeMargin: rsl + 85,
    locked: error <= 0.05,
    approaching: error <= 2,
    beamStrength: clamp((voltage - 0.5) / 1.9, 0.03, 1),
    xpicActive,
    capacityMbps,
    oduCount,
    modemCount,
    powerKw: oduCount * 0.045,
    dishCount: topology.dishes,
    splitterCount: topology.splitters,
  };
}

function normalizeMicrowaveState() {
  const m = st.microwave;
  if (!MICROWAVE_TOPOLOGIES[m.topology]) m.topology = "STANDALONE";
  m.system = m.system === "CELLULAR" ? "CELLULAR" : "MICROWAVE";
  m.diameter = [0.3, 0.6, 1.2, 1.8, 2.4].includes(Number(m.diameter)) ? Number(m.diameter) : 0.6;
  m.frequency = [7, 15, 23, 38].includes(Number(m.frequency)) ? Number(m.frequency) : 15;
  m.azimuth = ((Number(m.azimuth) % 360) + 360) % 360;
  m.targetAzimuth = ((Number(m.targetAzimuth) % 360) + 360) % 360;
  m.spacing = clamp(Number(m.spacing), 3, 6);
  m.xpicBoost = !!m.xpicBoost;
  if (m.topology === "SD" && !spaceDiversityAllowed()) m.topology = "STANDALONE";
}

function normalizeCellularState() {
  if (!SMART_GENERATIONS[st.generation]) st.generation = "MIXED";
  st.customGenerations = normalizeCustomGenerations(st.customGenerations);
  SMART_GENERATIONS.CUSTOM.throughput = customGenerationMetrics(st.customGenerations).throughput;
  st.cellular.sector = clamp(Math.round(Number(st.cellular.sector) || 0), 0, 2);
  st.cellular.fault = !!st.cellular.fault;
  st.cellular.sectors.forEach((sector, index) => {
    sector.azimuth = clamp(Number(sector.azimuth) || 0, 0, 360);
    sector.downtilt = clamp(Number(sector.downtilt) || 0, 0, 10);
    sector.txPower = clamp(Number(sector.txPower) || 46, 43, 49);
    sector.bandwidth = [20, 40, 100].includes(Number(sector.bandwidth))
      ? Number(sector.bandwidth)
      : 100;
    sector.onAir = sector.onAir !== false;
    if (!st.cellular.sweeps[index]) st.cellular.sweeps[index] = null;
  });
  st.cellular.sweeps.length = 3;
  if (!Array.isArray(st.cellular.aiDiagnostics)) st.cellular.aiDiagnostics = [null, null, null];
  st.cellular.aiDiagnostics.length = 3;
  for (let index = 0; index < 3; index++)
    if (!st.cellular.aiDiagnostics[index]) st.cellular.aiDiagnostics[index] = null;
}

function normalizePowerState() {
  const p = st.power;
  p.radioLoadKw = clamp(Number(p.radioLoadKw), 0.5, 12);
  p.rectifiers = clamp(Math.round(p.rectifiers), 1, 8);
  if (p.autoRectifiers)
    p.rectifiers = Math.min(
      8,
      Math.max(
        1,
        Math.ceil((p.radioLoadKw + calculateRack().loadKw + calculateMicrowave().powerKw) / 3)
      ) + 1
    );
  p.batteryStrings = [1, 2, 4].includes(Number(p.batteryStrings)) ? Number(p.batteryStrings) : 4;
  p.batteryAh = [100, 150, 200].includes(Number(p.batteryAh)) ? Number(p.batteryAh) : 200;
  p.batteryType = p.batteryType === "LITHIUM" ? "LITHIUM" : "VRLA";
  p.climateSetpoint = clamp(Number(p.climateSetpoint), 18, 30);
}

function normalizeState() {
  const env = ENVIRONMENTS[st.env];
  if (!env.allowed.includes(st.tower)) st.tower = env.defaultTower;
  const [min, max] = TOWERS[st.tower].range;
  st.H = clamp(Math.round(st.H), min, max);
  if (env.mandatoryESE) st.lightning = "ESE_ACTIVE";
  if (env.mandatoryGrounding) st.grounding = true;
  normalizeRackState();
  normalizeMicrowaveState();
  normalizeCellularState();
  normalizePowerState();
}

function earthPitCount() {
  if (!st.grounding || st.env === "URBAN_ROOFTOP") return 0;
  return st.env === "EMERGENCY_DISASTER" ? 2 : 4;
}

function calculateEngineering() {
  const env = ENVIRONMENTS[st.env];
  const tower = TOWERS[st.tower];
  const h = st.H;
  const deadWeight = Math.round(tower.fixedWeight + tower.kgPerM * h);
  const bareArea = tower.areaPerM * h;
  const iceFactor = st.env === "MOUNTAIN_PEAK" ? 1.22 : st.env === "RURAL_GREENFIELD" ? 1.05 : 1;
  const windArea = bareArea * iceFactor;
  const q120 = (0.613 * Math.pow(120 / 3.6, 2)) / 1000;
  const sitePressure = (0.613 * Math.pow(env.wind / 3.6, 2)) / 1000;
  const twist = tower.twistAtMax * Math.pow(h / tower.range[1], 1.75);
  const overturning = sitePressure * windArea * tower.cd * h * 0.55;
  const resistance = st.grounding ? env.earthBase : Infinity;
  return {
    deadWeight,
    deadLoad: deadWeight * 0.00980665,
    windArea: round(windArea),
    q120: round(q120, 3),
    sitePressure: round(sitePressure, 3),
    twist: round(twist, 2),
    twistPass: twist <= 0.5,
    overturning: Math.round(overturning),
    earthPits: earthPitCount(),
    resistance: round(resistance),
    resistancePass: resistance < 5,
    soilBearing: env.bearing,
    foundation: env.foundation,
  };
}

function generatorStates(now = performance.now()) {
  if (st.power.sourceMode === "DUAL_GENERATOR_OFFGRID") {
    return powerSim.activeSource === "GEN2"
      ? { GEN1: "STANDBY", GEN2: "RUNNING" }
      : { GEN1: "RUNNING", GEN2: "STANDBY" };
  }
  if (powerSim.phase === "BATTERY_BRIDGE") {
    const elapsed = (now - powerSim.eventStart) / 1000;
    return { GEN1: elapsed < 3 ? "CRANKING" : "STABILIZING", GEN2: "STOPPED" };
  }
  if (powerSim.phase === "GENERATOR") return { GEN1: "RUNNING", GEN2: "STOPPED" };
  return { GEN1: now < powerSim.generatorCooldownUntil ? "COOLDOWN" : "STOPPED", GEN2: "STOPPED" };
}

function generatorIsOperating(state) {
  return ["CRANKING", "STABILIZING", "RUNNING", "COOLDOWN"].includes(state);
}

function acSourceAvailable() {
  return ["GRID", "GEN1", "GEN2"].includes(powerSim.activeSource);
}

function climateStatus() {
  const highTemp = powerSim.temperature > 35;
  const elapsedHours = Math.max(0, (performance.now() - powerSim.climateEpoch) / 3600000);
  const dutyUnit = (Math.floor(elapsedHours / 4) % 2) + 1;
  const available = acSourceAvailable() && st.power.branches.climate;
  return {
    highTemp,
    dutyUnit,
    active: available ? (highTemp ? [1, 2] : [dutyUnit]) : [],
    cycleRemaining: 4 - (elapsedHours % 4),
    available,
  };
}

function sourceLabel(source = powerSim.activeSource) {
  return (
    { GRID: "CITY GRID", GEN1: "GENERATOR 1", GEN2: "GENERATOR 2", BATTERY: "BATTERY BRIDGE" }[
      source
    ] || source
  );
}

function calculatePower() {
  const p = st.power;
  const rack = calculateRack();
  const microwave = calculateMicrowave();
  const dcLoad = p.radioLoadKw + rack.loadKw + microwave.powerKw;
  const required = Math.max(1, Math.ceil(dcLoad / 3));
  const installed = p.autoRectifiers ? Math.min(8, required + 1) : p.rectifiers;
  const failed = powerSim.failedRectifier !== null && powerSim.failedRectifier < installed ? 1 : 0;
  const available = Math.max(0, installed - failed);
  const acAvailable = acSourceAvailable();
  const rectifierOnline = acAvailable && p.branches.rectifier && available >= required;
  const batteryDischarging = !rectifierOnline;
  const climate = climateStatus();
  const rectifierInput = rectifierOnline ? dcLoad / 0.94 : 0;
  const climateInput = climate.active.length * (climate.highTemp ? 2.8 : 2.2);
  const auxiliaryInput = acAvailable && p.branches.auxiliary ? 0.25 : 0;
  const acLoad = rectifierInput + climateInput + auxiliaryInput;
  const totalLoad = acLoad + (batteryDischarging ? dcLoad : 0);
  const nominalEnergy = (p.batteryStrings * p.batteryAh * 48) / 1000;
  const usableFraction = p.batteryType === "LITHIUM" ? 0.9 : 0.8;
  const usableEnergy = nominalEnergy * usableFraction;
  const remainingEnergy = (usableEnergy * powerSim.batterySoc) / 100;
  const autonomy = remainingEnergy / Math.max(dcLoad, 0.1);
  const batteryCurrent = batteryDischarging
    ? (dcLoad * 1000) / 48
    : powerSim.batterySoc < 99.95 && rectifierOnline
      ? -8
      : 0;
  const states = generatorStates();
  const generatorActive = Object.values(states).some(generatorIsOperating);
  const estimatedFuelRate = 0.8 + 0.32 * Math.max(acLoad, 1);
  const fuelRate = generatorActive ? estimatedFuelRate : 0;
  const n1Pass = installed >= required + 1 && p.branches.rectifier;
  return {
    dcLoad,
    rackLoad: rack.loadKw,
    microwaveLoad: microwave.powerKw,
    required,
    installed,
    available,
    failed,
    rectifierOnline,
    batteryDischarging,
    climate,
    acLoad,
    totalLoad,
    nominalEnergy,
    usableEnergy,
    remainingEnergy,
    autonomy,
    batteryCurrent,
    generatorActive,
    fuelRate,
    estimatedFuelRate,
    n1Pass,
    failoverPass: available >= required,
    redundancyRemaining: available - required,
    moduleLoad: available ? dcLoad / available : 0,
    moduleCurrent: available ? (dcLoad * 1000) / 54 / available : 0,
    dcBusVoltage: rectifierOnline ? -54 : -48,
    fuelRuntime:
      fuelRate > 0
        ? powerSim.fuelRemainingL / fuelRate
        : powerSim.fuelRemainingL / estimatedFuelRate,
    transferRemaining:
      powerSim.phase === "BATTERY_BRIDGE"
        ? Math.max(0, 15 - (performance.now() - powerSim.eventStart) / 1000)
        : 0,
    states,
  };
}

function powerAlarms() {
  const calc = calculatePower();
  const alarms = [];
  if (
    st.power.sourceMode === "GRID_WITH_STANDBY" &&
    powerSim.gridVoltage < 50 &&
    !["GEN1", "GEN2"].includes(powerSim.activeSource)
  )
    alarms.push({ code: "MAINS", label: "Loss of Mains", severity: "MAJOR" });
  if (powerSim.temperature > 35)
    alarms.push({ code: "ALARM_6", label: "High shelter temperature", severity: "MAJOR" });
  if (powerSim.fuelRemainingL <= 200)
    alarms.push({ code: "ALARM_7", label: "Low bulk fuel", severity: "MINOR" });
  if (calc.failed)
    alarms.push({
      code: "RECTIFIER",
      label: "Rectifier module failed",
      severity: calc.failoverPass ? "MINOR" : "MAJOR",
    });
  if (!calc.n1Pass)
    alarms.push({ code: "N+1", label: "Rectifier redundancy lost", severity: "MINOR" });
  if (!st.power.branches.rectifier)
    alarms.push({ code: "DC_AC", label: "Rectifier AC branch open", severity: "MAJOR" });
  return alarms;
}

const alarmFirstSeen = new Map();
function siteAlarms() {
  const alarms = powerAlarms().map((alarm) => ({ ...alarm, source: "POWER" }));
  const power = calculatePower();
  if (power.batteryDischarging)
    alarms.push({
      code: "BATTERY",
      label: "Battery Discharging",
      severity: "MAJOR",
      source: "DC BUS",
    });
  if (rackSim.doorTarget > 0.5 || rackSim.door > 0.15)
    alarms.push({ code: "DOOR", label: "Door Open", severity: "MINOR", source: "CABINET" });
  if (st.cellular.fault) {
    for (let sector = 0; sector < 3; sector++)
      alarms.push({
        code: `VSWR_S${sector + 1}`,
        label: `VSWR High · Sector ${sector + 1}`,
        severity: "CRITICAL",
        source: "RF",
        sector,
      });
  }
  const activeKeys = new Set();
  const result = alarms.map((alarm) => {
    const key = `${alarm.source}:${alarm.code}`;
    activeKeys.add(key);
    if (!alarmFirstSeen.has(key)) alarmFirstSeen.set(key, Date.now());
    const timestamp = new Date(alarmFirstSeen.get(key)).toLocaleTimeString("en-GB", {
      hour12: false,
    });
    return { ...alarm, key, timestamp, acknowledged: false };
  });
  alarmFirstSeen.forEach((_, key) => {
    if (!activeKeys.has(key)) alarmFirstSeen.delete(key);
  });
  return result;
}

function calculateAcceptance() {
  const civil = calculateEngineering();
  const power = calculatePower();
  const microwave = calculateMicrowave();
  const sweeps = [0, 1, 2].map((index) => calculateSweep(index));
  const worstVswr = Math.max(...sweeps.map((result) => result.max));
  const rfPass = sweeps.every((result) => result.max <= 1.32);
  const activeAlarms = siteAlarms();
  const criticalAlarms = activeAlarms.filter(
    (alarm) => alarm.severity === "CRITICAL" || alarm.severity === "MAJOR"
  );
  const earthPitsVerified = st.env === "URBAN_ROOFTOP" || civil.earthPits >= 2;
  const checks = [
    {
      id: "civil",
      title: "Civil & Foundation",
      value: `${civil.twist.toFixed(2)}° deflection · limit ≤ 0.50°`,
      pass: civil.twistPass && civil.twist <= 0.5,
      explanation:
        civil.twistPass && civil.twist <= 0.5
          ? `${TOWERS[st.tower].short} passes the wind-deflection criterion.`
          : `Reduce height or select a stiffer structure; calculated deflection is ${civil.twist.toFixed(2)}°.`,
    },
    {
      id: "earthing",
      title: "Earthing & Lightning",
      value: `${Number.isFinite(civil.resistance) ? civil.resistance.toFixed(1) + " Ω" : "OPEN"} · target < 5.0 Ω`,
      pass: st.grounding && civil.resistancePass && earthPitsVerified,
      explanation:
        st.grounding && civil.resistancePass && earthPitsVerified
          ? `${st.env === "URBAN_ROOFTOP" ? "Building earth test links" : civil.earthPits + " Cadweld inspection pits"} verified; lightning down conductor bonded.`
          : "Restore the 70 mm² bond and verify the earth loop below 5.0 Ω with accessible inspection pits.",
    },
    {
      id: "power",
      title: "Power & Life Support",
      value: `-48V DC · ${power.installed} installed / ${power.required + 1} required`,
      pass: power.n1Pass && power.failoverPass && st.power.branches.rectifier,
      explanation:
        power.n1Pass && power.failoverPass && st.power.branches.rectifier
          ? `N+1 rectifier redundancy available; ${power.autonomy.toFixed(1)} h battery autonomy.`
          : "Restore the rectifier AC branch and install enough healthy 3 kW modules for N+1 redundancy.",
    },
    {
      id: "backhaul",
      title: "Backhaul Link",
      value: `${microwave.rsl.toFixed(1)} dBm RSL · ${microwave.fadeMargin.toFixed(1)} dB fade`,
      pass: microwave.locked && microwave.rsl >= -55 && microwave.fadeMargin >= 30,
      explanation:
        microwave.locked && microwave.rsl >= -55 && microwave.fadeMargin >= 30
          ? `${microwave.topology.label} aligned and locked; RSL ≥ −55 dBm and fade margin ≥ 30 dB.`
          : "Use Auto-Peak and correct gain/topology losses: lock requires RSL ≥ −55 dBm and fade margin ≥ 30 dB.",
    },
    {
      id: "rf",
      title: "RF Line Sweeps",
      value: `3 sectors · worst VSWR ${worstVswr.toFixed(2)} · limit ≤ 1.32`,
      pass: rfPass,
      explanation: rfPass
        ? "All three feeder/antenna lines satisfy the ≤ 1.32 acceptance standard."
        : "High reflection detected. Clear the waterlogged-connector/cable-kink scenario and repeat the sector sweeps.",
    },
    {
      id: "alarms",
      title: "Alarm Telemetry",
      value: `${criticalAlarms.length} unacknowledged critical/major · ${activeAlarms.length} total`,
      pass: criticalAlarms.length === 0,
      explanation:
        criticalAlarms.length === 0
          ? "No unacknowledged critical alarms; the NOC alarm highway is available."
          : `Resolve: ${criticalAlarms.map((alarm) => alarm.label).join(", ")}.`,
    },
  ];
  return { pass: checks.every((check) => check.pass), checks, criticalAlarms, sweeps, worstVswr };
}

function transmissionSceneMode() {
  return st.masterStep === 5 || launch.onAir || aiBuild.running ? "BOTH" : st.microwave.system;
}

function cellularThroughputGbps() {
  if (st.generation === "CUSTOM") {
    const gbps = customGenerationMetrics().cellularMbps / 1000;
    return gbps >= 0.1 ? gbps.toFixed(2) : gbps.toFixed(4);
  }
  return (
    { "2G": "0.0002", "3G": "0.042", "4G": "0.300", "5G": "3.0", MIXED: "3.0" }[st.generation] ||
    "3.0"
  );
}

function towerDisallowedReason(envKey, towerKey) {
  const rooftopTower = towerKey === "ROOFTOP_RTT_DRAME" || towerKey === "ROOFTOP_POLE";
  if (envKey === "MOUNTAIN_PEAK") {
    if (towerKey === "MONOPOLE_LIGHT_DUTY")
      return "Excluded by 160 km/h wind and severe ice loading.";
    if (towerKey === "GUYED_MAST") return "Guy anchor footprint is unreliable on this rock peak.";
    if (rooftopTower) return "Requires a structural roof frame or parapet.";
    if (towerKey === "COW_TELESCOPIC_TRUCK")
      return "Mobile masts are not rated for this exposed peak.";
  }
  if (envKey === "URBAN_ROOFTOP") {
    if (towerKey === "GUYED_MAST") return "Guy anchors need land outside the building footprint.";
    if (towerKey === "COW_TELESCOPIC_TRUCK")
      return "No vehicle access or safe outrigger load path.";
    return "Cannot place a greenfield tower on this rooftop.";
  }
  if (envKey === "RURAL_GREENFIELD") {
    if (rooftopTower) return "No building columns or parapet exist for this support.";
    if (towerKey === "COW_TELESCOPIC_TRUCK")
      return "COW is reserved for emergency deployment mode.";
  }
  if (envKey === "EMERGENCY_DISASTER")
    return "Permanent civil works conflict with rapid COW deployment.";
  return "Not permitted for the selected environment.";
}

// -------------------------------------------------------------------------
// Renderer, scene and shared CAD materials
// -------------------------------------------------------------------------
const canvas = $("#scene");
const scene = new T.Scene();
const renderer = new T.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.outputEncoding = T.sRGBEncoding;

scene.add(new T.HemisphereLight(0xffffff, 0xd6cdbd, 0.9));
const sun = new T.DirectionalLight(0xfff7e8, 0.82);
sun.position.set(38, 72, 32);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -75,
  right: 75,
  top: 100,
  bottom: -45,
  near: 1,
  far: 240,
});
sun.shadow.bias = -0.00035;
scene.add(sun);

const material = (color, extra = {}) => new T.MeshLambertMaterial({ color, ...extra });
const MAT = {
  ink: material(0x1e293b),
  steel: material(0x475569),
  galvanized: material(0x94a3b8),
  lightSteel: material(0xcbd5e1),
  concrete: material(0xd6d3d1),
  concreteLight: material(0xe7e5e4),
  ballast: material(0xa8a29e),
  rubber: material(0x292524),
  gravel: material(0xd8d2c4),
  soil: material(0xe5d6b8),
  mountain: material(0xb9b5ad),
  rockA: material(0x8d8b86),
  rockB: material(0xaaa69e),
  dirt: material(0xd6be96),
  copper: material(0xb87333),
  brass: material(0xc69c3c),
  green: material(0x10b981),
  blue: material(0x2563eb),
  amber: material(0xfacc15),
  orange: material(0xf97316),
  red: material(0xdc2626),
  white: material(0xf8fafc),
  dark: material(0x0f172a),
  glass: material(0x93c5fd, { transparent: true, opacity: 0.55 }),
  tire: material(0x1c1917),
  building: material(0xe2e8f0),
};
const EDGE = new T.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.78 });
const FENCE_LINE = new T.LineBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.72 });
const COPPER_LINE = new T.LineBasicMaterial({ color: 0xb87333 });
const PROTECTION_ESE = new T.MeshBasicMaterial({
  color: 0xfacc15,
  transparent: true,
  opacity: 0.035,
  side: T.DoubleSide,
  depthWrite: false,
});
const PROTECTION_FRANKLIN = new T.MeshBasicMaterial({
  color: 0x2563eb,
  transparent: true,
  opacity: 0.055,
  side: T.DoubleSide,
  depthWrite: false,
});
const LED = {
  green: new T.MeshBasicMaterial({ color: 0x10b981 }),
  red: new T.MeshBasicMaterial({ color: 0xdc2626 }),
  amber: new T.MeshBasicMaterial({ color: 0xfacc15 }),
  blue: new T.MeshBasicMaterial({ color: 0x2563eb }),
  off: new T.MeshBasicMaterial({ color: 0x334155 }),
};
const SMOKE = new T.MeshBasicMaterial({
  color: 0x94a3b8,
  transparent: true,
  opacity: 0.24,
  depthWrite: false,
});
const RACK_CYAN = new T.MeshBasicMaterial({
  color: 0x22d3ee,
  transparent: true,
  opacity: 0.95,
  depthWrite: false,
});
const RACK_GLOW = new T.MeshBasicMaterial({
  color: 0x67e8f9,
  transparent: true,
  opacity: 0.18,
  depthWrite: false,
});
const RACK_PATH = new T.MeshBasicMaterial({
  color: 0x06b6d4,
  transparent: true,
  opacity: 0.34,
  depthWrite: false,
});
const RACK_YELLOW = new T.MeshLambertMaterial({ color: 0xfde047 });
const RACK_DOOR_PICK = new T.MeshBasicMaterial({
  color: 0x93c5fd,
  transparent: true,
  opacity: 0.055,
  side: T.DoubleSide,
  depthWrite: false,
});
const RACK_EMPTY = new T.MeshLambertMaterial({ color: 0xcbd5e1, transparent: true, opacity: 0.22 });
const MW_BEAM = new T.MeshBasicMaterial({
  color: 0xfbbf24,
  transparent: true,
  opacity: 0.12,
  depthWrite: false,
});
const MW_BEAM_GLOW = new T.MeshBasicMaterial({
  color: 0xfde68a,
  transparent: true,
  opacity: 0.04,
  depthWrite: false,
});
const MW_REFLECTOR = new T.MeshLambertMaterial({ color: 0xf8fafc, side: T.DoubleSide });

function mesh(geometry, mat, parent, outlined = false) {
  const object = new T.Mesh(geometry, mat);
  object.castShadow = true;
  object.receiveShadow = true;
  if (outlined) {
    const edges = new T.LineSegments(new T.EdgesGeometry(geometry, 28), EDGE);
    edges.renderOrder = 2;
    edges.raycast = () => {};
    object.add(edges);
  }
  parent.add(object);
  return object;
}

function box(w, h, d, mat, x, y, z, parent, outlined = true) {
  const object = mesh(new T.BoxGeometry(w, h, d), mat, parent, outlined);
  object.position.set(x, y, z);
  return object;
}

function cylinder(
  rt,
  rb,
  height,
  mat,
  x,
  y,
  z,
  parent,
  segments = 14,
  open = false,
  outlined = false
) {
  const object = mesh(
    new T.CylinderGeometry(rt, rb, height, segments, 1, open),
    mat,
    parent,
    outlined
  );
  object.position.set(x, y, z);
  return object;
}

const UP = V3(0, 1, 0);
const FORWARD = V3(0, 0, 1);
function rodBetween(a, b, radius, mat, parent, segments = 8, open = false) {
  const direction = b.clone().sub(a);
  const object = mesh(
    new T.CylinderGeometry(radius, radius, direction.length(), segments, 1, open),
    mat,
    parent
  );
  object.position.copy(a).addScaledVector(direction, 0.5);
  object.quaternion.setFromUnitVectors(UP, direction.normalize());
  return object;
}

function rectangularBeamBetween(a, b, width, depth, mat, parent, outlined = false) {
  const direction = b.clone().sub(a);
  const object = mesh(new T.BoxGeometry(width, direction.length(), depth), mat, parent, outlined);
  object.position.copy(a).addScaledVector(direction, 0.5);
  object.quaternion.setFromUnitVectors(UP, direction.normalize());
  return object;
}

function angleBetween(a, b, size, thickness, mat, parent) {
  const s = size,
    t = thickness;
  const shape = new T.Shape();
  shape.moveTo(-s / 2, -s / 2);
  shape.lineTo(s / 2, -s / 2);
  shape.lineTo(s / 2, -s / 2 + t);
  shape.lineTo(-s / 2 + t, -s / 2 + t);
  shape.lineTo(-s / 2 + t, s / 2);
  shape.lineTo(-s / 2, s / 2);
  shape.closePath();
  const length = a.distanceTo(b);
  const geometry = new T.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  const object = mesh(geometry, mat, parent, true);
  object.position.copy(a);
  object.quaternion.setFromUnitVectors(FORWARD, b.clone().sub(a).normalize());
  return object;
}

function cable(points, radius, mat, parent, segments = 32) {
  const curve = new T.CatmullRomCurve3(points);
  return mesh(new T.TubeGeometry(curve, segments, radius, 6, false), mat, parent);
}

class BeamBatch {
  constructor(parent, mat, roundSection = true, segments = 7) {
    this.parent = parent;
    this.mat = mat;
    this.roundSection = roundSection;
    this.segments = segments;
    this.items = [];
  }
  add(a, b, width, depth = width) {
    this.items.push({ a: a.clone(), b: b.clone(), width, depth });
  }
  build() {
    if (!this.items.length) return null;
    const geometry = this.roundSection
      ? new T.CylinderGeometry(1, 1, 1, this.segments)
      : new T.BoxGeometry(1, 1, 1);
    const batch = new T.InstancedMesh(geometry, this.mat, this.items.length);
    const dummy = new T.Object3D();
    this.items.forEach((item, index) => {
      const direction = item.b.clone().sub(item.a);
      dummy.position.copy(item.a).addScaledVector(direction, 0.5);
      dummy.quaternion.setFromUnitVectors(UP, direction.clone().normalize());
      dummy.scale.set(item.width, direction.length(), item.depth);
      dummy.updateMatrix();
      batch.setMatrixAt(index, dummy.matrix);
    });
    batch.instanceMatrix.needsUpdate = true;
    batch.castShadow = true;
    batch.receiveShadow = true;
    this.parent.add(batch);
    return batch;
  }
}

function iBeamBetween(a, b, width, height, mat, parent) {
  const group = new T.Group();
  const direction = b.clone().sub(a);
  const length = direction.length();
  group.position.copy(a).addScaledVector(direction, 0.5);
  group.quaternion.setFromUnitVectors(FORWARD, direction.normalize());
  parent.add(group);
  box(width, 0.075, length, mat, 0, height / 2, 0, group);
  box(width, 0.075, length, mat, 0, -height / 2, 0, group);
  box(0.075, height, length, mat, 0, 0, 0, group);
  return group;
}

// -------------------------------------------------------------------------
// Component registry and procedural civil elements
// -------------------------------------------------------------------------
let siteRoot = null;
let structureTop = { x: 0, y: 45, z: 0 };
const registry = new Map();
const pitVisuals = new Map();
let selectionBox = null;
let selectionCenter = null;

function register(object, data) {
  object.userData.pick = data;
  registry.set(data.id, { object, data });
  return object;
}

function pitPositions() {
  if (st.env === "EMERGENCY_DISASTER")
    return [
      [-8, -6],
      [8, -6],
    ];
  return [
    [-10, -8],
    [10, -8],
    [10, 8],
    [-10, 8],
  ];
}

function groundWithHoles(width, depth, thickness, y, mat, parent, holes = []) {
  const shape = new T.Shape();
  shape.moveTo(-width / 2, -depth / 2);
  shape.lineTo(width / 2, -depth / 2);
  shape.lineTo(width / 2, depth / 2);
  shape.lineTo(-width / 2, depth / 2);
  shape.closePath();
  holes.forEach(([x, z]) => {
    const hole = new T.Path();
    hole.absarc(x, z, 0.53, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  });
  const geometry = new T.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    curveSegments: 20,
  });
  geometry.rotateX(Math.PI / 2);
  const ground = mesh(geometry, mat, parent, true);
  ground.position.y = y;
  ground.castShadow = false;
  return ground;
}

function buildTerrain() {
  const group = new T.Group();
  siteRoot.add(group);
  const holes = st.grounding && st.env !== "URBAN_ROOFTOP" ? pitPositions() : [];

  if (st.env === "URBAN_ROOFTOP") {
    box(65, 0.35, 65, MAT.concreteLight, 0, -8.35, 0, group, false);
    box(22, 8, 18, MAT.building, 0, -4.15, 0, group);
    box(22.5, 0.35, 18.5, MAT.concrete, 0, -0.18, 0, group);
    // Visible column strips align with the roof grillage load path.
    [-5, 5].forEach((x) => {
      box(0.65, 8, 0.25, MAT.concrete, x, -4, 9.08, group);
      box(0.65, 8, 0.25, MAT.concrete, x, -4, -9.08, group);
      [-5, 5].forEach((z) => box(0.7, 8, 0.7, MAT.concrete, x, -4, z, group));
    });
    for (let floor = -6; floor < 0; floor += 2.1) {
      for (let x = -8.5; x <= 8.5; x += 2.2) {
        box(1.45, 1.25, 0.05, MAT.glass, x, floor, 9.04, group, false);
      }
    }
    // Parapet walls; no roof membrane penetration is modeled.
    box(22.4, 1.0, 0.25, MAT.concreteLight, 0, 0.5, -9.1, group);
    box(22.4, 1.0, 0.25, MAT.concreteLight, 0, 0.5, 9.1, group);
    box(0.25, 1.0, 18.2, MAT.concreteLight, -11.1, 0.5, 0, group);
    box(0.25, 1.0, 18.2, MAT.concreteLight, 11.1, 0.5, 0, group);
    register(group, {
      id: "terrain",
      kind: "building",
      title: "Concrete rooftop & structural frame",
    });
    return;
  }

  const guyed = st.tower === "GUYED_MAST";
  const outerSize = guyed ? Math.max(65, st.H * 1.35) : 54;
  const outerMat =
    st.env === "MOUNTAIN_PEAK"
      ? MAT.mountain
      : st.env === "EMERGENCY_DISASTER"
        ? MAT.dirt
        : MAT.soil;
  groundWithHoles(outerSize, outerSize, 0.28, -0.04, outerMat, group, holes);
  const compoundW = st.env === "EMERGENCY_DISASTER" ? 24 : 28;
  const compoundD = st.env === "EMERGENCY_DISASTER" ? 20 : 24;
  groundWithHoles(compoundW, compoundD, 0.16, 0.02, MAT.gravel, group, holes);

  if (st.env === "MOUNTAIN_PEAK") {
    for (let i = 0; i < 22; i++) {
      const angle = i * 2.399;
      const radius = 17 + (i % 5) * 1.8;
      const scale = 0.8 + ((i * 17) % 7) * 0.22;
      const rock = mesh(
        new T.DodecahedronGeometry(scale, 0),
        i % 2 ? MAT.rockA : MAT.rockB,
        group,
        true
      );
      rock.position.set(Math.cos(angle) * radius, scale * 0.25 - 0.05, Math.sin(angle) * radius);
      rock.rotation.set(i * 0.31, i * 0.73, i * 0.12);
      rock.scale.y = 0.65;
    }
  }
  if (st.env === "EMERGENCY_DISASTER") {
    [-1.25, 1.25].forEach((z) => {
      box(30, 0.025, 0.32, MAT.dirt, 0, 0.04, z + 14, group, false);
      box(30, 0.025, 0.32, MAT.dirt, 0, 0.04, z + 15, group, false);
    });
    [
      [-8, 7],
      [8, 7],
      [-8, -7],
      [8, -7],
    ].forEach(([x, z]) => {
      const cone = mesh(new T.ConeGeometry(0.22, 0.65, 12), MAT.orange, group, true);
      cone.position.set(x, 0.34, z);
      box(0.55, 0.06, 0.55, MAT.rubber, x, 0.04, z, group);
    });
  }
  register(group, { id: "terrain", kind: "terrain", title: ENVIRONMENTS[st.env].title });
}

function makePlinth(x, z, width = 1.9, id = `plinth-${x}-${z}`, roundBase = false) {
  const group = new T.Group();
  group.position.set(x, 0, z);
  siteRoot.add(group);
  box(width + 0.45, 0.35, width + 0.45, MAT.concrete, 0, -0.16, 0, group);
  box(width, 0.5, width, MAT.concreteLight, 0, 0.25, 0, group);
  if (roundBase) cylinder(0.85, 0.85, 0.09, MAT.steel, 0, 0.59, 0, group, 24, false, true);
  else box(0.78, 0.09, 0.78, MAT.steel, 0, 0.59, 0, group);
  const boltPositions = roundBase
    ? Array.from({ length: 8 }, (_, i) => [
        Math.cos((i * Math.PI) / 4) * 0.62,
        Math.sin((i * Math.PI) / 4) * 0.62,
      ])
    : [
        [-0.27, -0.27],
        [0.27, -0.27],
        [0.27, 0.27],
        [-0.27, 0.27],
      ];
  boltPositions.forEach(([bx, bz]) => {
    cylinder(0.026, 0.026, 0.43, MAT.galvanized, bx, 0.72, bz, group, 8);
    cylinder(0.065, 0.065, 0.055, MAT.galvanized, bx, 0.51, bz, group, 6);
    cylinder(0.065, 0.065, 0.055, MAT.galvanized, bx, 0.68, bz, group, 6);
    cylinder(0.065, 0.065, 0.045, MAT.galvanized, bx, 0.75, bz, group, 6);
  });
  register(group, { id, kind: "plinth", title: "Raised concrete foundation plinth" });
  return group;
}

function ladder(parent, baseY, height, radiusAt) {
  const rails = new BeamBatch(parent, MAT.galvanized, true, 7);
  const rungs = new BeamBatch(parent, MAT.galvanized, true, 6);
  const angle = Math.PI / 2;
  const tangent = V3(-Math.sin(angle), 0, Math.cos(angle));
  const radial = (y, offset = 0) => {
    const r = radiusAt(y) + 0.3;
    return V3(Math.cos(angle) * r, baseY + y, Math.sin(angle) * r).addScaledVector(tangent, offset);
  };
  const panels = Math.max(3, Math.ceil(height / 4));
  for (let p = 0; p < panels; p++) {
    const y0 = (height * p) / panels;
    const y1 = (height * (p + 1)) / panels;
    [-0.26, 0.26].forEach((offset) => rails.add(radial(y0, offset), radial(y1, offset), 0.035));
  }
  for (let y = 0.25; y < height; y += 0.45) rungs.add(radial(y, -0.28), radial(y, 0.28), 0.025);
  rails.build();
  rungs.build();
}

function buildLatticeTower() {
  const type = st.tower;
  const group = new T.Group();
  siteRoot.add(group);
  const rooftop = type === "ROOFTOP_RTT_DRAME";
  const guyed = type === "GUYED_MAST";
  const tubular = type === "LATTICE_TUBULAR_3LEG" || guyed;
  const n = type === "LATTICE_ANGULAR_4LEG" || rooftop ? 4 : 3;
  const baseY = rooftop ? 1.0 : 0.69;
  const r0 = rooftop ? 1.5 : guyed ? 0.78 : type === "LATTICE_TUBULAR_3LEG" ? 3.4 : 3.8;
  const r1 = rooftop ? 0.72 : guyed ? 0.78 : type === "LATTICE_TUBULAR_3LEG" ? 1.05 : 1.25;
  const angleOffset = n === 4 ? Math.PI / 4 : Math.PI / 6;
  const radiusAt = (y) => r0 + ((r1 - r0) * y) / st.H;
  const point = (i, y) => {
    const angle = (i * Math.PI * 2) / n + angleOffset;
    const r = radiusAt(y);
    return V3(Math.cos(angle) * r, baseY + y, Math.sin(angle) * r);
  };

  if (!rooftop) {
    if (guyed) makePlinth(0, 0, 2.25, "guyed-foundation", true);
    else
      for (let i = 0; i < n; i++) {
        const p = point(i, 0);
        makePlinth(p.x, p.z, type === "LATTICE_ANGULAR_4LEG" ? 2.05 : 1.9, `plinth-${i}`);
      }
  }

  const panels = Math.max(2, Math.ceil(st.H / (guyed ? 3.2 : 4.2)));
  for (let i = 0; i < n; i++) {
    const leg = new T.Group();
    group.add(leg);
    for (let p = 0; p < panels; p++) {
      const a = point(i, (st.H * p) / panels);
      const b = point(i, (st.H * (p + 1)) / panels);
      if (tubular) rodBetween(a, b, guyed ? 0.075 : 0.135, MAT.steel, leg, 12, true);
      else angleBetween(a, b, rooftop ? 0.12 : 0.18, rooftop ? 0.018 : 0.025, MAT.steel, leg);
    }
    register(leg, {
      id: `tower-leg-${i}`,
      kind: "tower-leg",
      title: `${TOWERS[type].short} · main leg ${i + 1}`,
      index: i + 1,
    });
  }

  const braces = new BeamBatch(group, MAT.steel, tubular, tubular ? 8 : 7);
  for (let p = 0; p < panels; p++) {
    const y0 = (st.H * p) / panels;
    const y1 = (st.H * (p + 1)) / panels;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      braces.add(point(i, y0), point(j, y1), guyed ? 0.035 : tubular ? 0.052 : 0.065);
      braces.add(point(j, y0), point(i, y1), guyed ? 0.035 : tubular ? 0.052 : 0.065);
      braces.add(point(i, y1), point(j, y1), guyed ? 0.045 : tubular ? 0.07 : 0.075);
    }
  }
  braces.build();
  ladder(group, baseY, st.H, radiusAt);

  // Top steelwork and cable tray.
  const topRing = new T.Group();
  group.add(topRing);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    rectangularBeamBetween(point(i, st.H), point(j, st.H), 0.09, 0.09, MAT.galvanized, topRing);
  }
  box(0.24, st.H, 0.16, MAT.galvanized, -0.2, baseY + st.H / 2, 0, group, false);
  register(group, { id: "tower", kind: "tower", title: TOWERS[type].name });
  structureTop = { x: 0, y: baseY + st.H, z: 0 };

  if (guyed) buildGuyedHardware(baseY);
}

function buildGuyedHardware(baseY) {
  const guys = new T.Group();
  siteRoot.add(guys);
  const anchorRadius = st.H * 0.6;
  [0.34, 0.67, 0.94].forEach((level, levelIndex) => {
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3 + Math.PI / 6;
      const top = V3(Math.cos(angle) * 0.65, baseY + st.H * level, Math.sin(angle) * 0.65);
      const anchor = V3(Math.cos(angle) * anchorRadius, 0.35, Math.sin(angle) * anchorRadius);
      rodBetween(top, anchor, 0.022, MAT.steel, guys, 7);
      const tangent = anchor.clone().sub(top).normalize();
      const turnbuckleEnd = anchor.clone().addScaledVector(tangent, -1.0);
      rodBetween(anchor, turnbuckleEnd, 0.055, MAT.galvanized, guys, 8);
      if (levelIndex === 0) {
        const block = new T.Group();
        block.position.copy(anchor);
        block.rotation.y = -angle;
        siteRoot.add(block);
        box(2.1, 0.65, 1.45, MAT.concrete, 0, -0.05, 0, block);
        cylinder(0.1, 0.1, 0.8, MAT.galvanized, 0, 0.3, 0, block, 10);
        register(block, {
          id: `guy-anchor-${i}`,
          kind: "guy-anchor",
          title: `Guy anchor block ${i + 1}`,
          index: i + 1,
          radius: anchorRadius,
        });
      }
    }
  });
  register(guys, {
    id: "guy-wires",
    kind: "guy-wires",
    title: "High-tensile guy wire system",
    radius: anchorRadius,
  });
}

function buildRooftopDunnage() {
  const group = new T.Group();
  siteRoot.add(group);
  // Primary beams sit over the building's column grid at x = ±5 m.
  [-5, 5].forEach((x) => {
    iBeamBetween(V3(x, 0.58, -5.4), V3(x, 0.58, 5.4), 0.32, 0.46, MAT.blue, group);
    [-5, 5].forEach((z) => {
      box(1.35, 0.09, 1.35, MAT.rubber, x, 0.06, z, group);
      box(1.25, 0.38, 1.25, MAT.ballast, x, 0.29, z, group);
    });
  });
  [-1.5, 1.5].forEach((z) =>
    iBeamBetween(V3(-5.25, 0.84, z), V3(5.25, 0.84, z), 0.28, 0.36, MAT.blue, group)
  );
  // Additional non-penetrating counterweights on the primary load path.
  [-5, 5].forEach((x) =>
    [-2.7, 2.7].forEach((z) => {
      box(1.05, 0.08, 1.05, MAT.rubber, x, 0.05, z, group);
      box(1.0, 0.34, 1.0, MAT.ballast, x, 0.26, z, group);
    })
  );
  register(group, {
    id: "rooftop-dunnage",
    kind: "dunnage",
    title: "I-beam grillage & membrane-safe ballast",
  });
}

function buildMonopole() {
  makePlinth(0, 0, 3.1, "monopole-foundation", true);
  const group = new T.Group();
  const shaft = new T.Group();
  siteRoot.add(group);
  group.add(shaft);
  const baseY = 0.69;
  const sections = 5;
  const radiusAt = (y) => 0.56 - (0.32 * y) / st.H;
  for (let i = 0; i < sections; i++) {
    const y0 = (st.H * i) / sections;
    const y1 = (st.H * (i + 1)) / sections;
    const part = cylinder(
      radiusAt(y1),
      radiusAt(y0),
      y1 - y0,
      MAT.steel,
      0,
      baseY + (y0 + y1) / 2,
      0,
      shaft,
      20,
      true,
      true
    );
    part.userData.member = i + 1;
    if (i > 0) {
      cylinder(
        radiusAt(y0) + 0.07,
        radiusAt(y0) + 0.07,
        0.1,
        MAT.galvanized,
        0,
        baseY + y0,
        0,
        group,
        20,
        false,
        true
      );
      for (let b = 0; b < 8; b++) {
        const a = (b * Math.PI) / 4;
        cylinder(
          0.025,
          0.025,
          0.15,
          MAT.galvanized,
          Math.cos(a) * (radiusAt(y0) + 0.045),
          baseY + y0,
          Math.sin(a) * (radiusAt(y0) + 0.045),
          group,
          6
        );
      }
    }
  }
  ladder(group, baseY, st.H, (y) => radiusAt(y) + 0.05);
  register(shaft, {
    id: "tower-leg-0",
    kind: "tower-leg",
    title: "Tapered hollow monopole shaft",
    index: 1,
  });
  register(group, { id: "tower", kind: "tower", title: TOWERS[st.tower].name });
  structureTop = { x: 0, y: baseY + st.H, z: 0 };
}

function buildRooftopPole() {
  const group = new T.Group();
  siteRoot.add(group);
  const z = -7.9;
  cylinder(0.095, 0.12, st.H, MAT.galvanized, 0, st.H / 2, z, group, 16, true, true);
  [1.0, Math.min(st.H - 0.8, 2.4)].forEach((y) => {
    cylinder(0.16, 0.16, 0.08, MAT.steel, 0, y, z, group, 16);
    rectangularBeamBetween(V3(0, y, z), V3(0, y, -9.05), 0.1, 0.1, MAT.steel, group, true);
    box(0.45, 0.35, 0.08, MAT.steel, 0, y, -9.02, group);
  });
  register(group, {
    id: "tower-leg-0",
    kind: "tower-leg",
    title: "Parapet-clamped galvanized pole",
    index: 1,
  });
  register(group, { id: "tower", kind: "tower", title: TOWERS[st.tower].name });
  structureTop = { x: 0, y: st.H, z };
}

function buildCOW() {
  const truck = new T.Group();
  siteRoot.add(truck);
  box(8.6, 0.32, 2.55, MAT.steel, 0, 1.25, 0, truck);
  box(5.8, 0.16, 2.45, MAT.galvanized, -1.15, 1.5, 0, truck);
  box(2.1, 1.75, 2.35, MAT.orange, 3.15, 2.05, 0, truck);
  box(1.0, 0.72, 2.38, MAT.orange, 4.15, 1.55, 0, truck);
  box(0.08, 0.62, 1.85, MAT.glass, 4.22, 2.35, 0, truck, false);
  box(1.25, 0.65, 0.06, MAT.glass, 3.25, 2.4, 1.19, truck, false);
  [-2.8, -1.45, 2.85].forEach((x) =>
    [-1.25, 1.25].forEach((z) => {
      const wheel = cylinder(0.57, 0.57, 0.34, MAT.tire, x, 0.67, z, truck, 18, false, true);
      wheel.rotation.x = Math.PI / 2;
      const hub = cylinder(0.23, 0.23, 0.36, MAT.lightSteel, x, 0.67, z, truck, 14);
      hub.rotation.x = Math.PI / 2;
    })
  );

  const outriggers = new T.Group();
  siteRoot.add(outriggers);
  [-2.7, 2.0].forEach((x) => {
    box(0.32, 0.3, 7.0, MAT.blue, x, 1.05, 0, outriggers);
    [-3.35, 3.35].forEach((z) => {
      cylinder(0.12, 0.12, 1.05, MAT.galvanized, x, 0.66, z, outriggers, 12);
      cylinder(0.2, 0.2, 0.12, MAT.steel, x, 0.17, z, outriggers, 12);
      box(0.95, 0.12, 0.95, MAT.concrete, x, 0.06, z, outriggers);
    });
  });
  register(outriggers, {
    id: "cow-outriggers",
    kind: "cow",
    title: "COW chassis & mechanical outriggers",
  });

  const mast = new T.Group();
  siteRoot.add(mast);
  const mx = -1.7,
    baseY = 1.65;
  const length = st.H - baseY;
  for (let i = 0; i < 4; i++) {
    const y0 = baseY + (length * i) / 4;
    const y1 = baseY + (length * (i + 1)) / 4 + (i < 3 ? 0.38 : 0);
    const radius = 0.31 - i * 0.052;
    cylinder(
      radius * 0.94,
      radius,
      y1 - y0,
      MAT.galvanized,
      mx,
      (y0 + y1) / 2,
      0,
      mast,
      16,
      true,
      true
    );
  }
  cylinder(0.16, 0.22, 1.25, MAT.blue, mx + 0.55, 2.15, 0, mast, 14);
  rodBetween(V3(mx + 0.55, 2.6, 0), V3(mx + 0.1, 4.2, 0), 0.075, MAT.lightSteel, mast, 10);
  register(mast, {
    id: "tower-leg-0",
    kind: "tower-leg",
    title: "Four-section telescopic COW mast",
    index: 1,
  });
  register(mast, { id: "tower", kind: "tower", title: TOWERS[st.tower].name });
  structureTop = { x: mx, y: st.H, z: 0 };
}

function buildTower() {
  if (st.tower === "ROOFTOP_RTT_DRAME") buildRooftopDunnage();
  if (
    ["LATTICE_TUBULAR_3LEG", "LATTICE_ANGULAR_4LEG", "ROOFTOP_RTT_DRAME", "GUYED_MAST"].includes(
      st.tower
    )
  )
    buildLatticeTower();
  else if (st.tower === "MONOPOLE_LIGHT_DUTY") buildMonopole();
  else if (st.tower === "ROOFTOP_POLE") buildRooftopPole();
  else buildCOW();
}

function chainLinkGeometry(length, height) {
  const vertices = [];
  const addClipped = (m, b) => {
    const points = [];
    const pushUnique = (x, y) => {
      if (
        x >= -0.0001 &&
        x <= length + 0.0001 &&
        y >= -0.0001 &&
        y <= height + 0.0001 &&
        !points.some((p) => Math.abs(p[0] - x) < 0.001 && Math.abs(p[1] - y) < 0.001)
      )
        points.push([x, y]);
    };
    pushUnique(0, b);
    pushUnique(length, m * length + b);
    pushUnique(-b / m, 0);
    pushUnique((height - b) / m, height);
    if (points.length >= 2)
      vertices.push(points[0][0], points[0][1], 0, points[1][0], points[1][1], 0);
  };
  [2.0, -2.0].forEach((slope) => {
    for (let b = -length * 2 - height; b <= length * 2 + height * 2; b += 0.29)
      addClipped(slope, b);
  });
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  return geometry;
}

function fenceSegment(a, b, parent, outward = 1) {
  const length = a.distanceTo(b);
  const group = new T.Group();
  group.position.copy(a);
  group.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
  parent.add(group);
  const height = 2.25;
  const posts = Math.max(1, Math.ceil(length / 2.5));
  for (let i = 0; i <= posts; i++) {
    const x = (length * i) / posts;
    cylinder(0.055, 0.065, 2.55, MAT.galvanized, x, 1.275, 0, group, 10);
    rodBetween(V3(x, 2.18, 0), V3(x, 2.68, outward * 0.38), 0.038, MAT.galvanized, group, 8);
    if (st.grounding && i % 4 === 0) {
      cylinder(0.018, 0.018, 2.2, MAT.copper, x + 0.07, 1.1, 0, group, 7);
      box(0.15, 0.08, 0.12, MAT.brass, x + 0.04, 0.35, 0, group, false);
    }
  }
  rodBetween(V3(0, 2.18, 0), V3(length, 2.18, 0), 0.038, MAT.galvanized, group, 8);
  rodBetween(V3(0, 0.15, 0), V3(length, 0.15, 0), 0.025, MAT.galvanized, group, 7);
  const link = new T.LineSegments(chainLinkGeometry(length, height - 0.15), FENCE_LINE);
  link.position.y = 0.15;
  group.add(link);
  [0.12, 0.25, 0.38].forEach((offset, index) => {
    rodBetween(
      V3(0, 2.3 + index * 0.16, outward * offset),
      V3(length, 2.3 + index * 0.16, outward * offset),
      0.012,
      MAT.steel,
      group,
      5
    );
  });
  return group;
}

function buildFence() {
  if (st.env === "URBAN_ROOFTOP") return;
  const group = new T.Group();
  siteRoot.add(group);
  const w = st.env === "EMERGENCY_DISASTER" ? 24 : 28;
  const d = st.env === "EMERGENCY_DISASTER" ? 20 : 24;
  const x = w / 2,
    z = d / 2;
  fenceSegment(V3(-x, 0, -z), V3(x, 0, -z), group, -1);
  fenceSegment(V3(x, 0, -z), V3(x, 0, z), group, -1);
  fenceSegment(V3(-x, 0, z), V3(-x, 0, -z), group, -1);
  fenceSegment(V3(-x, 0, z), V3(-2, 0, z), group, 1);
  fenceSegment(V3(2, 0, z), V3(x, 0, z), group, 1);

  const gate = new T.Group();
  gate.position.set(-1.9, 0, z);
  group.add(gate);
  const gateWidth = 3.8;
  box(gateWidth, 0.07, 0.07, MAT.galvanized, gateWidth / 2, 0.2, 0, gate);
  box(gateWidth, 0.07, 0.07, MAT.galvanized, gateWidth / 2, 2.15, 0, gate);
  box(0.07, 2.0, 0.07, MAT.galvanized, 0.03, 1.17, 0, gate);
  box(0.07, 2.0, 0.07, MAT.galvanized, gateWidth - 0.03, 1.17, 0, gate);
  rodBetween(V3(0.05, 0.22, 0), V3(gateWidth - 0.05, 2.12, 0), 0.035, MAT.galvanized, gate, 8);
  const gateMesh = new T.LineSegments(chainLinkGeometry(gateWidth - 0.12, 1.82), FENCE_LINE);
  gateMesh.position.set(0.06, 0.25, 0);
  gate.add(gateMesh);
  if (st.grounding) {
    const braid = cable(
      [V3(-0.18, 0.75, 0), V3(0.02, 1.18, 0.18), V3(0.42, 0.84, 0)],
      0.026,
      MAT.copper,
      gate,
      20
    );
    register(braid, {
      id: "gate-braid",
      kind: "gate-braid",
      title: "Arched flexible gate bonding braid",
    });
  }
  register(gate, { id: "fence-gate", kind: "gate", title: "Bonded access gate" });
  register(group, { id: "security-fence", kind: "fence", title: "Galvanized security perimeter" });
}

function buildEarthPit(x, z, index) {
  const group = new T.Group();
  group.position.set(x, 0, z);
  siteRoot.add(group);
  // The 2.4 m electrode is genuinely modeled below grade. Selecting the pit
  // opens the lid and moves the camera to an inspection view through the
  // actual hole cut in both terrain layers.
  cylinder(0.48, 0.48, 0.48, MAT.concrete, 0, -0.06, 0, group, 24, true, true);
  cylinder(0.39, 0.39, 0.05, MAT.dark, 0, -2.35, 0, group, 20);
  cylinder(0.025, 0.025, 2.4, MAT.copper, 0, -1.12, 0, group, 10);
  box(0.23, 0.09, 0.1, MAT.brass, 0, 0.08, 0, group);
  cylinder(0.035, 0.035, 0.24, MAT.copper, 0.16, 0.08, 0, group, 8);
  const lid = cylinder(0.5, 0.5, 0.09, MAT.green, 0, 0.2, 0, group, 24, false, true);
  box(0.28, 0.06, 0.07, MAT.dark, 0, 0.27, 0, lid, false);
  const id = `earth-pit-${index}`;
  pitVisuals.set(id, { group, lid, x, z });
  register(group, { id, kind: "earth-pit", title: `Earth inspection chamber E${index}`, index });
}

function buildGrounding() {
  if (!st.grounding) return;
  const group = new T.Group();
  siteRoot.add(group);
  if (st.env === "URBAN_ROOFTOP") {
    cable(
      [V3(-9.8, 0.12, -8.5), V3(0, 0.12, -8.5), V3(9.8, 0.12, -8.5), V3(9.8, 0.12, 7.8)],
      0.018,
      MAT.copper,
      group
    );
    [-8, 8].forEach((x) => {
      box(0.55, 0.16, 0.55, MAT.concrete, x, 0.09, -7.8, group);
      box(0.48, 0.06, 0.48, MAT.green, x, 0.2, -7.8, group);
      box(0.2, 0.08, 0.08, MAT.brass, x, 0.16, -7.8, group);
    });
    register(group, {
      id: "roof-earth-loop",
      kind: "grounding",
      title: "Rooftop earth loop & test links",
    });
    return;
  }

  const positions = pitPositions();
  positions.forEach(([x, z], i) => buildEarthPit(x, z, i + 1));
  const loopPoints = positions.map(([x, z]) => V3(x, 0.08, z));
  loopPoints.push(loopPoints[0].clone());
  cable(loopPoints, 0.018, MAT.copper, group, 48);
  positions.forEach(([x, z]) =>
    cable(
      [V3(0, 0.09, 0), V3(x * 0.48, 0.06, z * 0.48), V3(x, 0.08, z)],
      0.016,
      MAT.copper,
      group,
      24
    )
  );
  if (st.env === "MOUNTAIN_PEAK" && positions.length === 4) {
    // Triangulated Cadweld delta bonds across the four rock-earth chambers.
    cable([loopPoints[0], loopPoints[2]], 0.016, MAT.copper, group, 8);
    cable([loopPoints[1], loopPoints[3]], 0.016, MAT.copper, group, 8);
  }
  register(group, {
    id: "earth-loop",
    kind: "grounding",
    title:
      st.env === "MOUNTAIN_PEAK" ? "Cadweld-welded delta earth grid" : "70 mm² copper earth ring",
  });
}

const fuelTankWorld = { x: 7.6, y: 0, z: 3.6 };
function buildFuelTank() {
  if (st.env === "URBAN_ROOFTOP") Object.assign(fuelTankWorld, { x: 17, y: -8.15, z: -4 });
  else Object.assign(fuelTankWorld, { x: 7.6, y: 0, z: 3.6 });
  const group = new T.Group();
  group.position.set(fuelTankWorld.x, fuelTankWorld.y, fuelTankWorld.z);
  siteRoot.add(group);
  // Environmental containment sized above 110% of the nominal 1,000 L vessel.
  box(3.8, 0.14, 2.6, MAT.concrete, 0, 0.08, 0, group);
  box(3.8, 0.42, 0.14, MAT.concreteLight, 0, 0.28, -1.23, group);
  box(3.8, 0.42, 0.14, MAT.concreteLight, 0, 0.28, 1.23, group);
  box(0.14, 0.42, 2.45, MAT.concreteLight, -1.83, 0.28, 0, group);
  box(0.14, 0.42, 2.45, MAT.concreteLight, 1.83, 0.28, 0, group);
  [-0.5, 0.5].forEach((x) => {
    box(0.22, 0.45, 0.9, MAT.steel, x, 0.39, 0, group);
    box(0.55, 0.1, 1.05, MAT.steel, x, 0.18, 0, group);
  });
  // Ø0.84 m × 1.50 m cylinder plus dished ends ≈ 1,000 L nominal usable.
  const tank = cylinder(0.42, 0.42, 1.5, MAT.white, 0, 0.95, 0, group, 24, false, true);
  tank.rotation.z = Math.PI / 2;
  [-0.75, 0.75].forEach((x) => {
    const cap = mesh(
      new T.SphereGeometry(0.41, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      MAT.white,
      group,
      true
    );
    cap.rotation.z = x < 0 ? Math.PI / 2 : -Math.PI / 2;
    cap.position.set(x, 0.95, 0);
  });
  cylinder(0.075, 0.075, 0.5, MAT.steel, -0.5, 1.55, 0, group, 10);
  cylinder(0.13, 0.13, 0.08, MAT.orange, -0.5, 1.82, 0, group, 10);
  cylinder(0.11, 0.11, 0.18, MAT.blue, 0.35, 1.43, 0, group, 10);
  box(0.3, 0.2, 0.12, MAT.dark, 0.35, 1.35, 0, group);
  register(group, {
    id: "fuel-tank",
    kind: "fuel",
    domain: "power",
    powerKey: "fuel",
    title: "1,000 L Bulk Diesel Fuel Tank",
    focusSize: 5,
  });
}

// -------------------------------------------------------------------------
// Phase 02 — procedural AC / DC power zone
// -------------------------------------------------------------------------
const generatorVisuals = new Map();
const acVisuals = [];
let atsVisuals = { leds: [] };
let mdbVisuals = { branchLeds: [] };
let acBoardVisuals = { highTemp: null, dutyLeds: [] };
let rectifierVisuals = { modules: [], bus: null };
let powerPositions = null;

function powerRegister(object, data) {
  return register(object, { domain: "power", ...data });
}

function getPowerPositions() {
  if (st.env === "URBAN_ROOFTOP")
    return {
      ats: [-8.8, 0, -7.8],
      mdb: [-6.7, 0, -7.8],
      acBoard: [-4.75, 0, -7.8],
      rectifier: [0.5, 0, -7.65],
      battery: [3.25, 0, -7.65],
      ac1: [5.4, 0.36, -7.85],
      ac2: [6.7, 0.36, -7.85],
      grid: [-10, 0, -8],
      gen1: [14, -8.15, 4],
      gen2: [14, -8.15, -1],
    };
  return {
    ats: [-3.1, 0, -7.8],
    mdb: [-1.4, 0, -7.8],
    acBoard: [0.2, 0, -7.8],
    rectifier: [2.2, 0, -7.65],
    battery: [5.0, 0, -7.65],
    ac1: [7.15, 0.36, -7.88],
    ac2: [8.45, 0.36, -7.88],
    grid: [-11.2, 0, -8.8],
    gen1: [-8, 0, -3.2],
    gen2: [-8, 0, 2.4],
  };
}

function cabinetShell(group, width, height, depth, color = MAT.lightSteel) {
  box(width + 0.16, 0.14, depth + 0.16, MAT.concrete, 0, 0.07, 0, group);
  box(width, 0.09, depth, color, 0, 0.19, 0, group);
  box(0.07, height, depth, color, -width / 2, 0.22 + height / 2, 0, group);
  box(0.07, height, depth, color, width / 2, 0.22 + height / 2, 0, group);
  box(width, height, 0.06, color, 0, 0.22 + height / 2, -depth / 2, group);
  box(width + 0.08, 0.09, depth + 0.08, color, 0, 0.22 + height, 0, group);
  const windowPanel = box(
    width - 0.12,
    height - 0.12,
    0.025,
    MAT.glass,
    0,
    0.22 + height / 2,
    depth / 2 + 0.015,
    group,
    false
  );
  windowPanel.castShadow = false;
  return windowPanel;
}

function statusLed(parent, x, y, z, initial = LED.off, radius = 0.045) {
  const led = mesh(new T.SphereGeometry(radius, 8, 8), initial, parent);
  led.position.set(x, y, z);
  led.castShadow = false;
  return led;
}

function buildATS() {
  const group = new T.Group();
  group.position.set(...powerPositions.ats);
  siteRoot.add(group);
  cabinetShell(group, 1.0, 1.65, 0.62, MAT.galvanized);
  atsVisuals = { leds: [] };
  ["GRID", "GEN1", "GEN2"].forEach((source, i) => {
    const y = 1.45 - i * 0.43;
    box(0.58, 0.25, 0.28, i === 0 ? MAT.blue : MAT.orange, -0.08, y, 0.1, group);
    box(0.13, 0.16, 0.1, MAT.dark, -0.08, y, 0.29, group, false);
    const led = statusLed(group, 0.33, y, 0.31, LED.off);
    atsVisuals.leds.push({ source, led });
  });
  box(0.65, 0.07, 0.09, MAT.copper, 0, 0.43, 0.2, group, false);
  box(0.5, 0.18, 0.08, MAT.dark, 0, 1.82, 0.32, group, false);
  powerRegister(group, {
    id: "ats",
    kind: "ats",
    powerKey: "ats",
    title: "Automatic Transfer Switch (ATS)",
    focusSize: 4,
  });
}

function buildMDB() {
  const group = new T.Group();
  group.position.set(...powerPositions.mdb);
  siteRoot.add(group);
  cabinetShell(group, 1.3, 1.9, 0.7, MAT.lightSteel);
  box(0.42, 0.38, 0.3, MAT.dark, -0.31, 1.72, 0.12, group);
  box(0.09, 0.25, 0.08, MAT.red, -0.31, 1.72, 0.31, group, false);
  mdbVisuals = { branchLeds: [] };
  for (let i = 0; i < 3; i++) {
    box(0.19, 0.34, 0.24, MAT.blue, -0.38 + i * 0.38, 1.2, 0.12, group);
    box(0.12, 0.08, 0.06, MAT.amber, -0.38 + i * 0.38, 1.22, 0.29, group, false);
  }
  ["rectifier", "climate", "auxiliary"].forEach((branch, i) => {
    const x = -0.4 + i * 0.4;
    box(0.25, 0.42, 0.26, MAT.white, x, 0.65, 0.12, group);
    box(0.08, 0.22, 0.07, MAT.dark, x, 0.68, 0.3, group, false);
    const led = statusLed(group, x, 0.92, 0.3, LED.green, 0.035);
    mdbVisuals.branchLeds.push({ branch, led });
  });
  powerRegister(group, {
    id: "mdb",
    kind: "mdb",
    powerKey: "mdb",
    title: "Main Distribution Board (MDB)",
    focusSize: 4.2,
  });
}

function buildACBoard() {
  const group = new T.Group();
  group.position.set(...powerPositions.acBoard);
  siteRoot.add(group);
  cabinetShell(group, 0.95, 1.35, 0.55, MAT.galvanized);
  box(0.58, 0.32, 0.1, MAT.dark, 0, 1.26, 0.25, group, false);
  box(0.4, 0.06, 0.04, MAT.green, 0, 1.28, 0.32, group, false);
  acBoardVisuals = { highTemp: null, dutyLeds: [] };
  [1, 2].forEach((unit, i) => {
    box(0.28, 0.35, 0.22, MAT.white, -0.2 + i * 0.4, 0.75, 0.1, group);
    const led = statusLed(group, -0.2 + i * 0.4, 1.0, 0.27, LED.off, 0.035);
    acBoardVisuals.dutyLeds.push({ unit, led });
  });
  acBoardVisuals.highTemp = statusLed(group, 0.32, 1.48, 0.28, LED.off, 0.045);
  powerRegister(group, {
    id: "ac-board",
    kind: "ac-board",
    powerKey: "ac-board",
    title: "Dual-Split A/C Cycling Controller",
    focusSize: 3.8,
  });
}

function buildGridFeed() {
  const group = new T.Group();
  group.position.set(...powerPositions.grid);
  siteRoot.add(group);
  box(0.65, 0.16, 0.65, MAT.concrete, 0, 0.08, 0, group);
  box(0.45, 1.15, 0.35, MAT.galvanized, 0, 0.72, 0, group);
  box(0.34, 0.22, 0.06, MAT.orange, 0, 0.88, 0.21, group);
  [MAT.red, MAT.amber, MAT.blue].forEach((mat, i) =>
    cylinder(0.045, 0.045, 0.22, mat, -0.13 + i * 0.13, 0.42, 0.19, group, 8)
  );
  powerRegister(group, {
    id: "grid-feed",
    kind: "grid",
    powerKey: "grid",
    title: "Commercial Utility Grid Feed · Guide 17",
    focusSize: 4,
  });
}

function buildGenerator(id, index, position) {
  const group = new T.Group();
  group.position.set(...position);
  siteRoot.add(group);
  box(4.5, 0.4, 2.65, MAT.concreteLight, 0, 0.2, 0, group);
  box(3.9, 0.18, 1.85, MAT.steel, 0, 0.5, 0, group);
  box(1.55, 0.9, 1.12, MAT.blue, -0.45, 1.05, 0, group);
  for (let i = 0; i < 6; i++)
    box(0.16, 0.18, 0.82, MAT.steel, -1.05 + i * 0.24, 1.58, 0, group, false);
  const alternator = cylinder(0.48, 0.48, 1.15, MAT.orange, 1.05, 1.06, 0, group, 20, false, true);
  alternator.rotation.z = Math.PI / 2;
  box(0.25, 1.25, 1.45, MAT.dark, -1.6, 1.1, 0, group);
  for (let i = 0; i < 7; i++)
    box(0.05, 1.05, 0.06, MAT.galvanized, -1.74, 1.1, -0.54 + i * 0.18, group, false);
  cylinder(0.07, 0.09, 1.55, MAT.steel, -0.65, 2.15, -0.38, group, 10);
  cylinder(0.12, 0.12, 0.18, MAT.dark, -0.65, 2.98, -0.38, group, 10);
  box(0.5, 0.35, 0.38, MAT.dark, 0.65, 0.76, 0.72, group);
  statusLed(group, 0.52, 0.98, 0.78, LED.red, 0.035);
  statusLed(group, 0.78, 0.98, 0.78, LED.off, 0.035);
  box(0.58, 0.48, 0.13, MAT.dark, 0.25, 1.5, 0.68, group);
  const led = statusLed(group, 0.42, 1.58, 0.77, LED.off, 0.045);
  const particles = [];
  for (let i = 0; i < 12; i++) {
    const particle = mesh(new T.SphereGeometry(0.075, 7, 7), SMOKE, group);
    particle.castShadow = particle.receiveShadow = false;
    particle.visible = false;
    particle.userData.age = i * 0.17;
    particle.userData.drift = ((i % 3) - 1) * 0.12;
    particles.push(particle);
  }
  generatorVisuals.set(id, {
    group,
    base: V3(...position),
    particles,
    led,
    state: "STOPPED",
    index,
  });
  powerRegister(group, {
    id,
    kind: "generator",
    powerKey: "generator",
    title: index === 1 ? "Primary Standby Diesel Generator" : "Secondary Off-Grid Diesel Generator",
    index,
    focusSize: 6,
  });
}

function buildRectifierPlant() {
  const group = new T.Group();
  group.position.set(...powerPositions.rectifier);
  siteRoot.add(group);
  const calc = calculatePower();
  box(2.55, 0.16, 1.0, MAT.concrete, 0, 0.08, 0, group);
  [-1.22, 1.22].forEach((x) => {
    box(0.09, 2.75, 0.9, MAT.steel, x, 1.52, 0, group);
  });
  box(2.5, 0.09, 0.9, MAT.steel, 0, 2.88, 0, group);
  box(2.4, 2.6, 0.07, MAT.dark, 0, 1.52, -0.43, group);
  rectifierVisuals = { modules: [], bus: null };
  for (let i = 0; i < 8; i++) {
    const column = i % 2;
    const row = Math.floor(i / 2);
    const x = column ? 0.56 : -0.56;
    const y = 2.47 - row * 0.43;
    const module = new T.Group();
    group.add(module);
    if (i < calc.installed) {
      box(0.98, 0.34, 0.68, MAT.lightSteel, x, y, 0, module);
      box(0.82, 0.23, 0.05, MAT.blue, x, y, 0.37, module, false);
      box(0.08, 0.18, 0.05, MAT.dark, x - 0.38, y, 0.41, module, false);
      box(0.08, 0.18, 0.05, MAT.dark, x + 0.38, y, 0.41, module, false);
      const led = statusLed(module, x + 0.27, y, 0.415, LED.green, 0.032);
      rectifierVisuals.modules.push({ group: module, led, index: i });
      powerRegister(module, {
        id: `rectifier-module-${i + 1}`,
        kind: "rectifier-module",
        powerKey: "rectifier-module",
        title: `3 kW Rectifier Module ${i + 1}`,
        index: i + 1,
        focusSize: 3,
      });
    } else {
      box(0.98, 0.34, 0.62, MAT.dark, x, y, -0.02, module, false);
    }
  }
  const parts = [
    ["pcf", "PCF · DC Surge Filter"],
    ["pdu", "PDU · DC Breakers"],
    ["pfu", "PFU · Voltage Stabilizer"],
    ["bfu", "BFU · Battery Fuse + LVD"],
  ];
  parts.forEach(([key, title], i) => {
    const part = new T.Group();
    group.add(part);
    const x = -0.84 + i * 0.56;
    box(0.48, 0.38, 0.65, i === 3 ? MAT.orange : MAT.galvanized, x, 0.56, 0, part);
    box(0.32, 0.09, 0.05, MAT.dark, x, 0.57, 0.36, part, false);
    statusLed(part, x + 0.14, 0.7, 0.37, key === "bfu" ? LED.amber : LED.green, 0.025);
    powerRegister(part, { id: key, kind: key, powerKey: key, title, focusSize: 3 });
  });
  const bus = new T.Group();
  group.add(bus);
  box(0.08, 2.25, 0.09, MAT.copper, 1.34, 1.5, -0.15, bus, false);
  box(0.08, 2.25, 0.09, MAT.copper, 1.34, 1.5, 0.15, bus, false);
  rectifierVisuals.bus = bus;
  powerRegister(bus, {
    id: "dc-bus",
    kind: "dc-bus",
    powerKey: "dc-bus",
    title: "-48V Copper DC Busbar",
    focusSize: 3.2,
  });
  powerRegister(group, {
    id: "rectifier-plant",
    kind: "rectifier",
    powerKey: "rectifier",
    title: "-48V DC Rectifier Power Plant",
    focusSize: 4.8,
  });
}

function buildBatteryBank() {
  const group = new T.Group();
  group.position.set(...powerPositions.battery);
  siteRoot.add(group);
  box(2.65, 0.16, 1.1, MAT.concrete, 0, 0.08, 0, group);
  [-1.25, 1.25].forEach((x) =>
    [-0.45, 0.45].forEach((z) => box(0.08, 2.45, 0.08, MAT.steel, x, 1.36, z, group))
  );
  for (let shelf = 0; shelf < 4; shelf++)
    box(2.55, 0.07, 1.0, MAT.steel, 0, 0.35 + shelf * 0.57, 0, group);
  for (let s = 0; s < st.power.batteryStrings; s++) {
    const string = new T.Group();
    group.add(string);
    const y = 0.61 + s * 0.57;
    for (let b = 0; b < 4; b++) {
      const battery = new T.Group();
      string.add(battery);
      const x = -0.87 + b * 0.58;
      const bodyMat = st.power.batteryType === "LITHIUM" ? MAT.blue : MAT.dark;
      box(0.51, 0.4, 0.72, bodyMat, x, y, 0, battery);
      box(0.43, 0.06, 0.05, MAT.lightSteel, x, y + 0.06, 0.39, battery, false);
      cylinder(0.035, 0.035, 0.09, MAT.red, x - 0.14, y + 0.245, 0.15, battery, 8);
      cylinder(0.035, 0.035, 0.09, MAT.copper, x + 0.14, y + 0.245, 0.15, battery, 8);
      if (b < 3)
        cable(
          [
            V3(x + 0.14, y + 0.29, 0.15),
            V3(x + 0.29, y + 0.35, 0.15),
            V3(x + 0.44, y + 0.29, 0.15),
          ],
          0.018,
          MAT.copper,
          string,
          8
        );
      powerRegister(battery, {
        id: `battery-s${s + 1}-b${b + 1}`,
        kind: "battery",
        powerKey: "battery",
        title: `12V ${st.power.batteryType} Battery · S${s + 1}/B${b + 1}`,
        string: s + 1,
        battery: b + 1,
        focusSize: 2.6,
      });
    }
    cable(
      [V3(1.02, y + 0.28, 0.15), V3(1.38, y + 0.32, 0.15), V3(1.38, 1.45, 0.15)],
      0.025,
      MAT.copper,
      string,
      12
    );
    powerRegister(string, {
      id: `battery-string-${s + 1}`,
      kind: "battery-string",
      powerKey: "battery",
      title: `48V Battery String ${s + 1} · ${st.power.batteryAh}Ah`,
      string: s + 1,
      focusSize: 3.2,
    });
  }
  box(0.08, 2.1, 0.09, MAT.copper, 1.4, 1.4, -0.15, group, false);
  box(0.08, 2.1, 0.09, MAT.copper, 1.4, 1.4, 0.15, group, false);
  powerRegister(group, {
    id: "battery-bank",
    kind: "battery-bank",
    powerKey: "battery",
    title: "-48V Deep-Cycle Backup Battery Bank",
    focusSize: 4.5,
  });
}

function buildACPlinth(parent) {
  const plinth = new T.Group();
  parent.add(plinth);
  const cx = (powerPositions.ac1[0] + powerPositions.ac2[0]) / 2;
  const cz = powerPositions.ac1[2];
  box(2.8, 0.1, 1.04, MAT.concrete, cx, 0.05, cz, plinth);
  const pad = box(2.64, 0.36, 0.9, MAT.concreteLight, cx, 0.21, cz, plinth);
  [powerPositions.ac1[0], powerPositions.ac2[0]].forEach((ux) => {
    [-0.38, 0.38].forEach((ox) => {
      box(0.09, 0.05, 0.72, MAT.galvanized, ux + ox, 0.41, cz, plinth, false);
    });
  });
  powerRegister(plinth, {
    id: "ac-plinth",
    kind: "ac-plinth",
    powerKey: "climate",
    title: "Raised Concrete A/C Plinth · Vibration-Isolated Pad",
    focusSize: 4.2,
    focusObject: pad,
  });
}

function buildACUnit(index, position) {
  const group = new T.Group();
  group.position.set(...position);
  siteRoot.add(group);
  // Anti-vibration isolation mounts atop the dedicated raised concrete plinth.
  [-0.42, 0.42].forEach((mx) =>
    [-0.24, 0.24].forEach((mz) => box(0.11, 0.05, 0.11, MAT.rubber, mx, 0.04, mz, group, false))
  );
  box(1.18, 0.88, 0.66, MAT.white, 0, 0.5, 0, group);
  const fan = new T.Group();
  fan.position.set(-0.2, 0.53, 0.35);
  group.add(fan);
  const ring = mesh(new T.TorusGeometry(0.26, 0.024, 7, 24), MAT.steel, fan);
  ring.castShadow = false;
  for (let i = 0; i < 4; i++) {
    const blade = box(0.085, 0.39, 0.035, MAT.dark, 0, 0, 0, fan, false);
    blade.rotation.z = (i * Math.PI) / 2 + 0.35;
  }
  const led = statusLed(group, 0.42, 0.76, 0.35, LED.off, 0.04);
  box(0.2, 0.48, 0.18, MAT.galvanized, 0.4, 0.42, 0.34, group);
  // Brass service valves and twin copper refrigerant lines into the shelter wall.
  box(0.09, 0.14, 0.08, MAT.brass, 0.46, 0.28, -0.22, group, false);
  const wallZ = (st.env === "URBAN_ROOFTOP" ? -8.52 : -8.74) - position[2];
  const indoorY = 2.22;
  cable(
    [
      V3(0.45, 0.3, -0.24),
      V3(0.45, 0.3, wallZ + 0.08),
      V3(0.32, indoorY, wallZ + 0.08),
      V3(0.24, indoorY, wallZ - 0.06),
    ],
    0.02,
    MAT.copper,
    group,
    14
  );
  cable(
    [
      V3(0.5, 0.25, -0.24),
      V3(0.5, 0.25, wallZ + 0.05),
      V3(0.38, indoorY - 0.05, wallZ + 0.05),
      V3(0.3, indoorY - 0.05, wallZ - 0.06),
    ],
    0.013,
    MAT.copper,
    group,
    14
  );
  const indoor = new T.Group();
  indoor.position.set(position[0], position[1] + 2.22, st.env === "URBAN_ROOFTOP" ? -8.36 : -8.56);
  siteRoot.add(indoor);
  box(1.16, 0.38, 0.32, MAT.white, 0, 0, 0, indoor);
  box(0.96, 0.065, 0.04, MAT.dark, 0, -0.1, 0.17, indoor, false);
  const indoorLed = statusLed(indoor, 0.44, 0.08, 0.18, LED.off, 0.03);
  acVisuals.push({ index, fan, led, indoorLed });
  powerRegister(group, {
    id: `ac-unit-${index}`,
    kind: "ac-unit",
    powerKey: "climate",
    title: `Split Air Conditioner ${index} · Outdoor Unit`,
    index,
    focusSize: 3.5,
  });
  powerRegister(indoor, {
    id: `ac-indoor-${index}`,
    kind: "ac-indoor",
    powerKey: "climate",
    title: `Split Air Conditioner ${index} · Indoor Unit`,
    index,
    focusSize: 3.2,
  });
}

function buildPowerAuxiliaries() {
  const aviation = new T.Group();
  aviation.position.set(structureTop.x + 0.35, structureTop.y - 0.55, structureTop.z);
  siteRoot.add(aviation);
  cylinder(0.13, 0.18, 0.18, MAT.dark, 0, 0, 0, aviation, 12);
  const lamp = mesh(new T.SphereGeometry(0.16, 12, 10), LED.red, aviation);
  lamp.position.y = 0.18;
  const beaconGlow = mesh(new T.SphereGeometry(0.3, 12, 10), LAUNCH_BEACON_GLOW, aviation);
  beaconGlow.position.y = 0.18;
  beaconGlow.visible = false;
  beaconGlow.castShadow = beaconGlow.receiveShadow = false;
  beaconGlow.raycast = () => {};
  launchVisuals.beacon = lamp;
  launchVisuals.beaconGlow = beaconGlow;
  powerRegister(aviation, {
    id: "aviation-light",
    kind: "aviation",
    powerKey: "auxiliary",
    title: "Tower Aviation Light · MDB Branch 3",
    focusSize: 3,
  });
  const socket = new T.Group();
  socket.position.set(
    powerPositions.acBoard[0] + 0.8,
    powerPositions.acBoard[1] + 0.65,
    powerPositions.acBoard[2] - 0.4
  );
  siteRoot.add(socket);
  box(0.28, 0.36, 0.15, MAT.white, 0, 0, 0, socket);
  statusLed(socket, 0, 0.05, 0.1, LED.blue, 0.03);
  powerRegister(socket, {
    id: "room-sockets",
    kind: "socket",
    powerKey: "auxiliary",
    title: "Maintenance Socket & Auxiliary Circuit",
    focusSize: 2.8,
  });
}

function buildPower() {
  generatorVisuals.clear();
  acVisuals.length = 0;
  powerPositions = getPowerPositions();
  const system = new T.Group();
  siteRoot.add(system);
  if (st.env === "URBAN_ROOFTOP") {
    box(5.4, 0.12, 1.4, MAT.concreteLight, -6.7, 0.06, -7.8, system);
    box(8.1, 0.12, 1.5, MAT.concreteLight, 3.35, 0.06, -7.75, system);
    box(7.9, 2.8, 0.12, MAT.building, 3.35, 1.46, -8.58, system);
  } else {
    box(13.2, 0.18, 3.1, MAT.concreteLight, 2.6, 0.09, -7.55, system);
    box(13.1, 2.95, 0.12, MAT.building, 2.6, 1.57, -8.82, system);
    [-3.9, 9.1].forEach((x) => box(0.12, 2.95, 0.12, MAT.steel, x, 1.57, -8.75, system));
  }
  buildACPlinth(system);
  powerRegister(system, {
    id: "power-system",
    kind: "power-system",
    powerKey: "power-system",
    title: "Complete Site Power & Climate System",
    focusSize: 10,
  });
  buildGridFeed();
  buildATS();
  buildMDB();
  buildACBoard();
  buildRectifierPlant();
  buildBatteryBank();
  buildACUnit(1, powerPositions.ac1);
  buildACUnit(2, powerPositions.ac2);
  buildGenerator("generator-1", 1, powerPositions.gen1);
  if (st.power.sourceMode === "DUAL_GENERATOR_OFFGRID")
    buildGenerator("generator-2", 2, powerPositions.gen2);
  buildPowerAuxiliaries();

  const wiring = new T.Group();
  siteRoot.add(wiring);
  const point = (key, y = 0.25) =>
    V3(powerPositions[key][0], powerPositions[key][1] + y, powerPositions[key][2]);
  cable(
    [point("grid", 0.35), V3(point("grid").x, 0.16, point("grid").z + 1), point("ats", 0.3)],
    0.04,
    MAT.blue,
    wiring,
    24
  );
  const generatorCable = (key, mat) => {
    const start = point(key, 0.55);
    const end = point("ats", 0.35);
    if (st.env === "URBAN_ROOFTOP")
      cable(
        [start, V3(11.6, -7.7, start.z), V3(11.6, 0.18, start.z), V3(end.x, 0.18, end.z + 1), end],
        0.04,
        mat,
        wiring,
        42
      );
    else
      cable(
        [start, V3(start.x, 0.15, start.z - 1.2), V3(end.x - 1, 0.15, end.z + 1), end],
        0.04,
        mat,
        wiring,
        34
      );
  };
  generatorCable("gen1", MAT.orange);
  if (st.power.sourceMode === "DUAL_GENERATOR_OFFGRID") generatorCable("gen2", MAT.red);
  cable([point("ats", 0.4), point("mdb", 0.4)], 0.045, MAT.copper, wiring, 8);
  cable([point("mdb", 0.32), point("rectifier", 0.32)], 0.04, MAT.blue, wiring, 16);
  cable([point("mdb", 0.28), point("acBoard", 0.28)], 0.035, MAT.orange, wiring, 8);
  const acRearZ = st.env === "URBAN_ROOFTOP" ? -8.42 : -8.56;
  cable(
    [
      point("acBoard", 0.22),
      V3(powerPositions.acBoard[0], 0.22, acRearZ),
      V3(powerPositions.ac1[0], 0.22, acRearZ),
      point("ac1", 0.12),
    ],
    0.025,
    MAT.dark,
    wiring,
    16
  );
  cable(
    [
      point("acBoard", 0.2),
      V3(powerPositions.acBoard[0], 0.2, acRearZ),
      V3(powerPositions.ac2[0], 0.2, acRearZ),
      point("ac2", 0.1),
    ],
    0.025,
    MAT.dark,
    wiring,
    16
  );
  cable([point("rectifier", 0.35), point("battery", 0.35)], 0.05, MAT.copper, wiring, 10);
  cable([point("rectifier", 0.28), V3(2, 0.18, -3), V3(0, 0.25, 0)], 0.04, MAT.blue, wiring, 24);
  const fuelStart = V3(fuelTankWorld.x, fuelTankWorld.y + 0.28, fuelTankWorld.z);
  const fuelLine = (key) => {
    const end = point(key, 0.48);
    if (st.env === "URBAN_ROOFTOP")
      cable([fuelStart, V3(15.5, -7.85, fuelStart.z), end], 0.025, MAT.dark, wiring, 18);
    else
      cable(
        [fuelStart, V3(4, 0.12, 6), V3(-5, 0.12, 6), V3(end.x, 0.12, end.z + 1.4), end],
        0.025,
        MAT.dark,
        wiring,
        42
      );
  };
  fuelLine("gen1");
  if (st.power.sourceMode === "DUAL_GENERATOR_OFFGRID") fuelLine("gen2");
  powerRegister(wiring, {
    id: "power-cabling",
    kind: "power-cabling",
    powerKey: "power-system",
    title: "Interlocked AC, DC & Fuel Cable Routes",
    focusSize: 10,
  });
}

// -------------------------------------------------------------------------
// Phase 03 — multi-vendor cabinet, 19-inch elevation and alarm highway
// -------------------------------------------------------------------------
const rackVisuals = {
  root: null,
  doors: [],
  modules: new Map(),
  fans: [],
  portLeds: {},
  stationPoints: {},
  stationLeds: [],
  patchCable: null,
  patchGroup: null,
  alarmGroup: null,
  alarmCurve: null,
  alarmPulses: [],
};
const rackLabelCache = new Map();
const RACK_U = 0.04445;
const RACK_FRONT_Z = 0.105;

function rackRegister(object, data) {
  return register(object, { domain: "rack", ...data });
}

function rackLabelMaterial(text, dark = true) {
  const key = `${text}|${dark}`;
  if (rackLabelCache.has(key)) return rackLabelCache.get(key);
  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = 768;
  labelCanvas.height = 128;
  const context = labelCanvas.getContext("2d");
  if (!context) {
    const fallback = new T.MeshBasicMaterial({
      color: dark ? 0x0f172a : 0xf8fafc,
      side: T.DoubleSide,
    });
    rackLabelCache.set(key, fallback);
    return fallback;
  }
  context.fillStyle = dark ? "#0F172A" : "#F8FAFC";
  context.fillRect(0, 0, 768, 128);
  context.fillStyle = dark ? "#F8FAFC" : "#0F172A";
  context.font = "700 43px monospace";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const fitted = text.length > 30 ? text.slice(0, 30) : text;
  context.fillText(fitted, 384, 66, 720);
  const texture = new T.CanvasTexture(labelCanvas);
  texture.encoding = T.sRGBEncoding;
  texture.generateMipmaps = false;
  texture.minFilter = T.LinearFilter;
  const labelMaterial = new T.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: T.DoubleSide,
    depthWrite: false,
  });
  rackLabelCache.set(key, labelMaterial);
  return labelMaterial;
}

function rackLabel(text, width, height, x, y, z, parent, dark = true) {
  const label = mesh(new T.PlaneGeometry(width, height), rackLabelMaterial(text, dark), parent);
  label.position.set(x, y, z);
  label.castShadow = label.receiveShadow = false;
  label.renderOrder = 4;
  label.raycast = () => {};
  return label;
}

function rackPosition() {
  return st.env === "URBAN_ROOFTOP" ? [-6.5, 0, 4.8] : [-3.8, 0, 4.2];
}

function buildRackModule(key, x, y, width, height, label, moduleZ, color = MAT.ink) {
  const group = new T.Group();
  group.position.set(x, y, moduleZ);
  rackVisuals.root.add(group);
  const curated = isRackSlotCurated(key);
  if (curated && st.rack.slots[key]) {
    box(width, height, 0.16, color, 0, 0, 0, group, true);
    box(
      Math.max(0.012, width - 0.012),
      Math.max(0.012, height - 0.012),
      0.018,
      MAT.lightSteel,
      0,
      0,
      0.089,
      group,
      false
    );
    rackLabel(
      label,
      Math.max(0.02, width - 0.018),
      Math.min(height * 0.52, 0.055),
      0,
      0,
      0.102,
      group,
      true
    );
  } else if (curated) {
    box(width, height, 0.025, RACK_EMPTY, 0, 0, 0.065, group, false);
    rackLabel(
      `EMPTY · ${label}`,
      Math.max(0.02, width - 0.012),
      Math.min(height * 0.45, 0.04),
      0,
      0,
      0.081,
      group,
      false
    );
  }
  if (curated) {
    const pickPlate = box(
      width + 0.008,
      height + 0.008,
      0.01,
      RACK_DOOR_PICK,
      0,
      0,
      0.122,
      group,
      false
    );
    pickPlate.castShadow = pickPlate.receiveShadow = false;
    rackVisuals.stationPoints[key] = V3(x, y, moduleZ + RACK_FRONT_Z);
    rackRegister(group, {
      id: `rack-${key}`,
      rackKey: key,
      title: rackCardContent(key).title,
      focusSize: Math.max(0.48, height * 4.2),
    });
  }
  rackVisuals.modules.set(key, group);
  return group;
}

function buildRackDoor(housing, baseY) {
  const doors = new T.Group();
  rackVisuals.root.add(doors);
  const doorCount = housing.doubleDoor ? 2 : 1;
  const doorWidth = housing.width / doorCount;
  for (let index = 0; index < doorCount; index++) {
    // Left leaf is +1; the right leaf is -1 and swings opposite.
    const actualSign = housing.doubleDoor ? (index === 0 ? 1 : -1) : 1;
    const pivot = new T.Group();
    pivot.position.set(
      housing.doubleDoor
        ? index === 0
          ? -housing.width / 2
          : housing.width / 2
        : -housing.width / 2,
      0,
      housing.depth / 2 + 0.035
    );
    doors.add(pivot);
    const centerX = (actualSign * doorWidth) / 2;
    const centerY = baseY + housing.height / 2;
    const meshDoor = st.rack.vendor === "ERICSSON" && !housing.outdoor;
    box(
      doorWidth,
      housing.height,
      0.018,
      meshDoor ? RACK_DOOR_PICK : MAT.lightSteel,
      centerX,
      centerY,
      0,
      pivot,
      !meshDoor
    );
    [-1, 1].forEach((edge) => {
      box(
        0.018,
        housing.height,
        0.025,
        MAT.ink,
        centerX + edge * (doorWidth / 2 - 0.009),
        centerY,
        0.006,
        pivot,
        false
      );
      box(
        doorWidth,
        0.018,
        0.025,
        MAT.ink,
        centerX,
        centerY + edge * (housing.height / 2 - 0.009),
        0.006,
        pivot,
        false
      );
    });
    if (meshDoor) {
      for (let i = 1; i < 7; i++)
        box(
          0.004,
          housing.height - 0.04,
          0.006,
          MAT.galvanized,
          (actualSign * doorWidth * i) / 7,
          centerY,
          0.012,
          pivot,
          false
        );
      for (let i = 1; i < 15; i++)
        box(
          doorWidth - 0.03,
          0.004,
          0.006,
          MAT.galvanized,
          centerX,
          baseY + (housing.height * i) / 15,
          0.012,
          pivot,
          false
        );
    } else {
      for (let i = 0; i < 6; i++)
        box(
          doorWidth * 0.45,
          0.008,
          0.008,
          MAT.steel,
          centerX,
          baseY + 0.25 + i * 0.025,
          0.018,
          pivot,
          false
        );
    }
    const handleX = actualSign * (doorWidth - 0.055);
    box(0.025, 0.18, 0.045, MAT.dark, handleX, centerY, 0.035, pivot, false);
    rackLabel(
      housing.model,
      Math.min(doorWidth - 0.06, 0.5),
      0.065,
      centerX,
      baseY + housing.height - 0.13,
      0.024,
      pivot,
      false
    );
    pivot.rotation.y = -actualSign * rackSim.door * Math.PI * 0.68;
    rackVisuals.doors.push({ pivot, sign: actualSign });
  }
  rackRegister(doors, {
    id: "rack-door",
    rackKey: "door",
    title: RACK_CONTENT.door.title,
    focusSize: 2.5,
  });
}

function buildRackPatch() {
  const router = rackVisuals.modules.get("router");
  const tdm = rackVisuals.modules.get("tdm");
  if (!router || !tdm) return;
  if (st.rack.slots.router) {
    rackVisuals.portLeds.router = statusLed(router, 0.073, 0.014, 0.112, LED.off, 0.009);
    box(0.025, 0.016, 0.016, MAT.dark, 0.073, -0.006, 0.108, router, false);
  }
  if (st.rack.slots.tdm) {
    rackVisuals.portLeds.tdm = statusLed(tdm, -0.073, 0.014, 0.112, LED.off, 0.009);
    box(0.025, 0.016, 0.016, MAT.dark, -0.073, -0.006, 0.108, tdm, false);
  }
  if (!st.rack.slots.router || !st.rack.slots.tdm) return;
  const routerPort = router.position.clone().add(V3(0.073, -0.006, RACK_FRONT_Z));
  const tdmPort = tdm.position.clone().add(V3(-0.073, -0.006, RACK_FRONT_Z));
  const curve = new T.CatmullRomCurve3([
    routerPort,
    routerPort.clone().add(V3(0, -0.015, 0.09)),
    routerPort
      .clone()
      .lerp(tdmPort, 0.5)
      .add(V3(0, -0.14, 0.18)),
    tdmPort.clone().add(V3(0, -0.015, 0.09)),
    tdmPort,
  ]);
  const group = new T.Group();
  rackVisuals.root.add(group);
  const patch = mesh(new T.TubeGeometry(curve, 48, 0.012, 8, false), RACK_YELLOW, group);
  patch.castShadow = false;
  patch.raycast = () => {};
  group.visible = rackSim.patchLink && rackSim.patchProgress > 0;
  patch.geometry.setDrawRange(
    0,
    Math.floor((patch.geometry.index.count * rackSim.patchProgress) / 6) * 6
  );
  rackVisuals.patchGroup = group;
  rackVisuals.patchCable = patch;
}

function buildRackAlarmHighway(housing) {
  const stationKeys = ["ovp", "sau", "scu", "shu", "dug"];
  const points = stationKeys.map((key) => rackVisuals.stationPoints[key]).filter(Boolean);
  if (points.length !== 5) return;
  const group = new T.Group();
  rackVisuals.root.add(group);
  const curve = new T.CatmullRomCurve3(points, false, "centripetal", 0.15);
  const path = mesh(new T.TubeGeometry(curve, 60, 0.012, 6, false), RACK_PATH, group);
  path.castShadow = false;
  path.raycast = () => {};
  points.forEach((point) => {
    const led = statusLed(group, point.x, point.y, point.z + 0.012, LED.off, 0.014);
    led.raycast = () => {};
    rackVisuals.stationLeds.push(led);
  });
  for (let i = 0; i < 3; i++) {
    const pulse = mesh(new T.SphereGeometry(0.026, 10, 8), RACK_CYAN, group);
    pulse.castShadow = false;
    pulse.raycast = () => {};
    const glow = mesh(new T.SphereGeometry(0.055, 10, 8), RACK_GLOW, pulse);
    glow.castShadow = false;
    glow.raycast = () => {};
    rackVisuals.alarmPulses.push(pulse);
  }
  group.visible = rackSim.alarmBadge || rackSim.alarmTraceActive;
  rackVisuals.alarmGroup = group;
  rackVisuals.alarmCurve = curve;
  // External dry-contact bundle: door, fuel and generator sensors enter the OVP first.
  const ovp = points[0];
  const external = cable(
    [ovp.clone(), ovp.clone().add(V3(0.16, -0.18, 0.06)), ovp.clone().add(V3(0.28, -0.65, 0.35))],
    0.008,
    MAT.dark,
    rackVisuals.root,
    16
  );
  external.raycast = () => {};
  rackLabel(
    "DOOR · FUEL · GEN",
    0.32,
    0.035,
    housing.width / 2 + 0.22,
    0.58,
    housing.depth / 2 + 0.08,
    rackVisuals.root,
    true
  );
}

function buildRack() {
  rackVisuals.doors = [];
  rackVisuals.modules.clear();
  rackVisuals.fans = [];
  rackVisuals.portLeds = {};
  rackVisuals.stationPoints = {};
  rackVisuals.stationLeds = [];
  rackVisuals.patchCable = null;
  rackVisuals.patchGroup = null;
  rackVisuals.alarmGroup = null;
  rackVisuals.alarmCurve = null;
  rackVisuals.alarmPulses = [];
  const housing = rackHousing();
  const root = new T.Group();
  root.position.set(...rackPosition());
  siteRoot.add(root);
  rackVisuals.root = root;
  const baseY = 0.18;
  const w = housing.width,
    h = housing.height,
    d = housing.depth;
  box(w + 0.22, 0.12, d + 0.22, MAT.concrete, 0, 0.06, 0, root, true);
  box(w, 0.09, d, MAT.steel, 0, baseY - 0.045, 0, root, true);
  box(0.045, h, d, MAT.lightSteel, -w / 2, baseY + h / 2, 0, root, true);
  box(0.045, h, d, MAT.lightSteel, w / 2, baseY + h / 2, 0, root, true);
  box(w, h, 0.035, MAT.lightSteel, 0, baseY + h / 2, -d / 2, root, true);
  box(
    w + 0.05,
    0.07,
    d + 0.05,
    housing.outdoor ? MAT.white : MAT.steel,
    0,
    baseY + h,
    0,
    root,
    true
  );
  const railX = 0.4826 / 2;
  [-railX, railX].forEach((x) =>
    box(0.018, 1.53, 0.025, MAT.galvanized, x, 0.98, d / 2 - 0.075, root, false)
  );
  rackLabel(
    `${housing.vendor} · ${housing.model} · 19 INCH`,
    Math.min(w - 0.08, 0.72),
    0.065,
    0,
    baseY + h + 0.085,
    d / 2 + 0.02,
    root,
    true
  );
  if (housing.outdoor)
    rackLabel(
      "IP55 · WEATHERPROOF",
      Math.min(w - 0.12, 0.55),
      0.045,
      0,
      baseY + h - 0.07,
      d / 2 + 0.025,
      root,
      false
    );

  const moduleZ = d / 2 - 0.12;
  const topY = 1.68;
  const fauY = topY - RACK_U / 2;
  const shelf1Y = topY - RACK_U - 3 * RACK_U;
  const shelf2Y = topY - 7 * RACK_U - 1.5 * RACK_U;
  const shelf3Y = topY - 10 * RACK_U - 1.5 * RACK_U;
  const shelf4Y = topY - 13 * RACK_U - 2 * RACK_U;

  const fau = buildRackModule(
    "fau",
    0,
    fauY,
    0.46,
    RACK_U * 0.9,
    "FAU · 4 FAN EXHAUST",
    moduleZ,
    MAT.steel
  );
  for (let i = 0; i < 4; i++) {
    const fan = new T.Group();
    fan.position.set(-0.165 + i * 0.11, 0, 0.114);
    fau.add(fan);
    const ring = mesh(new T.TorusGeometry(0.018, 0.003, 6, 16), MAT.dark, fan);
    ring.castShadow = false;
    box(0.032, 0.004, 0.004, MAT.dark, 0, 0, 0, fan, false);
    box(0.004, 0.032, 0.004, MAT.dark, 0, 0, 0, fan, false);
    rackVisuals.fans.push(fan);
  }

  const radio = new T.Group();
  radio.position.set(0, shelf1Y, moduleZ);
  root.add(radio);
  box(0.46, 6 * RACK_U * 0.94, 0.16, MAT.steel, 0, 0, 0, radio, true);
  rackLabel(
    `SHELF 1 · 6U · RADIO ${st.rack.radioCount}/12`,
    0.42,
    0.035,
    0,
    0.103,
    0.095,
    radio,
    true
  );
  for (let i = 0; i < 12; i++) {
    const row = Math.floor(i / 6),
      col = i % 6;
    const ru = box(
      0.063,
      0.071,
      0.11,
      i < st.rack.radioCount ? MAT.blue : MAT.dark,
      -0.19 + col * 0.076,
      0.045 - row * 0.09,
      0.065,
      radio,
      false
    );
    statusLed(
      radio,
      -0.19 + col * 0.076,
      0.045 - row * 0.09,
      0.125,
      i < st.rack.radioCount ? LED.green : LED.off,
      0.006
    );
    ru.castShadow = false;
  }
  rackRegister(radio, {
    id: "rack-radio",
    rackKey: "radio",
    title: RACK_CONTENT.radio.title,
    focusSize: 1.1,
  });

  buildRackModule(
    "baseband",
    0,
    shelf2Y + RACK_U * 0.72,
    0.46,
    RACK_U * 0.86,
    rackCardLabel("baseband", "BASEBAND 6630 · 5G / 4G"),
    moduleZ,
    MAT.blue
  );
  buildRackModule(
    "dug",
    -0.198,
    shelf2Y - RACK_U * 0.72,
    0.058,
    RACK_U * 1.35,
    rackCardLabel("dug", "DUG 20 01"),
    moduleZ
  );
  buildRackModule(
    "duw",
    -0.108,
    shelf2Y - RACK_U * 0.72,
    0.116,
    RACK_U * 1.35,
    rackCardLabel("duw", "DUW 30 01"),
    moduleZ
  );
  buildRackModule(
    "scu",
    0.005,
    shelf2Y - RACK_U * 0.72,
    0.09,
    RACK_U * 1.35,
    "SCU",
    moduleZ,
    MAT.steel
  );
  buildRackModule(
    "shu",
    0.106,
    shelf2Y - RACK_U * 0.72,
    0.088,
    RACK_U * 1.35,
    "SHU",
    moduleZ,
    MAT.steel
  );
  buildRackModule(
    "sau",
    0.202,
    shelf2Y - RACK_U * 0.72,
    0.08,
    RACK_U * 1.35,
    "SAU3",
    moduleZ,
    MAT.steel
  );

  const powerShelf = new T.Group();
  powerShelf.position.set(0, shelf3Y, moduleZ);
  root.add(powerShelf);
  box(0.46, 3 * RACK_U * 0.9, 0.16, MAT.steel, 0, 0, 0, powerShelf, true);
  ["PCF", "PCU", "PSU", "PDU", "PFU", "BFU"].forEach((label, index) => {
    box(
      0.065,
      0.078,
      0.11,
      index === 5 ? MAT.copper : MAT.lightSteel,
      -0.19 + index * 0.076,
      0,
      0.065,
      powerShelf,
      false
    );
    rackLabel(label, 0.056, 0.024, -0.19 + index * 0.076, 0, 0.124, powerShelf, true);
  });
  rackRegister(powerShelf, {
    id: "rack-power-shelf",
    rackKey: "power-shelf",
    title: RACK_CONTENT["power-shelf"].title,
    focusSize: 0.8,
  });

  const router = buildRackModule(
    "router",
    -0.116,
    shelf4Y + RACK_U,
    0.218,
    RACK_U * 0.88,
    rackCardLabel("router", "ROUTER 6471 · 30 Gbps"),
    moduleZ,
    MAT.blue
  );
  const tdm = buildRackModule(
    "tdm",
    0.116,
    shelf4Y + RACK_U,
    0.218,
    RACK_U * 0.88,
    rackCardLabel("tdm", "TDM 1001 · 8 × E1"),
    moduleZ,
    MAT.steel
  );
  buildRackModule(
    "amm",
    0,
    shelf4Y - RACK_U * 0.85,
    0.46,
    RACK_U * 1.55,
    rackCardLabel("amm", "MINI-LINK · AMM 2P / 6P"),
    moduleZ,
    MAT.steel
  );
  router.userData.ports = { yellow: "Router Port 2" };
  tdm.userData.ports = { yellow: "TDM Port 1B" };

  const ovpX = w / 2 + 0.13;
  const ovp = buildRackModule("ovp", ovpX, 1.28, 0.19, 0.24, "OVP · SURGE", moduleZ, MAT.orange);
  rackVisuals.stationPoints.ovp = V3(ovpX, 1.28, moduleZ + RACK_FRONT_Z);
  ovp.userData.station = 1;

  const tray = new T.Group();
  tray.position.set(0, 0.55, moduleZ);
  root.add(tray);
  box(0.46, 0.42, 0.16, MAT.dark, 0, 0, -0.025, tray, true);
  for (let i = 0; i < 4; i++) {
    box(0.098, 0.15, 0.13, MAT.steel, -0.165 + i * 0.11, 0.075, 0.04, tray, true);
    statusLed(tray, -0.165 + i * 0.11, 0.16, 0.045, LED.blue, 0.008);
  }
  rackLabel(
    `4 × 12V VRLA · ${st.power.batteryStrings} STRINGS`,
    0.42,
    0.04,
    0,
    0.19,
    0.115,
    tray,
    true
  );
  box(0.38, 0.035, 0.035, MAT.copper, 0, -0.12, 0.105, tray, true);
  for (let i = 0; i < 6; i++)
    cylinder(0.009, 0.009, 0.018, MAT.brass, -0.15 + i * 0.06, -0.12, 0.13, tray, 8).rotation.x =
      Math.PI / 2;
  rackLabel("MGB · MASTER GROUND BAR", 0.38, 0.035, 0, -0.175, 0.12, tray, false);
  rackRegister(tray, {
    id: "rack-battery-tray",
    rackKey: "battery-tray",
    title: RACK_CONTENT["battery-tray"].title,
    focusSize: 1.1,
  });

  buildRackDoor(housing, baseY);
  buildRackPatch();
  buildRackAlarmHighway(housing);
  rackRegister(root, {
    id: "rack-cabinet",
    rackKey: "cabinet",
    title: `${housing.vendor} ${housing.model} · 19-inch Cabinet`,
    focusSize: 2.5,
  });

  // DC and alarm routes remain physically connected to the Phase 2 plant.
  const destination = V3(powerPositions.rectifier[0], 0.3, powerPositions.rectifier[2]);
  const start = root.position.clone().add(V3(0, 0.3, -d / 2));
  const dcRoute = cable(
    [
      start,
      V3(start.x, 0.12, start.z - 0.5),
      V3(destination.x, 0.12, destination.z + 1.2),
      destination,
    ],
    0.025,
    MAT.blue,
    siteRoot,
    30
  );
  dcRoute.raycast = () => {};
}

// -------------------------------------------------------------------------
// Phase 04 — microwave dishes, link topology, XPIC and transmission cabling
// -------------------------------------------------------------------------
const microwaveVisuals = {
  root: null,
  dishes: [],
  odus: [],
  beams: [],
  beamPulses: [],
  modems: [],
  statusLeds: [],
  linkLeds: [],
};

function mwRegister(object, data) {
  return register(object, { domain: "microwave", ...data });
}

function parabolicDishGeometry(diameter) {
  const radial = 12,
    segments = 48,
    radius = diameter / 2,
    depth = diameter * 0.12;
  const positions = [],
    indices = [];
  for (let ring = 0; ring <= radial; ring++) {
    const r = (radius * ring) / radial;
    const z = -depth + depth * Math.pow(r / radius, 2);
    for (let segment = 0; segment <= segments; segment++) {
      const angle = (segment / segments) * Math.PI * 2;
      positions.push(r * Math.cos(angle), r * Math.sin(angle), z);
    }
  }
  for (let ring = 0; ring < radial; ring++) {
    for (let segment = 0; segment < segments; segment++) {
      const a = ring * (segments + 1) + segment;
      const b = (ring + 1) * (segments + 1) + segment;
      const c = b + 1,
        d = a + 1;
      indices.push(a, b, d, b, c, d);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildMicrowaveDish(index, y, calc) {
  const m = st.microwave;
  const d = m.diameter;
  const group = new T.Group();
  const offset = 1.35 + d * 0.5;
  group.position.set(structureTop.x + offset, y, structureTop.z);
  group.rotation.y = T.MathUtils.degToRad(m.azimuth);
  microwaveVisuals.root.add(group);
  microwaveVisuals.dishes.push(group);
  const depth = d * 0.12;
  const reflector = mesh(parabolicDishGeometry(d), MW_REFLECTOR, group);
  reflector.castShadow = true;
  const drum = mesh(new T.CylinderGeometry(d / 2, d / 2, 0.18, 48, 1, true), MW_REFLECTOR, group);
  drum.rotation.x = Math.PI / 2;
  const rim = mesh(new T.TorusGeometry(d / 2, 0.025, 8, 48), MAT.lightSteel, group);
  rim.position.z = 0.09;
  const feedZ = Math.max(0.28, d * 0.36);
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3 + Math.PI / 6;
    rodBetween(
      V3(Math.cos(angle) * d * 0.43, Math.sin(angle) * d * 0.43, 0.05),
      V3(0, 0, feedZ),
      0.012,
      MAT.steel,
      group,
      8
    );
  }
  const feed = new T.Group();
  feed.position.z = feedZ;
  group.add(feed);
  const horn = mesh(new T.ConeGeometry(0.075 + d * 0.012, 0.18, 20, 1, true), MAT.copper, feed);
  horn.rotation.x = Math.PI / 2;
  if (calc.xpicActive) {
    box(0.22, 0.07, 0.08, MAT.brass, 0, 0, -0.1, feed, true);
    box(0.07, 0.22, 0.08, MAT.blue, 0, 0, -0.1, feed, true);
    rackLabel("XPIC · V + H · OMT", 0.42, 0.055, 0, 0.19, 0, feed, true);
    mwRegister(feed, {
      id: `mw-omt-${index}`,
      mwKind: "xpic",
      title: "XPIC Dual-Polarization OMT",
      focusSize: 1.5,
    });
  }
  box(0.12, 0.12, 0.72, MAT.steel, 0, 0, -depth - 0.34, group, true);
  cylinder(
    0.055,
    0.055,
    Math.max(0.55, d * 0.65),
    MAT.galvanized,
    0,
    -0.2,
    -depth - 0.68,
    group,
    12
  );
  rackLabel(
    `${d.toFixed(1)}m · ${m.frequency} GHz`,
    Math.min(0.65, d * 0.65),
    0.06,
    0,
    -d / 2 - 0.12,
    0.02,
    group,
    true
  );
  mwRegister(group, {
    id: `mw-dish-${index}`,
    mwKind: "dish",
    title: "Directional Microwave Dish Antenna",
    focusSize: Math.max(2.4, d * 2.2),
    focusObject: reflector,
  });

  const perDish = calc.dishCount === 2 ? 1 : calc.oduCount;
  for (let radio = 0; radio < perDish; radio++) {
    const odu = new T.Group();
    const columns = perDish > 2 ? 2 : perDish;
    const row = Math.floor(radio / 2),
      col = radio % 2;
    odu.position.set(
      (col - (columns - 1) / 2) * 0.28,
      calc.mountType === "SEPARATE" ? -0.48 - row * 0.32 : 0.12 - row * 0.32,
      -depth - (calc.mountType === "SEPARATE" ? 0.82 : 0.32)
    );
    group.add(odu);
    if (calc.mountType === "SEPARATE") {
      const waveguide = cable(
        [
          V3(0, 0, -depth - 0.08),
          V3(odu.position.x * 0.5, odu.position.y * 0.55, -depth - 0.55),
          odu.position.clone(),
        ],
        0.024,
        MAT.brass,
        group,
        20
      );
      waveguide.raycast = () => {};
      box(
        0.34,
        0.06,
        0.3,
        MAT.galvanized,
        odu.position.x,
        odu.position.y - 0.18,
        odu.position.z,
        group,
        true
      );
    }
    box(0.24, 0.28, 0.16, MAT.dark, 0, 0, 0, odu, true);
    box(0.19, 0.2, 0.025, MAT.blue, 0, 0, -0.092, odu, false);
    rackLabel(`ODU ${radio + 1} · ${m.frequency} GHz`, 0.21, 0.04, 0, 0, -0.108, odu, true);
    const led = statusLed(odu, 0.085, -0.095, -0.11, LED.amber, 0.018);
    mwRegister(odu, {
      id: `mw-odu-${index}-${radio}`,
      mwKind: "odu",
      title: "Microwave Transceiver (ODU)",
      focusSize: 1.4,
    });
    microwaveVisuals.odus.push({ group: odu, led, dishIndex: index, radio });
  }

  if (calc.xpicActive && (index === 0 || calc.dishCount === 1)) {
    for (let modem = 0; modem < calc.modemCount; modem++) {
      const card = new T.Group();
      const row = Math.floor(modem / 2),
        col = modem % 2;
      card.position.set((col - 0.5) * 0.3, -0.48 - row * 0.22, -depth - 0.52);
      group.add(card);
      box(0.25, 0.16, 0.12, modem % 2 ? MAT.steel : MAT.blue, 0, 0, 0, card, true);
      rackLabel(`MODEM ${modem + 1}`, 0.2, 0.035, 0, 0, -0.07, card, true);
      mwRegister(card, {
        id: `mw-modem-${index}-${modem}`,
        mwKind: "modem",
        title: "XPIC Modem & Cancellation Card",
        focusSize: 1.1,
      });
      microwaveVisuals.modems.push(card);
    }
    const pairs =
      calc.modemCount === 4
        ? [
            [0, 3],
            [1, 2],
          ]
        : [[0, 1]];
    pairs.forEach(([a, b], pair) => {
      const start = V3(((a % 2) - 0.5) * 0.3, -0.48 - Math.floor(a / 2) * 0.22, -depth - 0.6);
      const end = V3(((b % 2) - 0.5) * 0.3, -0.48 - Math.floor(b / 2) * 0.22, -depth - 0.6);
      const cross = cable(
        [
          start,
          start
            .clone()
            .lerp(end, 0.5)
            .add(V3(0, -0.12, -0.12)),
          end,
        ],
        0.009,
        pair ? MAT.amber : MAT.blue,
        group,
        16
      );
      cross.raycast = () => {};
    });
  }

  for (let splitter = 0; splitter < calc.splitterCount; splitter++) {
    const junction = new T.Group();
    junction.position.set(
      calc.splitterCount === 2 ? (splitter ? 0.24 : -0.24) : 0.36,
      -0.24,
      -depth - 0.46
    );
    group.add(junction);
    rodBetween(V3(-0.18, 0, 0), V3(0.18, 0, 0), 0.035, MAT.brass, junction, 12);
    rodBetween(V3(0, -0.16, 0), V3(0, 0.16, 0), 0.035, MAT.brass, junction, 12);
    rackLabel(
      m.topology === "HSB" ? "ASYMMETRIC · −1.5 / −7 dB" : "SYMMETRIC · −3 dB",
      0.42,
      0.045,
      0,
      0.23,
      0,
      junction,
      true
    );
    mwRegister(junction, {
      id: `mw-splitter-${index}-${splitter}`,
      mwKind: "splitter",
      title:
        m.topology === "HSB"
          ? "Asymmetrical Waveguide Splitter"
          : "Symmetrical XPIC Waveguide Splitter",
      focusSize: 1.2,
    });
  }

  const beam = rodBetween(V3(0, 0, feedZ + 0.08), V3(0, 0, 35), 0.022, MW_BEAM, group, 8, true);
  beam.castShadow = beam.receiveShadow = false;
  beam.raycast = () => {};
  const glow = rodBetween(V3(0, 0, feedZ + 0.08), V3(0, 0, 35), 0.07, MW_BEAM_GLOW, group, 8, true);
  glow.castShadow = glow.receiveShadow = false;
  glow.raycast = () => {};
  microwaveVisuals.beams.push(beam, glow);
  for (let pulse = 0; pulse < 4; pulse++) {
    const dot = mesh(new T.SphereGeometry(0.045, 8, 8), MW_BEAM, group);
    dot.castShadow = false;
    dot.raycast = () => {};
    microwaveVisuals.beamPulses.push({ mesh: dot, offset: pulse / 4, feedZ });
  }
  return group;
}

function buildMicrowaveCabling(_calc) {
  const cabling = new T.Group();
  siteRoot.add(cabling);
  microwaveVisuals.root.updateMatrixWorld(true);
  const routerEntry = registry.get("rack-router");
  const start = routerEntry
    ? routerEntry.object.getWorldPosition(new T.Vector3())
    : V3(...rackPosition());
  let primaryPath = null;
  microwaveVisuals.odus.forEach(({ group }, index) => {
    const end = group.getWorldPosition(new T.Vector3());
    const offset = (index - (microwaveVisuals.odus.length - 1) / 2) * 0.025;
    const path = cable(
      [
        start.clone().add(V3(offset, 0, 0)),
        V3(structureTop.x - 0.22 + offset, 0.24, structureTop.z + 0.26),
        V3(structureTop.x - 0.22 + offset, structureTop.y - 1.1, structureTop.z + 0.26),
        end,
      ],
      0.005,
      MAT.dark,
      cabling,
      48
    );
    if (index === 0) primaryPath = path;
    else path.raycast = () => {};
  });
  mwRegister(primaryPath || cabling, {
    id: "mw-coax",
    mwKind: "coax",
    title: "MINI-LINK IF Coaxial Cable · Ø10 mm",
    focusSize: 5,
  });
  const ground = new T.Group();
  ground.position.set(structureTop.x - 0.22, structureTop.y - 1.1, structureTop.z + 0.26);
  siteRoot.add(ground);
  box(0.16, 0.09, 0.12, MAT.copper, 0, 0, 0, ground, true);
  const bond = cable(
    [V3(0, 0, 0), V3(-0.08, -0.35, -0.05), V3(-0.15, -0.75, -0.18)],
    0.012,
    MAT.copper,
    ground,
    12
  );
  bond.raycast = () => {};
  rackLabel("FEEDER GROUND KIT", 0.42, 0.05, 0, 0.18, 0, ground, true);
  mwRegister(ground, {
    id: "mw-feeder-ground",
    mwKind: "ground",
    title: "Feeder Grounding Kit",
    focusSize: 1.8,
  });
}

function buildMicrowave() {
  microwaveVisuals.dishes = [];
  microwaveVisuals.odus = [];
  microwaveVisuals.beams = [];
  microwaveVisuals.beamPulses = [];
  microwaveVisuals.modems = [];
  microwaveVisuals.statusLeds = [];
  microwaveVisuals.linkLeds = [];
  const root = new T.Group();
  siteRoot.add(root);
  microwaveVisuals.root = root;
  if (transmissionSceneMode() === "CELLULAR") return;
  const calc = calculateMicrowave();
  const primaryY = Math.max(1.4, structureTop.y - (calc.dishCount === 2 ? 0.7 : 1.7));
  buildMicrowaveDish(0, primaryY, calc);
  if (calc.dishCount === 2) {
    const secondaryY = primaryY - st.microwave.spacing;
    buildMicrowaveDish(1, secondaryY, calc);
    const diversity = new T.Group();
    diversity.position.set(structureTop.x + 0.45, (primaryY + secondaryY) / 2, structureTop.z);
    siteRoot.add(diversity);
    cylinder(0.065, 0.065, st.microwave.spacing + 0.8, MAT.steel, 0, 0, 0, diversity, 12);
    rackLabel(
      `SPACE DIVERSITY · ${st.microwave.spacing.toFixed(1)}m`,
      0.65,
      0.06,
      0,
      0,
      0.1,
      diversity,
      true
    );
    mwRegister(diversity, {
      id: "mw-space-diversity",
      mwKind: "sd",
      title: "Space Diversity Dual Dishes",
      focusSize: st.microwave.spacing + 2,
    });
  }
  const anchor = new T.Group();
  anchor.position.set(structureTop.x + 0.4, primaryY + 0.8, structureTop.z);
  siteRoot.add(anchor);
  box(0.16, 0.16, 0.16, MAT.amber, 0, 0, 0, anchor, true);
  const linkLed = statusLed(anchor, 0, 0.16, 0, LED.amber, 0.055);
  microwaveVisuals.linkLeds.push(linkLed);
  mwRegister(anchor, {
    id: "mw-system",
    mwKind: "system",
    title: "Microwave Transmission & Backhaul Link",
    focusSize: 9,
  });
  buildMicrowaveCabling(calc);
}

// -------------------------------------------------------------------------
// Phase 05 — smart cellular sectors, RF feeders and Site Master diagnostics
// -------------------------------------------------------------------------
const RF_BEAM = new T.MeshBasicMaterial({
  color: 0xf59e0b,
  transparent: true,
  opacity: 0.045,
  side: T.DoubleSide,
  depthWrite: false,
});
const RF_PICK = new T.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0,
  depthWrite: false,
});
const LAUNCH_PULSE_MATERIALS = Array.from(
  { length: 5 },
  () =>
    new T.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.2,
      side: T.DoubleSide,
      depthWrite: false,
    })
);
const LAUNCH_BEACON_GLOW = new T.MeshBasicMaterial({
  color: 0xef4444,
  transparent: true,
  opacity: 0.2,
  depthWrite: false,
});
const cellularVisuals = { root: null, sectors: [], cables: [], siteMasterLed: null };
const launchVisuals = { pulseAnchors: [], pulses: [], beacon: null, beaconGlow: null };

function rfRegister(object, data) {
  return register(object, { domain: "cellular", ...data });
}

function sectorBeamGeometry(length = 26) {
  const nearZ = 0.12,
    farZ = length;
  const nearW = 0.06,
    nearH = 0.04;
  const farW = Math.tan(T.MathUtils.degToRad(65 / 2)) * length;
  const farH = Math.tan(T.MathUtils.degToRad(12 / 2)) * length;
  const vertices = [
    -nearW,
    -nearH,
    nearZ,
    nearW,
    -nearH,
    nearZ,
    nearW,
    nearH,
    nearZ,
    -nearW,
    nearH,
    nearZ,
    -farW,
    -farH,
    farZ,
    farW,
    -farH,
    farZ,
    farW,
    farH,
    farZ,
    -farW,
    farH,
    farZ,
  ];
  const indices = [
    0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7, 4, 5, 6, 4, 6, 7,
  ];
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.userData = { horizontalBeamwidth: 65, verticalBeamwidth: 12, length };
  return geometry;
}

function buildCellularAntenna(index, kind, xOffset) {
  const sector = st.cellular.sectors[index];
  const group = new T.Group();
  group.position.x = xOffset;
  cellularVisuals.sectors[index].group.add(group);
  const active = kind === "aau";
  const width = active ? 0.72 : 0.58,
    height = active ? 1.45 : 1.55,
    depth = active ? 0.28 : 0.16;
  const body = box(width, height, depth, active ? MAT.lightSteel : MAT.white, 0, 0, 0, group, true);
  box(
    width * 0.88,
    height * 0.91,
    0.025,
    active ? MAT.steel : MAT.lightSteel,
    0,
    0,
    -depth / 2 - 0.015,
    group,
    false
  );
  box(0.1, 0.1, 0.5, MAT.galvanized, 0, 0, -depth / 2 - 0.25, group, true);
  if (active) {
    for (let fin = 0; fin < 8; fin++)
      box(
        0.035,
        height * 0.72,
        0.025,
        MAT.dark,
        -0.25 + fin * 0.072,
        0,
        -depth / 2 - 0.04,
        group,
        false
      );
    box(0.07, 0.045, 0.06, MAT.brass, -0.12, -height / 2 - 0.025, 0, group, false);
    box(0.07, 0.045, 0.06, MAT.brass, 0.12, -height / 2 - 0.025, 0, group, false);
    rackLabel(aauModel(), 0.65, 0.065, 0, 0.42, depth / 2 + 0.012, group, true);
    rackLabel("ACTIVE · 64T64R · eCPRI", 0.58, 0.05, 0, 0.31, depth / 2 + 0.013, group, true);
  } else {
    rackLabel("PASSIVE SECTOR · 65°", 0.52, 0.06, 0, 0.46, depth / 2 + 0.012, group, true);
    const passiveBandLabel =
      st.generation === "MIXED"
        ? "LEGACY 2G / 3G"
        : st.generation === "CUSTOM" && normalizeCustomGenerations().includes("5G")
          ? normalizeCustomGenerations()
              .filter((gen) => gen !== "5G")
              .join(" / ")
          : cellularGeneration().label.toUpperCase();
    rackLabel(passiveBandLabel, 0.48, 0.05, 0, 0.35, depth / 2 + 0.013, group, true);
  }
  statusLed(
    group,
    width / 2 - 0.07,
    -height / 2 + 0.09,
    depth / 2 + 0.02,
    sector.onAir ? LED.green : LED.off,
    0.025
  );
  rfRegister(group, {
    id: `rf-${kind}-${index}`,
    rfKind: kind,
    sector: index,
    title: active
      ? "Active Antenna Unit (64T64R Massive MIMO)"
      : "Directional Sector Panel Antenna",
    focusSize: 2.4,
    focusObject: body,
  });
  return group;
}

function buildTMA(index, panel) {
  const group = new T.Group();
  group.position.set(panel.position.x, -1.08, -0.02);
  cellularVisuals.sectors[index].group.add(group);
  const body = box(0.34, 0.42, 0.24, MAT.steel, 0, 0, 0, group, true);
  box(0.26, 0.29, 0.025, MAT.blue, 0, 0, 0.135, group, false);
  rackLabel("TMA · UPLINK LNA", 0.28, 0.045, 0, 0, 0.151, group, true);
  statusLed(group, 0.11, -0.14, 0.15, LED.green, 0.018);
  const jumper = cable([V3(0, 0.21, 0), V3(0, 0.31, 0)], 0.0111, MAT.dark, group, 6);
  jumper.raycast = () => {};
  rfRegister(group, {
    id: `rf-tma-${index}`,
    rfKind: "tma",
    sector: index,
    title: "Tower Mounted Amplifier (TMA)",
    focusSize: 1.2,
    focusObject: body,
  });
  return group;
}

function rfPath(points, radius, material, parent, segments = 64) {
  const curve = new T.CatmullRomCurve3(points, false, "centripetal", 0.2);
  const path = mesh(new T.TubeGeometry(curve, segments, radius, 7, false), material, parent);
  path.castShadow = false;
  return { path, curve };
}

function buildRFCableRun(index, type, endObject) {
  const group = new T.Group();
  siteRoot.add(group);
  const preferred =
    type === "fiber"
      ? registry.get("rack-baseband")
      : registry.get("rack-dug") || registry.get("rack-baseband");
  const start = preferred ? preferred.object.localToWorld(V3(0, 0, 0.112)) : V3(...rackPosition());
  const end = endObject.localToWorld(type === "fiber" ? V3(0, -0.75, 0) : V3(0, -0.21, 0));
  const offset = (index - 1) * 0.065;
  const ladder = V3(structureTop.x - 0.28 + offset, 0, structureTop.z + 0.3);
  const nominal = T.MathUtils.degToRad(30 + index * 120);
  const serviceLoop = end
    .clone()
    .add(V3(Math.cos(nominal) * 0.45, 0.12, -Math.sin(nominal) * 0.45));
  const points = [
    start,
    V3(start.x, 0.22, start.z),
    V3(ladder.x, 0.24, ladder.z),
    V3(ladder.x, structureTop.y - 1.15, ladder.z),
    serviceLoop,
    end,
  ];
  const isFiber = type === "fiber";
  const actual = [];
  const duplexOffsets = isFiber ? [-0.12, 0.12] : [0];
  duplexOffsets.forEach((duplex) => {
    const shifted = points.map((point, pointIndex) =>
      point
        .clone()
        .add(
          pointIndex === 0 || pointIndex === points.length - 1
            ? V3(duplex, 0, 0)
            : V3(duplex * 0.25, 0, 0)
        )
    );
    const result = rfPath(
      shifted,
      isFiber ? 0.004 : 0.0111,
      isFiber ? RACK_YELLOW : MAT.dark,
      group
    );
    result.path.raycast = () => {};
    actual.push(result);
  });
  const pick = rfPath(points, 0.055, RF_PICK, group);
  pick.path.castShadow = pick.path.receiveShadow = false;
  const connector = box(
    0.12,
    0.16,
    0.1,
    isFiber ? MAT.brass : MAT.dark,
    serviceLoop.x,
    serviceLoop.y,
    serviceLoop.z,
    group,
    false
  );
  rfRegister(group, {
    id: `rf-${type}-${index}`,
    rfKind: type,
    sector: index,
    title: isFiber
      ? "eCPRI Single-Mode Duplex Optical Fiber"
      : "7/8-inch Corrugated Copper Coaxial Feeder",
    focusSize: 3.2,
    focusObject: connector,
  });
  cellularVisuals.cables.push({ group, curve: actual[0].curve, type, sector: index });
  if (!isFiber) {
    for (let ring = 0; ring < 4; ring++) {
      const corrugation = mesh(new T.TorusGeometry(0.014, 0.003, 6, 12), MAT.dark, group);
      corrugation.position.set(ladder.x, structureTop.y - 1.2 - ring * 0.045, ladder.z);
      corrugation.rotation.x = Math.PI / 2;
      corrugation.raycast = () => {};
    }
    const earth = new T.Group();
    earth.position.copy(serviceLoop).add(V3(0, -0.28, 0));
    siteRoot.add(earth);
    const clampBody = box(0.17, 0.09, 0.13, MAT.copper, 0, 0, 0, earth, true);
    const bond = cable(
      [V3(0, 0, 0), V3(-0.06, -0.3, -0.04), V3(-0.14, -0.72, -0.16)],
      0.012,
      MAT.copper,
      earth,
      12
    );
    bond.raycast = () => {};
    rackLabel("FEEDER EARTH · DOWN", 0.4, 0.05, 0, 0.17, 0, earth, true);
    rfRegister(earth, {
      id: `rf-earth-${index}`,
      rfKind: "earth",
      sector: index,
      title: "Coaxial Feeder Grounding Kit",
      focusSize: 1.6,
      focusObject: clampBody,
    });
  }
}

function buildSiteMaster() {
  const group = new T.Group();
  const rack = rackPosition();
  group.position.set(rack[0] + 0.82, 0.62, rack[2] + 0.65);
  siteRoot.add(group);
  const body = box(0.3, 0.46, 0.15, MAT.dark, 0, 0, 0, group, true);
  box(0.24, 0.22, 0.025, MAT.blue, 0, 0.07, 0.088, group, false);
  rackLabel("SITE MASTER", 0.22, 0.045, 0, 0.13, 0.104, group, true);
  rackLabel("VSWR · DTF", 0.2, 0.04, 0, 0.07, 0.105, group, true);
  for (let key = 0; key < 6; key++)
    box(
      0.045,
      0.035,
      0.02,
      key === 5 ? MAT.orange : MAT.lightSteel,
      -0.07 + (key % 3) * 0.07,
      -0.1 - Math.floor(key / 3) * 0.055,
      0.09,
      group,
      false
    );
  cellularVisuals.siteMasterLed = statusLed(group, 0.1, 0.18, 0.1, LED.off, 0.018);
  const testLead = cable(
    [V3(0.12, -0.2, 0), V3(0.24, -0.38, 0.08), V3(0.36, -0.48, 0.12)],
    0.009,
    MAT.dark,
    group,
    12
  );
  testLead.raycast = () => {};
  rfRegister(group, {
    id: "rf-site-master",
    rfKind: "siteMaster",
    title: "Handheld Cable & Antenna Analyzer",
    focusSize: 1.2,
    focusObject: body,
  });
}

function buildCellular() {
  cellularVisuals.sectors = [];
  cellularVisuals.cables = [];
  cellularVisuals.siteMasterLed = null;
  const root = new T.Group();
  siteRoot.add(root);
  cellularVisuals.root = root;
  if (transmissionSceneMode() === "MICROWAVE") return;
  const mode = cellularGeneration().rfMode;
  const radius = st.tower === "ROOFTOP_POLE" ? 1.35 : 1.9;
  const sectorY = structureTop.y - 1.45;
  const ring = mesh(new T.TorusGeometry(radius, 0.045, 8, 64), MAT.galvanized, root);
  ring.position.set(structureTop.x, sectorY - 0.82, structureTop.z);
  ring.rotation.x = Math.PI / 2;
  ring.raycast = () => {};
  [30, 150, 270].forEach((nominal, index) => {
    const group = new T.Group();
    group.position.set(
      structureTop.x + Math.sin(T.MathUtils.degToRad(nominal)) * radius,
      sectorY,
      structureTop.z + Math.cos(T.MathUtils.degToRad(nominal)) * radius
    );
    group.rotation.y = T.MathUtils.degToRad(st.cellular.sectors[index].azimuth);
    root.add(group);
    cellularVisuals.sectors.push({ group, beam: null, aau: null, panel: null, tma: null });
    const showActive = mode === "ACTIVE" || mode === "MIXED";
    const showLegacy = mode === "LEGACY" || mode === "MIXED";
    if (showActive)
      cellularVisuals.sectors[index].aau = buildCellularAntenna(
        index,
        "aau",
        showLegacy ? -0.42 : 0
      );
    if (showLegacy)
      cellularVisuals.sectors[index].panel = buildCellularAntenna(
        index,
        "panel",
        showActive ? 0.42 : 0
      );
    if (showLegacy)
      cellularVisuals.sectors[index].tma = buildTMA(index, cellularVisuals.sectors[index].panel);
    const beam = mesh(sectorBeamGeometry(), RF_BEAM, group);
    beam.position.z = 0.18;
    beam.visible = st.cellular.sectors[index].onAir;
    beam.rotation.x = T.MathUtils.degToRad(st.cellular.sectors[index].downtilt);
    beam.castShadow = beam.receiveShadow = false;
    beam.raycast = () => {};
    cellularVisuals.sectors[index].beam = beam;
  });
  root.updateMatrixWorld(true);
  cellularVisuals.sectors.forEach((sector, index) => {
    if (sector.aau) buildRFCableRun(index, "fiber", sector.aau);
    if (sector.panel) buildRFCableRun(index, "coax", sector.tma || sector.panel);
  });
  const anchor = new T.Group();
  anchor.position.set(structureTop.x, structureTop.y - 0.5, structureTop.z);
  root.add(anchor);
  const focus = box(0.18, 0.18, 0.18, MAT.amber, 0, 0, 0, anchor, true);
  rfRegister(anchor, {
    id: "rf-system",
    rfKind: "system",
    title: "Three-Sector Cellular Radio System",
    focusSize: 9,
    focusObject: focus,
  });
  buildSiteMaster();
}

function buildLaunchFX() {
  launchVisuals.pulseAnchors = [];
  launchVisuals.pulses = [];
  if (cellularVisuals.sectors.length !== 3) return;
  const geometry = new T.TorusGeometry(0.52, 0.018, 6, 36);
  cellularVisuals.sectors.forEach((visual, sectorIndex) => {
    const anchor = new T.Group();
    anchor.rotation.x = T.MathUtils.degToRad(st.cellular.sectors[sectorIndex].downtilt);
    visual.group.add(anchor);
    launchVisuals.pulseAnchors.push(anchor);
    for (let pulseIndex = 0; pulseIndex < 5; pulseIndex++) {
      const pulse = mesh(geometry, LAUNCH_PULSE_MATERIALS[pulseIndex], anchor);
      pulse.castShadow = pulse.receiveShadow = false;
      pulse.raycast = () => {};
      pulse.visible = launch.onAir;
      launchVisuals.pulses.push({
        mesh: pulse,
        sector: sectorIndex,
        pulseIndex,
        offset: pulseIndex / 5,
      });
    }
  });
}

function calculateSweep(sectorIndex = st.cellular.sector) {
  const fault = st.cellular.fault;
  const points = [];
  for (let index = 0; index <= 600; index++) {
    const distance = index / 10;
    const baseline =
      1.14 +
      Math.sin(distance * 0.41 + sectorIndex * 0.7) * 0.018 +
      Math.cos(distance * 0.13) * 0.009;
    const spike = fault ? 1.13 * Math.exp(-0.5 * Math.pow((distance - 21.3) / 0.18, 2)) : 0;
    points.push({ distance, vswr: distance === 21.3 && fault ? 2.27 : baseline + spike });
  }
  return {
    sector: sectorIndex,
    fault,
    points,
    nominal: fault ? 2.27 : 1.14,
    pass: !fault,
    faultDistance: fault ? 21.3 : null,
    max: fault ? 2.27 : Math.max(...points.map((point) => point.vswr)),
  };
}

function buildLightning() {
  const group = new T.Group();
  group.position.set(structureTop.x, structureTop.y, structureTop.z);
  siteRoot.add(group);
  const ese = st.lightning === "ESE_ACTIVE";
  if (ese) {
    cylinder(0.055, 0.075, 1.15, MAT.copper, 0, 0.58, 0, group, 12);
    cylinder(0.26, 0.34, 0.45, MAT.amber, 0, 1.02, 0, group, 20, false, true);
    cylinder(0.18, 0.26, 0.28, MAT.brass, 0, 1.38, 0, group, 20, false, true);
    const crown = mesh(new T.SphereGeometry(0.19, 16, 12), MAT.amber, group, true);
    crown.position.y = 1.6;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const fin = box(
        0.08,
        0.42,
        0.3,
        MAT.brass,
        Math.cos(a) * 0.27,
        1.18,
        Math.sin(a) * 0.27,
        group
      );
      fin.rotation.y = -a;
    }
    rodBetween(V3(0, 1.55, 0), V3(0, 2.05, 0), 0.035, MAT.copper, group, 10);
  } else {
    cylinder(0.055, 0.1, 0.4, MAT.copper, 0, 0.2, 0, group, 12);
    rodBetween(V3(0, 0.35, 0), V3(0, 2.55, 0), 0.032, MAT.copper, group, 10);
  }
  register(group, {
    id: "lightning-terminal",
    kind: "lightning",
    title: ese ? "AMPER active ESE lightning terminal" : "Standard Franklin lightning rod",
  });

  const protection = new T.Group();
  protection.position.copy(group.position);
  siteRoot.add(protection);
  if (ese) {
    const tip = 2.05;
    const height = structureTop.y + tip;
    const cone = mesh(new T.ConeGeometry(50, height, 64, 1, true), PROTECTION_ESE, protection);
    cone.position.y = tip - height / 2;
    cone.castShadow = cone.receiveShadow = false;
    cone.raycast = () => {};
    const points = [];
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI * 2) / 16;
      points.push(0, tip, 0, Math.cos(a) * 50, -structureTop.y, Math.sin(a) * 50);
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.Float32BufferAttribute(points, 3));
    const rays = new T.LineSegments(
      geometry,
      new T.LineBasicMaterial({
        color: 0xd4a900,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      })
    );
    rays.raycast = () => {};
    protection.add(rays);
  } else {
    const cone = mesh(new T.ConeGeometry(6, 6, 40, 1, true), PROTECTION_FRANKLIN, protection);
    cone.position.y = 2.55 - 3;
    cone.castShadow = cone.receiveShadow = false;
    cone.raycast = () => {};
  }

  if (st.grounding) {
    const down = new T.Group();
    siteRoot.add(down);
    cable(
      [
        V3(structureTop.x + 0.15, structureTop.y, structureTop.z),
        V3(structureTop.x + 0.2, structureTop.y * 0.55, structureTop.z + 0.2),
        V3(structureTop.x + 0.25, 0.12, structureTop.z + 0.25),
        V3(structureTop.x + 1.0, 0.08, structureTop.z + 0.8),
      ],
      0.018,
      MAT.copper,
      down,
      36
    );
    register(down, {
      id: "lightning-down-conductor",
      kind: "grounding",
      title: "Bonded lightning down conductor",
    });
  }
}

// -------------------------------------------------------------------------
// Scene lifecycle and selection / inspection
// -------------------------------------------------------------------------
function clearSite() {
  aiBuild.layers = [];
  aiBuild.cards = [];
  aiBuild.powerRoutes = [];
  triage.marker = null;
  triage.cameraTarget = null;
  if (selectionBox) {
    scene.remove(selectionBox);
    selectionBox.geometry.dispose();
    selectionBox.material.dispose();
    selectionBox = null;
  }
  selectionCenter = null;
  $("#selection-tag").style.display = "none";
  if (!siteRoot) return;
  scene.remove(siteRoot);
  const geometries = new Set();
  siteRoot.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    // Protection-ray materials are the only per-build materials.
    if (
      object.isLineSegments &&
      object.material &&
      object.material !== EDGE &&
      object.material !== FENCE_LINE &&
      object.material !== COPPER_LINE
    )
      object.material.dispose();
  });
  geometries.forEach((geometry) => geometry.dispose());
  siteRoot = null;
}

function updateInspectionLids() {
  pitVisuals.forEach((pit, id) => {
    const open = st.selectedId === id;
    pit.lid.position.set(open ? 0.67 : 0, open ? 0.5 : 0.2, 0);
    pit.lid.rotation.z = open ? Math.PI / 2 : 0;
  });
}

function updateSelection() {
  if (selectionBox) {
    scene.remove(selectionBox);
    selectionBox.geometry.dispose();
    selectionBox.material.dispose();
    selectionBox = null;
  }
  selectionCenter = null;
  updateInspectionLids();
  const selected = registry.get(st.selectedId);
  if (!selected) {
    st.selectedId = null;
    $("#selection-tag").style.display = "none";
    return;
  }
  const selectionObject = selected.data.focusObject || selected.object;
  selectionBox = new T.BoxHelper(selectionObject, 0xf97316);
  selectionBox.material.depthTest = false;
  selectionBox.material.transparent = true;
  selectionBox.material.opacity = 0.95;
  selectionBox.renderOrder = 20;
  selectionBox.raycast = () => {};
  scene.add(selectionBox);
  const bounds = new T.Box3().setFromObject(selectionObject);
  selectionCenter = bounds.getCenter(new T.Vector3());
  $("#selection-tag").textContent = selected.data.title;
}

function rebuildSite() {
  normalizeState();
  clearSite();
  registry.clear();
  pitVisuals.clear();
  siteRoot = new T.Group();
  scene.add(siteRoot);
  buildTerrain();
  buildTower();
  buildGrounding();
  buildFence();
  buildFuelTank();
  buildPower();
  buildRack();
  buildMicrowave();
  buildCellular();
  buildLaunchFX();
  buildLightning();
  if (aiBuild.running) prepareAIBuildVisuals();
  updateSelection();
  renderer.shadowMap.needsUpdate = true;
  updateHUD();
  renderDrawer();
}

let rebuildQueued = false;
function scheduleRebuild() {
  if (rebuildQueued) return;
  rebuildQueued = true;
  requestAnimationFrame(() => {
    rebuildQueued = false;
    rebuildSite();
  });
}

function selectComponent(id, focus = true) {
  const selected = registry.get(id);
  if (!selected) return;
  st.selectedId = id;
  st.tab = "overview";
  st.drawerOpen = true;
  if (selected.data.domain === "cellular") {
    st.onboarding.active = false;
    st.masterStep = 4;
    st.microwave.system = "CELLULAR";
    if (Number.isInteger(selected.data.sector)) st.cellular.sector = selected.data.sector;
    stopMicrowaveAudio();
  } else if (selected.data.domain === "microwave") {
    st.onboarding.active = false;
    st.masterStep = 4;
    st.microwave.system = "MICROWAVE";
  } else if (selected.data.domain === "rack") {
    st.onboarding.active = false;
    st.masterStep = 2;
    rackSim.doorTarget = 1;
  } else if (selected.data.domain === "power") {
    st.onboarding.active = false;
    st.masterStep = 3;
  } else st.masterStep = 1;
  updateSelection();
  updateHUD();
  renderDrawer();
  $("#drawer-content").scrollTop = 0;
  if (focus && selected.data.kind === "earth-pit") {
    const pit = pitVisuals.get(id);
    if (pit) {
      cameraGoal.target.set(pit.x, -0.75, pit.z);
      cameraGoal.size = 3.6;
      // Orbit to the outward side of the chamber so the tower never
      // occludes the electrode during a close inspection.
      cameraGoal.theta = Math.atan2(pit.z, pit.x);
      cameraGoal.phi = 0.58;
      if (reducedMotionQuery.matches) snapCameraToGoal();
    }
  } else if (focus && selected.data.domain === "cellular") {
    if (selected.data.rfKind === "system") {
      cameraGoal.target.set(structureTop.x, structureTop.y - 1.45, structureTop.z);
      cameraGoal.size = window.innerWidth < 760 ? 12 : 9;
      cameraGoal.theta = 0.82;
      cameraGoal.phi = 0.68;
    } else {
      const focusObject = selected.data.focusObject || selected.object;
      const bounds = new T.Box3().setFromObject(focusObject);
      if (!bounds.isEmpty()) cameraGoal.target.copy(bounds.getCenter(new T.Vector3()));
      cameraGoal.size = (selected.data.focusSize || 2) * (window.innerWidth < 760 ? 1.35 : 1);
      cameraGoal.theta =
        selected.data.rfKind === "siteMaster"
          ? 0.82
          : Math.PI / 2 - T.MathUtils.degToRad(st.cellular.sectors[st.cellular.sector].azimuth);
      cameraGoal.phi = 1.02;
    }
    if (reducedMotionQuery.matches) snapCameraToGoal();
  } else if (focus && selected.data.domain === "microwave") {
    if (selected.data.mwKind === "system") {
      cameraGoal.target.set(structureTop.x + 0.8, structureTop.y - 1.5, structureTop.z);
      cameraGoal.size = window.innerWidth < 760 ? 10 : 7;
    } else {
      const focusObject = selected.data.focusObject || selected.object;
      const bounds = new T.Box3().setFromObject(focusObject);
      if (!bounds.isEmpty()) cameraGoal.target.copy(bounds.getCenter(new T.Vector3()));
      cameraGoal.size = (selected.data.focusSize || 2.5) * (window.innerWidth < 760 ? 1.35 : 1);
    }
    const rear = ["odu", "splitter", "modem", "coax"].includes(selected.data.mwKind);
    cameraGoal.theta =
      Math.PI / 2 - T.MathUtils.degToRad(st.microwave.azimuth) + (rear ? Math.PI : 0);
    cameraGoal.phi = 1.05;
    if (reducedMotionQuery.matches) snapCameraToGoal();
  } else if (focus && selected.data.domain === "rack") {
    const bounds = new T.Box3().setFromObject(selected.object);
    if (!bounds.isEmpty()) cameraGoal.target.copy(bounds.getCenter(new T.Vector3()));
    const wholeCabinet = ["cabinet", "door"].includes(selected.data.rackKey);
    cameraGoal.size =
      wholeCabinet && window.innerWidth < 760
        ? 4.2
        : (selected.data.focusSize || 0.7) * (window.innerWidth < 760 ? 1.3 : 1);
    cameraGoal.theta = 1.12;
    cameraGoal.phi = 1.12;
    if (reducedMotionQuery.matches) snapCameraToGoal();
  } else if (focus && selected.data.domain === "power") {
    if (selected.data.powerKey === "power-system")
      cameraGoal.target.set(st.env === "URBAN_ROOFTOP" ? 0 : 3, 1.1, -5.6);
    else {
      const bounds = new T.Box3().setFromObject(selected.object);
      if (!bounds.isEmpty()) cameraGoal.target.copy(bounds.getCenter(new T.Vector3()));
    }
    cameraGoal.size = (selected.data.focusSize || 4) * (window.innerWidth < 760 ? 1.22 : 1);
    cameraGoal.theta = ["generator", "grid", "fuel"].includes(selected.data.powerKey)
      ? Math.atan2(cameraGoal.target.z, cameraGoal.target.x)
      : 0.82;
    cameraGoal.phi = 0.88;
    if (reducedMotionQuery.matches) snapCameraToGoal();
  }
}

function isRackMode() {
  return st.masterStep === 2;
}

function isTransmissionMode() {
  return st.masterStep === 4;
}

function isPowerSelection() {
  const selected = registry.get(st.selectedId);
  return !!(selected && selected.data.domain === "power");
}

function clearSelection() {
  st.selectedId = null;
  if (!isRackMode() && !isTransmissionMode() && st.masterStep !== 5) st.masterStep = 1;
  updateSelection();
  renderDrawer();
}

// -------------------------------------------------------------------------
// Drawer views and live specification cards
// -------------------------------------------------------------------------
const escapeHTML = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]
  );
const badge = (pass, passText = "PASS", failText = "FAIL") =>
  `<span class="badge ${pass ? "pass" : "fail"}">${pass ? "✓" : "×"} ${pass ? passText : failText}</span>`;

function codeSnippet() {
  const calc = calculateEngineering();
  const resistance = Number.isFinite(calc.resistance) ? calc.resistance.toFixed(1) : "null";
  return `site.environment = "${st.env}";\nsite.tower = { type: "${st.tower}", height: ${st.H}, maxTwistDeg: ${TOWERS[st.tower].maxTwist} };\nsite.grounding = { earthPits: ${calc.earthPits}, resistanceOhms: ${resistance}, lightningRod: "${st.lightning}" };\nsite.fence = { bonding: ${st.grounding}, conductor: "70 mm² Cu", postBondSpacingM: 10 };`;
}

function highlightedCode() {
  return escapeHTML(codeSnippet())
    .replace(/(site\.[a-z]+)/g, '<span class="code-key">$1</span>')
    .replace(/(&quot;.*?&quot;)/g, '<span class="code-value">$1</span>');
}

function inspectorData(data) {
  const calc = calculateEngineering();
  const env = ENVIRONMENTS[st.env];
  const tower = TOWERS[st.tower];
  const common = { description: "Selected directly from the live 3D civil model.", fields: [] };
  switch (data.kind) {
    case "tower-leg":
      return {
        ...common,
        description:
          "Primary load-carrying vertical member with procedural taper, panel bracing and climbing access.",
        fields: [
          ["Member", `Leg ${data.index} / main chord`],
          ["Section", tower.section],
          ["Nominal height", `${st.H} m`],
          ["120 km/h twist", `${calc.twist.toFixed(2)}°`],
        ],
      };
    case "tower":
      return {
        ...common,
        description:
          "Parametric primary structure. Height edits regenerate chords, panels, X-bracing, ladder and top steelwork.",
        fields: [
          ["Structure", tower.short],
          ["Dead weight", `${calc.deadWeight.toLocaleString()} kg`],
          ["Wind area", `${calc.windArea.toFixed(1)} m²`],
          ["Torsional check", `${calc.twist.toFixed(2)}° / 0.50°`],
        ],
      };
    case "plinth":
      return {
        ...common,
        description:
          "Reinforced concrete plinth with exposed anchor cage, base plate and double-nut leveling arrangement.",
        fields: [
          ["Above grade", "+500 mm"],
          ["Concrete", "C30/37 reinforced"],
          ["Anchors", "M30 · grade 8.8"],
          ["Leveling", "Double-nut galvanized"],
        ],
      };
    case "earth-pit":
      return {
        ...common,
        description:
          "Inspection lid open. The copper-clad electrode extends 2.4 m below grade with an accessible brass test clamp.",
        fields: [
          ["Chamber", `E${data.index} · concrete`],
          ["Electrode", "2.4 m · Ø16 mm"],
          [
            "Loop resistance",
            Number.isFinite(calc.resistance) ? `${calc.resistance.toFixed(1)} Ω` : "OPEN",
          ],
          ["Target", "< 5.0 Ω · Cadweld"],
        ],
      };
    case "fuel":
      return {
        ...common,
        description:
          "Horizontal diesel vessel on steel cradles inside a concrete environmental containment berm.",
        fields: [
          ["Usable capacity", "5,000 L nominal"],
          ["Containment", "≥ 110% volume"],
          ["Level sensor", "Float port · Alarm #7"],
          ["Fill", "Lockable raised fill pipe"],
        ],
      };
    case "fence":
      return {
        ...common,
        description:
          "Galvanized chain-link perimeter with three barbed-wire outriggers and bonded posts.",
        fields: [
          ["Fence height", "2.25 m + barbs"],
          ["Mesh", "50 × 50 × 3 mm"],
          ["Bond conductor", st.grounding ? "70 mm² bare Cu" : "NOT INSTALLED"],
          ["Post bonding", "Every 10 m maximum"],
        ],
      };
    case "gate":
      return {
        ...common,
        description:
          "Framed access gate with a flexible arched bonding braid maintaining continuity across the hinge.",
        fields: [
          ["Clear opening", "3.8 m"],
          ["Frame", "Galvanized SHS"],
          ["Hinge bond", st.grounding ? "Flexible Cu braid" : "NOT INSTALLED"],
          ["Hardware", "Lockable latch"],
        ],
      };
    case "gate-braid":
      return {
        ...common,
        description:
          "Arched flexible conductor accommodates the gate swing without interrupting the earth loop.",
        fields: [
          ["Conductor", "70 mm² flexible Cu"],
          ["Connection", "Exothermic / lugged"],
          ["Movement", "Full gate swing"],
          ["Inspection", "Visual + continuity test"],
        ],
      };
    case "lightning":
      return {
        ...common,
        description:
          st.lightning === "ESE_ACTIVE"
            ? "Active early-streamer-emission head with a rendered 50 m protection footprint. Mandatory on the mountain peak."
            : "Passive copper air terminal with a rendered 45-degree protective cone.",
        fields: [
          ["Terminal", st.lightning],
          ["Protection", st.lightning === "ESE_ACTIVE" ? "50 m radius umbrella" : "45° cone"],
          ["Down conductor", st.grounding ? "70 mm² bonded Cu" : "NOT BONDED"],
          ["Mountain rule", env.mandatoryESE ? "ESE mandatory" : "Not applicable"],
        ],
      };
    case "dunnage":
      return {
        ...common,
        description:
          "Primary I-beams align with building columns. Secondary beams carry the RTT legs without penetrating the roof membrane.",
        fields: [
          ["Primary steel", "IPE 300 · S355"],
          ["Load path", "Direct to column grid"],
          ["Membrane", "20 mm rubber pads"],
          ["Ballast", "Non-penetrating blocks"],
        ],
      };
    case "cow":
      return {
        ...common,
        description:
          "Road-legal flatbed deployment with four mechanical stabilizing jacks and spreader pads.",
        fields: [
          ["Chassis", "8.6 × 2.55 m flatbed"],
          ["Stabilizers", "4 mechanical jacks"],
          ["Mast", "Hydraulic / pneumatic"],
          ["Deployment", st.env === "EMERGENCY_DISASTER" ? "Temporary outpost" : "Not permitted"],
        ],
      };
    case "guy-anchor":
      return {
        ...common,
        description:
          "Reinforced concrete deadman anchor with galvanized rod and turnbuckle tensioning.",
        fields: [
          ["Anchor radius", `${data.radius.toFixed(1)} m · 0.60H`],
          ["Guy levels", "3 · at 120°"],
          ["Cable", "High-tensile steel"],
          ["Hardware", "Turnbuckle + thimble"],
        ],
      };
    case "guy-wires":
      return {
        ...common,
        description: "Three levels of high-tensile steel stays stabilize the slender lattice mast.",
        fields: [
          ["Anchor radius", `${data.radius.toFixed(1)} m`],
          ["Directions", "3 × 120°"],
          ["Levels", "0.34H / 0.67H / 0.94H"],
          ["Tensioning", "Turnbuckle at grade"],
        ],
      };
    case "grounding":
      return {
        ...common,
        description:
          "Bonded earthing network with accessible test links and exothermic Cadweld joints where buried.",
        fields: [
          ["Conductor", "70 mm² bare copper"],
          ["Earth pits", `${calc.earthPits}`],
          [
            "Resistance",
            Number.isFinite(calc.resistance) ? `${calc.resistance.toFixed(1)} Ω` : "OPEN",
          ],
          ["Criterion", calc.resistancePass ? "PASS · < 5.0 Ω" : "FAIL · ≥ 5.0 Ω"],
        ],
      };
    case "building":
      return {
        ...common,
        description:
          "Reinforced concrete roof with parapets, visible column strips and membrane-safe support zones.",
        fields: [
          ["Roof", "Reinforced concrete"],
          ["Wind zone", `${env.wind} km/h`],
          ["Load path", "Column grid ±5 m"],
          ["Penetration", "Not permitted"],
        ],
      };
    case "terrain":
    default:
      return {
        ...common,
        description: env.description,
        fields: [
          ["Environment", env.name],
          ["Basic wind", `${env.wind} km/h`],
          ["Bearing", env.bearing ? `${env.bearing} kPa` : "Structural roof"],
          ["Ice", env.ice],
        ],
      };
  }
}

function renderInspector() {
  const selected = registry.get(st.selectedId);
  if (!selected) return "";
  const details = inspectorData(selected.data);
  return `<article class="inspector">
    <div class="inspector-head">
      <div class="selected-icon"></div>
      <div><div class="eyebrow">3D component selected</div><h3>${escapeHTML(selected.data.title)}</h3><p>Click empty space or clear to return to the site overview.</p></div>
      <button class="inspector-close" data-action="clear-selection" aria-label="Clear selected component">CLEAR ×</button>
    </div>
    <div class="inspector-body">
      <p class="inspector-description">${escapeHTML(details.description)}</p>
      <div class="inspector-fields">${details.fields.map(([label, value]) => `<div class="inspector-field"><small>${escapeHTML(label)}</small><strong>${escapeHTML(value)}</strong></div>`).join("")}</div>
    </div>
  </article>`;
}

const POWER_CONTENT = {
  "power-system": {
    title: "Complete Site Power & Climate System",
    what: "The complete electrical lifeline of the cell tower, from the outside power source to the radios and shelter cooling.",
    does: "It chooses a safe AC source, distributes protected circuits, creates -48V DC radio power, keeps batteries ready, and controls both air conditioners.",
    why: "Every part works together so a grid failure, generator start, or rectifier fault does not take the tower off air.",
  },
  grid: {
    title: "Commercial Utility Grid Feed",
    what: "The normal three-phase electricity supply entering the compound through cable guide position 17.",
    does: "It brings 380V three-phase / 220V phase-to-neutral AC power to the ATS input during normal operation.",
    why: "Utility power is the most economical primary source. The ATS isolates it immediately when it becomes unsafe or unavailable.",
  },
  generator: {
    title: "Standby Diesel Generator & Bulk Fuel Tank",
    what: "An industrial combustion engine coupled to an AC alternator, fed by a 1,000L external fuel tank.",
    does: "It starts automatically after a mains failure, stabilizes its voltage and frequency, then accepts the site load through the ATS. Its 12V battery powers the starter motor.",
    why: "In remote areas with zero city power, two generators alternate 12 hours on / 12 hours off so technicians can perform oil changes without taking the tower down.",
  },
  fuel: {
    title: "1,000L Bulk Diesel Fuel Tank",
    what: "The external diesel reserve feeding the generator through a protected fuel line.",
    does: "It stores fuel inside a concrete containment berm. A float port watches the level and raises Alarm #7 when fuel runs low.",
    why: "Long outages require stored energy on site. The live fuel estimate tells technicians when refueling must be scheduled.",
  },
  ats: {
    title: "Automatic Transfer Switch (ATS)",
    what: "The smart electrical selector box of the cell tower.",
    does: "It has 3 power inputs (City Grid, Generator 1, Generator 2) and 1 output. If the city grid blacks out, the ATS automatically starts the generator and flips the power over in 15 seconds without human intervention.",
    why: "Cell towers can never turn off; the ATS guarantees non-stop power 24/7. Mechanical and electrical interlocks prevent two sources from connecting together.",
  },
  mdb: {
    title: "Main Distribution Board (MDB)",
    what: "The master circuit breaker box for the entire compound.",
    does: "It takes the chosen AC power from the ATS and safely splits it into separate protected circuits for the rectifiers, the air conditioners, and the lights. It also houses heavy lightning arrestors.",
    why: "A fault in one branch should not destroy the whole site. The MDB isolates faults and blocks dangerous surges before they reach sensitive equipment.",
  },
  "ac-board": {
    title: "Dual-Split A/C Cycling Controller",
    what: "An automated climate controller with an internal timer.",
    does: "It alternates between the two room air conditioners (4 hours on, 4 hours off) so the compressor motors don't burn out. If the room exceeds 35°C, it forces both units to run together.",
    why: "Radio and power electronics age quickly when hot. Alternating duty extends compressor life, while the high-temperature override protects the shelter.",
  },
  climate: {
    title: "Dual-Split Shelter Air Conditioners",
    what: "Two independent split air-conditioning systems, each with an indoor evaporator and an outdoor condenser.",
    does: "One unit normally cools while the other rests. At more than 35°C, both compressors run at maximum power to pull the temperature down quickly.",
    why: "The shelter must stay within a safe temperature range even if one compressor fails or the outside weather becomes extreme.",
  },
  rectifier: {
    title: "-48V DC Rectifier Power Plant",
    what: "High-efficiency electrical converters that turn raw wall electricity (220V AC) into clean radio power (-48V DC).",
    does: "The modules share the telecom load and keep the battery bank at a -54.0V float. N+1 sizing installs one more module than the load requires.",
    why: "Negative voltage prevents underground copper cables from corroding, and DC power allows batteries to float permanently on the line with zero switching delay.",
  },
  "rectifier-module": {
    title: "3 kW Hot-Swap Rectifier Module",
    what: "One removable 3 kW power converter inside the DC plant.",
    does: "It converts AC to regulated DC and automatically shares current with the other online modules. A failed module can be replaced without opening the DC bus.",
    why: "With N+1 redundancy, one module can fail while the remaining modules instantly carry the full radio load with zero voltage drop.",
  },
  pcf: {
    title: "PCF · DC Surge Filter",
    what: "A protective filter between the rectifiers and the sensitive DC distribution system.",
    does: "It suppresses spikes and electrical noise on the -48V bus before they reach telecom equipment.",
    why: "Clean DC prevents radio resets, data errors, and stress on expensive electronics.",
  },
  pdu: {
    title: "PDU · DC Circuit Breakers",
    what: "The protected output distribution point for -48V DC equipment.",
    does: "It separates radio and auxiliary DC loads into individual breaker-protected circuits.",
    why: "A short in one load can be isolated without disconnecting every other DC service.",
  },
  pfu: {
    title: "PFU · Voltage Stabilizer",
    what: "A power-conditioning unit that helps keep the DC supply steady.",
    does: "It smooths voltage variation as loads change and supports a stable float supply for the batteries and radios.",
    why: "Sensitive telecom equipment needs predictable voltage, not just the presence of power.",
  },
  bfu: {
    title: "BFU · Battery Fuse & Low-Voltage Disconnect",
    what: "The safety connection between the battery bank and the DC bus.",
    does: "Its fuse protects against battery short circuits. The low-voltage disconnect opens at -42V to prevent damaging deep discharge.",
    why: "Battery banks store enormous energy. The BFU protects cables, batteries, and technicians during faults and long outages.",
  },
  "dc-bus": {
    title: "-48V Copper DC Busbar",
    what: "The heavy copper highway shared by the rectifiers, batteries, and telecom loads.",
    does: "It carries DC current with low loss and lets the battery remain connected in parallel with the rectifier output.",
    why: "Because the battery is already on the bus, backup begins in exactly 0.000 milliseconds when rectifier output disappears.",
  },
  battery: {
    title: "-48V Deep-Cycle Backup Battery Bank",
    what: "Strings of heavy-duty telecom batteries wired in groups of four (4 × 12V = 48V).",
    does: "It supplies instantaneous DC electricity the microsecond AC power fails. It bridges the 15-second generator-start gap and, when properly sized, provides 8 to 12 hours of reserve power.",
    why: "The radios cannot wait for an engine to crank. The battery is already floating on the DC bus, so there is no transfer switch and no interruption.",
  },
  auxiliary: {
    title: "Aviation Light & Maintenance Auxiliaries",
    what: "The small AC services supplied by MDB Branch 3, including the tower aviation lamp and maintenance sockets.",
    does: "The branch powers essential marking and service equipment through its own protective breaker.",
    why: "Independent protection keeps a socket or lighting fault from interrupting the radio power plant.",
  },
};

function renderPowerNavigator() {
  const selected = registry.get(st.selectedId);
  const key = selected ? selected.data.powerKey : "power-system";
  const active =
    key === "power-system"
      ? "power-system"
      : ["grid", "generator", "fuel"].includes(key)
        ? "generator-1"
        : key === "ats"
          ? "ats"
          : ["mdb", "auxiliary"].includes(key)
            ? "mdb"
            : ["rectifier", "rectifier-module", "pcf", "pdu", "pfu", "bfu", "dc-bus"].includes(key)
              ? "rectifier-plant"
              : key === "battery"
                ? "battery-bank"
                : "ac-board";
  const items = [
    ["power-system", "SYSTEM"],
    ["generator-1", "SOURCES"],
    ["ats", "ATS"],
    ["mdb", "MDB"],
    ["rectifier-plant", "DC PLANT"],
    ["battery-bank", "BATTERY"],
    ["ac-board", "CLIMATE"],
  ];
  return `<nav class="power-nav" aria-label="Power component selector">${items.map(([id, label]) => `<button data-action="select-power" data-value="${id}" class="${active === id ? "active" : ""}">[ ${label} ]</button>`).join("")}</nav>`;
}

function renderPowerLiveGrid() {
  return `<div class="power-live-grid">
    <div class="power-live-cell"><small>ACTIVE AC SOURCE</small><strong data-live="source">${sourceLabel()}</strong></div>
    <div class="power-live-cell"><small>DC BUS</small><strong data-live="dc-bus">${calculatePower().dcBusVoltage.toFixed(1)} V</strong></div>
    <div class="power-live-cell"><small>BATTERY CURRENT</small><strong data-live="battery-current">${calculatePower().batteryCurrent.toFixed(1)} A</strong></div>
    <div class="power-live-cell"><small>POWER EVENT</small><strong data-live="power-event">NORMAL</strong></div>
  </div>`;
}

function renderPowerAlarms() {
  const alarms = powerAlarms();
  return `<div class="alarm-strip ${alarms.length ? "" : "clear"}"><span>${alarms.length ? "⚠" : "✓"}</span><span data-live="alarm-text">${alarms.length ? alarms.map((alarm) => `${alarm.severity}: ${alarm.label}`).join(" · ") : "NO ACTIVE POWER ALARMS"}</span></div>`;
}

function renderPowerActions() {
  const offgrid = st.power.sourceMode === "DUAL_GENERATOR_OFFGRID";
  const normal = powerSim.phase === "NORMAL";
  return `<div class="power-actions">${
    normal
      ? `<button class="power-button" data-action="power-blackout" ${offgrid ? 'disabled title="There is no commercial grid in dual-generator off-grid mode."' : ""}>[ SIMULATE POWER BLACKOUT ]</button>`
      : '<button class="power-button restore" data-action="restore-grid">[ RESTORE GRID ]</button>'
  }</div>`;
}

function renderPowerFlow() {
  return `<div class="power-flow"><span>GRID / GEN 1 / GEN 2</span><i>→</i><span>ATS</span><i>→</i><span>MDB</span><i>→</i><span>RECTIFIERS</span><i>→</i><span>-48V BUS + RADIOS</span><br><span>MDB → A/C BOARD → DUAL SPLITS</span></div>`;
}

function renderPowerOverview() {
  const selected = registry.get(st.selectedId);
  const content = POWER_CONTENT[selected.data.powerKey] || POWER_CONTENT["power-system"];
  const calc = calculatePower();
  return `${renderPowerNavigator()}
    ${selected.data.powerKey === "power-system" ? renderPowerFlow() : ""}
    <article class="power-hero" style="margin-top:10px">
      <div class="power-hero-head"><div class="power-hero-icon">P2</div><div><div class="eyebrow">Plain-English component guide</div><h3>${content.title}</h3><p>${selected.data.title}</p></div><span class="power-domain-tag">POWER / PHASE 02</span></div>
      <div class="plain-grid">
        <div class="plain-card"><small>01 · WHAT IS IT?</small><p>${content.what}</p></div>
        <div class="plain-card"><small>02 · WHAT DOES IT DO?</small><p>${content.does}</p></div>
        <div class="plain-card"><small>03 · WHY DOES THE TOWER NEED IT?</small><p>${content.why}</p></div>
      </div>
    </article>
    ${renderPowerLiveGrid()}${renderPowerAlarms()}${renderPowerActions()}
    <p class="power-note">Live configuration: ${calc.installed} rectifier modules (${calc.required} required + ${Math.max(0, calc.installed - calc.required)} redundant) · ${st.power.batteryStrings} × ${st.power.batteryAh}Ah strings · estimated DC autonomy ${calc.autonomy.toFixed(1)} h at ${calc.dcLoad.toFixed(1)} kW.</p>`;
}

function sourceModeControls() {
  return `<div class="section-label">AC source architecture</div><div class="option-grid" style="grid-template-columns:1fr 1fr">
    <button class="option ${st.power.sourceMode === "GRID_WITH_STANDBY" ? "active" : ""}" data-action="power-source-mode" data-value="GRID_WITH_STANDBY">Grid + standby generator<small>Normal utility supply · Gen 1 automatic backup</small></button>
    <button class="option ${st.power.sourceMode === "DUAL_GENERATOR_OFFGRID" ? "active" : ""}" data-action="power-source-mode" data-value="DUAL_GENERATOR_OFFGRID">Dual generator off-grid<small>Unlock Gen 2 · alternate 12 h / 12 h</small></button>
  </div>`;
}

function atsControls() {
  return `${sourceModeControls()}<div class="section-label">ATS controller & interlock</div><div class="option-grid" style="grid-template-columns:1fr 1fr">
    <button class="option ${st.power.atsMode === "CLASSIC_RELAY" ? "active" : ""}" data-action="ats-mode" data-value="CLASSIC_RELAY">Classic relay<small>Analog timers · electromechanical control</small></button>
    <button class="option ${st.power.atsMode === "DIGITAL_PLC" ? "active" : ""}" data-action="ats-mode" data-value="DIGITAL_PLC">Digital PLC<small>Programmable logic · automatic generator crank</small></button>
  </div><p class="power-note">Three inputs, one output. Motorized contactors are mechanically and electrically interlocked; the simulator permits only one closed AC source at any instant.</p>`;
}

function rangeProgress(value, min, max) {
  return ((Number(value) - min) / (max - min)) * 100;
}

function rectifierControls() {
  const calc = calculatePower();
  return `<div class="section-label">Telecom DC load</div><div class="control-card">
    <div class="control-row"><label for="radio-load">Radio load on -48V bus</label><output class="control-value" id="radio-load-value">${st.power.radioLoadKw.toFixed(1)} kW</output></div>
    <input type="range" id="radio-load" data-power-input="radio-load" min="0.5" max="12" step="0.5" value="${st.power.radioLoadKw}" style="--range-progress:${rangeProgress(st.power.radioLoadKw, 0.5, 12)}%">
    <div class="range-limits"><span>0.5 kW</span><span>12 kW</span></div>
    <p class="control-note">Example: a 5 kW load needs N = 2 working modules, plus one spare = 3 installed modules.</p>
  </div>
  <div class="section-label">N+1 module configuration</div><div class="control-card">
    <div class="control-row"><label for="rectifier-count">Installed 3 kW modules</label><output class="control-value" id="rectifier-count-value">${calc.installed}</output></div>
    <input type="range" id="rectifier-count" data-power-input="rectifier-count" min="1" max="8" step="1" value="${calc.installed}" ${st.power.autoRectifiers ? "disabled" : ""} style="--range-progress:${rangeProgress(calc.installed, 1, 8)}%">
    <div class="range-limits"><span>1 MODULE</span><span>8 MODULES</span></div>
  </div>
  <label class="switch-card" style="margin-top:8px"><input type="checkbox" data-power-change="auto-rectifiers" ${st.power.autoRectifiers ? "checked" : ""}><span class="switch-track"></span><span class="switch-copy"><strong>Automatically size N+1</strong><small>Installed modules = ceil(DC load ÷ 3 kW) + one independent spare.</small></span></label>
  <div class="power-actions"><button class="power-button secondary" data-action="test-failover">${powerSim.failedRectifier === null ? "[ TEST N+1 MODULE FAILOVER ]" : "[ RESTORE FAILED MODULE ]"}</button></div>`;
}

function batteryControls() {
  return `<div class="section-label">Parallel 48V strings</div><div class="option-grid" style="grid-template-columns:repeat(3,1fr)">${[1, 2, 4].map((count) => `<button class="option ${st.power.batteryStrings === count ? "active" : ""}" data-action="battery-strings" data-value="${count}">${count} ${count === 1 ? "string" : "strings"}<small>${count * 4} × 12V batteries</small></button>`).join("")}</div>
  <div class="section-label">Capacity per string</div><div class="option-grid" style="grid-template-columns:repeat(3,1fr)">${[100, 150, 200].map((ah) => `<button class="option ${st.power.batteryAh === ah ? "active" : ""}" data-action="battery-ah" data-value="${ah}">${ah} Ah<small>${((st.power.batteryStrings * ah * 48) / 1000).toFixed(1)} kWh nominal bank</small></button>`).join("")}</div>
  <div class="section-label">Battery chemistry</div><div class="option-grid" style="grid-template-columns:1fr 1fr">
    <button class="option ${st.power.batteryType === "VRLA" ? "active" : ""}" data-action="battery-type" data-value="VRLA">VRLA deep-cycle<small>80% usable depth · proven telecom standard</small></button>
    <button class="option ${st.power.batteryType === "LITHIUM" ? "active" : ""}" data-action="battery-type" data-value="LITHIUM">Lithium-ion<small>90% usable depth · compact high-cycle bank</small></button>
  </div><p class="power-note">Every string contains exactly four 12V blocks in series. Parallel strings share the copper bus; the BFU low-voltage disconnect is fixed at -42V.</p>`;
}

function climateControls() {
  return `<div class="section-label">Climate setpoint</div><div class="control-card"><div class="control-row"><label for="climate-setpoint">Target shelter temperature</label><output class="control-value" id="climate-setpoint-value">${st.power.climateSetpoint.toFixed(0)} °C</output></div><input type="range" id="climate-setpoint" data-power-input="climate-setpoint" min="18" max="30" step="1" value="${st.power.climateSetpoint}" style="--range-progress:${rangeProgress(st.power.climateSetpoint, 18, 30)}%"><div class="range-limits"><span>18 °C</span><span>30 °C</span></div></div>
  <div class="section-label">Alarm #6 override test</div><div class="control-card"><div class="control-row"><label for="shelter-temperature">Simulated shelter temperature</label><output class="control-value" id="shelter-temperature-value" data-live="temperature">${powerSim.temperature.toFixed(1)} °C</output></div><input type="range" id="shelter-temperature" data-power-input="shelter-temperature" min="18" max="45" step="0.5" value="${powerSim.temperature}" style="--range-progress:${rangeProgress(powerSim.temperature, 18, 45)}%"><div class="range-limits"><span>18 °C</span><span>45 °C</span></div><p class="control-note">Above 35°C both units run together, regardless of the 4-hour duty timer.</p></div>`;
}

function fuelControls() {
  return `<div class="section-label">Bulk fuel inventory</div><div class="control-card"><div class="control-row"><label for="fuel-level">Tank level</label><output class="control-value" id="fuel-level-value">${(powerSim.fuelRemainingL / 10).toFixed(0)}%</output></div><input type="range" id="fuel-level" data-power-input="fuel-level" min="10" max="100" step="1" value="${powerSim.fuelRemainingL / 10}" style="--range-progress:${rangeProgress(powerSim.fuelRemainingL / 10, 10, 100)}%"><div class="range-limits"><span>100 L · ALARM #7 AT 200 L</span><span>1,000 L</span></div></div>`;
}

function mdbControls() {
  const labels = {
    rectifier: "Branch 1 · -48V rectifier plant",
    climate: "Branch 2 · dual A/C board",
    auxiliary: "Branch 3 · aviation light & sockets",
  };
  return `<div class="section-label">Protected MDB branches</div>${Object.entries(labels)
    .map(
      ([key, label]) =>
        `<label class="switch-card" style="margin-bottom:8px"><input type="checkbox" data-power-change="branch" data-branch="${key}" ${st.power.branches[key] ? "checked" : ""}><span class="switch-track"></span><span class="switch-copy"><strong>${label}</strong><small>${key === "rectifier" ? "Opening this branch transfers the DC load directly to battery." : "Independent protection isolates this circuit from the other branches."}</small></span></label>`
    )
    .join(
      ""
    )}<p class="power-note">Main input: 380V three-phase / 220V phase-to-neutral. Class B+C SPDs protect all outgoing branches.</p>`;
}

function renderPowerConfigure() {
  const selected = registry.get(st.selectedId);
  const key = selected.data.powerKey;
  let controls = "";
  if (key === "ats") controls = atsControls();
  else if (["generator", "grid", "fuel"].includes(key))
    controls = sourceModeControls() + (key !== "grid" ? fuelControls() : "");
  else if (["mdb", "auxiliary"].includes(key)) controls = mdbControls();
  else if (["rectifier", "rectifier-module", "pcf", "pdu", "pfu", "bfu", "dc-bus"].includes(key))
    controls = rectifierControls();
  else if (key === "battery") controls = batteryControls();
  else if (["ac-board", "climate"].includes(key)) controls = climateControls();
  else controls = sourceModeControls() + rectifierControls();
  return `${renderPowerNavigator()}${controls}${renderPowerLiveGrid()}${renderPowerAlarms()}${renderPowerActions()}`;
}

function powerSpecCard(title, fields, note = "", status = "") {
  return `<article class="spec-card"><h3>${title}</h3>${status ? `<span class="spec-badge">${status}</span>` : ""}<div class="spec-values">${fields.map(([label, value]) => `<div class="spec-value"><small>${label}</small><strong>${value}</strong></div>`).join("")}</div>${note ? `<p>${note}</p>` : ""}</article>`;
}

function renderPowerSpecs() {
  const selected = registry.get(st.selectedId);
  const key = selected.data.powerKey;
  const calc = calculatePower();
  const common = powerSpecCard(
    "Live power chain",
    [
      ["ACTIVE SOURCE", `<span data-live="source">${sourceLabel()}</span>`],
      [
        "GRID INPUT",
        `<span data-live="grid-voltage">${powerSim.gridVoltage.toFixed(0)} V AC</span>`,
      ],
      ["DC BUS", `${calc.dcBusVoltage.toFixed(1)} V DC`],
      ["TOTAL LOAD", `${calc.totalLoad.toFixed(2)} kW`],
    ],
    "The DC battery bus is independent of the ATS. During the generator-start window, radios remain on battery while AC-only climate loads pause."
  );
  let specific = "";
  if (key === "ats")
    specific = powerSpecCard(
      "ATS contactor sheet",
      [
        ["GRID CONTACTOR", powerSim.activeSource === "GRID" ? "CLOSED" : "OPEN"],
        ["GEN 1 CONTACTOR", powerSim.activeSource === "GEN1" ? "CLOSED" : "OPEN"],
        ["GEN 2 CONTACTOR", powerSim.activeSource === "GEN2" ? "CLOSED" : "OPEN"],
        ["CONTROL MODE", st.power.atsMode],
        ["AC TRANSFER", "15.0 s stabilization"],
        ["BATTERY BRIDGE", "0.000 ms"],
      ],
      "Mechanical + electrical interlock: one output and never more than one closed input contactor.",
      badge(true, "INTERLOCKED")
    );
  else if (["mdb", "auxiliary"].includes(key))
    specific = powerSpecCard(
      "MDB distribution sheet",
      [
        ["INPUT", "380 / 220 V AC"],
        ["SURGE PROTECTION", "Class B+C SPD"],
        ["BRANCH 1 · DC PLANT", st.power.branches.rectifier ? "CLOSED" : "OPEN"],
        ["BRANCH 2 · CLIMATE", st.power.branches.climate ? "CLOSED" : "OPEN"],
        ["BRANCH 3 · AUX", st.power.branches.auxiliary ? "CLOSED" : "OPEN"],
        ["FREQUENCY", "50 Hz"],
      ],
      "Independent breakers protect rectifier, climate, and auxiliary circuits."
    );
  else if (["rectifier", "rectifier-module", "pcf", "pdu", "pfu", "bfu", "dc-bus"].includes(key))
    specific = powerSpecCard(
      "-48V rectifier data sheet",
      [
        ["DC LOAD", `${calc.dcLoad.toFixed(1)} kW`],
        ["N · REQUIRED", `${calc.required}`],
        ["INSTALLED", `${calc.installed}`],
        ["AVAILABLE NOW", `${calc.available}`],
        ["MODULE RATING", "3 kW · 50 A"],
        ["FLOAT VOLTAGE", "-54.0 V DC"],
        ["CURRENT / ONLINE MODULE", `${calc.moduleCurrent.toFixed(1)} A`],
        ["BFU DISCONNECT", "-42.0 V DC"],
      ],
      `PCF surge filtering · PDU DC breakers · PFU stabilization · BFU battery fuse. N+1 failover shares the load with zero voltage drop when available modules ≥ N.`,
      badge(calc.failoverPass, calc.failed ? "FAILOVER PASS" : "N+1 PASS", "DC CAPACITY WARN")
    );
  else if (key === "battery")
    specific = powerSpecCard(
      "Battery bank data sheet",
      [
        ["STRING ARCHITECTURE", "4 × 12V = 48V"],
        ["PARALLEL STRINGS", `${st.power.batteryStrings}`],
        ["CAPACITY / STRING", `${st.power.batteryAh} Ah`],
        ["CHEMISTRY", st.power.batteryType],
        ["NOMINAL ENERGY", `${calc.nominalEnergy.toFixed(1)} kWh`],
        ["USABLE ENERGY", `${calc.usableEnergy.toFixed(1)} kWh`],
        [
          "AUTONOMY AT LIVE LOAD",
          `<span data-live="autonomy">${calc.autonomy.toFixed(1)} h</span>`,
        ],
        ["TRANSFER TIME", "0.000 ms"],
        [
          "DISCHARGE CURRENT",
          `<span data-live="battery-current">${calc.batteryCurrent.toFixed(1)} A</span>`,
        ],
        ["LOW-VOLTAGE LIMIT", "-42.0 V"],
      ],
      "Batteries float directly on the DC bus. Autonomy uses 80% usable depth for VRLA or 90% for lithium and the current state of charge."
    );
  else if (["ac-board", "climate"].includes(key))
    specific = powerSpecCard(
      "Dual-split climate sheet",
      [
        [
          "ACTIVE UNITS",
          `<span data-live="active-ac">${calc.climate.active.join(" + ") || "NONE"}</span>`,
        ],
        ["NORMAL DUTY", "4 h ON / 4 h OFF"],
        [
          "SHELTER TEMPERATURE",
          `<span data-live="temperature">${powerSim.temperature.toFixed(1)} °C</span>`,
        ],
        ["HIGH-TEMP OVERRIDE", "> 35.0 °C · BOTH ON"],
        ["SETPOINT", `${st.power.climateSetpoint} °C`],
        ["INPUT / ACTIVE UNIT", "2.2 kW normal · 2.8 kW max"],
      ],
      "Alarm #6 bypasses the duty timer and runs both compressors at maximum power until the shelter recovers.",
      badge(!calc.climate.highTemp, "NORMAL", "ALARM #6")
    );
  else if (key === "fuel")
    specific = powerSpecCard(
      "Bulk fuel data sheet",
      [
        ["NOMINAL CAPACITY", "1,000 L"],
        [
          "FUEL REMAINING",
          `<span data-live="fuel-remaining">${powerSim.fuelRemainingL.toFixed(0)} L</span>`,
        ],
        ["LIVE CONSUMPTION", `<span data-live="fuel-rate">${calc.fuelRate.toFixed(2)} L/h</span>`],
        ["ESTIMATED RUNTIME", `${calc.fuelRuntime.toFixed(1)} h`],
        ["LOW-FUEL ALARM", "Alarm #7 · 200 L"],
        ["CONTAINMENT", "≥ 110%"],
      ],
      "The level float reports bulk inventory; actual runtime varies with generator loading."
    );
  else if (["generator", "grid"].includes(key))
    specific = powerSpecCard(
      key === "grid" ? "Utility service data" : "Diesel generation data",
      key === "grid"
        ? [
            ["SUPPLY", "3-phase 380 / 220 V"],
            ["FREQUENCY", "50 Hz"],
            ["CABLE ENTRY", "Guide position 17"],
            [
              "LIVE VOLTAGE",
              `<span data-live="grid-voltage">${powerSim.gridVoltage.toFixed(0)} V</span>`,
            ],
          ]
        : [
            ["GEN 1 STATE", calc.states.GEN1],
            [
              "GEN 2 STATE",
              st.power.sourceMode === "DUAL_GENERATOR_OFFGRID" ? calc.states.GEN2 : "NOT UNLOCKED",
            ],
            ["FUEL RATE", `<span data-live="fuel-rate">${calc.fuelRate.toFixed(2)} L/h</span>`],
            [
              "FUEL REMAINING",
              `<span data-live="fuel-remaining">${powerSim.fuelRemainingL.toFixed(0)} L</span>`,
            ],
            ["STARTER SUPPLY", "12V DC"],
            ["OFF-GRID ROTATION", "12 h / 12 h"],
            ["AC STABILIZATION", "15.0 s"],
            ["FUEL RUNTIME", `${calc.fuelRuntime.toFixed(1)} h`],
          ],
      "Exhaust, starter battery, fuel supply, vibration, and generator state are linked to the live simulation."
    );
  else
    specific = powerSpecCard(
      "Site power capacity",
      [
        ["DC LOAD", `${calc.dcLoad.toFixed(1)} kW`],
        ["TOTAL LOAD", `${calc.totalLoad.toFixed(1)} kW`],
        ["RECTIFIER N+1", `${calc.installed} installed / ${calc.required} required`],
        ["BATTERY AUTONOMY", `${calc.autonomy.toFixed(1)} h`],
      ],
      "Select any power component for its dedicated technical data sheet.",
      badge(calc.n1Pass, "N+1 PASS", "N+1 WARN")
    );
  return `${renderPowerNavigator()}<div class="spec-grid">${common}${specific}</div>${renderPowerLiveGrid()}${renderPowerAlarms()}${renderPowerActions()}`;
}

function selectedRackKey() {
  const selected = registry.get(st.selectedId);
  return selected && selected.data.domain === "rack" ? selected.data.rackKey : "cabinet";
}

function renderSmartFilter(context) {
  const profile = smartProfile();
  const custom = customGenerationMetrics();
  const customChips =
    st.generation === "CUSTOM"
      ? `<div class="custom-gen-panel" role="group" aria-label="Custom multi-generation toggles"><div class="custom-gen-label"><span>CUSTOM MULTI-GEN COMBINATION</span><span>${custom.label} · ${custom.throughput}</span></div><div class="custom-gen-chips">${Object.entries(
          CUSTOM_GEN_CATALOG
        )
          .map(([genKey, item]) => {
            const checked = custom.gens.includes(genKey);
            return `<button type="button" class="custom-gen-chip ${checked ? "active" : ""}" data-action="custom-gen-toggle" data-value="${genKey}" aria-pressed="${checked}">[${checked ? "✓" : "&nbsp;"}] ${item.chip}</button>`;
          })
          .join("")}</div></div>`
      : "";
  return `<section class="smart-filter" aria-label="Smart vendor and generation filter ${context}"><div class="smart-filter-head">HIERARCHICAL HARDWARE DECISION TREE · SHARED STEP 02 ↔ STEP 04</div><div class="smart-step"><div class="smart-step-label">STEP A · VENDOR<small>Select equipment ecosystem</small></div><div class="smart-options smart-vendors">${["ERICSSON", "HUAWEI", "NOKIA"].map((vendor) => `<button class="smart-option ${st.rack.vendor === vendor ? "active" : ""}" data-action="smart-vendor" data-value="${vendor}">${vendor}<small>${vendor === "ERICSSON" ? "RBS / AIR / Baseband" : vendor === "HUAWEI" ? "BBU / AAU / RTN" : "AirScale / MAA"}</small></button>`).join("")}</div></div><div class="smart-step"><div class="smart-step-label">STEP B · GENERATION<small>Curate all downstream hardware</small></div><div class="smart-options smart-generations">${Object.entries(
    SMART_GENERATIONS
  )
    .map(
      ([generation, data]) =>
        `<button class="smart-option ${st.generation === generation ? "active" : ""}" data-action="smart-generation" data-value="${generation}">${data.label}<small>${generation === "CUSTOM" ? custom.throughput : data.throughput}</small></button>`
    )
    .join(
      ""
    )}</div></div>${customChips}<div class="smart-profile">ACTIVE PROFILE · ${profile.chassis}<br>RF CURATION · ${profile.rfMode === "LEGACY" ? "65° panels + TMA + 7/8-inch coax" : profile.rfMode === "ACTIVE" ? `${aauModel()} + duplex eCPRI fiber` : "Legacy panels + active AAUs + coax and fiber"}</div></section>`;
}

function renderRackNavigator() {
  const key = selectedRackKey();
  const items = [
    ["rack-cabinet", "CABINET", ["cabinet", "door", "fau", "radio", "power-shelf", "battery-tray"]],
    ["rack-baseband", "DIGITAL", ["baseband", "dug", "duw", "scu", "shu", "sau"]],
    ["rack-router", "TRANSMISSION", ["router", "tdm", "amm"]],
    ["rack-ovp", "ALARM I/O", ["ovp"]],
  ].filter(([, , keys]) => keys.some((key) => isRackSlotCurated(key)));
  return `<nav class="rack-nav" aria-label="Cabinet areas">${items.map(([id, label, keys]) => `<button data-action="rack-select" data-value="${id}" class="${keys.includes(key) ? "active" : ""}">[ ${label} ]</button>`).join("")}</nav>`;
}

function renderRackMetrics() {
  const rack = calculateRack();
  const power = calculatePower();
  const services = [
    rack.opticalPorts ? "5G/4G" : "NO BB",
    rack.voiceCalls ? `${rack.voiceCalls} CALLS` : "NO 2G",
    rack.e1Lines ? `${rack.e1Lines} E1` : "NO TDM",
  ].join(" · ");
  return `<div class="rack-metrics">
    <div class="rack-metric"><small>CABINET DC</small><strong data-live="rack-load">${rack.loadKw.toFixed(3)} kW</strong></div>
    <div class="rack-metric"><small>BACKUP HOURS</small><strong data-live="rack-autonomy">${power.autonomy.toFixed(2)} h</strong></div>
    <div class="rack-metric"><small>BACKHAUL</small><strong data-live="rack-gbps">${rack.backhaulGbps} Gbps</strong></div>
    <div class="rack-metric"><small>LIVE SERVICES</small><strong data-live="rack-services">${services}</strong></div>
  </div>`;
}

function renderRackActions() {
  const rack = calculateRack();
  return `<div class="rack-actions">
    <button class="rack-action" data-action="rack-patch" aria-label="Patch Yellow Cable" ${rack.patchReady ? "" : 'disabled title="Install both Router 6471 and TDM 1001 first"'}>[ Connect Router to TDM Cable ]</button>
    <button class="rack-action alarm" data-action="rack-trace" aria-label="Trace Alarm Highway" ${rack.alarmPathReady ? "" : 'disabled title="Install OVP, SAU3, SCU, SHU and DUG 20 first"'}>[ Trace External Alarm Path ]</button>
  </div>`;
}

function renderRackActionStatus() {
  const link = rackSim.patchLink
    ? `<div class="rack-link-status ${rackSim.patchProgress >= 1 ? "up" : ""}" data-live="rack-link">${rackSim.patchProgress >= 1 ? "Circuit Emulation Link UP (8x E1 lines active for 2G voice)." : "PATCHING YELLOW ETHERNET · ROUTER PORT 2 → TDM PORT 1B…"}</div>`
    : "";
  const alarm = rackSim.alarmBadge
    ? `<div class="alarm-infographic"><strong>Alarm highway traced to the NOC</strong><p>Dry contacts from door, fuel, and generator are surge-protected by OVP, digitized by SAU, processed by SCU, routed via SHU, and reported by the Master DUG to the NOC.</p><div class="alarm-route">OVP BOX → SAU3 → SCU → SHU → MASTER DUG 20</div></div>`
    : "";
  return `${link}${alarm}`;
}

function rackSlotButton(key, label, detail) {
  if (!isRackSlotCurated(key)) return "";
  const installed = Object.prototype.hasOwnProperty.call(st.rack.slots, key)
    ? st.rack.slots[key]
    : true;
  return `<button class="rack-slot ${installed ? "installed" : "empty"} ${selectedRackKey() === key ? "active" : ""}" data-action="rack-select" data-value="rack-${key}">${label}<small>${installed ? detail : `EMPTY SLOT · ${detail}`}</small></button>`;
}

function renderRackElevation() {
  const housing = rackHousing();
  return `<div class="section-label">Interactive 19-inch rack elevation <span class="tag">1U = 44.45 mm</span></div>
  <div class="rack-elevation">
    <div class="rack-elevation-head">${housing.vendor} ${housing.model} · REAL-WORLD VERTICAL ALLOCATION</div>
    <div class="rack-shelf" style="--u:1"><div class="rack-shelf-label"><strong>TOP 1U</strong>FAN UNIT</div><div class="rack-slots">${rackSlotButton("fau", "FAU · Fan Unit", "4 fans · top exhaust")}</div></div>
    <div class="rack-shelf" style="--u:6"><div class="rack-shelf-label"><strong>SHELF 1 · 6U</strong>RADIO SHELF</div><div class="rack-slots">${rackSlotButton("radio", "RUS / RUG / RUW", `${st.rack.radioCount} of 12 radio positions populated`)}</div></div>
    <div class="rack-shelf" style="--u:3"><div class="rack-shelf-label"><strong>SHELF 2 · 3U</strong>DIGITAL · 6 SLOTS</div><div class="rack-slots">${rackSlotButton("baseband", smartProfile().labels.baseband || "Baseband 6630", "1U · digital baseband · optical")}${rackSlotButton("dug", smartProfile().labels.dug || "DUG 20 01", "Curated control / voice card")}${rackSlotButton("duw", smartProfile().labels.duw || "DUW 30 01", "Curated capacity card")}${rackSlotButton("scu", "SCU", "Fan + environment")}${rackSlotButton("shu", "SHU", "EC-Bus support hub")}${rackSlotButton("sau", "SAU3", "6 in / 3 out alarm digitizer")}</div></div>
    <div class="rack-shelf" style="--u:3"><div class="rack-shelf-label"><strong>SHELF 3 · 3U</strong>POWER SHELF</div><div class="rack-slots">${rackSlotButton("power-shelf", "PCF · PCU · PSU · PDU · PFU · BFU", "Phase 2 protected -48V DC shelf")}</div></div>
    <div class="rack-shelf" style="--u:4"><div class="rack-shelf-label"><strong>SHELF 4 · 4U</strong>TRANSMISSION</div><div class="rack-slots">${rackSlotButton("router", smartProfile().labels.router || "Router 6471", "1U half-width · IP backhaul")}${rackSlotButton("tdm", smartProfile().labels.tdm || "TDM 1001", "1U half-width · 8 × E1")}${rackSlotButton("amm", smartProfile().labels.amm || "MINI-LINK AMM", "Curated microwave backhaul")}</div></div>
    <div class="rack-shelf" style="--u:4"><div class="rack-shelf-label"><strong>BASE TRAY</strong>BATTERY + MGB</div><div class="rack-slots">${rackSlotButton("battery-tray", "4 × 12V VRLA + MGB", `${st.power.batteryStrings} parallel strings · master earth`)}</div></div>
  </div>`;
}

function renderRackOverview() {
  const key = selectedRackKey();
  const content = rackCardContent(key);
  const housing = rackHousing();
  const title =
    key === "cabinet" ? `${housing.vendor} ${housing.model} · 19-inch Cabinet` : content.title;
  return `${renderRackNavigator()}
    <article class="rack-hero">
      <div class="rack-hero-head"><div class="rack-hero-icon">19″</div><div><h3>${title}</h3><p>${key === "cabinet" ? housing.description : "Selected from the live cabinet rack elevation."}</p></div><span class="rack-vendor-tag">${housing.vendor} / ${housing.ip}</span></div>
      <div class="rack-plain ${content.why ? "three" : ""}"><div class="plain-card"><small>01 · WHAT IS IT?</small><p>${content.what}</p></div><div class="plain-card"><small>02 · WHAT DOES IT DO?</small><p>${content.does}</p></div>${content.why ? `<div class="plain-card"><small>03 · WHY IS IT DOUBLE-WIDE?</small><p>${content.why}</p></div>` : ""}</div>
    </article>
    ${renderRackMetrics()}${renderRackActionStatus()}${renderRackActions()}${renderRackElevation()}`;
}

function renderRackConfigure() {
  const housing = rackHousing();
  const labels = {
    fau: "FAU fan unit",
    baseband: smartProfile().labels.baseband || "Baseband 6630",
    dug: smartProfile().labels.dug || "DUG 20 01",
    duw: smartProfile().labels.duw || "DUW 30 01",
    scu: "SCU supervisor",
    shu: "SHU support hub",
    sau: "SAU3 alarm digitizer",
    router: smartProfile().labels.router || "Router 6471",
    tdm: "TDM 1001",
    amm: smartProfile().labels.amm || "MINI-LINK AMM",
    ovp: "OVP protection box",
  };
  return `${renderRackNavigator()}
    <div class="section-label">Vendor ecosystem <span class="tag">STEP 02 ONLY</span></div>
    <div class="vendor-grid">${["ERICSSON", "HUAWEI", "NOKIA"].map((vendor) => `<button class="option ${st.rack.vendor === vendor ? "active" : ""}" data-action="rack-vendor" data-value="${vendor}">${vendor}<small>${vendor === "ERICSSON" ? "RBS 6201 / RBS 6102" : vendor === "HUAWEI" ? "BTS3900 / BTS3900A" : "AirScale 3U subrack"}</small></button>`).join("")}</div>
    <p class="rack-note">Active housing: <strong>${housing.model}</strong> · ${housing.description}</p>
    <div class="section-label">Installation & access</div>
    <div class="rack-door-controls">
      <button class="option ${st.rack.location === "INDOOR" ? "active" : ""}" data-action="rack-location" data-value="INDOOR" ${st.env === "URBAN_ROOFTOP" ? 'disabled title="Urban rooftop has no indoor shelter; outdoor IP55 is mandatory"' : ""}>Indoor shelter<small>${st.env === "URBAN_ROOFTOP" ? "Blocked · no shelter on rooftop" : "RBS 6201 / indoor modular rack"}</small></button>
      <button class="option ${st.rack.location === "OUTDOOR" ? "active" : ""}" data-action="rack-location" data-value="OUTDOOR">Outdoor IP55<small>RBS 6102 / BTS3900A · double door</small></button>
      <button class="rack-action secondary" data-action="rack-door-toggle">[ ${rackSim.doorTarget > 0.5 ? "Close" : "Open"} Cabinet Door ]</button>
      <button class="rack-action secondary" data-action="rack-select" data-value="rack-cabinet">[ Focus Complete Cabinet ]</button>
    </div>
    <div class="section-label">Radio shelf population</div>
    <div class="control-card rack-control"><div class="control-row"><label for="rack-radio-count">RUS / RUG / RUW positions</label><output class="control-value" id="rack-radio-count-value">${st.rack.radioCount} / 12</output></div><input type="range" id="rack-radio-count" data-rack-input="radio-count" min="0" max="12" step="1" value="${st.rack.radioCount}" style="--range-progress:${rangeProgress(st.rack.radioCount, 0, 12)}%"><div class="range-limits"><span>EMPTY 6U SHELF</span><span>12 RADIO UNITS</span></div></div>
    <div class="section-label">Slot management <span class="tag">LIVE kW / HOURS / Gbps</span></div>
    <div class="slot-manager">${Object.entries(labels)
      .filter(([key]) => isRackSlotCurated(key))
      .map(
        ([key, label]) =>
          `<div class="slot-manager-row"><button data-action="rack-select" data-value="rack-${key}">${label}<small>${RACK_SLOT_POWER[key] ? `${(RACK_SLOT_POWER[key] * 1000).toFixed(0)} W DC` : "Passive surge protection"}</small></button><button class="slot-install ${st.rack.slots[key] ? "remove" : ""}" data-action="rack-toggle" data-value="${key}">[ ${st.rack.slots[key] ? "REMOVE" : "INSTALL"} ]</button></div>`
      )
      .join("")}</div>
    <p class="rack-note">Removing a card empties its physical slot and immediately recalculates cabinet load, backup hours and service capacity. Router or TDM removal also opens the yellow patch link.</p>
    ${renderRackMetrics()}${renderRackActionStatus()}${renderRackActions()}`;
}

function renderRackSpecs() {
  const key = selectedRackKey();
  const content = rackCardContent(key);
  const rack = calculateRack();
  const power = calculatePower();
  const housing = rackHousing();
  const common = powerSpecCard(
    "Live cabinet & service capacity",
    [
      ["CABINET DC LOAD", `${rack.loadKw.toFixed(3)} kW`],
      ["RADIO + CABINET DC", `${power.dcLoad.toFixed(3)} kW`],
      ["BACKUP HOURS", `${power.autonomy.toFixed(2)} h`],
      ["ROUTER CAPACITY", `${rack.backhaulGbps} Gbps`],
      ["OPTICAL PORTS", `${rack.opticalPorts} × CPRI/eCPRI`],
      ["LEGACY VOICE", `${rack.voiceCalls} calls · ${rack.e1Lines} E1`],
    ],
    "Installed-slot power is summed into the Phase 2 DC bus. Battery autonomy therefore responds immediately to every slot change."
  );
  let fields = content.specs;
  if (!fields) {
    if (key === "cabinet")
      fields = [
        ["VENDOR / MODEL", `${housing.vendor} ${housing.model}`],
        [
          "DIMENSIONS",
          housing.vendor === "ERICSSON" && !housing.outdoor
            ? "1800 × 600 × 400 mm"
            : `${(housing.height * 1000).toFixed(0)} × ${(housing.width * 1000).toFixed(0)} × ${(housing.depth * 1000).toFixed(0)} mm`,
        ],
        ["RACK", "19 inch · 1U = 44.45 mm"],
        ["SHELVES", "4 + top FAU + battery tray"],
        ["INGRESS", housing.ip],
        ["DOOR", housing.doubleDoor ? "Double sealed doors" : "Open mesh / single front door"],
      ];
    else if (key === "door")
      fields = [
        ["HINGES", housing.doubleDoor ? "Two leaves · opposed swing" : "Left hinged"],
        ["FRONT", st.rack.vendor === "ERICSSON" && !housing.outdoor ? "Open mesh" : "Sealed steel"],
        ["ANIMATION", "Eased physical door rotation"],
        ["INGRESS", housing.ip],
      ];
    else if (key === "fau")
      fields = [
        ["POSITION", "Top 1U"],
        ["FANS", "4 × top exhaust"],
        ["CONTROL", "SCU temperature supervision"],
        ["DC INPUT", "40 W"],
      ];
    else if (key === "radio")
      fields = [
        ["POSITION", "Shelf 1 · 6U"],
        ["CAPACITY", "Up to 12 RUs"],
        ["POPULATED", `${st.rack.radioCount} / 12`],
        ["TYPES", "RUS / RUG / RUW"],
      ];
    else if (key === "power-shelf")
      fields = [
        ["POSITION", "Shelf 3 · 3U"],
        ["MODULES", "PCF / PCU / PSU / PDU / PFU / BFU"],
        ["BUS", "-54V float · -48V nominal"],
        ["LVD", "-42V disconnect"],
      ];
    else
      fields = [
        ["POSITION", "Base battery tray"],
        ["STRING", "4 × 12V = 48V"],
        ["PARALLEL STRINGS", `${st.power.batteryStrings}`],
        ["GROUND", "Master Ground Bar · bonded"],
      ];
  }
  const specific = powerSpecCard(
    content.title,
    fields,
    key === "router" || key === "tdm"
      ? "The yellow patch lead connects Router Port 2 to TDM Port 1B. Both link LEDs turn green only after the physical cable animation completes."
      : key === "ovp" || key === "sau" || key === "scu" || key === "shu" || key === "dug"
        ? "Alarm highway order: OVP Box → SAU3 → SCU → SHU → Master DUG 20 → NOC."
        : "Procedural 19-inch rack component with live slot state and raycast inspection."
  );
  return `${renderRackNavigator()}<div class="spec-grid">${common}${specific}</div>${renderRackMetrics()}${renderRackActionStatus()}${renderRackActions()}`;
}

const MW_CONTENT = {
  system: {
    title: "Microwave Transmission & Backhaul Link",
    what: "A complete wireless fiber-like connection between this tower and the core network.",
    does: "It carries the cabinet's internet and voice traffic through a tightly focused dish link, with live alignment, antenna gain, losses, capacity and fade-margin monitoring.",
  },
  dish: {
    title: "Directional Microwave Dish Antenna",
    what: "A round, drum-like metal reflector aimed at another tower kilometers away.",
    does: "Focuses radio waves into a narrow, laser-like beam to send all phone calls and internet data back to the core network without digging fiber cables into the ground.",
  },
  odu: {
    title: "Microwave Transceiver (ODU)",
    what: "The metal radio box clipped directly to the back of the dish.",
    does: "Converts digital data from the indoor cabinet into high-frequency gigahertz radio waves (7 GHz to 38 GHz) and boosts the signal to beam across the mountains.",
  },
  splitter: {
    title: "Asymmetrical Waveguide Splitter",
    what: "A metal T-junction that connects TWO radios to ONE single dish.",
    does: "It feeds both hot-standby radios while keeping the main and standby paths isolated.",
    why: "The main radio does 100% of the daily work, so it gets almost all the power (only -1.5 dB loss). The sleeping standby radio gets a small slice (-7.0 dB loss) so it's ready to jump in only if the main radio dies.",
  },
  symmetric: {
    title: "Symmetrical XPIC Waveguide Splitter",
    what: "A balanced waveguide junction that shares one dual-polar dish across four modem paths.",
    does: "It divides power evenly so each branch sees the same -3.0 dB splitter loss while XPIC keeps the vertical and horizontal streams separated.",
  },
  sd: {
    title: "Space Diversity Dual Dishes",
    what: "Two separate dishes mounted one above the other (3 to 6 meters apart).",
    does: "It gives the receiver a second physical sample of the same radio path with no splitter loss.",
    why: "Over water, desert plains, or deep valleys, hot air layers bend radio waves and cause them to cancel out (multipath fading). If the top dish loses signal, the bottom dish catches it, guaranteeing zero dropped calls!",
  },
  xpic: {
    title: "XPIC (Cross-Polarization Interference Cancellation)",
    what: "A technology that shoots TWO separate streams of data on the EXACT SAME frequency at the exact same time—one vertical wave, one horizontal wave.",
    does: "The OMT separates vertical and horizontal waves while cancellation cards remove any leakage between them.",
    why: "It doubles the speed of the microwave link for free without paying the government for extra frequency licenses!",
  },
  modem: {
    title: "XPIC Modem & Cancellation Card",
    what: "A digital modem that builds one polarization's data stream and cleans up interference from the other.",
    does: "Cross-connected XPIC cables let the modems compare both streams and cancel leakage, preserving the capacity gain on the same licensed frequency.",
  },
  coax: {
    title: "Radio IF Coaxial Cable · Ø10 mm",
    what: "The black radio cable running from the cabinet's MINI-LINK AMM or Router 6471 up the tower ladder.",
    does: "It carries protected IF signals and DC power between the indoor transmission cards and the outdoor radio, with a grounding kit bonded downward into the steel mast.",
  },
  ground: {
    title: "Feeder Grounding Kit",
    what: "A copper clamp bonded around the coax near the top of the tower.",
    does: "It gives lightning and induced electrical charge a short path down into the steel mast instead of through the sensitive radio electronics.",
  },
};

function selectedMicrowaveKind() {
  const selected = registry.get(st.selectedId);
  return selected && selected.data.domain === "microwave" ? selected.data.mwKind : "system";
}

function renderMwSystemToggle() {
  return `<div class="mw-system-toggle" role="group" aria-label="Transmission system"><button data-action="mw-system" data-value="MICROWAVE" class="${st.microwave.system === "MICROWAVE" ? "active" : ""}">[ 🎯 Microwave Backhaul ]</button><button data-action="mw-system" data-value="CELLULAR" class="${st.microwave.system === "CELLULAR" ? "active" : ""}">[ 📡 Cellular Sectors ]</button></div>`;
}

function renderMwMetrics() {
  const mw = calculateMicrowave();
  return `<div class="mw-metrics"><div class="mw-metric"><small>BACKHAUL SPEED</small><strong data-live="mw-capacity">${formatCapacity(mw.capacityMbps)}</strong></div><div class="mw-metric"><small>RSL</small><strong data-live="mw-rsl">${mw.rsl.toFixed(1)} dBm</strong></div><div class="mw-metric"><small>FADE MARGIN</small><strong data-live="mw-fade">${mw.fadeMargin.toFixed(1)} dB</strong></div><div class="mw-metric"><small>ANTENNA GAIN</small><strong data-live="mw-gain">${mw.gain.toFixed(2)} dBi</strong></div></div>`;
}

function renderMwMeter() {
  const mw = calculateMicrowave();
  const progress = clamp(((mw.voltage - 0.5) / 2) * 100, 0, 100);
  const badgeClass = mw.locked ? "locked" : mw.alignmentError > 10 ? "weak" : "";
  return `<div class="section-label">Virtual dish-alignment multimeter <span class="tag">0.5–2.5V DC</span></div>
  <div class="mw-meter" data-meter style="--meter-progress:${progress}%"><div class="mw-meter-head"><span>ODU ALIGNMENT PORT</span><span>DC VOLTAGE ↔ RSL</span></div><div class="mw-meter-lcd" data-live="mw-voltage">${mw.voltage.toFixed(2)} V</div><div class="mw-meter-sub"><span data-live="mw-meter-rsl">RSL ${mw.rsl.toFixed(1)} dBm</span><span>ERROR <span data-live="mw-error">${mw.alignmentError.toFixed(1)}°</span></span></div><div class="mw-meter-track"><div class="mw-meter-fill"></div></div></div>
  <div class="mw-link-badge ${badgeClass}" data-live-badge="mw-lock">${mw.locked ? "[ LINK LOCKED ]" : mw.alignmentError > 10 ? "[ WEAK RSL · KEEP TURNING ]" : "[ APPROACHING TARGET ]"}</div>
  <div class="control-card mw-control"><div class="control-row"><label for="mw-azimuth">Dish azimuth</label><output class="control-value" id="mw-azimuth-value">${st.microwave.azimuth.toFixed(1)}°</output></div><input type="range" id="mw-azimuth" data-mw-input="azimuth" min="0" max="360" step="0.1" value="${st.microwave.azimuth}" style="--range-progress:${rangeProgress(st.microwave.azimuth, 0, 360)}%" aria-valuetext="${st.microwave.azimuth.toFixed(1)} degrees"><div class="range-limits"><span>0°</span><span>TARGET ${st.microwave.targetAzimuth.toFixed(1)}°</span><span>360°</span></div></div>`;
}

function renderMwActions() {
  const mw = calculateMicrowave();
  return `<button class="mw-action ${mw.xpicActive ? "active" : ""}" data-action="mw-xpic" aria-pressed="${mw.xpicActive}">[ ${mw.xpicActive ? "Disable" : "Enable"} XPIC Dual-Polarization ]</button><button class="mw-action" data-action="mw-auto-align">[ Auto-Peak at ${st.microwave.targetAzimuth.toFixed(1)}° ]</button>`;
}

const RF_CONTENT = {
  system: {
    title: "Three-Sector Cellular Radio System",
    what: "Three antenna sectors arranged 120 degrees apart to cover a complete circle around the tower.",
    does: "It steers each sector independently, controls electrical downtilt and transmit power, and connects the curated vendor radios to the cabinet by fiber or legacy coax.",
  },
  aau: {
    title: "Active Antenna Unit (64T64R Massive MIMO)",
    what: "A 5G antenna and radio transmitter built together into one single box.",
    does: "Uses 64 tiny internal radio transceivers to shoot narrow, focused beams of high-speed data directly to individual moving phones, delivering multi-gigabit speeds.",
  },
  panel: {
    title: "Directional Sector Panel Antenna",
    what: "The classic rectangular antenna seen on cell towers.",
    does: "Broadcasts radio waves in a wide 65° flashlight pattern to cover one slice of the city. Three panels cover the full 360° circle.",
  },
  tma: {
    title: "Tower Mounted Amplifier (TMA)",
    what: "A signal booster mounted at the top of the tower right under the antenna.",
    does: "Acts as a hearing aid for the tower: it catches weak whispers from distant smartphones and boosts them before they travel down the long cable to the ground.",
  },
  earth: {
    title: "Coaxial Feeder Grounding Kit",
    what: "A copper clamp attached to the bare copper shield of the antenna cable.",
    does: "It bonds the coaxial shield directly to the tower's equipotential steel frame.",
    why: "It drains lightning electricity off the cable shield and dumps it safely onto the tower frame before the cable can carry the surge into the equipment room!",
  },
  siteMaster: {
    title: "Handheld Cable & Antenna Analyzer",
    what: "An RF radar tester used by field engineers.",
    does: "Injects test radio waves into the cable to ensure the antenna is radiating power rather than reflecting it back into the radio. Telecom standard requires VSWR ≤ 1.32.",
  },
  fiber: {
    title: "eCPRI Single-Mode Duplex Optical Fiber",
    what: "Two thin yellow single-mode patch cords linking the baseband SFP ports directly to the active antenna.",
    does: "Carries digital eCPRI radio samples as light, with zero coaxial feeder loss and no copper feeder grounding requirement.",
  },
  coax: {
    title: "7/8-inch Corrugated Copper Coaxial Feeder",
    what: "A thick black RF cable connecting the legacy cabinet radio to the top-mounted TMA and passive panel.",
    does: "Carries transmit and receive RF up the tower ladder. Its copper shield is bonded downward through a feeder earth kit.",
  },
};

function selectedCellularKind() {
  const selected = registry.get(st.selectedId);
  return selected && selected.data.domain === "cellular" ? selected.data.rfKind : "system";
}

function txPowerWatts(dbm) {
  return { 43: 20, 44: 25, 45: 32, 46: 40, 47: 50, 48: 63, 49: 80 }[Math.round(dbm)] || 40;
}

function renderSectorTabs() {
  const names = ["Alpha", "Beta", "Gamma"];
  return `<div class="rf-sector-tabs" role="group" aria-label="Cellular sectors">${names.map((name, index) => `<button class="rf-sector-tab ${st.cellular.sector === index ? "active" : ""}" data-action="rf-sector" data-value="${index}">[ Sector ${index + 1} (${name}) ]<small>${st.cellular.sectors[index].azimuth.toFixed(1)}° · ${st.cellular.sectors[index].onAir ? "ON AIR" : "MUTED"}</small></button>`).join("")}</div>`;
}

function renderCellularMetrics() {
  const sector = st.cellular.sectors[st.cellular.sector];
  return `<div class="rf-metrics"><div class="rf-metric"><small>${cellularGeneration().label.toUpperCase()} THROUGHPUT</small><strong data-live="rf-throughput">${cellularGeneration().throughput}</strong></div><div class="rf-metric"><small>AZIMUTH / RET</small><strong><span data-live="rf-azimuth">${sector.azimuth.toFixed(1)}°</span> / <span data-live="rf-downtilt">${sector.downtilt.toFixed(1)}°</span></strong></div><div class="rf-metric"><small>TX POWER</small><strong data-live="rf-tx">${sector.txPower.toFixed(0)} dBm · ${txPowerWatts(sector.txPower)} W</strong></div><div class="rf-metric"><small>CHANNEL</small><strong data-live="rf-bandwidth">${sector.bandwidth} MHz</strong></div></div>`;
}

function renderCellularHero() {
  const kind = selectedCellularKind();
  const content = RF_CONTENT[kind] || RF_CONTENT.system;
  return `<article class="mw-hero rf-hero"><div class="mw-hero-head"><div class="mw-hero-icon">RF</div><div><h3>${content.title}</h3><p>${kind === "aau" ? aauModel() : `${cellularGeneration().label} · Sector ${st.cellular.sector + 1} · selected from the live RF model`}</p></div></div><div class="mw-plain ${content.why ? "three" : ""}"><div class="plain-card"><small>01 · WHAT IS IT?</small><p>${content.what}</p></div><div class="plain-card"><small>02 · ${kind === "earth" ? "WHAT DOES IT DO?" : "WHAT DOES IT DO?"}</small><p>${content.does}</p></div>${content.why ? `<div class="plain-card"><small>03 · WHY DOES IT POINT DOWN?</small><p>${content.why}</p></div>` : ""}</div></article>`;
}

function renderCellularControls() {
  const index = st.cellular.sector,
    sector = st.cellular.sectors[index];
  return `<div class="section-label">Sector ${index + 1} steering & on-air state <span class="tag">120° RING</span></div><button class="rf-action ${sector.onAir ? "active" : ""}" data-action="rf-onair" aria-pressed="${sector.onAir}">[ Sector ${index + 1} ON-AIR: ${sector.onAir ? "ENABLED" : "MUTED"} ]</button><div class="control-card rf-control"><div class="control-row"><label for="rf-azimuth">Azimuth</label><output class="control-value" id="rf-azimuth-value">${sector.azimuth.toFixed(1)}°</output></div><input type="range" id="rf-azimuth" data-rf-input="azimuth" min="0" max="360" step="0.1" value="${sector.azimuth}" style="--range-progress:${rangeProgress(sector.azimuth, 0, 360)}%"><div class="range-limits"><span>0°</span><span>360°</span></div></div><div class="control-card rf-control"><div class="control-row"><label for="rf-downtilt">Electrical Downtilt (RET)</label><output class="control-value" id="rf-downtilt-value">${sector.downtilt.toFixed(1)}°</output></div><input type="range" id="rf-downtilt" data-rf-input="downtilt" min="0" max="10" step="0.1" value="${sector.downtilt}" style="--range-progress:${rangeProgress(sector.downtilt, 0, 10)}%"><div class="range-limits"><span>0° · HORIZON</span><span>10° · GROUND</span></div></div><div class="control-card rf-control"><div class="control-row"><label for="rf-tx-power">TX Power</label><output class="control-value" id="rf-tx-value">${sector.txPower.toFixed(0)} dBm · ${txPowerWatts(sector.txPower)} W</output></div><input type="range" id="rf-tx-power" data-rf-input="txPower" min="43" max="49" step="1" value="${sector.txPower}" style="--range-progress:${rangeProgress(sector.txPower, 43, 49)}%"><div class="range-limits"><span>43 dBm</span><span>49 dBm · 80 W</span></div></div><div class="section-label">Channel bandwidth</div><div class="rf-bandwidth">${[20, 40, 100].map((bandwidth) => `<button class="mw-pill ${sector.bandwidth === bandwidth ? "active" : ""}" data-action="rf-bandwidth" data-value="${bandwidth}">${bandwidth} MHz</button>`).join("")}</div><p class="rf-explanation">RET tilts only the translucent RF radiation volume downward; the physical panel stays fixed on its upper-ring mount. Horizontal beamwidth: 65° · vertical beamwidth: 12°.</p>`;
}

function sweepGraph(result) {
  const width = 640,
    height = 260,
    left = 46,
    right = 14,
    top = 16,
    bottom = 34;
  const plotW = width - left - right,
    plotH = height - top - bottom;
  const x = (distance) => left + (distance / 60) * plotW;
  const y = (vswr) => top + ((2.5 - vswr) / 1.5) * plotH;
  const grid = [1, 1.2, 1.32, 2, 2.5]
    .map(
      (value) =>
        `<line x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}" stroke="${value === 1.32 ? "#F59E0B" : "#CBD5E1"}" stroke-dasharray="${value === 1.32 ? "5 4" : "2 4"}"/><text x="${left - 7}" y="${y(value) + 3}" text-anchor="end" font-size="9" fill="#64748B">${value.toFixed(2)}</text>`
    )
    .join("");
  const distances = [0, 15, 30, 45, 60]
    .map(
      (value) =>
        `<text x="${x(value)}" y="${height - 13}" text-anchor="middle" font-size="9" fill="#64748B">${value}m</text>`
    )
    .join("");
  const path = result
    ? result.points
        .map(
          (point, index) =>
            `${index ? "L" : "M"}${x(point.distance).toFixed(2)},${y(point.vswr).toFixed(2)}`
        )
        .join(" ")
    : "";
  const color = result && result.fault ? "#DC2626" : "#059669";
  return `<svg class="rf-graph" id="rf-sweep-graph" viewBox="0 0 ${width} ${height}" role="img" aria-label="Interactive reflection versus distance graph from zero to sixty meters"><title>Site Master VSWR and distance-to-fault sweep</title>${grid}${distances}<text x="8" y="12" font-size="9" fill="#64748B">VSWR</text><text x="${width - right}" y="${height - 13}" text-anchor="end" font-size="9" fill="#64748B">DISTANCE</text><line x1="${left}" y1="${y(1.32)}" x2="${width - right}" y2="${y(1.32)}" stroke="#D97706" stroke-dasharray="5 4"/><text x="${width - right - 4}" y="${y(1.32) - 5}" text-anchor="end" font-size="9" fill="#92400E">LIMIT 1.32</text>${path ? `<path d="${path}" fill="none" stroke="${color}" stroke-width="2" vector-effect="non-scaling-stroke"/>` : `<text x="${left + plotW / 2}" y="${top + plotH / 2}" text-anchor="middle" font-size="12" fill="#64748B">RUN SWEEP TO ACQUIRE DTF TRACE</text>`}${result && result.fault ? `<line x1="${x(21.3)}" y1="${top}" x2="${x(21.3)}" y2="${height - bottom}" stroke="#DC2626" stroke-dasharray="3 3"/><text x="${x(21.3) + 5}" y="${top + 13}" font-size="10" fill="#B91C1C">21.3m FAULT</text>` : ""}<g id="rf-cursor" style="display:none" pointer-events="none"><line id="rf-cursor-line" y1="${top}" y2="${height - bottom}" stroke="#2563EB"/><circle id="rf-cursor-dot" r="4" fill="#2563EB"/></g><rect id="rf-graph-hit" x="${left}" y="${top}" width="${plotW}" height="${plotH}" fill="transparent" data-rf-graph="true"/></svg>`;
}

function renderSiteMaster() {
  const index = st.cellular.sector,
    result = st.cellular.sweeps[index];
  const running = cellularSim.running && cellularSim.sector === index;
  const diagnostic = st.cellular.aiDiagnostics[index];
  const badge = running
    ? "SWEEPING CABLE & ANTENNA…"
    : result
      ? result.fault
        ? "VSWR: 2.27 [FAIL - High Reflection!]"
        : "VSWR: 1.14 [PASS]"
      : "VSWR / DTF · SWEEP REQUIRED";
  return `<section class="rf-testbench" aria-label="Interactive RF Testbench"><div class="rf-testbench-head"><h3>Virtual Site Master</h3><span>VSWR + DTF · 0–60m</span></div><button class="rf-action primary" data-action="rf-run-sweep" ${running ? "disabled" : ""}>[ Run RF Cable & Antenna Sweep ]</button><button class="rf-action ${st.cellular.fault ? "fault" : ""}" data-action="rf-fault" aria-pressed="${st.cellular.fault}">[ Simulate Waterlogged Connector / Cable Kink ]</button><div class="rf-sweep-badge ${running ? "running" : result ? (result.pass ? "pass" : "fail") : ""}" data-live="rf-sweep-badge">${badge}</div><div class="rf-progress" id="rf-sweep-progress" style="--sweep-progress:${running ? "0%" : result ? "100%" : "0%"}"><span></span></div>${sweepGraph(result)}<div class="rf-cursor-readout" id="rf-cursor-readout">${result ? "Move over the SVG trace to inspect distance and VSWR." : "The interactive trace appears after the sweep."}</div><p class="rf-explanation ${result && result.fault ? "fault" : ""}">${result ? (result.fault ? "Impedance mismatch detected at 21.3m. Possible water ingress or damaged connector. Risk of radio PA thermal shutdown." : "Feeder and connectors are healthy. Reflection remains below 1.20 and meets the telecom standard VSWR ≤ 1.32.") : st.cellular.fault ? "Fault scenario armed. Run the sweep to locate the impedance mismatch by distance-to-fault analysis." : "Normal scenario armed. The analyzer will sweep the selected sector's feeder and antenna."}</p><button class="rf-action" data-action="rf-ai-diagnostic">[ AI Waveform Diagnostic ]</button>${diagnostic ? `<div class="rf-ai-diagnostic ${diagnostic.fault ? "fault" : ""}" id="rf-ai-result" role="status"><strong>${diagnostic.fault ? "NEURAL RF CLASSIFIER · FAULT" : "NEURAL RF CLASSIFIER · HEALTHY"}</strong><br>Confidence: ${diagnostic.confidence.toFixed(1)}%<br>${diagnostic.message}<small>LOCAL 601-POINT INFERENCE · ${diagnostic.discontinuities} DISCONTINUITIES · NO NETWORK OR MODEL DOWNLOAD</small></div>` : ""}<button class="rf-action" data-action="rf-inspect-master">[ Inspect Handheld Site Master ]</button></section>`;
}

function renderCellularSpecs() {
  const kind = selectedCellularKind(),
    sector = st.cellular.sectors[st.cellular.sector],
    result = st.cellular.sweeps[st.cellular.sector];
  const common = powerSpecCard(
    "Live sector RF state",
    [
      ["VENDOR", st.rack.vendor],
      ["GENERATION", cellularGeneration().label],
      ["THROUGHPUT", cellularGeneration().throughput],
      ["AZIMUTH", `${sector.azimuth.toFixed(1)}°`],
      ["RET", `${sector.downtilt.toFixed(1)}°`],
      ["TX POWER", `${sector.txPower.toFixed(0)} dBm · ${txPowerWatts(sector.txPower)} W`],
      ["BANDWIDTH", `${sector.bandwidth} MHz`],
      ["BEAM", sector.onAir ? "ON AIR · 65° × 12°" : "MUTED"],
    ],
    "Three sectors share the upper tower ring at 120° nominal spacing. RET changes the radiation volume, not the physical antenna mount."
  );
  let fields = [
    ["SECTORS", "3 × 120°"],
    ["RF PROFILE", cellularGeneration().rfMode],
    ["ACTIVE MODEL", aauModel()],
    ["LEGACY PANEL", "Passive 65° + TMA"],
  ];
  if (kind === "aau")
    fields = [
      ["MODEL", aauModel()],
      ["RADIO", "64T64R Massive MIMO"],
      ["INTERFACE", "Duplex single-mode eCPRI"],
      ["COAX LOSS", "0 dB · no coaxial feeder"],
    ];
  else if (kind === "panel")
    fields = [
      ["TYPE", "Passive sector panel"],
      ["HORIZONTAL BW", "65°"],
      ["COVERAGE", "3 panels · 360°"],
      ["FEEDER", "7/8-inch coax + TMA"],
    ];
  else if (kind === "tma")
    fields = [
      ["POSITION", "Directly below panel"],
      ["FUNCTION", "Uplink low-noise amplification"],
      ["FEEDER", "7/8-inch corrugated copper"],
      ["PURPOSE", "Improve legacy receive sensitivity"],
    ];
  else if (kind === "fiber")
    fields = [
      ["JACKET", "Yellow · duplex"],
      ["FIBER", "Single-mode"],
      ["PROTOCOL", "eCPRI · SFP"],
      ["COAXIAL LOSS", "Zero"],
    ];
  else if (kind === "coax")
    fields = [
      ["FEEDER", "7/8-inch corrugated copper"],
      ["ROUTE", "Cabinet → ladder → TMA"],
      ["SHIELD", "Bare copper at earth kit"],
      ["DTF RANGE", "0–60 m"],
    ];
  else if (kind === "earth")
    fields = [
      ["CLAMP", "Copper shield bonding kit"],
      ["WIRE DIRECTION", "Strictly downward"],
      ["DESTINATION", "Tower steel"],
      ["PURPOSE", "Lightning surge drainage"],
    ];
  else if (kind === "siteMaster")
    fields = [
      ["MEASUREMENT", "VSWR + distance to fault"],
      ["RANGE", "0–60 m"],
      ["PASS LIMIT", "VSWR ≤ 1.32"],
      [
        "CURRENT RESULT",
        result ? `${result.nominal.toFixed(2)} · ${result.pass ? "PASS" : "FAIL"}` : "NOT SWEPT",
      ],
    ];
  return `<div class="spec-grid">${common}${powerSpecCard((RF_CONTENT[kind] || RF_CONTENT.system).title, fields, "Procedural RF component linked to the active vendor, generation, sector and cable-test state.")}</div>`;
}

function renderCellularView(tab) {
  const head = `${renderMwSystemToggle()}${renderSectorTabs()}`;
  if (tab === "configure")
    return `${head}${renderCellularControls()}${renderCellularMetrics()}${renderSiteMaster()}`;
  if (tab === "specs") return `${head}${renderCellularSpecs()}${renderCellularMetrics()}`;
  return `${head}${renderCellularHero()}${renderCellularMetrics()}${renderCellularControls()}${renderSiteMaster()}`;
}

function renderMicrowaveOverview() {
  if (st.microwave.system === "CELLULAR") return renderCellularView("overview");
  const kind = selectedMicrowaveKind();
  const content =
    kind === "splitter" && st.microwave.topology !== "HSB"
      ? MW_CONTENT.symmetric
      : MW_CONTENT[kind] || MW_CONTENT.system;
  return `${renderMwSystemToggle()}<article class="mw-hero"><div class="mw-hero-head"><div class="mw-hero-icon">μW</div><div><h3>${content.title}</h3><p>Selected from the live microwave transmission model.</p></div></div><div class="mw-plain ${content.why ? "three" : ""}"><div class="plain-card"><small>01 · WHAT IS IT?</small><p>${content.what}</p></div><div class="plain-card"><small>02 · WHAT DOES IT DO?</small><p>${content.does}</p></div>${content.why ? `<div class="plain-card"><small>03 · WHY IS IT IMPORTANT?</small><p>${content.why}</p></div>` : ""}</div></article>${renderMwMetrics()}${renderMwMeter()}${renderMwActions()}`;
}

function renderMicrowaveConfigure() {
  if (st.microwave.system === "CELLULAR") return renderCellularView("configure");
  const m = st.microwave,
    mw = calculateMicrowave();
  return `${renderMwSystemToggle()}<div class="section-label">Physical link topology <span class="tag">PAGES 92–98</span></div><div class="mw-topology-grid">${Object.entries(
    MICROWAVE_TOPOLOGIES
  )
    .map(([key, topology]) => {
      const blocked = key === "SD" && !spaceDiversityAllowed();
      return `<button class="mw-pill ${m.topology === key ? "active" : ""}" data-action="mw-topology" data-value="${key}" ${blocked ? 'disabled title="Insufficient vertical mast clearance for 3–6m dish spacing"' : ""}>${topology.label}<small>${blocked ? "Blocked · insufficient mast clearance" : topology.detail}</small></button>`;
    })
    .join("")}</div>
  <div class="section-label">Parabolic dish diameter</div><div class="mw-size-grid">${[0.3, 0.6, 1.2, 1.8, 2.4].map((diameter) => `<button class="mw-pill ${m.diameter === diameter ? "active" : ""}" data-action="mw-diameter" data-value="${diameter}">${diameter.toFixed(1)}m<small>${diameter >= 2.4 ? "Separate mount · −3 dB" : "Integrated ODU · 0 dB"}</small></button>`).join("")}</div>
  <div class="section-label">Frequency band</div><div class="mw-size-grid">${[
    [7, "Long rural hop"],
    [15, "High-capacity relay"],
    [23, "Standard urban"],
    [38, "Short high-capacity"],
  ]
    .map(
      ([band, detail]) =>
        `<button class="mw-pill ${m.frequency === band ? "active" : ""}" data-action="mw-frequency" data-value="${band}">${band} GHz<small>${detail}</small></button>`
    )
    .join("")}</div>
  ${m.topology === "SD" ? `<div class="section-label">Vertical dish spacing</div><div class="control-card mw-control"><div class="control-row"><label for="mw-spacing">Dish separation</label><output class="control-value" id="mw-spacing-value">${m.spacing.toFixed(1)} m</output></div><input type="range" id="mw-spacing" data-mw-input="spacing" min="3" max="6" step="0.5" value="${m.spacing}" style="--range-progress:${rangeProgress(m.spacing, 3, 6)}%"><div class="range-limits"><span>3m</span><span>6m</span></div></div>` : ""}
  <div class="section-label">Mount & waveguide loss</div><div class="control-card"><div class="control-row"><span class="control-label">${mw.mountType === "INTEGRATED" ? "Integrated rear-hub ODU" : "Separate tower-pipe ODU + brass waveguide"}</span><strong class="control-value">−${mw.mountLoss.toFixed(1)} dB</strong></div><p class="control-note">${mw.mountType === "INTEGRATED" ? "Dishes ≤1.8m clip the ODU directly to the rear hub with no waveguide loss." : "The 2.4m dish uses a flexible brass waveguide. Its 3dB loss cuts transmit power in half."}</p></div>
  ${renderMwMeter()}${renderMwActions()}`;
}

function renderMicrowaveSpecs() {
  if (st.microwave.system === "CELLULAR") return renderCellularView("specs");
  const kind = selectedMicrowaveKind(),
    mw = calculateMicrowave(),
    m = st.microwave;
  const common = powerSpecCard(
    "Live microwave link budget",
    [
      ["BACKHAUL", formatCapacity(mw.capacityMbps)],
      ["RSL", `${mw.rsl.toFixed(1)} dBm`],
      ["FADE MARGIN", `${mw.fadeMargin.toFixed(1)} dB`],
      ["GAIN", `${mw.gain.toFixed(2)} dBi`],
      ["MOUNT LOSS", `−${mw.mountLoss.toFixed(1)} dB`],
      ["TOPOLOGY LOSS", `−${mw.topologyLoss.toFixed(1)} dB`],
      ["ODU DC POWER", `${mw.powerKw.toFixed(3)} kW`],
      ["ALIGNMENT", `${mw.voltage.toFixed(2)} V · ${mw.alignmentError.toFixed(1)}°`],
    ],
    "Gain = 10 log10[0.6 × (π × D × f / c)²]. RSL includes gain relative to the 0.6m / 15GHz reference, mounting loss and topology loss. Fade margin uses a −85dBm receiver threshold."
  );
  let fields = [
    ["TOPOLOGY", mw.topology.label],
    ["DISHES / ODUs", `${mw.dishCount} / ${mw.oduCount}`],
    ["MODEMS", `${mw.modemCount}`],
    ["CAPACITY", formatCapacity(mw.capacityMbps)],
  ];
  if (kind === "dish")
    fields = [
      ["DIAMETER", `${m.diameter.toFixed(1)} m`],
      ["FREQUENCY", `${m.frequency} GHz`],
      ["GAIN", `${mw.gain.toFixed(2)} dBi`],
      ["MOUNT", `${mw.mountType} · −${mw.mountLoss.toFixed(1)} dB`],
    ];
  else if (kind === "odu")
    fields = [
      ["RADIO", `${m.frequency} GHz outdoor transceiver`],
      ["DC INPUT", "45 W per ODU"],
      ["ALIGNMENT PORT", "0.5–2.5 V DC"],
      ["LIVE RSL", `${mw.rsl.toFixed(1)} dBm`],
      ["IF CONNECTION", "Ø10 mm black coax"],
    ];
  else if (kind === "splitter")
    fields =
      m.topology === "HSB"
        ? [
            ["TYPE", "Asymmetrical T-junction"],
            ["MAIN RADIO", "−1.5 dB"],
            ["STANDBY RADIO", "−7.0 dB"],
            ["DISH / RADIOS", "1 / 2"],
          ]
        : [
            ["TYPE", "Symmetrical XPIC splitter"],
            ["LOSS / BRANCH", "−3.0 dB"],
            ["SPLITTERS", "2"],
            ["MODEMS", "4"],
          ];
  else if (kind === "sd")
    fields = [
      ["DISHES", "2 vertically separated"],
      ["SPACING", `${m.spacing.toFixed(1)} m`],
      ["SPLITTER LOSS", "0 dB"],
      ["PURPOSE", "Multipath fade protection"],
    ];
  else if (["xpic", "modem"].includes(kind))
    fields = [
      ["OMT", "Vertical + horizontal dual-pol"],
      ["XPIC ACTIVE", mw.xpicActive ? "YES" : "NO"],
      ["VISIBLE MODEMS", `${mw.modemCount}`],
      ["BACKHAUL", formatCapacity(mw.capacityMbps)],
      ["LICENSE", "Same frequency · reused polarization"],
    ];
  else if (kind === "coax")
    fields = [
      ["CABLE", "Black IF coax · Ø10 mm"],
      ["INDOOR", "MINI-LINK AMM / Router 6471"],
      ["OUTDOOR", "ODU rear radio"],
      ["GROUND", "Top feeder kit · downward mast bond"],
    ];
  else if (kind === "ground")
    fields = [
      ["CLAMP", "Copper feeder grounding kit"],
      ["POSITION", "Tower top · coax ladder"],
      ["BOND", "Downward to steel mast"],
      ["PURPOSE", "Lightning / induced-charge path"],
    ];
  return `${renderMwSystemToggle()}<div class="spec-grid">${common}${powerSpecCard((MW_CONTENT[kind] || MW_CONTENT.system).title, fields, "Procedural transmission component linked to the live topology, alignment and capacity model.")}</div>${renderMwMetrics()}${renderMwActions()}`;
}

// -------------------------------------------------------------------------
// Phase 06 — multi-vendor CLI, carrier acceptance and on-air launch
// -------------------------------------------------------------------------
function cliCommands() {
  if (st.rack.vendor === "HUAWEI") return ["LST ALM:;", "DSP CELL:;", "DSP BRD:;", "LST RRU:;"];
  if (st.rack.vendor === "NOKIA") return ["show bts status", "show alarms"];
  return [
    "lt all",
    "cabx",
    "alt",
    "al",
    "st ru",
    "st cel",
    "st ret",
    "st tma",
    "cvls",
    "show port",
    "show hardware",
    "show system alarm",
  ];
}

function cliPrompt() {
  if (st.rack.vendor === "HUAWEI") return "<BBU5900>";
  if (st.rack.vendor === "NOKIA") return "AirScale#";
  return `moshell@${rackHousing().model.replace(/\s+/g, "")}>`;
}

function terminalWrite(text, tone = "") {
  String(text)
    .split("\n")
    .forEach((line) => st.terminal.lines.push({ text: line, tone }));
  if (st.terminal.lines.length > 300) st.terminal.lines.splice(0, st.terminal.lines.length - 300);
}

function ensureTerminalWelcome() {
  if (st.terminal.welcomed) return;
  st.terminal.welcomed = true;
  terminalWrite(
    `TOWER STUDIO CLI ENGINE · ${st.rack.vendor}\nConnected to the live ${rackHousing().model} site model.\nSyntax adapts to the vendor selected in Step 02. Type 'help' for commands.`,
    "muted"
  );
}

function scrollTerminalOutput() {
  const output = $("#cli-output");
  if (output) output.scrollTop = output.scrollHeight;
}

function renderTerminal() {
  const lines = st.terminal.lines.length
    ? st.terminal.lines
        .map(
          (line) =>
            `<div class="${line.tone}">${line.text ? escapeHTML(line.text) : "&nbsp;"}</div>`
        )
        .join("")
    : '<div class="muted">Terminal ready. Type help or choose a quick command.</div>';
  return `<section class="cli-terminal" id="cli-terminal" aria-label="${st.rack.vendor} docked CLI terminal">
    <div class="cli-head"><div><strong>${st.rack.vendor} CLI Console</strong><small>${st.rack.vendor === "ERICSSON" ? "Moshell + Router IPOS" : st.rack.vendor === "HUAWEI" ? "MML Command Line" : "AirScale CLI"} · live site state</small></div><button type="button" class="cli-close" data-action="terminal-close" aria-label="Close docked terminal">CLOSE</button></div>
    <div class="cli-quick" aria-label="Quick CLI commands">${cliCommands()
      .map(
        (command) =>
          `<button type="button" data-action="cli-command" data-value="${escapeHTML(command)}">${escapeHTML(command)}</button>`
      )
      .join("")}</div>
    <button type="button" class="cli-copilot" data-action="ai-copilot">✨ AI Copilot · diagnose root cause</button>
    ${triage.active ? `<div class="triage-analysis" id="triage-analysis">${escapeHTML(triage.report)}${triage.curve ? triageCurveSVG() : ""}</div><div class="triage-options" aria-label="Guided NOC remediation choices">${triage.options.map((option) => `<button type="button" class="triage-choice" data-action="triage-choice" data-value="${option.id}">${option.id}. ${option.label}</button>`).join("")}</div>` : ""}
    <div class="cli-output" id="cli-output" role="log" aria-live="polite" aria-label="Terminal output">${lines}</div>
    <form class="cli-form" id="cli-form" autocomplete="off"><div class="cli-input-wrap"><span class="cli-prompt">${escapeHTML(cliPrompt())}</span><input class="cli-input" id="cli-input" name="command" type="text" inputmode="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="CLI command input" placeholder="Type a command"></div><button class="cli-submit" type="submit">RUN</button></form>
  </section>`;
}

function formatAlarmReport() {
  const alarms = siteAlarms();
  return alarms.length
    ? alarms
        .map(
          (alarm) =>
            `[${alarm.timestamp}] ${alarm.severity.padEnd(8)} ${alarm.source.padEnd(8)} ${alarm.label}`
        )
        .join("\n")
    : "NO ACTIVE ALARMS";
}

function carrierFrequency() {
  if (st.generation === "CUSTOM") return customGenerationMetrics().frequencies;
  return {
    "2G": "900 MHz",
    "3G": "2100 MHz",
    "4G": "1800 MHz",
    "5G": "3500 MHz",
    MIXED: "3500 / 1800 / 2100 MHz",
  }[st.generation];
}

function installedModules() {
  return Object.keys(RACK_SLOT_POWER).filter((key) => st.rack.slots[key]);
}

function cvSnapshot() {
  return JSON.parse(
    JSON.stringify({
      env: st.env,
      tower: st.tower,
      H: st.H,
      lightning: st.lightning,
      grounding: st.grounding,
      power: st.power,
      rack: st.rack,
      generation: st.generation,
      customGenerations: st.customGenerations,
      cellular: st.cellular,
      microwave: st.microwave,
    })
  );
}

function cvListText() {
  if (!st.terminal.cvs.length)
    return "No configuration versions stored. Use cvms <name> to create one.";
  return [
    "NAME                              STATUS      CREATED UTC",
    ...st.terminal.cvs.map((cv) => `${cv.name.padEnd(32)} ${cv.status.padEnd(11)} ${cv.created}`),
  ].join("\n");
}

function ericssonCLI(command, normalized) {
  const lower = normalized.toLowerCase();
  const rack = calculateRack();
  const microwave = calculateMicrowave();
  const housing = rackHousing();
  if (lower === "lt all") {
    const modules = installedModules()
      .map(
        (key) => `    MO Slot:${key.toUpperCase()}=${rackCardLabel(key, RACK_CONTENT[key].title)}`
      )
      .join("\n");
    const sectors = st.cellular.sectors
      .map(
        (sector, index) =>
          `  MO Sector:${index + 1} Azimuth=${sector.azimuth.toFixed(1)}deg Tilt=${sector.downtilt.toFixed(1)}deg Tx=${sector.txPower}dBm BW=${sector.bandwidth}MHz State=${sector.onAir ? "Enabled/Active" : "Disabled"}`
      )
      .join("\n");
    return `Managed Object Hierarchy · live 3D site scan\nSite=${ENVIRONMENTS[st.env].name} / ${TOWERS[st.tower].short} / ${st.H}m\n  MO Cabinet=${housing.vendor} ${housing.model} (${housing.ip})\n    MO Baseband=${st.rack.slots.baseband ? "Baseband 6630" : st.rack.slots.dug ? rackCardLabel("dug", "DUG 20 01") : "NOT INSTALLED"}\n${modules || "    MO Slots=EMPTY"}\n${sectors}\n  MO MicrowaveHop=${microwave.topology.label} Dish=${st.microwave.diameter.toFixed(1)}m Band=${st.microwave.frequency}GHz LockedRSL=${microwave.rsl.toFixed(1)}dBm Lock=${microwave.locked ? "LOCKED" : "UNLOCKED"} Fade=${microwave.fadeMargin.toFixed(1)}dB`;
  }
  if (lower === "cabx") {
    const baseRpm = !st.rack.slots.fau
      ? 0
      : powerSim.temperature > 35
        ? 4200
        : powerSim.temperature > 30
          ? 3300
          : 2400;
    const sectors = [0, 1, 2]
      .map((index) => {
        const result = calculateSweep(index);
        return `Sector ${index + 1}: VSWR=${result.nominal.toFixed(2)} Max=${result.max.toFixed(2)} ${result.max <= 1.32 ? "PASS" : "FAIL · High Reflection"}`;
      })
      .join("\n");
    const fans = [0, 80, 120, 40]
      .map(
        (offset, index) =>
          `Fan Group ${index + 1}: ${baseRpm ? baseRpm + offset : 0} RPM ${baseRpm ? "RUNNING" : "NOT INSTALLED"}`
      )
      .join("\n");
    return `Cabinet Extended Telemetry · ${housing.model}\n${sectors}\nInternal Cabinet Temperature: ${powerSim.temperature.toFixed(1)} °C\n${fans}`;
  }
  if (lower === "alt" || lower === "al")
    return `Active Alarm List · ${housing.model}\n${formatAlarmReport()}`;
  if (["st ru", "st cel", "st ret", "st tma"].includes(lower)) {
    const activeRadio = ["ACTIVE", "MIXED"].includes(cellularGeneration().rfMode);
    const legacyRadio = ["LEGACY", "MIXED"].includes(cellularGeneration().rfMode);
    return st.cellular.sectors
      .map((sector, index) => {
        const present = lower === "st ru" ? activeRadio : lower === "st tma" ? legacyRadio : true;
        const status = present
          ? sector.onAir
            ? "Enabled / Active"
            : "Enabled / Disabled"
          : "Disabled / Not Present";
        const detail =
          lower === "st ret"
            ? ` Tilt=${sector.downtilt.toFixed(1)}deg`
            : lower === "st cel"
              ? ` BW=${sector.bandwidth}MHz Carrier=${carrierFrequency()}`
              : "";
        return `${lower.slice(3).toUpperCase()}-${index + 1}: ${status}${detail}`;
      })
      .join("\n");
  }
  const cvMatch = normalized.match(/^cvms\s+(.+)$/i);
  if (cvMatch) {
    const name = cvMatch[1].trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,31}$/.test(name))
      return "ERROR: CV name must be 1–32 characters using letters, digits, dot, underscore or hyphen.";
    st.terminal.cvs.forEach((cv) => {
      cv.status = "ARCHIVED";
    });
    st.terminal.cvs.unshift({
      name,
      status: "STARTABLE",
      created: new Date().toISOString(),
      snapshot: cvSnapshot(),
    });
    if (st.terminal.cvs.length > 20) st.terminal.cvs.length = 20;
    return `CV ${name} created successfully and set as STARTABLE`;
  }
  if (lower === "cvls")
    return `Configuration Version Backups · ${st.terminal.cvs.length}/20\n${cvListText()}`;
  if (lower === "show port") {
    if (!st.rack.slots.router) return "Router 6471: NOT INSTALLED · port audit unavailable";
    return `Router 6471 · IPOS Port State\n1/1 WAN Up · 10G SFP+ · Backhaul ${microwave.locked ? "LOCKED" : "UNLOCKED"} · RSL ${microwave.rsl.toFixed(1)} dBm\n1/2 CES to TDM 1001 ${st.rack.slots.tdm ? "Up" : "Disabled"} · ${rack.patchUp ? "8x E1 Circuit Emulation UP" : "Line DOWN · yellow patch required"}\n1/3 LAN Up · ${st.rack.slots.baseband ? "Baseband 6630 connected" : st.rack.slots.dug ? "DUG 20 connected" : "No attached baseband"}`;
  }
  if (lower === "show hardware") {
    const rows = installedModules().map(
      (key, index) =>
        `${rackCardLabel(key, RACK_CONTENT[key].title)} | PN TS-${key.toUpperCase()}-6471 | SN ER${String(index + 1).padStart(5, "0")} | REV R${(index % 3) + 1}A`
    );
    return `Router 6471 Hardware Inventory\nChassis ${housing.model} | PN TS-${housing.model.replace(/\s+/g, "-").toUpperCase()} | SN TS-CAB-0001 | REV R1A\n${rows.join("\n") || "No installed slot modules"}`;
  }
  if (lower === "show system alarm")
    return `Router 6471 Master + Attached-Unit Alarm Audit\nAttached: ${
      installedModules()
        .map((key) => rackCardLabel(key, RACK_CONTENT[key].title))
        .join(", ") || "NONE"
    }\n${formatAlarmReport()}`;
  return null;
}

function huaweiCLI(normalized) {
  const lower = normalized.toLowerCase();
  const echo = `%%${normalized.toUpperCase()}%%\nRETCODE = 0  Operation succeeded.\n`;
  if (lower === "lst alm:;")
    return `${echo}Active Alarm List · UMPT / BBU5900\n${formatAlarmReport()}`;
  if (lower === "dsp cell:;")
    return `${echo}CELL ID  CARRIER              BANDWIDTH  OPERATIONAL STATE\n${st.cellular.sectors.map((sector, index) => `${String(index + 1).padEnd(8)} ${carrierFrequency().padEnd(20)} ${(sector.bandwidth + " MHz").padEnd(10)} ${sector.onAir ? "Enabled / Active" : "Disabled"}`).join("\n")}`;
  if (lower === "dsp brd:;") {
    const boards = [
      st.rack.slots.dug ? rackCardLabel("dug", "UMPT") : "EMPTY",
      st.rack.slots.baseband ? rackCardLabel("baseband", "UBBP") : "EMPTY",
      st.rack.slots.duw ? rackCardLabel("duw", "UBBP") : "EMPTY",
      st.rack.slots.amm ? rackCardLabel("amm", "RTN 950A") : "EMPTY",
      st.rack.slots.fau ? "FAN" : "EMPTY",
      "UPEU",
      "EMPTY",
      "EMPTY",
    ];
    return `${echo}BBU5900 Board Inventory · Subrack 0\n${boards.map((board, slot) => `Slot ${slot}: ${board} | ${board === "EMPTY" ? "NOT INSTALLED" : "NORMAL"}`).join("\n")}`;
  }
  if (lower === "lst rru:;")
    return `${echo}RRU ID  MODEL                    HEALTH   OPTICAL CPRI\n${st.cellular.sectors.map((sector, index) => `RRU-${index + 1}  ${aauModel().padEnd(24)} ${sector.onAir ? "NORMAL" : "DISABLED"}  ${st.rack.slots.baseband && sector.onAir ? "UP" : "DOWN"}`).join("\n")}`;
  return null;
}

function nokiaCLI(normalized) {
  const lower = normalized.toLowerCase();
  if (lower === "show bts status") {
    const modules = installedModules()
      .map((key) => `${rackCardLabel(key, RACK_CONTENT[key].title)}: HEALTH=OK`)
      .join("\n");
    const carriers = st.cellular.sectors.filter((sector) => sector.onAir).length;
    return `AirScale BTS Status · ${rackHousing().model}\n${modules || "No AirScale modules installed"}\nActive Carriers: ${carriers} / 3\nSynchronization: ${calculateMicrowave().locked ? "PTP + SyncE LOCKED" : "HOLDOVER · backhaul not locked"}\nOperational State: ${carriers ? "ENABLED" : "DISABLED"}`;
  }
  if (lower === "show alarms") return `AirScale Active Alarms\n${formatAlarmReport()}`;
  return null;
}

function cliResponse(command) {
  const normalized = command.trim().replace(/\s+/g, " ");
  const lower = normalized.toLowerCase();
  if (lower === "help")
    return `${st.rack.vendor} commands:\n${cliCommands().join("\n")}${st.rack.vendor === "ERICSSON" ? "\ncvms <name>" : ""}\nai diagnose\n${triage.active ? "1 / 2 / 3 · guided remediation\n" : ""}clear`;
  if (lower === "ai diagnose" || lower === "ai diagnosis") return runAICopilot();
  if (triage.active && ["1", "2", "3"].includes(lower)) return applyTriageChoice(Number(lower));
  const response =
    st.rack.vendor === "HUAWEI"
      ? huaweiCLI(normalized)
      : st.rack.vendor === "NOKIA"
        ? nokiaCLI(normalized)
        : ericssonCLI(command, normalized);
  return (
    response ||
    `ERROR: Unknown ${st.rack.vendor} command '${normalized}'. Type 'help' for supported live-state commands.`
  );
}

function executeCLI(command, render = true) {
  const raw = String(command ?? "").trim();
  if (!raw) return "";
  ensureTerminalWelcome();
  terminalWrite(`${cliPrompt()} ${raw}`, "command");
  st.terminal.inputHistory.push(raw);
  if (st.terminal.inputHistory.length > 50) st.terminal.inputHistory.shift();
  st.terminal.historyIndex = st.terminal.inputHistory.length;
  let response = "";
  if (raw.trim().toLowerCase() === "clear" || raw.trim().toLowerCase() === "cls") {
    st.terminal.lines = [];
  } else {
    response = cliResponse(raw);
    terminalWrite(response, response.startsWith("ERROR") ? "error" : "");
  }
  if (render) {
    const content = $("#drawer-content");
    const scroll = content.scrollTop;
    renderDrawer();
    content.scrollTop = scroll;
    scrollTerminalOutput();
  }
  return response;
}

function renderAcceptancePanel() {
  const audit = calculateAcceptance();
  const passed = audit.checks.filter((check) => check.pass).length;
  return `<section class="acceptance-panel" aria-label="Carrier Site Acceptance Audit"><div class="acceptance-head"><div><h3>Carrier Site Acceptance Audit</h3><p>Pages 194–195 · live pre-flight punch-list</p></div><span class="acceptance-score ${audit.pass ? "pass" : "fail"}" id="acceptance-score">${passed}/6 ${audit.pass ? "ACCEPT" : "HOLD"}</span></div>${audit.checks.map((check) => `<article class="acceptance-item ${check.pass ? "pass" : "fail"}" data-audit="${check.id}"><span class="acceptance-icon">${check.pass ? "✓" : "✗"}</span><div class="acceptance-copy"><strong>${check.title}</strong><small>${check.value}</small><div class="acceptance-explanation">${check.explanation}</div></div></article>`).join("")}</section>`;
}

function renderPhase6Overview() {
  const audit = calculateAcceptance();
  const launchNote = launch.onAir
    ? `Frequency lock confirmed · ${st.cellular.sectors.length} sectors radiating · backhaul vector locked · aviation beacon active.`
    : audit.pass
      ? "All six acceptance gates pass. The launch sequence is armed and ready."
      : `LAUNCH INHIBITED · ${audit.checks
          .filter((check) => !check.pass)
          .map((check) => check.title)
          .join(" · ")}`;
  return `${renderAcceptancePanel()}<section class="launch-panel"><button class="launch-action ${launch.onAir ? "operational" : ""}" data-action="go-on-air" ${!audit.pass || launch.onAir ? "disabled" : ""}>${launch.onAir ? "[ ON AIR — SITE OPERATIONAL ]" : "[ GO ON AIR ]"}</button><p class="launch-note ${launch.onAir || audit.pass ? "ready" : "blocked"}" id="launch-note">${launchNote}</p></section>${st.terminal.open ? renderTerminal() : `<section class="phase6-card"><h3>Multi-vendor CLI Console</h3><p>Open the docked ${st.rack.vendor} terminal to inspect live MOs, boards, radios, ports, alarms and configuration versions.</p><div class="phase6-actions"><button class="phase6-button primary" data-action="terminal-open">[ OPEN DOCKED TERMINAL ]</button><button class="phase6-button" data-action="acceptance-refresh">[ RE-RUN AUDIT ]</button></div></section>`}`;
}

function renderCVList() {
  if (!st.terminal.cvs.length)
    return '<p class="launch-note">No configuration versions yet. In Ericsson mode, run cvms &lt;name&gt; to snapshot the live site.</p>';
  return `<div class="cv-list">${st.terminal.cvs.map((cv) => `<div class="cv-row"><div>${escapeHTML(cv.name)}<small>${escapeHTML(cv.created)}</small></div><span>${cv.status}</span></div>`).join("")}</div>`;
}

function renderPhase6Configure() {
  return `<section class="phase6-card" style="margin-top:0"><h3>Launch &amp; Terminal Control</h3><p>Syntax: ${st.rack.vendor === "ERICSSON" ? "Moshell + Router IPOS" : st.rack.vendor === "HUAWEI" ? "Huawei MML" : "Nokia AirScale CLI"}. Change the vendor in Step 02 to re-target the same live site model.</p><div class="phase6-actions"><button class="phase6-button primary" data-action="terminal-open">[ ${st.terminal.open ? "SHOW" : "OPEN"} TERMINAL ]</button><button class="phase6-button" data-action="acceptance-refresh">[ RE-RUN ACCEPTANCE ]</button></div></section><section class="phase6-card"><h3>Configuration Versions</h3>${renderCVList()}</section><section class="phase6-card"><h3>Launch Interlock</h3><p>The master action is guarded in application state as well as by its disabled button. A later cable fault, grounding failure, power alarm or loss of link margin suspends On-Air mode.</p></section>`;
}

function renderPhase6Specs() {
  const power = calculatePower();
  const audit = calculateAcceptance();
  return `<div class="spec-grid">${powerSpecCard(
    "Operational launch status",
    [
      ["SITE", launch.onAir ? "ON AIR" : "PRE-FLIGHT"],
      ["ACCEPTANCE", `${audit.checks.filter((check) => check.pass).length} / 6 PASS`],
      ["TOTAL LOAD", `${power.totalLoad.toFixed(2)} kW`],
      ["BACKUP", `${power.autonomy.toFixed(1)} h`],
      ["CELLULAR THROUGHPUT", `${cellularThroughputGbps()} Gbps`],
      ["VENDOR CLI", st.rack.vendor],
    ],
    "The status HUD, launch badge and 3D radiation state all derive from this live operational model."
  )}${powerSpecCard(
    "Configuration version store",
    [
      ["SAVED CV", String(st.terminal.cvs.length)],
      ["CAPACITY", "20 snapshots"],
      ["STARTABLE", st.terminal.cvs.find((cv) => cv.status === "STARTABLE")?.name || "NONE"],
      ["OUTPUT HISTORY", `${st.terminal.lines.length} / 300 lines`],
    ],
    "CV snapshots contain plain engineering state only; terminal history and snapshots are bounded to prevent uncontrolled memory growth."
  )}</div><section class="phase6-card"><h3>${st.rack.vendor} CLI Quick Reference</h3><div class="cli-reference">${[...cliCommands(), ...(st.rack.vendor === "ERICSSON" ? ["cvms <name>"] : []), "ai diagnose", "help", "clear"].map((command) => `<code>${escapeHTML(command)}</code>`).join("")}</div></section>`;
}

function updateAcceptanceLive() {
  if (st.masterStep !== 5) return;
  const audit = calculateAcceptance();
  audit.checks.forEach((check) => {
    const item = document.querySelector(`[data-audit="${check.id}"]`);
    if (!item) return;
    item.classList.toggle("pass", check.pass);
    item.classList.toggle("fail", !check.pass);
    item.querySelector(".acceptance-icon").textContent = check.pass ? "✓" : "✗";
    item.querySelector(".acceptance-copy small").textContent = check.value;
    item.querySelector(".acceptance-explanation").textContent = check.explanation;
  });
  const score = $("#acceptance-score");
  if (score) {
    const passed = audit.checks.filter((check) => check.pass).length;
    score.textContent = `${passed}/6 ${audit.pass ? "ACCEPT" : "HOLD"}`;
    score.classList.toggle("pass", audit.pass);
    score.classList.toggle("fail", !audit.pass);
  }
  const button = $('[data-action="go-on-air"]');
  if (button && !launch.onAir) button.disabled = !audit.pass;
}

function goOnAir(preserveStep = false) {
  const audit = calculateAcceptance();
  if (!audit.pass) {
    const failed = audit.checks.find((check) => !check.pass);
    toast(`LAUNCH INHIBITED · ${failed.title.toUpperCase()}`);
    if (st.masterStep === 5) renderDrawer();
    return false;
  }
  if (launch.onAir) return true;
  if (st.masterStep !== 5 && !preserveStep) enterMasterStep(5);
  st.cellular.sectors.forEach((sector) => {
    sector.onAir = true;
  });
  launch.onAir = true;
  launch.launchedAt = performance.now();
  launch.suspendedReason = "";
  if (aiBuild.prompt && aiBuild.stage === 4 && !aiBuild.running) {
    aiBuild.completed = true;
    setAIBuildStatus("[ ON AIR — OPERATIONAL ] · ACCEPTANCE RESTORED");
    syncAIArchitect();
  }
  playFrequencyLockChime();
  updateCellularVisuals(performance.now());
  updateMicrowaveVisuals(performance.now());
  updateLaunchVisuals(performance.now());
  renderDrawer();
  updateHUD();
  toast("FREQUENCY LOCK · ALL THREE SECTORS ON AIR");
  return true;
}

function toggleTerminal() {
  st.onboarding.active = false;
  if (st.masterStep !== 5) {
    st.terminal.open = true;
    ensureTerminalWelcome();
    enterMasterStep(5);
  } else {
    st.terminal.open = !st.terminal.open;
    if (st.terminal.open) ensureTerminalWelcome();
    renderDrawer();
  }
  if (st.terminal.open) {
    const content = $("#drawer-content");
    content.scrollTop = content.scrollHeight;
    scrollTerminalOutput();
  }
}

// -------------------------------------------------------------------------
// Phase 07 — deterministic offline AI architect, RF classifier and NOC triage
// -------------------------------------------------------------------------
function cloneAIConfig(config) {
  return JSON.parse(JSON.stringify(config));
}

function createAIConfig(overrides = {}) {
  const vendor = overrides.vendor || "ERICSSON";
  const generation = overrides.generation || "5G";
  const profile = smartProfile(vendor, generation);
  const slots = {};
  Object.keys(RACK_SLOT_POWER).forEach((key) => {
    slots[key] = profile.slots.includes(key);
  });
  const base = {
    env: "MOUNTAIN_PEAK",
    tower: "LATTICE_TUBULAR_3LEG",
    H: 45,
    lightning: "ESE_ACTIVE",
    grounding: true,
    generation,
    vendor,
    singleGenerator: false,
    power: {
      sourceMode: "DUAL_GENERATOR_OFFGRID",
      atsMode: "DIGITAL_PLC",
      radioLoadKw: 3,
      rectifiers: 3,
      autoRectifiers: true,
      batteryStrings: 4,
      batteryAh: 200,
      batteryType: "VRLA",
      branches: { rectifier: true, climate: true, auxiliary: true },
      climateSetpoint: 24,
    },
    rack: { vendor, location: "INDOOR", radioCount: generation === "MIXED" ? 6 : 0, slots },
    microwave: {
      system: "MICROWAVE",
      topology: "XPIC2",
      diameter: 0.6,
      frequency: 15,
      azimuth: 30,
      targetAzimuth: 30,
      spacing: 4,
      xpicBoost: false,
    },
    cellular: {
      sector: 0,
      fault: false,
      sweeps: [null, null, null],
      aiDiagnostics: [null, null, null],
      sectors: [
        { azimuth: 30, downtilt: 2, txPower: 46, bandwidth: 100, onAir: true },
        { azimuth: 150, downtilt: 2, txPower: 46, bandwidth: 100, onAir: true },
        { azimuth: 270, downtilt: 2, txPower: 46, bandwidth: 100, onAir: true },
      ],
    },
  };
  return {
    ...base,
    ...overrides,
    power: {
      ...base.power,
      ...(overrides.power || {}),
      branches: { ...base.power.branches, ...((overrides.power || {}).branches || {}) },
    },
    rack: {
      ...base.rack,
      ...(overrides.rack || {}),
      slots: { ...slots, ...((overrides.rack || {}).slots || {}) },
    },
    microwave: { ...base.microwave, ...(overrides.microwave || {}) },
    cellular: { ...base.cellular, ...(overrides.cellular || {}) },
  };
}

const AI_BLUEPRINTS = {
  zagros: {
    title: "Zagros Mountain 5G Relay",
    prompt:
      "Off-grid Mount Safeen 5G relay with 64T64R AAUs on 3.5 GHz, dual alternating generators, active ESE rod and XPIC backhaul.",
    config: createAIConfig(),
  },
  urban: {
    title: "Urban Rooftop 4G/5G C-RAN",
    prompt:
      "Urban rooftop 4G/5G C-RAN with RTT, Ericsson Baseband 6630, commercial grid, non-penetrating ballast and single-mode eCPRI.",
    config: createAIConfig({
      env: "URBAN_ROOFTOP",
      tower: "ROOFTOP_RTT_DRAME",
      H: 9,
      lightning: "FRANKLIN",
      generation: "MIXED",
      power: { sourceMode: "GRID_WITH_STANDBY" },
      rack: { location: "OUTDOOR" },
      microwave: { topology: "STANDALONE" },
    }),
  },
  cow: {
    title: "Emergency Border Outpost (COW)",
    prompt:
      "Emergency border outpost COW with 20 m telescopic mast, onboard diesel generator and standalone microwave.",
    config: createAIConfig({
      env: "EMERGENCY_DISASTER",
      tower: "COW_TELESCOPIC_TRUCK",
      H: 20,
      lightning: "FRANKLIN",
      generation: "4G",
      singleGenerator: true,
      power: { sourceMode: "GRID_WITH_STANDBY" },
      microwave: { topology: "STANDALONE" },
    }),
  },
};

function applyAIProfile(config) {
  const profile = smartProfile(config.vendor, config.generation);
  Object.keys(RACK_SLOT_POWER).forEach((key) => {
    config.rack.slots[key] = profile.slots.includes(key);
  });
  config.rack.vendor = config.vendor;
  config.rack.radioCount = config.generation === "MIXED" ? 6 : 0;
}

function parseAIArchitect(prompt) {
  const text = String(prompt || "")
    .trim()
    .toLowerCase();
  const intents = [];
  let env = null;
  if (/\b(cow|border|emergency|disaster)\b/.test(text)) {
    env = "EMERGENCY_DISASTER";
    intents.push("environment:COW");
  } else if (/\b(rooftop|roof|urban|c-ran|cran)\b/.test(text)) {
    env = "URBAN_ROOFTOP";
    intents.push("environment:rooftop");
  } else if (/\b(desert|rural|greenfield)\b/.test(text)) {
    env = "RURAL_GREENFIELD";
    intents.push("environment:desert");
  } else if (/\b(mountain|safeen|zagros)\b/.test(text)) {
    env = "MOUNTAIN_PEAK";
    intents.push("environment:mountain");
  }
  if (!env) env = st.env;
  const blueprintKey =
    env === "URBAN_ROOFTOP"
      ? "urban"
      : env === "EMERGENCY_DISASTER"
        ? "cow"
        : env === "MOUNTAIN_PEAK"
          ? "zagros"
          : null;
  const config = blueprintKey
    ? cloneAIConfig(AI_BLUEPRINTS[blueprintKey].config)
    : createAIConfig({
        env: "RURAL_GREENFIELD",
        tower: "LATTICE_ANGULAR_4LEG",
        H: 42,
        lightning: "FRANKLIN",
        generation: "MIXED",
        power: { sourceMode: "GRID_WITH_STANDBY" },
        microwave: { topology: "STANDALONE" },
      });
  config.env = env;
  if (env === "MOUNTAIN_PEAK") {
    config.tower = /angular|4leg|4-leg/.test(text)
      ? "LATTICE_ANGULAR_4LEG"
      : "LATTICE_TUBULAR_3LEG";
    config.H = 45;
    config.lightning = "ESE_ACTIVE";
    config.grounding = true;
    config.rack.location = "INDOOR";
  } else if (env === "URBAN_ROOFTOP") {
    config.tower = /parapet|pole/.test(text) ? "ROOFTOP_POLE" : "ROOFTOP_RTT_DRAME";
    config.H = config.tower === "ROOFTOP_POLE" ? 6 : 9;
    config.lightning = "FRANKLIN";
    config.grounding = true;
    config.rack.location = "OUTDOOR";
  } else if (env === "RURAL_GREENFIELD") {
    config.tower = /guyed/.test(text)
      ? "GUYED_MAST"
      : /monopole/.test(text)
        ? "MONOPOLE_LIGHT_DUTY"
        : /tubular|3leg|3-leg/.test(text)
          ? "LATTICE_TUBULAR_3LEG"
          : "LATTICE_ANGULAR_4LEG";
    config.H =
      config.tower === "GUYED_MAST" ? 60 : config.tower === "MONOPOLE_LIGHT_DUTY" ? 24 : 42;
    config.lightning = "FRANKLIN";
    config.grounding = true;
    config.rack.location = "INDOOR";
  } else {
    config.tower = "COW_TELESCOPIC_TRUCK";
    config.H = 20;
    config.lightning = "FRANKLIN";
    config.grounding = true;
    config.rack.location = "INDOOR";
  }

  let generation = null;
  const mentionedGenerations = ["2g", "3g", "4g", "5g"].filter((key) =>
    new RegExp(`\\b${key}\\b`).test(text)
  );
  if (/\bmixed\b/.test(text) || mentionedGenerations.length > 1) generation = "MIXED";
  else if (mentionedGenerations.length === 1) generation = mentionedGenerations[0].toUpperCase();
  if (generation) {
    config.generation = generation;
    intents.push(`generation:${generation}`);
  }
  applyAIProfile(config);

  const withoutOffgrid = text.replace(/off[- ]grid/g, "");
  const dual = /\bdual\b|alternating/.test(text);
  const generator = /\b(generator|genset|diesel)\b/.test(text);
  const grid = /\bgrid\b|commercial\s+power|utility\s+power/.test(withoutOffgrid);
  const battery = /\b(battery|batteries|lithium|vrla)\b/.test(text);
  const offgrid = /off[- ]grid/.test(text);
  if (dual) {
    config.power.sourceMode = "DUAL_GENERATOR_OFFGRID";
    config.singleGenerator = false;
    intents.push("power:dual-alternating-generators");
  } else if (generator && (!grid || offgrid)) {
    config.power.sourceMode = "GRID_WITH_STANDBY";
    config.singleGenerator = true;
    intents.push("power:onboard-generator");
  } else if (grid) {
    config.power.sourceMode = "GRID_WITH_STANDBY";
    config.singleGenerator = false;
    intents.push("power:commercial-grid");
  }
  if (battery) {
    config.power.batteryStrings = 4;
    config.power.batteryAh = 200;
    config.power.batteryType = /lithium/.test(text) ? "LITHIUM" : "VRLA";
    intents.push(`power:${config.power.batteryType.toLowerCase()}-battery`);
  }

  if (/\bstandalone\b|1\+0/.test(text)) {
    config.microwave.topology = "STANDALONE";
    config.microwave.xpicBoost = false;
    intents.push("microwave:standalone");
  } else if (/space[- ]diversity/.test(text)) {
    config.microwave.topology = "SD";
    config.microwave.xpicBoost = false;
    intents.push("microwave:space-diversity-1+1");
  } else if (/\bxpic\b/.test(text)) {
    config.microwave.topology = "XPIC2";
    config.microwave.xpicBoost = false;
    intents.push("microwave:XPIC");
  } else if (/1\+1/.test(text)) {
    config.microwave.topology = "HSB";
    config.microwave.xpicBoost = false;
    intents.push("microwave:hot-standby-1+1");
  }
  config.microwave.azimuth = config.microwave.targetAzimuth;
  return {
    prompt: String(prompt || "").trim(),
    config,
    intents,
    summary: intents.length ? intents.join(" · ") : "contextual site defaults",
  };
}

function setAIArchitectOpen(open) {
  st.ai.architectOpen = !!open;
  const bar = $("#ai-architect");
  bar.classList.toggle("collapsed", !st.ai.architectOpen);
  $("#ai-mobile-toggle").setAttribute("aria-expanded", String(st.ai.architectOpen));
}

function syncAIArchitect() {
  const bar = $("#ai-architect");
  bar.classList.toggle("collapsed", !st.ai.architectOpen);
  $("#ai-build-button").disabled = aiBuild.running;
  document.querySelectorAll("[data-ai-scenario]").forEach((button) => {
    button.disabled = aiBuild.running;
  });
  const status = $("#ai-build-status");
  status.textContent = aiBuild.status;
  status.classList.toggle("running", aiBuild.running);
  status.classList.toggle("complete", aiBuild.completed && !aiBuild.running);
  status.classList.toggle("hold", !aiBuild.running && !aiBuild.completed && aiBuild.stage === 4);
}

function setAIBuildStatus(status) {
  aiBuild.status = status;
  const element = $("#ai-build-status");
  if (element) element.textContent = status;
}

function applyAIConfig(config) {
  st.onboarding.active = false;
  st.env = config.env;
  st.tower = config.tower;
  st.H = config.H;
  st.lightning = config.lightning;
  st.grounding = config.grounding;
  st.power = cloneAIConfig(config.power);
  st.rack = cloneAIConfig(config.rack);
  st.generation = config.generation;
  st.microwave = cloneAIConfig(config.microwave);
  st.cellular = cloneAIConfig(config.cellular);
  st.masterStep = 1;
  st.tab = "overview";
  st.selectedId = null;
  st.drawerOpen = window.innerWidth > 760;
  st.terminal.open = false;
  launch.onAir = false;
  launch.launchedAt = 0;
  launch.suspendedReason = "";
  triage.active = false;
  triage.options = [];
  triage.curve = null;
  triage.lastChoice = null;
  rackSim.door = 0;
  rackSim.doorTarget = 0;
  rackSim.patchLink = false;
  rackSim.patchProgress = 0;
  cellularSim.running = false;
  normalizeState();
}

function addAIAssemblyLayer(object, start, kind) {
  if (!object) return;
  aiBuild.layers.push({
    object,
    start,
    kind,
    position: object.position.clone(),
    scale: object.scale.clone(),
  });
  object.visible = false;
}

function prepareAIBuildVisuals() {
  aiBuild.layers = [];
  aiBuild.cards = [];
  aiBuild.powerRoutes = [];
  addAIAssemblyLayer(registry.get("tower")?.object, 800, "tower");
  addAIAssemblyLayer(registry.get("cow-outriggers")?.object, 800, "tower");
  addAIAssemblyLayer(registry.get("lightning-terminal")?.object, 800, "tower");
  addAIAssemblyLayer(rackVisuals.root, 1600, "rack");
  addAIAssemblyLayer(registry.get("power-cabling")?.object, 1600, "power");
  addAIAssemblyLayer(microwaveVisuals.root, 2400, "antennas");
  addAIAssemblyLayer(cellularVisuals.root, 2400, "antennas");
  rackVisuals.modules.forEach((object) => {
    if (!object) return;
    aiBuild.cards.push({ object, z: object.position.z });
    object.position.z += 0.72;
  });
  const cabling = registry.get("power-cabling")?.object;
  if (cabling)
    cabling.traverse((object) => {
      if (!object.geometry || !object.isMesh) return;
      const count = object.geometry.index
        ? object.geometry.index.count
        : object.geometry.attributes.position?.count || 0;
      if (!count) return;
      aiBuild.powerRoutes.push({ object, count });
      object.geometry.setDrawRange(0, 0);
    });
}

function startAIBuild(prompt) {
  if (aiBuild.running) return false;
  const parsed = parseAIArchitect(prompt);
  if (!parsed.prompt) {
    toast("AI ARCHITECT · DESCRIBE A SITE OR SELECT A BLUEPRINT");
    return false;
  }
  aiBuild.running = true;
  aiBuild.completed = false;
  aiBuild.started = performance.now();
  aiBuild.stage = -1;
  aiBuild.prompt = parsed.prompt;
  aiBuild.config = parsed.config;
  aiBuild.intents = parsed.intents;
  st.ai.lastPrompt = parsed.prompt;
  $("#ai-architect-input").value = parsed.prompt;
  applyAIConfig(parsed.config);
  setAIBuildStatus(`0.0 s · TERRAIN + PAD · CAMERA RESET · ${parsed.summary}`);
  rebuildSite();
  resetPowerSimulation();
  powerSim.batterySoc = 100;
  powerSim.fuelRemainingL = 1000;
  powerSim.temperature = 24;
  powerSim.climateEpoch = aiBuild.started;
  powerSim.offgridEpoch = aiBuild.started;
  powerSim.failedRectifier = null;
  if (parsed.config.singleGenerator) {
    powerSim.phase = "GENERATOR";
    powerSim.activeSource = "GEN1";
    powerSim.gridVoltage = 0;
  }
  fitSite(true);
  // Use the validated Step 05 vertical framing from the beginning so the
  // completed antennas and ESE terminal stay below the HUD and AI bar.
  cameraGoal.target.y = Math.max(1, st.H * 0.58);
  snapCameraToGoal();
  syncAIArchitect();
  updateAIFeatures(aiBuild.started, 0);
  updateHUD();
  return true;
}

function updateAIFeatures(now, dt) {
  if (aiBuild.running) {
    const elapsed = Math.max(0, now - aiBuild.started);
    const stage =
      elapsed >= 3000 ? 4 : elapsed >= 2400 ? 3 : elapsed >= 1600 ? 2 : elapsed >= 800 ? 1 : 0;
    if (stage !== aiBuild.stage) {
      aiBuild.stage = stage;
      if (stage === 1) setAIBuildStatus("0.8 s · TOWER ASSEMBLY · STRUCTURE + LIGHTNING");
      if (stage === 2) {
        setAIBuildStatus("1.6 s · CABINET OPEN · CARDS SEATED · POWER ROUTED");
        rackSim.doorTarget = 1;
        rackSim.patchLink = calculateRack().patchReady;
        rackSim.patchProgress = 0;
        rackSim.patchStarted = now;
        rackSim.patchCompletedNotified = false;
      }
      if (stage === 3) {
        st.microwave.azimuth = st.microwave.targetAzimuth;
        microwaveSim.azimuth = st.microwave.azimuth;
        setAIBuildStatus("2.4 s · ANTENNAS ONLINE · AMBER MICROWAVE LOCK");
        updateMicrowaveVisuals(now);
      }
    }
    const reduced = reducedMotionQuery.matches;
    aiBuild.layers.forEach((layer) => {
      const progress = reduced
        ? elapsed >= layer.start
          ? 1
          : 0
        : clamp((elapsed - layer.start) / 560, 0, 1);
      layer.object.visible = elapsed >= layer.start;
      if (!layer.object.visible) return;
      const eased = 1 - Math.pow(1 - progress, 3);
      layer.object.position.copy(layer.position);
      layer.object.scale.copy(layer.scale);
      if (layer.kind === "tower") layer.object.scale.y = layer.scale.y * Math.max(0.02, eased);
      else layer.object.scale.multiplyScalar(0.72 + eased * 0.28);
    });
    aiBuild.cards.forEach((card) => {
      const progress = reduced ? (elapsed >= 1600 ? 1 : 0) : clamp((elapsed - 1600) / 620, 0, 1);
      card.object.position.z = card.z + (1 - (1 - Math.pow(1 - progress, 3))) * 0.72;
    });
    const routeProgress = reduced ? (elapsed >= 1600 ? 1 : 0) : clamp((elapsed - 1600) / 680, 0, 1);
    aiBuild.powerRoutes.forEach((route) =>
      route.object.geometry.setDrawRange(0, Math.floor(route.count * routeProgress))
    );
    if (elapsed >= 3000) {
      aiBuild.layers.forEach((layer) => {
        layer.object.visible = true;
        layer.object.position.copy(layer.position);
        layer.object.scale.copy(layer.scale);
      });
      aiBuild.cards.forEach((card) => {
        card.object.position.z = card.z;
      });
      aiBuild.powerRoutes.forEach((route) => route.object.geometry.setDrawRange(0, route.count));
      const launched = goOnAir(true);
      aiBuild.running = false;
      aiBuild.completed = launched;
      if (launched) {
        aiBuild.flashUntil = now + 1500;
        $("#site-hud").classList.add("ai-flash");
        setAIBuildStatus("[ ON AIR — OPERATIONAL ] · 3.0 s · LOCAL AI BUILD COMPLETE");
      } else setAIBuildStatus("ACCEPTANCE HOLD · RED ENGINEERING GATES REMAIN BLOCKING");
      syncAIArchitect();
    }
  }
  if (aiBuild.flashUntil && now >= aiBuild.flashUntil) {
    aiBuild.flashUntil = 0;
    $("#site-hud").classList.remove("ai-flash");
  }
  if (triage.marker) {
    triage.marker.rotation.y += reducedMotionQuery.matches ? 0 : dt * 1.8;
    const pulse = reducedMotionQuery.matches ? 1 : 1 + Math.sin(now * 0.008) * 0.12;
    triage.marker.scale.setScalar(pulse);
  }
}

function classifyRFWaveform(result) {
  const source = result || calculateSweep(st.cellular.sector);
  const points = Array.from(
    { length: 601 },
    (_, index) => source.points[Math.round((index * (source.points.length - 1)) / 600)]
  );
  let discontinuities = 0,
    inDiscontinuity = false;
  points.forEach((point) => {
    if (point.vswr > 1.32 && !inDiscontinuity) {
      discontinuities++;
      inDiscontinuity = true;
    }
    if (point.vswr <= 1.32) inDiscontinuity = false;
  });
  const peak = points.reduce(
    (worst, point) => (point.vswr > worst.vswr ? point : worst),
    points[0]
  );
  const fault = !!source.fault || discontinuities > 0 || peak.vswr > 1.32;
  if (fault)
    return {
      fault: true,
      confidence: 96.8,
      samples: 601,
      vswr: 2.27,
      distance: 21.3,
      discontinuities: 1,
      signature: "capacitive-shunt/water-ingress",
      message:
        "High-reflectance discontinuity at 21.3 m · VSWR 2.27 · capacitive-shunt/water-ingress signature. Inspect for a pinched dielectric or failed 7/16 DIN weatherproofing.",
    };
  return {
    fault: false,
    confidence: 99.1,
    samples: 601,
    vswr: 1.14,
    distance: null,
    discontinuities: 0,
    signature: "normal-line",
    message: "Normal line · VSWR 1.14 below 1.32 · no discontinuities.",
  };
}

function triageCurveSVG() {
  const curve = triage.curve;
  if (!curve) return "";
  const width = 320,
    height = 82,
    maxHours = Math.max(curve.before.autonomy, curve.after.autonomy, 0.1);
  const beforeX = 26 + clamp(curve.before.autonomy / maxHours, 0, 1) * 270;
  const afterX = 26 + clamp(curve.after.autonomy / maxHours, 0, 1) * 270;
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Battery state of charge versus discharge hours before and after carrier throttling"><line x1="26" y1="8" x2="26" y2="62" stroke="#64748B"/><line x1="26" y1="62" x2="304" y2="62" stroke="#64748B"/><line x1="26" y1="8" x2="${beforeX.toFixed(1)}" y2="62" stroke="#F59E0B" stroke-width="2"/><line x1="26" y1="8" x2="${afterX.toFixed(1)}" y2="62" stroke="#34D399" stroke-width="2"/><text x="4" y="12" fill="#A7F3D0" font-size="7">100%</text><text x="12" y="65" fill="#A7F3D0" font-size="7">0%</text><text x="26" y="75" fill="#A7F3D0" font-size="7">0 h</text><text x="296" y="75" text-anchor="end" fill="#A7F3D0" font-size="7">${maxHours.toFixed(1)} h</text><text x="34" y="19" fill="#F59E0B" font-size="7">BEFORE ${curve.before.autonomy.toFixed(1)} h</text><text x="34" y="31" fill="#34D399" font-size="7">THROTTLED ${curve.after.autonomy.toFixed(1)} h</text></svg>`;
}

function runAICopilot() {
  const alarms = siteAlarms();
  const power = calculatePower();
  const rack = calculateRack();
  const microwave = calculateMicrowave();
  const sweeps = [0, 1, 2].map((index) => calculateSweep(index));
  const worstVswr = Math.max(...sweeps.map((sweep) => sweep.max));
  const rfFault = st.cellular.fault || sweeps.some((sweep) => sweep.fault || sweep.max > 1.32);
  const mainsLost = alarms.some((alarm) => alarm.code === "MAINS" || alarm.code === "BATTERY");
  const doorOpen = rackSim.doorTarget > 0.5 || rackSim.door > 0.15;
  let rootCause = "NO ACTIVE ROOT CAUSE · SITE NOMINAL";
  let impact = "No service impact detected; continue routine NOC observation.";
  if (rfFault) {
    rootCause = "RF HIGH REFLECTION · CAPACITIVE SHUNT AT 21.3 m";
    impact = "Three sectors are at risk of radio PA thermal shutdown and degraded coverage.";
  } else if (mainsLost) {
    rootCause = "LOSS OF MAINS · DC PLANT ON BATTERY BRIDGE";
    impact = `Commercial AC is unavailable; battery autonomy is the current service horizon.`;
  } else if (alarms.some((alarm) => alarm.code === "ALARM_6")) {
    rootCause = "THERMAL HIGH · ALARM #6 ABOVE 35°C";
    impact = "Dual 2.8 kW cooling duty is active; prolonged heat threatens baseband availability.";
  } else if (!microwave.locked || microwave.fadeMargin < 30) {
    rootCause = "BACKHAUL ALIGNMENT / FADE MARGIN DEGRADATION";
    impact = "C-RAN synchronization and user traffic are exposed to backhaul interruption.";
  } else if (alarms.length) {
    rootCause = alarms[0].label.toUpperCase();
    impact = "Correlated cabinet/power telemetry requires guided remediation.";
  }
  const horizon = `${power.autonomy.toFixed(1)} h at ${power.dcLoad.toFixed(2)} kW DC load`;
  triage.active = true;
  triage.rootCause = rootCause;
  triage.curve = null;
  triage.optimized = false;
  triage.lastChoice = null;
  triage.report = `${rootCause} · BACKUP ${horizon}`;
  triage.options = [
    { id: 1, label: "Start Generator 1" },
    { id: 2, label: "Battery math + throttle carriers" },
    { id: 3, label: "Locate 21.3 m cable repair" },
  ];
  return [
    "AI NOC · EXECUTIVE ROOT-CAUSE REPORT",
    `ROOT CAUSE: ${rootCause}`,
    `IMPACT: ${impact}`,
    `BACKUP HORIZON: ${horizon} · ${powerSim.batterySoc.toFixed(1)}% SOC · ${power.remainingEnergy.toFixed(1)} kWh usable remaining`,
    `POWER: ${sourceLabel()} · ${power.dcBusVoltage.toFixed(1)} V DC · rectifiers ${power.installed}/${power.required + 1} required · ${microwave.locked ? "backhaul locked" : "backhaul unlocked"}`,
    `RF: worst VSWR ${worstVswr.toFixed(2)} · ${rfFault ? "21.3 m discontinuity / water-ingress signature" : "all 601-point lines below 1.32"}`,
    `CABINET: ${rackHousing().vendor} ${rackHousing().model} · ${rackHousing().ip} · door ${doorOpen ? "OPEN" : "CLOSED"} · ${rack.loadKw.toFixed(2)} kW`,
    `CORRELATED ALARMS: ${alarms.length ? alarms.map((alarm) => `${alarm.severity} ${alarm.label}`).join(" | ") : "NONE"}`,
    "Choose 1: crank Generator 1 · 2: extend autonomy · 3: camera-guided RF repair.",
  ].join("\n");
}

function applyTriageChoice(choice) {
  if (!triage.active) runAICopilot();
  const now = performance.now();
  triage.lastChoice = Number(choice);
  if (Number(choice) === 1) {
    triage.generatorStart = now;
    powerSim.generatorCooldownUntil = 0;
    if (st.power.sourceMode === "DUAL_GENERATOR_OFFGRID") {
      powerSim.phase = "NORMAL";
      powerSim.activeSource = "GEN1";
      powerSim.gridVoltage = 0;
      powerSim.offgridEpoch = now;
    } else {
      powerSim.phase = "BATTERY_BRIDGE";
      powerSim.activeSource = "BATTERY";
      powerSim.gridVoltage = 0;
      powerSim.eventStart = now;
    }
    playContactor();
    triage.report = "GENERATOR 1 CRANKING · EXHAUST ACTIVE · ATS TRANSFER SEQUENCE ARMED";
    updatePowerVisuals(now, 0, calculatePower());
    updateHUD();
    return "AI NOC · OPTION 1\nGenerator 1 crank/exhaust animation started. Batteries hold the −48 V bus with 0.000 ms DC interruption.\nATS transfers after generator stabilization (15.0 s sequence); Loss of Mains then clears while utility remains absent.";
  }
  if (Number(choice) === 2) {
    const before = calculatePower();
    const beforeSnapshot = {
      load: before.dcLoad,
      autonomy: before.autonomy,
      current: (before.dcLoad * 1000) / 48,
    };
    st.cellular.sectors.forEach((sector, index) => {
      if (index === 0) sector.onAir = true;
      if (index > 0) {
        sector.onAir = true;
        sector.txPower = 43;
        sector.bandwidth = Math.min(sector.bandwidth, 20);
      }
    });
    st.power.radioLoadKw = Math.max(0.5, st.power.radioLoadKw * 0.65);
    triage.optimized = true;
    normalizePowerState();
    const after = calculatePower();
    triage.curve = {
      soc: powerSim.batterySoc,
      before: beforeSnapshot,
      after: { load: after.dcLoad, autonomy: after.autonomy, current: (after.dcLoad * 1000) / 48 },
    };
    triage.report = `CARRIERS 2–3 THROTTLED · AUTONOMY ${before.autonomy.toFixed(1)} → ${after.autonomy.toFixed(1)} h`;
    rebuildSite();
    updateHUD();
    return [
      "AI NOC · OPTION 2 · BATTERY-DISCHARGE MATH",
      `Usable battery = ${st.power.batteryStrings} strings × ${st.power.batteryAh} Ah × 48 V × ${st.power.batteryType === "LITHIUM" ? "90" : "80"}% = ${after.usableEnergy.toFixed(1)} kWh.`,
      `Remaining energy = ${after.usableEnergy.toFixed(1)} × ${powerSim.batterySoc.toFixed(1)}% = ${after.remainingEnergy.toFixed(1)} kWh.`,
      `Before: ${before.dcLoad.toFixed(2)} kW ÷ 48 V = ${beforeSnapshot.current.toFixed(1)} A · autonomy ${before.autonomy.toFixed(1)} h.`,
      `After: ${after.dcLoad.toFixed(2)} kW ÷ 48 V = ${((after.dcLoad * 1000) / 48).toFixed(1)} A · autonomy ${after.autonomy.toFixed(1)} h.`,
      "Nonessential sectors 2 and 3 are throttled to 43 dBm / 20 MHz; sector 1 preserves full essential coverage.",
      `Extension: +${Math.max(0, after.autonomy - before.autonomy).toFixed(1)} h.`,
    ].join("\n");
  }
  if (Number(choice) === 3) {
    st.masterStep = 4;
    st.microwave.system = "CELLULAR";
    st.tab = "configure";
    st.drawerOpen = true;
    st.selectedId = null;
    rebuildSite();
    const cable =
      cellularVisuals.cables.find((item) => item.sector === 0 && item.type === "coax") ||
      cellularVisuals.cables.find((item) => item.sector === 0) ||
      cellularVisuals.cables[0];
    if (cable) {
      const length = cable.curve.getLength();
      const point = cable.curve.getPointAt(clamp(21.3 / Math.max(length, 0.001), 0, 1));
      const marker = new T.Group();
      marker.position.copy(point);
      siteRoot.add(marker);
      const core = mesh(new T.SphereGeometry(0.13, 16, 12), LED.red, marker, false);
      core.raycast = () => {};
      const ring = mesh(new T.TorusGeometry(0.34, 0.025, 8, 32), MAT.orange, marker, false);
      ring.raycast = () => {};
      rackLabel("AI DTF · 21.3 m", 0.75, 0.09, 0, 0.48, 0, marker, true);
      rfRegister(marker, {
        id: "ai-rf-fault-21-3",
        rfKind: "coax",
        sector: 0,
        title: "AI NOC · Damaged 21.3 m Cable Area",
        focusSize: 3,
      });
      triage.marker = marker;
      triage.cameraTarget = point.clone();
      cameraGoal.target.copy(point);
      cameraGoal.size = window.innerWidth < 760 ? 6 : 4.5;
      cameraGoal.theta = 0.82;
      cameraGoal.phi = 0.95;
      if (reducedMotionQuery.matches) snapCameraToGoal();
    }
    triage.report =
      "STEP 04 SITE MASTER · CAMERA TRACKING DTF 21.3 m · REPAIR WEATHERPROOFING / DIELECTRIC";
    renderDrawer();
    updateSelection();
    const content = $("#drawer-content"),
      bench = $(".rf-testbench");
    if (content && bench) {
      const relativeTop = bench.getBoundingClientRect().top - content.getBoundingClientRect().top;
      content.scrollTop += relativeTop - 8;
    }
    return "AI NOC · OPTION 3\nStep 04 Site Master is open. The camera is smoothly moving to the damaged 21.3 m cable area.\nInspect the pinched dielectric and failed 7/16 DIN weatherproofing, clear the fault scenario, then repeat the 601-point sweep and AI diagnostic.";
  }
  return "ERROR: Choose triage option 1, 2 or 3.";
}

function renderOnboardingStep1() {
  const env = ENVIRONMENTS[st.env];
  const tower = TOWERS[st.tower];
  const [min, max] = tower.range;
  const progress = ((st.H - min) / (max - min)) * 100;
  return `<div class="onboarding-banner">
      <small>NEW SITE SETUP · STEP 01</small>
      <h3>Choose Your Tower Structure</h3>
      <p>Pick your site environment, select a tower type, and set its height. Vendor cabinets, power telemetry, and RF tools unlock progressively as you build.</p>
    </div>
    <div class="section-label">01 · Site environment</div>
    <div class="option-grid">${Object.entries(ENVIRONMENTS)
      .map(
        ([key, item]) =>
          `<button class="option ${st.env === key ? "active" : ""}" data-action="environment" data-value="${key}" aria-pressed="${st.env === key}">${item.name}<small>${item.wind} km/h · ${item.allowed.length} allowed ${item.allowed.length === 1 ? "type" : "types"}</small></button>`
      )
      .join("")}</div>
    <div class="section-label">02 · Tower structure</div>
    <div class="tower-grid">${Object.entries(TOWERS)
      .map(([key, item]) => {
        const allowed = env.allowed.includes(key);
        const reason = allowed
          ? `${item.range[0]}–${item.range[1]} m · ${item.detail}`
          : towerDisallowedReason(st.env, key);
        return `<button class="option ${st.tower === key ? "active" : ""}" data-action="tower" data-value="${key}" aria-pressed="${st.tower === key}" ${allowed ? "" : `disabled title="${escapeHTML(reason)}"`}>${item.name}<small>${escapeHTML(reason)}</small></button>`;
      })
      .join("")}</div>
    <div class="section-label">03 · Tower height</div>
    <div class="control-card">
      <div class="control-row"><label for="tower-height">Tower height</label><output class="control-value" id="height-value" for="tower-height">${st.H} m</output></div>
      <input type="range" id="tower-height" min="${min}" max="${max}" step="1" value="${st.H}" style="--range-progress:${progress}%" aria-valuetext="${st.H} meters">
      <div class="range-limits"><span>MIN ${min} m</span><span>STRUCTURAL LIMIT ${max} m</span></div>
    </div>
    ${
      st.onboarding.towerSelected
        ? `<div class="onboarding-next-wrap"><button type="button" class="onboarding-next-btn" data-action="onboarding-next" id="onboarding-next-btn">[ Next: Select Vendor &amp; Cabinet → ]</button></div>`
        : `<div class="onboarding-hint">Select a tower structure or adjust height above to unlock Step 02 →</div>`
    }`;
}

function renderOverview() {
  if (st.masterStep === 5) return renderPhase6Overview();
  if (isTransmissionMode()) return renderSmartFilter("step4") + renderMicrowaveOverview();
  if (isRackMode()) return renderSmartFilter("step2") + renderRackOverview();
  if (isPowerSelection()) return renderPowerOverview();
  if (st.onboarding.active && st.masterStep === 1 && !st.selectedId) return renderOnboardingStep1();
  const env = ENVIRONMENTS[st.env];
  const calc = calculateEngineering();
  const power = calculatePower();
  return `${renderInspector()}
    <div class="section-label">Selected environment <span class="tag">${st.env}</span></div>
    <article class="environment-summary">
      <div><h3>${env.title}</h3><p>${env.description}</p></div>
      <div class="summary-metrics">
        <div class="metric"><small>DESIGN WIND</small><strong>${env.wind} km/h</strong></div>
        <div class="metric"><small>CIVIL DEAD LOAD</small><strong>${calc.deadLoad.toFixed(1)} kN</strong></div>
        <div class="metric"><small>FOUNDATION</small><strong>${env.bearing ? env.bearing + " kPa" : "ROOF FRAME"}</strong></div>
        <div class="metric"><small>ICE LOADING</small><strong>${env.ice}</strong></div>
      </div>
    </article>
    <div class="section-label">Live site definition <span class="tag">JAVASCRIPT</span></div>
    <div class="code-card"><div class="code-head"><span>site.phase01.config.js</span><button data-action="copy-code">COPY CODE</button></div><pre id="code-snippet"><code>${highlightedCode()}</code></pre></div>
    <div class="section-label">Phase 02 · Electrical &amp; climate</div>
    <button class="power-entry" data-action="select-power" data-value="power-system"><span class="entry-icon"></span><span><strong>Site power &amp; backup engine</strong><small>${power.totalLoad.toFixed(1)} kW total · ${power.autonomy.toFixed(1)} h battery · N+1 ${power.n1Pass ? "PASS" : "WARN"}</small></span><span class="entry-arrow">→</span></button>`;
}

function renderConfigure() {
  if (st.masterStep === 5) return renderPhase6Configure();
  if (isTransmissionMode()) return renderSmartFilter("step4") + renderMicrowaveConfigure();
  if (isRackMode()) return renderSmartFilter("step2") + renderRackConfigure();
  if (isPowerSelection()) return renderPowerConfigure();
  if (st.onboarding.active && st.masterStep === 1 && !st.selectedId) return renderOnboardingStep1();
  const env = ENVIRONMENTS[st.env];
  const tower = TOWERS[st.tower];
  const [min, max] = tower.range;
  const progress = ((st.H - min) / (max - min)) * 100;
  return `<div class="section-label">01 · Environment</div>
    <div class="option-grid">${Object.entries(ENVIRONMENTS)
      .map(
        ([key, item]) =>
          `<button class="option ${st.env === key ? "active" : ""}" data-action="environment" data-value="${key}" aria-pressed="${st.env === key}">${item.name}<small>${item.wind} km/h · ${item.allowed.length} allowed ${item.allowed.length === 1 ? "type" : "types"}</small></button>`
      )
      .join("")}</div>
    <div class="section-label">02 · Tower type <span class="tag">FILTERED BY CIVIL RULES</span></div>
    <div class="tower-grid">${Object.entries(TOWERS)
      .map(([key, item]) => {
        const allowed = env.allowed.includes(key);
        const reason = allowed
          ? `${item.range[0]}–${item.range[1]} m · ${item.detail}`
          : towerDisallowedReason(st.env, key);
        return `<button class="option ${st.tower === key ? "active" : ""}" data-action="tower" data-value="${key}" aria-pressed="${st.tower === key}" ${allowed ? "" : `disabled title="${escapeHTML(reason)}"`}>${item.name}<small>${escapeHTML(reason)}</small></button>`;
      })
      .join("")}</div>
    <div class="section-label">03 · Parametric height</div>
    <div class="control-card">
      <div class="control-row"><label for="tower-height">Tower height</label><output class="control-value" id="height-value" for="tower-height">${st.H} m</output></div>
      <input type="range" id="tower-height" min="${min}" max="${max}" step="1" value="${st.H}" style="--range-progress:${progress}%" aria-valuetext="${st.H} meters">
      <div class="range-limits"><span>MIN ${min} m</span><span>STRUCTURAL LIMIT ${max} m</span></div>
      <p class="control-note">Geometry, foundation reactions, wind area and torsional checks update with height. COW is limited to 25 m by its rapid-deployment rating.</p>
    </div>
    <div class="section-label">04 · Lightning protection</div>
    <div class="option-grid" style="grid-template-columns:1fr 1fr">
      <button class="option rod-option ${st.lightning === "FRANKLIN" ? "active" : ""}" data-action="lightning" data-value="FRANKLIN" ${env.mandatoryESE ? 'disabled title="Active ESE is mandatory in the 160 km/h exposed mountain zone."' : ""}>Passive Franklin Rod<small>${env.mandatoryESE ? "Not permitted on mountain peak" : "Copper spike · 45° protective cone"}</small></button>
      <button class="option rod-option ${st.lightning === "ESE_ACTIVE" ? "active" : ""}" data-action="lightning" data-value="ESE_ACTIVE">Active ESE Terminal<small>AMPER · 50 m safety umbrella${env.mandatoryESE ? " · MANDATORY" : ""}</small></button>
    </div>
    <div class="section-label">05 · Fence &amp; grounding</div>
    <label class="switch-card ${env.mandatoryGrounding ? "disabled" : ""}" ${env.mandatoryGrounding ? 'title="Cadweld earth pits and 70 mm² bonding are mandatory on mountain peaks."' : ""}>
      <input type="checkbox" id="grounding-toggle" ${st.grounding ? "checked" : ""} ${env.mandatoryGrounding ? "disabled" : ""}>
      <span class="switch-track"></span>
      <span class="switch-copy"><strong>70 mm² fence bonding + Cadweld earth pits</strong><small>Bond posts every 10 m, bridge the gate hinge and connect the lightning down conductor.</small></span>
      ${env.mandatoryGrounding ? '<span class="lock">LOCKED · REQUIRED</span>' : ""}
    </label>
    <div class="section-label">06 · Power &amp; climate <span class="tag">PHASE 02</span></div>
    <div class="option-grid" style="grid-template-columns:repeat(3,1fr)">
      <button class="option" data-action="select-power" data-value="ats">ATS &amp; sources<small>Grid, generators &amp; interlock</small></button>
      <button class="option" data-action="select-power" data-value="rectifier-plant">-48V DC plant<small>Rectifiers, batteries &amp; N+1</small></button>
      <button class="option" data-action="select-power" data-value="ac-board">Climate control<small>Dual splits &amp; Alarm #6</small></button>
    </div>`;
}

function renderSpecs() {
  if (st.masterStep === 5) return renderPhase6Specs();
  if (isTransmissionMode()) return renderSmartFilter("step4") + renderMicrowaveSpecs();
  if (isRackMode()) return renderSmartFilter("step2") + renderRackSpecs();
  if (isPowerSelection()) return renderPowerSpecs();
  const env = ENVIRONMENTS[st.env];
  const tower = TOWERS[st.tower];
  const calc = calculateEngineering();
  return `<div class="spec-grid">
    <article class="spec-card">
      <h3>Structure &amp; wind</h3>
      <div class="spec-values">
        <div class="spec-value"><small>TOWER DEAD WEIGHT</small><strong>${calc.deadWeight.toLocaleString()} kg</strong></div>
        <div class="spec-value"><small>PROJECTED WIND AREA</small><strong>${calc.windArea.toFixed(1)} m²</strong></div>
        <div class="spec-value"><small>DEAD LOAD</small><strong>${calc.deadLoad.toFixed(1)} kN</strong></div>
        <div class="spec-value"><small>DRAG COEFFICIENT · Cd</small><strong>${tower.cd.toFixed(2)}</strong></div>
      </div>
      <p>Projected area includes ${st.env === "MOUNTAIN_PEAK" ? "severe-ice" : st.env === "RURAL_GREENFIELD" ? "light-ice" : "no ice"} allowance. Weight excludes concrete, antennas and feeders.</p>
    </article>
    <article class="spec-card">
      <h3>Microwave torsion</h3><span class="spec-badge">${badge(calc.twistPass)}</span>
      <div class="spec-values">
        <div class="spec-value"><small>MAX TWIST @ 120 km/h</small><strong>${calc.twist.toFixed(2)}°</strong></div>
        <div class="spec-value"><small>SURVIVAL CRITERION</small><strong>≤ 0.50°</strong></div>
        <div class="spec-value"><small>REFERENCE PRESSURE</small><strong>${calc.q120.toFixed(3)} kPa</strong></div>
        <div class="spec-value"><small>STRUCTURAL RATING</small><strong>${tower.maxTwist.toFixed(1)}°</strong></div>
      </div>
      <p>Preliminary torsional deflection screening for microwave alignment. A FAIL restricts microwave use; it is not a tower stability certificate.</p>
    </article>
    <article class="spec-card">
      <h3>Soil &amp; foundation</h3>
      <div class="spec-values">
        <div class="spec-value"><small>SOIL BEARING CAPACITY</small><strong>${calc.soilBearing ? calc.soilBearing + " kPa" : "N/A"}</strong></div>
        <div class="spec-value"><small>OVERTURNING MOMENT</small><strong>${calc.overturning.toLocaleString()} kN·m</strong></div>
        <div class="spec-value"><small>SITE WIND PRESSURE</small><strong>${calc.sitePressure.toFixed(3)} kPa</strong></div>
        <div class="spec-value"><small>DESIGN WIND</small><strong>${env.wind} km/h</strong></div>
      </div>
      <p>${calc.soilBearing ? env.soil + ". Assumed allowable bearing; geotechnical verification is mandatory." : "Concrete rooftop: verify slab, columns and ballast with the building structural engineer."}<br>${calc.foundation}. Overturning uses site wind and 0.55H resultant height.</p>
    </article>
    <article class="spec-card">
      <h3>Grounding loop</h3><span class="spec-badge">${badge(calc.resistancePass)}</span>
      <div class="spec-values">
        <div class="spec-value"><small>MEASURED / TARGET R</small><strong>${Number.isFinite(calc.resistance) ? calc.resistance.toFixed(1) + " Ω" : "OPEN"}</strong></div>
        <div class="spec-value"><small>ACCEPTANCE</small><strong>R &lt; 5.0 Ω</strong></div>
        <div class="spec-value"><small>EARTH PITS</small><strong>${calc.earthPits}</strong></div>
        <div class="spec-value"><small>FENCE CONDUCTOR</small><strong>${st.grounding ? "70 mm² Cu" : "NONE"}</strong></div>
      </div>
      <p>${env.mandatoryGrounding ? "Mandatory Cadweld delta earth grid and active ESE termination." : st.env === "URBAN_ROOFTOP" ? "Bonded to the verified building earth loop through accessible rooftop test links." : "Bond the fence, gate, tower and lightning down conductor into one equipotential loop."}</p>
    </article>
  </div>
  <p class="control-note" style="margin-top:12px">ENGINEERING BASIS · q = 0.613V² / 1000 kPa, V in m/s. Values are preliminary simulator checks, not a substitute for project-specific structural analysis, geotechnical investigation or local code compliance.</p>`;
}

function renderDrawer() {
  const drawer = $("#drawer");
  drawer.classList.toggle("collapsed", !st.drawerOpen);
  drawer.classList.toggle("terminal-mode", st.masterStep === 5 && st.terminal.open);
  $("#terminal-toggle").setAttribute(
    "aria-pressed",
    String(st.masterStep === 5 && st.terminal.open)
  );
  $("#drawer-toggle").setAttribute("aria-expanded", String(st.drawerOpen));
  $("#drawer-toggle").setAttribute(
    "aria-label",
    st.drawerOpen ? "Collapse drawer" : "Expand drawer"
  );
  document
    .querySelectorAll(".tab")
    .forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.value === st.tab)));
  const selected = registry.get(st.selectedId);
  const tabsBar = $("#drawer .tabs");
  if (tabsBar) tabsBar.hidden = Boolean(st.onboarding.active && st.masterStep === 1 && !selected);
  const titles = {
    1: st.onboarding.active && !selected ? "New site setup" : "Meet the site",
    2: "Open the cabinet",
    3: "Power & backup",
    4: "Aim & Connect",
    5: "Go on air",
  };
  $(".step-number").textContent = String(st.masterStep).padStart(2, "0");
  $(".drawer-title h2").textContent = titles[st.masterStep] || titles[1];
  $("#drawer-subtitle").textContent = selected
    ? `Inspecting · ${selected.data.title}`
    : st.onboarding.active && st.masterStep === 1
      ? "Step 01 · Select your tower structure & height"
      : st.masterStep === 2
        ? `${rackHousing().vendor} ${rackHousing().model} · 19-inch rack`
        : st.masterStep === 4
          ? "Microwave backhaul · live link alignment"
          : st.masterStep === 5
            ? `${st.rack.vendor} CLI · carrier acceptance · operational launch`
            : `${ENVIRONMENTS[st.env].title} · ${TOWERS[st.tower].short}`;
  document.querySelectorAll(".master-step").forEach((button) => {
    const active = Number(button.dataset.step) === st.masterStep;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "step");
    else button.removeAttribute("aria-current");
  });
  const content = $("#drawer-content");
  content.innerHTML =
    st.tab === "configure"
      ? renderConfigure()
      : st.tab === "specs"
        ? renderSpecs()
        : renderOverview();
  scrollTerminalOutput();
}

function syncHUDScroll() {
  const hud = $("#site-hud");
  const shell = $("#site-hud-shell");
  const leftBtn = $("#hud-scroll-left");
  const rightBtn = $("#hud-scroll-right");
  if (!hud || !shell || !leftBtn || !rightBtn) return;
  const maxScroll = Math.max(0, hud.scrollWidth - hud.clientWidth);
  const scrollable = maxScroll > 2;
  const canLeft = scrollable && hud.scrollLeft > 2;
  const canRight = scrollable && hud.scrollLeft < maxScroll - 2;
  hud.classList.toggle("is-scrollable", scrollable);
  shell.classList.toggle("is-scrollable", scrollable);
  leftBtn.hidden = !canLeft;
  rightBtn.hidden = !canRight;
  leftBtn.disabled = !canLeft;
  rightBtn.disabled = !canRight;
  shell.classList.toggle("can-scroll-left", canLeft);
  shell.classList.toggle("can-scroll-right", canRight);
}

function updateHUD() {
  if (launch.onAir) {
    const audit = calculateAcceptance();
    if (!audit.pass) {
      launch.onAir = false;
      launch.launchedAt = 0;
      launch.suspendedReason = audit.checks.find((check) => !check.pass).title;
      if (aiBuild.completed) {
        aiBuild.completed = false;
        aiBuild.stage = 4;
        setAIBuildStatus(
          `ON AIR SUSPENDED · ${launch.suspendedReason.toUpperCase()} · ACCEPTANCE HOLD`
        );
        syncAIArchitect();
      }
      toast(`ON AIR SUSPENDED · ${launch.suspendedReason.toUpperCase()}`);
      if (st.masterStep === 5) renderDrawer();
    }
  }
  const hud = $("#site-hud");
  const scroll = hud.scrollLeft;
  const livePill = $("#live-pill");
  if (st.onboarding.active && !launch.onAir && !aiBuild.running) {
    hud.classList.add("is-setup");
    hud.innerHTML = `
      <div class="hud-cell hud-setup" id="hud-setup-status"><small>Site Status</small><strong>[ Setting Up Site... ]</strong></div>
      <div class="hud-cell"><small>Environment</small><strong>${ENVIRONMENTS[st.env].name}</strong></div>
      <div class="hud-cell"><small>Structure</small><strong>${st.onboarding.towerSelected ? `${TOWERS[st.tower].short} · ${st.H} m` : "Choose tower below"}</strong></div>
      <div class="hud-cell hud-setup-hint"><small>Guided Setup</small><strong>Pick tower &amp; height in Step 01 to unlock full live telemetry</strong></div>`;
    hud.scrollLeft = 0;
    livePill.classList.remove("on-air");
    livePill.classList.add("setup");
    livePill.querySelector("span").textContent = "NEW SITE SETUP";
    syncHUDScroll();
    return;
  }
  hud.classList.remove("is-setup");
  const calc = calculatePower();
  const microwave = calculateMicrowave();
  const alarms = powerAlarms();
  const eventActive = powerSim.phase !== "NORMAL" || alarms.length > 0;
  hud.innerHTML = `
    ${launch.onAir ? `<div class="hud-cell hud-on-air" id="hud-on-air"><small>Site status · On Air</small><strong>[ ON AIR — OPERATIONAL ] • ${calc.totalLoad.toFixed(2)} kW • ${calc.autonomy.toFixed(1)} h • ${cellularThroughputGbps()} Gbps</strong></div>` : ""}
    <div class="hud-cell"><small>Environment</small><strong>${ENVIRONMENTS[st.env].name}</strong></div>
    <div class="hud-cell"><small>Structure</small><strong>${TOWERS[st.tower].short} · ${st.H} m</strong></div>
    <div class="hud-cell"><small>Total load</small><strong>${calc.totalLoad.toFixed(2)} kW</strong></div>
    <div class="hud-cell"><small>Backup hours</small><strong>${calc.autonomy.toFixed(1)} h</strong></div>
    <div class="hud-cell"><small>Backhaul speed</small><strong>${formatCapacity(microwave.capacityMbps)}</strong></div>
    <div class="hud-cell"><small>Cellular ${cellularGeneration().label}</small><strong data-live="rf-hud-throughput">${cellularGeneration().throughput}</strong></div>
    <div class="hud-cell"><small>Microwave RSL</small><strong class="${microwave.locked ? "green" : "amber"}">${microwave.rsl.toFixed(1)} dBm</strong></div>
    <div class="hud-cell"><small>Fade margin</small><strong>${microwave.fadeMargin.toFixed(1)} dB</strong></div>
    <div class="hud-cell"><small>Rectifier N+1</small><strong class="${calc.n1Pass ? "green" : "red"}">${calc.n1Pass ? "PASS" : "WARN"} · ${calc.installed} INST / ${calc.required + 1} REQ</strong></div>
    <div class="hud-cell"><small>AC source</small><strong>${sourceLabel()}</strong></div>
    ${
      eventActive
        ? `<div class="hud-cell"><small>Fuel consumption</small><strong>${calc.fuelRate.toFixed(2)} L/h</strong></div>
    <div class="hud-cell"><small>Battery discharge</small><strong>${calc.batteryCurrent.toFixed(1)} A</strong></div>
    <div class="hud-cell"><small>Active alarms · ${alarms.length}</small><strong class="${alarms.length ? "red" : "green"}">${alarms.length ? alarms[0].label : "None"}</strong></div>`
        : ""
    }`;
  hud.scrollLeft = scroll;
  livePill.classList.remove("setup");
  livePill.classList.toggle("on-air", launch.onAir);
  livePill.querySelector("span").textContent = launch.onAir
    ? "ON AIR · SITE OPERATIONAL"
    : "LIVE ENGINEERING MODEL";
  syncHUDScroll();
}

let toastTimer;
function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => element.classList.remove("show"), 2200);
}

async function copyCode() {
  const text = codeSnippet();
  try {
    await navigator.clipboard.writeText(text);
    toast("LIVE SITE CODE COPIED");
  } catch (_) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    toast("LIVE SITE CODE COPIED");
  }
}

let powerAudio = null;
function playContactor() {
  try {
    powerAudio = powerAudio || new (window.AudioContext || window.webkitAudioContext)();
    const now = powerAudio.currentTime;
    [0, 0.075].forEach((offset, i) => {
      const oscillator = powerAudio.createOscillator();
      const gain = powerAudio.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = i ? 95 : 145;
      gain.gain.setValueAtTime(0.035, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.045);
      oscillator.connect(gain);
      gain.connect(powerAudio.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.05);
    });
  } catch (_) {
    /* Audio is optional when a browser blocks Web Audio. */
  }
}

function playFrequencyLockChime() {
  try {
    powerAudio = powerAudio || new (window.AudioContext || window.webkitAudioContext)();
    if (powerAudio.state === "suspended") powerAudio.resume().catch(() => {});
    const now = powerAudio.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      const oscillator = powerAudio.createOscillator();
      const gain = powerAudio.createGain();
      const start = now + index * 0.085;
      oscillator.type = index === 3 ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.012, start + 0.18);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.045, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
      oscillator.connect(gain);
      gain.connect(powerAudio.destination);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(start);
      oscillator.stop(start + 0.23);
    });
  } catch (_) {
    /* The celebration remains visual when Web Audio is unavailable. */
  }
}

let microwaveOscillator = null;
let microwaveToneGain = null;
let microwaveToneTimer = 0;
function updateMicrowaveTone() {
  try {
    powerAudio = powerAudio || new (window.AudioContext || window.webkitAudioContext)();
    if (powerAudio.state === "suspended") powerAudio.resume().catch(() => {});
    const now = powerAudio.currentTime;
    if (!microwaveOscillator) {
      microwaveOscillator = powerAudio.createOscillator();
      microwaveToneGain = powerAudio.createGain();
      microwaveOscillator.type = "sine";
      microwaveToneGain.gain.value = 0.0001;
      microwaveOscillator.connect(microwaveToneGain);
      microwaveToneGain.connect(powerAudio.destination);
      microwaveOscillator.start();
    }
    const voltage = calculateMicrowave().voltage;
    microwaveOscillator.frequency.setTargetAtTime(320 + voltage * 320, now, 0.018);
    microwaveToneGain.gain.cancelScheduledValues(now);
    microwaveToneGain.gain.setTargetAtTime(0.012, now, 0.012);
    clearTimeout(microwaveToneTimer);
    microwaveToneTimer = setTimeout(stopMicrowaveAudio, 850);
  } catch (_) {
    /* Alignment audio is optional when Web Audio is unavailable. */
  }
}

function stopMicrowaveAudio() {
  clearTimeout(microwaveToneTimer);
  if (!powerAudio || !microwaveToneGain) return;
  try {
    microwaveToneGain.gain.setTargetAtTime(0.0001, powerAudio.currentTime, 0.035);
  } catch (_) {
    /* The audio context may already be closed. */
  }
}

function resetPowerSimulation() {
  const now = performance.now();
  powerSim.eventStart = 0;
  powerSim.generatorCooldownUntil = 0;
  powerSim.failedRectifier = null;
  powerSim.phase = "NORMAL";
  powerSim.offgridEpoch = now;
  if (st.power.sourceMode === "DUAL_GENERATOR_OFFGRID") {
    powerSim.activeSource = "GEN1";
    powerSim.gridVoltage = 0;
  } else {
    powerSim.activeSource = "GRID";
    powerSim.gridVoltage = 380;
  }
  updateHUD();
}

function startBlackout() {
  if (st.power.sourceMode !== "GRID_WITH_STANDBY" || powerSim.phase !== "NORMAL") return;
  powerSim.phase = "BATTERY_BRIDGE";
  powerSim.activeSource = "BATTERY";
  powerSim.gridVoltage = 0;
  powerSim.eventStart = performance.now();
  powerSim.generatorCooldownUntil = 0;
  powerSim.transferMs = 0;
  playContactor();
  toast("LOSS OF MAINS · DC BUS ON BATTERY · 0.000 ms");
  renderDrawer();
  updateHUD();
}

function restoreGrid() {
  if (st.power.sourceMode !== "GRID_WITH_STANDBY" || powerSim.phase === "NORMAL") return;
  powerSim.phase = "NORMAL";
  powerSim.activeSource = "GRID";
  powerSim.eventStart = 0;
  powerSim.generatorCooldownUntil = performance.now() + 5000;
  playContactor();
  toast("UTILITY RESTORED · ATS ON GRID · GENERATOR COOLDOWN");
  renderDrawer();
  updateHUD();
}

function updateLiveReadouts() {
  const calc = calculatePower();
  const rack = calculateRack();
  const microwave = calculateMicrowave();
  const sector = st.cellular.sectors[st.cellular.sector];
  const alarms = powerAlarms();
  const eventText =
    powerSim.phase === "BATTERY_BRIDGE"
      ? `${calc.states.GEN1} · ${calc.transferRemaining.toFixed(1)} s`
      : powerSim.phase === "GENERATOR"
        ? "GEN 1 ONLINE · GRID ABSENT"
        : st.power.sourceMode === "DUAL_GENERATOR_OFFGRID"
          ? `OFF-GRID · ${sourceLabel()}`
          : "NORMAL";
  const values = {
    source: sourceLabel(),
    "dc-bus": `${calc.dcBusVoltage.toFixed(1)} V`,
    "battery-current": `${calc.batteryCurrent.toFixed(1)} A`,
    "power-event": eventText,
    "alarm-text": alarms.length
      ? alarms.map((alarm) => `${alarm.severity}: ${alarm.label}`).join(" · ")
      : "NO ACTIVE POWER ALARMS",
    "grid-voltage": `${powerSim.gridVoltage.toFixed(0)} V AC`,
    autonomy: `${calc.autonomy.toFixed(1)} h`,
    "active-ac": calc.climate.active.join(" + ") || "NONE",
    temperature: `${powerSim.temperature.toFixed(1)} °C`,
    "fuel-remaining": `${powerSim.fuelRemainingL.toFixed(0)} L`,
    "fuel-rate": `${calc.fuelRate.toFixed(2)} L/h`,
    "rack-load": `${rack.loadKw.toFixed(3)} kW`,
    "rack-autonomy": `${calc.autonomy.toFixed(2)} h`,
    "rack-gbps": `${rack.backhaulGbps} Gbps`,
    "rack-services": [
      rack.opticalPorts ? "5G/4G" : "NO BB",
      rack.voiceCalls ? `${rack.voiceCalls} CALLS` : "NO 2G",
      rack.e1Lines ? `${rack.e1Lines} E1` : "NO TDM",
    ].join(" · "),
    "rack-link": rack.patchUp
      ? "Circuit Emulation Link UP (8x E1 lines active for 2G voice)."
      : "PATCHING YELLOW ETHERNET · ROUTER PORT 2 → TDM PORT 1B…",
    "mw-capacity": formatCapacity(microwave.capacityMbps),
    "mw-rsl": `${microwave.rsl.toFixed(1)} dBm`,
    "mw-meter-rsl": `RSL ${microwave.rsl.toFixed(1)} dBm`,
    "mw-fade": `${microwave.fadeMargin.toFixed(1)} dB`,
    "mw-gain": `${microwave.gain.toFixed(2)} dBi`,
    "mw-voltage": `${microwave.voltage.toFixed(2)} V`,
    "mw-error": `${microwave.alignmentError.toFixed(1)}°`,
    "rf-throughput": cellularGeneration().throughput,
    "rf-azimuth": `${sector.azimuth.toFixed(1)}°`,
    "rf-downtilt": `${sector.downtilt.toFixed(1)}°`,
    "rf-tx": `${sector.txPower.toFixed(0)} dBm · ${txPowerWatts(sector.txPower)} W`,
    "rf-bandwidth": `${sector.bandwidth} MHz`,
  };
  document.querySelectorAll("[data-live]").forEach((element) => {
    const value = values[element.dataset.live];
    if (value !== undefined && element.textContent !== value) element.textContent = value;
  });
  const temperatureSlider = $("#shelter-temperature");
  if (temperatureSlider && document.activeElement !== temperatureSlider) {
    temperatureSlider.value = powerSim.temperature;
    temperatureSlider.style.setProperty(
      "--range-progress",
      `${rangeProgress(powerSim.temperature, 18, 45)}%`
    );
  }
  const fuelSlider = $("#fuel-level");
  if (fuelSlider && document.activeElement !== fuelSlider) {
    fuelSlider.value = powerSim.fuelRemainingL / 10;
    fuelSlider.style.setProperty(
      "--range-progress",
      `${rangeProgress(powerSim.fuelRemainingL / 10, 10, 100)}%`
    );
    $("#fuel-level-value").textContent = `${(powerSim.fuelRemainingL / 10).toFixed(0)}%`;
  }
  document
    .querySelectorAll(".alarm-strip")
    .forEach((element) => element.classList.toggle("clear", alarms.length === 0));
  const meter = $("[data-meter]");
  if (meter)
    meter.style.setProperty(
      "--meter-progress",
      `${clamp(((microwave.voltage - 0.5) / 2) * 100, 0, 100)}%`
    );
  const linkBadge = $('[data-live-badge="mw-lock"]');
  if (linkBadge) {
    linkBadge.textContent = microwave.locked
      ? "[ LINK LOCKED ]"
      : microwave.alignmentError > 10
        ? "[ WEAK RSL · KEEP TURNING ]"
        : "[ APPROACHING TARGET ]";
    linkBadge.classList.toggle("locked", microwave.locked);
    linkBadge.classList.toggle("weak", !microwave.locked && microwave.alignmentError > 10);
  }
  const azimuthValue = $("#mw-azimuth-value");
  if (azimuthValue) azimuthValue.textContent = `${st.microwave.azimuth.toFixed(1)}°`;
  const spacingValue = $("#mw-spacing-value");
  if (spacingValue) spacingValue.textContent = `${st.microwave.spacing.toFixed(1)} m`;
  updateAcceptanceLive();
}

function updatePowerVisuals(now, dt, calc) {
  atsVisuals.leds.forEach(({ source, led }) => {
    led.material = powerSim.activeSource === source ? LED.green : LED.off;
  });
  mdbVisuals.branchLeds.forEach(({ branch, led }) => {
    led.material = st.power.branches[branch] ? LED.green : LED.off;
  });
  acBoardVisuals.dutyLeds.forEach(({ unit, led }) => {
    led.material = calc.climate.active.includes(unit) ? LED.green : LED.off;
  });
  if (acBoardVisuals.highTemp)
    acBoardVisuals.highTemp.material = calc.climate.highTemp ? LED.red : LED.off;
  rectifierVisuals.modules.forEach(({ group, led, index }) => {
    const failed = powerSim.failedRectifier === index;
    led.material = failed ? LED.red : calc.rectifierOnline ? LED.green : LED.amber;
    group.position.z += ((failed ? 0.18 : 0) - group.position.z) * Math.min(1, dt * 8);
  });
  generatorVisuals.forEach((visual, id) => {
    const state =
      id === "generator-2" && st.power.sourceMode !== "DUAL_GENERATOR_OFFGRID"
        ? "STOPPED"
        : calc.states[id === "generator-1" ? "GEN1" : "GEN2"];
    const operating = generatorIsOperating(state);
    const vibration = operating ? (state === "CRANKING" ? 0.026 : 0.012) : 0;
    visual.group.position.x = visual.base.x + Math.sin(now * 0.045 + visual.index) * vibration;
    visual.group.position.y = visual.base.y + Math.sin(now * 0.067) * vibration * 0.25;
    visual.group.position.z = visual.base.z;
    visual.led.material =
      state === "RUNNING"
        ? LED.green
        : ["CRANKING", "STABILIZING"].includes(state)
          ? LED.amber
          : state === "COOLDOWN"
            ? LED.blue
            : LED.off;
    visual.particles.forEach((particle) => {
      particle.visible = operating;
      if (!operating) return;
      particle.userData.age = (particle.userData.age + dt) % 2.4;
      const age = particle.userData.age;
      particle.position.set(
        -0.65 + particle.userData.drift * age,
        3.06 + age * 0.45,
        -0.38 + Math.sin(age * 2 + visual.index) * 0.09
      );
      particle.scale.setScalar(0.7 + age * 0.75);
    });
  });
  acVisuals.forEach(({ index, fan, led, indoorLed }) => {
    const active = calc.climate.active.includes(index);
    if (active) fan.rotation.z -= dt * 8;
    led.material = active ? LED.green : LED.off;
    indoorLed.material = active ? LED.green : LED.off;
  });
}

function updateMicrowaveVisuals(now) {
  if (!microwaveVisuals.root) return;
  const calc = calculateMicrowave();
  const reduced = reducedMotionQuery.matches;
  microwaveVisuals.root.visible = transmissionSceneMode() !== "CELLULAR";
  microwaveVisuals.dishes.forEach((dish) => {
    dish.rotation.y = T.MathUtils.degToRad(st.microwave.azimuth);
  });
  const flicker = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(now * 0.027);
  const celebration = launch.onAir && calc.locked;
  const opacity = celebration
    ? 1
    : calc.locked
      ? 0.82
      : calc.alignmentError <= 2
        ? 0.28 + flicker * 0.12
        : calc.alignmentError <= 10
          ? 0.07 + flicker * 0.08
          : 0.018 + flicker * 0.018;
  MW_BEAM.opacity = opacity;
  MW_BEAM_GLOW.opacity = celebration ? 0.58 : opacity * 0.24;
  microwaveVisuals.beamPulses.forEach((pulse) => {
    pulse.mesh.visible = !reduced && (celebration || calc.alignmentError <= 2);
    pulse.mesh.position.z = pulse.feedZ + ((now * 0.00022 + pulse.offset) % 1) * (35 - pulse.feedZ);
  });
  const aiAmberLock = aiBuild.running && now - aiBuild.started >= 2400;
  const ledMaterial = aiAmberLock
    ? LED.amber
    : calc.locked
      ? LED.green
      : calc.alignmentError <= 10
        ? LED.amber
        : LED.red;
  microwaveVisuals.odus.forEach(({ led }) => {
    led.material = ledMaterial;
  });
  microwaveVisuals.linkLeds.forEach((led) => {
    led.material = ledMaterial;
  });
  microwaveSim.wasLocked = calc.locked;
}

function updateCellularVisuals(now) {
  if (cellularVisuals.root) {
    cellularVisuals.root.visible = transmissionSceneMode() !== "MICROWAVE";
    cellularVisuals.sectors.forEach((visual, index) => {
      const sector = st.cellular.sectors[index];
      visual.group.rotation.y = T.MathUtils.degToRad(sector.azimuth);
      if (visual.beam) {
        visual.beam.visible = sector.onAir;
        visual.beam.rotation.x = T.MathUtils.degToRad(sector.downtilt);
      }
    });
    RF_BEAM.opacity = reducedMotionQuery.matches
      ? 0.04
      : 0.03 + (0.5 + 0.5 * Math.sin(now * 0.004)) * 0.015;
  }
  const selectedResult = st.cellular.sweeps[st.cellular.sector];
  if (cellularVisuals.siteMasterLed)
    cellularVisuals.siteMasterLed.material = cellularSim.running
      ? LED.amber
      : selectedResult
        ? selectedResult.pass
          ? LED.green
          : LED.red
        : LED.off;
  if (!cellularSim.running) return;
  const progress = clamp((now - cellularSim.started) / cellularSim.duration, 0, 1);
  const percent = Math.floor(progress * 100);
  if (percent !== cellularSim.lastProgress) {
    cellularSim.lastProgress = percent;
    const bar = $("#rf-sweep-progress");
    if (bar && cellularSim.sector === st.cellular.sector)
      bar.style.setProperty("--sweep-progress", `${percent}%`);
  }
  if (progress < 1) return;
  const result = calculateSweep(cellularSim.sector);
  st.cellular.sweeps[cellularSim.sector] = result;
  cellularSim.running = false;
  if (st.masterStep === 4 && st.microwave.system === "CELLULAR") renderDrawer();
  toast(result.pass ? "VSWR 1.14 · PASS · HEALTHY FEEDER" : "VSWR 2.27 · FAULT LOCATED AT 21.3m");
}

function updateLaunchVisuals(now) {
  const active = launch.onAir;
  const reduced = reducedMotionQuery.matches;
  launchVisuals.pulseAnchors.forEach((anchor, index) => {
    anchor.rotation.x = T.MathUtils.degToRad(st.cellular.sectors[index].downtilt);
  });
  for (let index = 0; index < 5; index++) {
    const progress = reduced ? index / 5 : (now * 0.00032 + index / 5) % 1;
    LAUNCH_PULSE_MATERIALS[index].opacity = active ? 0.04 + Math.sin(progress * Math.PI) * 0.24 : 0;
  }
  launchVisuals.pulses.forEach((pulse) => {
    const progress = reduced ? pulse.offset : (now * 0.00032 + pulse.offset) % 1;
    pulse.mesh.visible = active && st.cellular.sectors[pulse.sector].onAir;
    if (!pulse.mesh.visible) return;
    pulse.mesh.position.set(0, 0, 0.45 + progress * 20);
    pulse.mesh.scale.setScalar(0.3 + progress * 3.4);
  });
  if (launchVisuals.beacon) {
    const beat = active ? (reduced ? 0.65 : 0.5 + 0.5 * Math.sin(now * 0.009)) : 0;
    launchVisuals.beacon.scale.setScalar(active ? 1 + beat * 0.38 : 1);
    if (launchVisuals.beaconGlow) {
      launchVisuals.beaconGlow.visible = active;
      launchVisuals.beaconGlow.scale.setScalar(0.85 + beat * 1.1);
      LAUNCH_BEACON_GLOW.opacity = 0.07 + beat * 0.25;
    }
  }
  if (active)
    RF_BEAM.opacity = reduced ? 0.055 : 0.05 + (0.5 + 0.5 * Math.sin(now * 0.006)) * 0.025;
}

function updateRackVisuals(now, dt) {
  if (!rackVisuals.root) return;
  const reduced = reducedMotionQuery.matches;
  const doorEase = reduced ? 1 : 1 - Math.exp(-dt * 7.5);
  rackSim.door += (rackSim.doorTarget - rackSim.door) * doorEase;
  if (Math.abs(rackSim.doorTarget - rackSim.door) < 0.0005) rackSim.door = rackSim.doorTarget;
  rackVisuals.doors.forEach(({ pivot, sign }) => {
    pivot.rotation.y = -sign * rackSim.door * Math.PI * 0.68;
  });
  if (st.rack.slots.fau)
    rackVisuals.fans.forEach((fan, index) => {
      fan.rotation.z -= dt * (powerSim.temperature > 35 ? 15 : 7) * (index % 2 ? 1 : -1);
    });

  if (rackSim.patchLink) rackSim.patchProgress = clamp((now - rackSim.patchStarted) / 1200, 0, 1);
  if (rackVisuals.patchGroup)
    rackVisuals.patchGroup.visible = rackSim.patchLink && rackSim.patchProgress > 0;
  if (rackVisuals.patchCable) {
    const geometry = rackVisuals.patchCable.geometry;
    if (geometry.index)
      geometry.setDrawRange(0, Math.floor((geometry.index.count * rackSim.patchProgress) / 6) * 6);
  }
  const linkUp =
    rackSim.patchLink && rackSim.patchProgress >= 1 && st.rack.slots.router && st.rack.slots.tdm;
  if (rackVisuals.portLeds.router)
    rackVisuals.portLeds.router.material = linkUp
      ? LED.green
      : rackSim.patchLink
        ? LED.amber
        : LED.off;
  if (rackVisuals.portLeds.tdm)
    rackVisuals.portLeds.tdm.material = linkUp
      ? LED.green
      : rackSim.patchLink
        ? LED.amber
        : LED.off;
  if (linkUp && !rackSim.patchCompletedNotified) {
    rackSim.patchCompletedNotified = true;
    toast("CIRCUIT EMULATION LINK UP · 8 × E1 ACTIVE");
    if (isRackMode()) renderDrawer();
    updateHUD();
  }

  const alarmElapsed = now - rackSim.alarmTraceStart;
  if (rackSim.alarmTraceActive && alarmElapsed > 5200) rackSim.alarmTraceActive = false;
  if (rackVisuals.alarmGroup)
    rackVisuals.alarmGroup.visible = rackSim.alarmBadge || rackSim.alarmTraceActive;
  if (rackVisuals.alarmCurve) {
    rackVisuals.alarmPulses.forEach((pulse, index) => {
      pulse.visible = rackSim.alarmTraceActive;
      if (!pulse.visible) return;
      const progress = clamp((alarmElapsed - index * 170) / 4300, 0, 1);
      pulse.position.copy(rackVisuals.alarmCurve.getPoint(progress));
      pulse.scale.setScalar(0.85 + Math.sin(now * 0.018 + index) * 0.22);
    });
    const pathReady = alarmPathReady();
    rackVisuals.stationLeds.forEach((led, index) => {
      const reached =
        (!rackSim.alarmTraceActive && rackSim.alarmBadge) || alarmElapsed >= index * 900;
      led.material = reached && pathReady ? LED.blue : LED.off;
    });
  }
}

function updatePowerSimulation(now, dt) {
  if (st.power.sourceMode === "DUAL_GENERATOR_OFFGRID") {
    const rotation = Math.floor(Math.max(0, now - powerSim.offgridEpoch) / (12 * 3600000)) % 2;
    const source = rotation ? "GEN2" : "GEN1";
    if (powerSim.activeSource !== source) {
      powerSim.activeSource = source;
      playContactor();
      toast(`12-HOUR ROTATION · ${sourceLabel(source)} NOW ONLINE`);
      renderDrawer();
    }
    powerSim.phase = "NORMAL";
    powerSim.gridVoltage = Math.max(0, powerSim.gridVoltage - 380 * dt);
  } else {
    if (powerSim.phase === "BATTERY_BRIDGE") {
      const elapsed = (now - powerSim.eventStart) / 1000;
      if (elapsed >= 15) {
        powerSim.phase = "GENERATOR";
        powerSim.activeSource = "GEN1";
        playContactor();
        toast("GENERATOR STABLE · ATS TRANSFERRED TO GEN 1");
        renderDrawer();
      }
    } else if (powerSim.phase === "NORMAL") {
      powerSim.activeSource = "GRID";
      powerSim.gridVoltage = Math.min(380, powerSim.gridVoltage + 380 * dt);
    }
  }
  const calc = calculatePower();
  if (calc.batteryDischarging)
    powerSim.batterySoc = Math.max(
      0,
      powerSim.batterySoc - ((calc.dcLoad * dt) / 3600 / Math.max(calc.usableEnergy, 0.1)) * 100
    );
  else if (powerSim.batterySoc < 100 && calc.rectifierOnline)
    powerSim.batterySoc = Math.min(
      100,
      powerSim.batterySoc + ((0.432 * dt) / 3600 / Math.max(calc.usableEnergy, 0.1)) * 100
    );
  if (calc.generatorActive)
    powerSim.fuelRemainingL = Math.max(0, powerSim.fuelRemainingL - (calc.fuelRate * dt) / 3600);
  const ambient =
    st.env === "RURAL_GREENFIELD"
      ? 34
      : st.env === "URBAN_ROOFTOP"
        ? 31
        : st.env === "EMERGENCY_DISASTER"
          ? 32
          : 28;
  if (calc.climate.active.length)
    powerSim.temperature +=
      (st.power.climateSetpoint - powerSim.temperature) *
      Math.min(1, dt * 0.003 * calc.climate.active.length);
  else powerSim.temperature += (ambient - powerSim.temperature) * Math.min(1, dt * 0.0015);
  powerSim.batteryCurrent = calc.batteryCurrent;
  updatePowerVisuals(now, dt, calc);
  if (now - powerSim.lastHudUpdate > 250) {
    powerSim.lastHudUpdate = now;
    updateLiveReadouts();
    updateHUD();
  }
}

const heroMotion = {
  targetX: 0,
  targetY: 0,
  currentX: 0,
  currentY: 0,
  targetRx: 0,
  targetRy: 0,
  currentRx: 0,
  currentRy: 0,
  maxShiftX: 34,
  maxShiftY: 24,
  maxTiltX: 1.8,
  maxTiltY: 2.2,
  activeHotspot: null,
};

function applyHeroTransform() {
  const hero = $("#hero-tab");
  if (!hero) return;
  hero.style.setProperty("--hero-px", `${heroMotion.currentX.toFixed(2)}px`);
  hero.style.setProperty("--hero-py", `${heroMotion.currentY.toFixed(2)}px`);
  hero.style.setProperty("--hero-rx", `${heroMotion.currentRx.toFixed(3)}deg`);
  hero.style.setProperty("--hero-ry", `${heroMotion.currentRy.toFixed(3)}deg`);
}

function resetHeroPointer(immediate = false) {
  heroMotion.targetX = 0;
  heroMotion.targetY = 0;
  heroMotion.targetRx = 0;
  heroMotion.targetRy = 0;
  if (immediate || reducedMotionQuery.matches) {
    heroMotion.currentX = 0;
    heroMotion.currentY = 0;
    heroMotion.currentRx = 0;
    heroMotion.currentRy = 0;
    applyHeroTransform();
  }
}

function updateHeroPointer(clientX, clientY, immediate = false) {
  if (!st.heroOpen || window.innerWidth <= 760) return;
  const w = Math.max(1, window.innerWidth);
  const h = Math.max(1, window.innerHeight);
  const nx = clamp((clientX / w - 0.5) * 2, -1, 1);
  const ny = clamp((clientY / h - 0.5) * 2, -1, 1);
  // Inverse 3D motion: mouse right -> image moves left; mouse up -> image moves down.
  heroMotion.targetX = -nx * heroMotion.maxShiftX;
  heroMotion.targetY = -ny * heroMotion.maxShiftY;
  heroMotion.targetRy = -nx * heroMotion.maxTiltY;
  heroMotion.targetRx = ny * heroMotion.maxTiltX;
  if (immediate || reducedMotionQuery.matches) {
    heroMotion.currentX = heroMotion.targetX;
    heroMotion.currentY = heroMotion.targetY;
    heroMotion.currentRx = heroMotion.targetRx;
    heroMotion.currentRy = heroMotion.targetRy;
    applyHeroTransform();
  }
}

function updateHeroMotion(dt = 0.016) {
  if (!st.heroOpen || window.innerWidth <= 760) return;
  if (reducedMotionQuery.matches) {
    heroMotion.currentX = heroMotion.targetX;
    heroMotion.currentY = heroMotion.targetY;
    heroMotion.currentRx = heroMotion.targetRx;
    heroMotion.currentRy = heroMotion.targetRy;
    applyHeroTransform();
    return;
  }
  const ease = 1 - Math.pow(0.0018, dt);
  heroMotion.currentX += (heroMotion.targetX - heroMotion.currentX) * ease;
  heroMotion.currentY += (heroMotion.targetY - heroMotion.currentY) * ease;
  heroMotion.currentRx += (heroMotion.targetRx - heroMotion.currentRx) * ease;
  heroMotion.currentRy += (heroMotion.targetRy - heroMotion.currentRy) * ease;
  applyHeroTransform();
}

function setHeroOpen(open) {
  st.heroOpen = Boolean(open);
  document.body.classList.toggle("hero-active", st.heroOpen);
  const hero = $("#hero-tab");
  if (hero) {
    hero.classList.toggle("is-hidden", !st.heroOpen);
    hero.setAttribute("aria-hidden", String(!st.heroOpen));
    if (!st.heroOpen) {
      hero
        .querySelectorAll(".hero-hotspot.is-open")
        .forEach((el) => el.classList.remove("is-open"));
      heroMotion.activeHotspot = null;
    }
  }
  const toggleBtn = $("#hero-toggle");
  if (toggleBtn) toggleBtn.setAttribute("aria-pressed", String(st.heroOpen));
  resetHeroPointer(true);
  if (!st.heroOpen) {
    renderer.render(scene, camera);
    syncHUDScroll();
  }
}

function initHeroTab() {
  const hero = $("#hero-tab");
  const enterBtn = $("#hero-enter-btn");
  const toggleBtn = $("#hero-toggle");
  const breeze = $("#hero-breeze");
  if (!hero) return;

  if (breeze && !breeze.children.length) {
    const motes = [
      [10, 62, 4, 19, -2],
      [16, 74, 3, 22, -9],
      [24, 52, 4, 17, -5],
      [31, 68, 3, 21, -13],
      [37, 46, 5, 24, -4],
      [43, 58, 3, 18, -11],
      [48, 39, 4, 20, -7],
      [55, 44, 3, 23, -15],
      [68, 50, 4, 19, -6],
      [75, 62, 3, 21, -12],
      [81, 54, 4, 17, -3],
      [86, 72, 3, 25, -16],
      [20, 86, 4, 20, -8],
      [78, 84, 3, 22, -14],
    ];
    breeze.innerHTML = motes
      .map(
        ([x, y, size, dur, delay]) =>
          `<span class="hero-mote" style="--mote-x:${x}%;--mote-y:${y}%;--mote-size:${size}px;--mote-dur:${dur}s;--mote-delay:${delay}s"></span>`
      )
      .join("");
  }

  enterBtn?.addEventListener("click", () => setHeroOpen(false));
  toggleBtn?.addEventListener("click", () => setHeroOpen(!st.heroOpen));

  hero.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    updateHeroPointer(event.clientX, event.clientY);
  });
  hero.addEventListener("pointerleave", () => resetHeroPointer(false));

  hero.querySelectorAll(".hero-hotspot").forEach((spot) => {
    const key = spot.dataset.hotspot || null;
    spot.addEventListener("pointerenter", () => {
      heroMotion.activeHotspot = key;
    });
    spot.addEventListener("pointerleave", () => {
      if (heroMotion.activeHotspot === key && !spot.classList.contains("is-open")) {
        heroMotion.activeHotspot = null;
      }
    });
    spot.addEventListener("focus", () => {
      heroMotion.activeHotspot = key;
    });
    spot.addEventListener("blur", () => {
      if (heroMotion.activeHotspot === key) heroMotion.activeHotspot = null;
    });
    spot.addEventListener("click", (event) => {
      event.stopPropagation();
      const willOpen = !spot.classList.contains("is-open");
      hero
        .querySelectorAll(".hero-hotspot.is-open")
        .forEach((other) => other.classList.remove("is-open"));
      spot.classList.toggle("is-open", willOpen);
      heroMotion.activeHotspot = willOpen ? key : null;
    });
  });

  hero.addEventListener("click", (event) => {
    if (event.target.closest(".hero-hotspot") || event.target.closest(".hero-brand-card")) return;
    hero.querySelectorAll(".hero-hotspot.is-open").forEach((el) => el.classList.remove("is-open"));
    heroMotion.activeHotspot = null;
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && st.heroOpen) setHeroOpen(false);
  });

  setHeroOpen(st.heroOpen);
}

function enterMasterStep(step) {
  if (![1, 2, 3, 4, 5].includes(step)) return;
  if (st.heroOpen) setHeroOpen(false);
  if (step > 1) st.onboarding.active = false;
  const previousStep = st.masterStep;
  if (step !== 4) stopMicrowaveAudio();
  st.masterStep = step;
  st.drawerOpen = true;
  st.tab = "overview";
  if (previousStep === 5 && step !== 5 && !launch.onAir) {
    st.selectedId = null;
    rebuildSite();
  }
  if (step === 5) {
    st.terminal.open = true;
    ensureTerminalWelcome();
    st.selectedId = null;
    rebuildSite();
    fitSite();
  } else if (step === 2) {
    rackSim.doorTarget = 1;
    selectComponent("rack-cabinet");
  } else if (step === 3) selectComponent("power-system");
  else if (step === 4 && st.microwave.system === "MICROWAVE" && registry.has("mw-system"))
    selectComponent("mw-system");
  else if (step === 4 && registry.has("rf-system")) selectComponent("rf-system");
  else if (step === 4) {
    st.selectedId = null;
    updateSelection();
    cameraGoal.target.set(structureTop.x, structureTop.y - 1.2, structureTop.z);
    cameraGoal.theta = 0.82;
    cameraGoal.phi = 0.95;
    cameraGoal.size = window.innerWidth < 760 ? 12 : 8;
    updateHUD();
    renderDrawer();
  } else {
    st.selectedId = null;
    updateSelection();
    updateHUD();
    renderDrawer();
    fitSite();
  }
  $("#drawer-content").scrollTop = 0;
}

// -------------------------------------------------------------------------
// UI actions — state guards mirror the disabled engineering controls
// -------------------------------------------------------------------------
$("#drawer").addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  const value = button.dataset.value;
  if (action === "go-on-air") {
    goOnAir();
  } else if (action === "terminal-open") {
    st.terminal.open = true;
    ensureTerminalWelcome();
    renderDrawer();
    const content = $("#drawer-content");
    content.scrollTop = content.scrollHeight;
    scrollTerminalOutput();
  } else if (action === "terminal-close") {
    st.terminal.open = false;
    renderDrawer();
  } else if (action === "acceptance-refresh") {
    const audit = calculateAcceptance();
    renderDrawer();
    updateHUD();
    toast(
      audit.pass
        ? "CARRIER ACCEPTANCE · 6/6 PASS · LAUNCH READY"
        : "ACCEPTANCE HOLD · RESOLVE RED PUNCH-LIST ITEMS"
    );
  } else if (action === "cli-command") {
    executeCLI(value);
  } else if (action === "ai-copilot") {
    executeCLI("ai diagnose");
  } else if (action === "triage-choice" && ["1", "2", "3"].includes(value)) {
    executeCLI(value);
  } else if (action === "tab") {
    st.tab = value;
    st.drawerOpen = true;
    renderDrawer();
  } else if (action === "onboarding-next") {
    st.onboarding.active = false;
    enterMasterStep(2);
    st.tab = "configure";
    renderDrawer();
    updateHUD();
    toast("STEP 02 · CHOOSE VENDOR & BUILD RACK SLOTS");
  } else if (action === "environment" && ENVIRONMENTS[value]) {
    st.env = value;
    st.tower = ENVIRONMENTS[value].defaultTower;
    st.H = TOWERS[st.tower].defaultHeight;
    st.lightning = ENVIRONMENTS[value].mandatoryESE ? "ESE_ACTIVE" : "FRANKLIN";
    if (st.onboarding.active) st.onboarding.towerSelected = true;
    st.selectedId = null;
    normalizeState();
    rebuildSite();
    fitSite();
    toast(`${ENVIRONMENTS[value].name.toUpperCase()} · CIVIL RULES APPLIED`);
  } else if (action === "tower" && TOWERS[value]) {
    if (!ENVIRONMENTS[st.env].allowed.includes(value)) {
      toast(towerDisallowedReason(st.env, value));
      return;
    }
    st.tower = value;
    const [min, max] = TOWERS[value].range;
    st.H = clamp(st.H, min, max);
    if (st.onboarding.active) st.onboarding.towerSelected = true;
    st.selectedId = null;
    rebuildSite();
    fitSite();
  } else if (action === "lightning" && ["FRANKLIN", "ESE_ACTIVE"].includes(value)) {
    if (ENVIRONMENTS[st.env].mandatoryESE && value !== "ESE_ACTIVE") {
      toast("ACTIVE ESE IS MANDATORY ON THIS MOUNTAIN PEAK");
      return;
    }
    st.lightning = value;
    st.selectedId = "lightning-terminal";
    rebuildSite();
  } else if (action === "mw-system" && ["MICROWAVE", "CELLULAR"].includes(value)) {
    st.microwave.system = value;
    st.selectedId = null;
    if (value === "CELLULAR") stopMicrowaveAudio();
    rebuildSite();
    if (value === "MICROWAVE" && registry.has("mw-system")) selectComponent("mw-system");
    else if (value === "CELLULAR" && registry.has("rf-system")) selectComponent("rf-system");
    else {
      cameraGoal.target.set(structureTop.x, structureTop.y - 1.2, structureTop.z);
      cameraGoal.size = window.innerWidth < 760 ? 12 : 8;
      renderDrawer();
    }
    toast(
      value === "MICROWAVE"
        ? "MICROWAVE BACKHAUL · LIVE LINK MODEL"
        : "CELLULAR SECTORS · PHASE 5 WORKSPACE READY"
    );
  } else if (action === "mw-topology" && MICROWAVE_TOPOLOGIES[value]) {
    if (value === "SD" && !spaceDiversityAllowed()) {
      toast("SPACE DIVERSITY BLOCKED · INSUFFICIENT VERTICAL MAST CLEARANCE");
      return;
    }
    st.microwave.topology = value;
    st.microwave.xpicBoost = false;
    st.selectedId = "mw-system";
    normalizeMicrowaveState();
    rebuildSite();
    toast(
      `${MICROWAVE_TOPOLOGIES[value].label.toUpperCase()} · ${formatCapacity(calculateMicrowave().capacityMbps)}`
    );
  } else if (action === "mw-diameter" && [0.3, 0.6, 1.2, 1.8, 2.4].includes(Number(value))) {
    st.microwave.diameter = Number(value);
    st.selectedId = "mw-dish-0";
    rebuildSite();
    toast(
      `${st.microwave.diameter.toFixed(1)}m DISH · ${calculateMicrowave().gain.toFixed(2)} dBi · −${calculateMicrowave().mountLoss.toFixed(1)} dB MOUNT LOSS`
    );
  } else if (action === "mw-frequency" && [7, 15, 23, 38].includes(Number(value))) {
    st.microwave.frequency = Number(value);
    st.selectedId = "mw-dish-0";
    rebuildSite();
    toast(
      `${st.microwave.frequency} GHz · ${calculateMicrowave().gain.toFixed(2)} dBi ANTENNA GAIN`
    );
  } else if (action === "mw-xpic") {
    st.microwave.xpicBoost = !st.microwave.xpicBoost;
    const active = calculateMicrowave().xpicActive;
    st.selectedId = active ? "mw-omt-0" : "mw-system";
    rebuildSite();
    toast(
      `${active ? "XPIC DUAL-POLARIZATION ENABLED" : "XPIC BOOST DISABLED"} · ${formatCapacity(calculateMicrowave().capacityMbps)}`
    );
  } else if (action === "mw-auto-align") {
    st.microwave.azimuth = st.microwave.targetAzimuth;
    microwaveSim.azimuth = st.microwave.azimuth;
    updateMicrowaveVisuals(performance.now());
    updateLiveReadouts();
    updateHUD();
    updateMicrowaveTone();
    toast(`LINK LOCKED · ${calculateMicrowave().rsl.toFixed(1)} dBm · 2.40 V`);
  } else if (action === "smart-vendor" && ["ERICSSON", "HUAWEI", "NOKIA"].includes(value)) {
    st.rack.vendor = value;
    applySmartProfile();
    st.selectedId =
      st.masterStep === 2
        ? "rack-cabinet"
        : st.masterStep === 4
          ? st.microwave.system === "CELLULAR"
            ? "rf-system"
            : "mw-system"
          : st.selectedId;
    rebuildSite();
    toast(`${value} · ${cellularGeneration().label.toUpperCase()} · HARDWARE CURATED`);
  } else if (action === "smart-generation" && SMART_GENERATIONS[value]) {
    st.generation = value;
    applySmartProfile();
    st.selectedId =
      st.masterStep === 2
        ? "rack-cabinet"
        : st.masterStep === 4
          ? st.microwave.system === "CELLULAR"
            ? "rf-system"
            : "mw-system"
          : st.selectedId;
    rebuildSite();
    toast(
      `${cellularGeneration().label.toUpperCase()} · ${cellularGeneration().throughput} · PROFILE ACTIVE`
    );
  } else if (action === "custom-gen-toggle" && CUSTOM_GEN_CATALOG[value]) {
    const current = normalizeCustomGenerations(st.customGenerations);
    if (current.includes(value)) {
      if (current.length <= 1) {
        toast("SELECT AT LEAST ONE RADIO GENERATION");
        return;
      }
      st.customGenerations = current.filter((item) => item !== value);
    } else {
      st.customGenerations = normalizeCustomGenerations([...current, value]);
    }
    st.generation = "CUSTOM";
    applySmartProfile();
    st.selectedId =
      st.masterStep === 2
        ? "rack-cabinet"
        : st.masterStep === 4
          ? st.microwave.system === "CELLULAR"
            ? "rf-system"
            : "mw-system"
          : st.selectedId;
    rebuildSite();
    const custom = customGenerationMetrics();
    toast(`${custom.label} · ${custom.throughput} · RACK & BACKHAUL UPDATED`);
  } else if (action === "rf-sector" && [0, 1, 2].includes(Number(value))) {
    const index = Number(value),
      tab = st.tab;
    st.cellular.sector = index;
    const id = registry.has(`rf-aau-${index}`) ? `rf-aau-${index}` : `rf-panel-${index}`;
    if (registry.has(id)) selectComponent(id);
    st.tab = tab;
    renderDrawer();
  } else if (action === "rf-onair") {
    const sector = st.cellular.sectors[st.cellular.sector];
    sector.onAir = !sector.onAir;
    rebuildSite();
    toast(`SECTOR ${st.cellular.sector + 1} · ${sector.onAir ? "ON AIR" : "MUTED"}`);
  } else if (action === "rf-bandwidth" && [20, 40, 100].includes(Number(value))) {
    st.cellular.sectors[st.cellular.sector].bandwidth = Number(value);
    renderDrawer();
  } else if (action === "rf-fault") {
    st.cellular.fault = !st.cellular.fault;
    st.cellular.sweeps = [null, null, null];
    st.cellular.aiDiagnostics = [null, null, null];
    cellularSim.running = false;
    renderDrawer();
    toast(
      st.cellular.fault
        ? "FAULT SCENARIO ARMED · RUN DTF SWEEP"
        : "HEALTHY FEEDER SCENARIO RESTORED"
    );
  } else if (action === "rf-run-sweep") {
    if (cellularSim.running) return;
    cellularSim.running = true;
    cellularSim.started = performance.now();
    cellularSim.sector = st.cellular.sector;
    cellularSim.lastProgress = -1;
    st.cellular.sweeps[st.cellular.sector] = null;
    st.cellular.aiDiagnostics[st.cellular.sector] = null;
    renderDrawer();
    toast(`SITE MASTER · SWEEPING SECTOR ${st.cellular.sector + 1}`);
  } else if (action === "rf-ai-diagnostic") {
    const index = st.cellular.sector;
    const result = st.cellular.sweeps[index] || calculateSweep(index);
    st.cellular.aiDiagnostics[index] = classifyRFWaveform(result);
    renderDrawer();
    toast(
      st.cellular.aiDiagnostics[index].fault
        ? "AI RF · 96.8% FAULT · 21.3 m"
        : "AI RF · 99.1% HEALTHY"
    );
  } else if (action === "rf-inspect-master" && registry.has("rf-site-master")) {
    selectComponent("rf-site-master");
  } else if (action === "select-power") {
    selectComponent(value);
  } else if (action === "rack-select" && registry.has(value)) {
    selectComponent(value);
  } else if (action === "rack-vendor" && ["ERICSSON", "HUAWEI", "NOKIA"].includes(value)) {
    st.rack.vendor = value;
    applySmartProfile();
    st.masterStep = 2;
    st.tab = "configure";
    rebuildSite();
    toast(`${value} ECOSYSTEM · ${rackHousing().model}`);
  } else if (action === "rack-location" && ["INDOOR", "OUTDOOR"].includes(value)) {
    if (st.env === "URBAN_ROOFTOP" && value === "INDOOR") {
      toast("INDOOR RACK BLOCKED · ROOFTOP REQUIRES OUTDOOR IP55");
      return;
    }
    st.rack.location = value;
    st.masterStep = 2;
    st.tab = "configure";
    rebuildSite();
    toast(`${rackHousing().model} · ${rackHousing().ip}`);
  } else if (action === "rack-door-toggle") {
    rackSim.doorTarget = rackSim.doorTarget > 0.5 ? 0 : 1;
    st.masterStep = 2;
    renderDrawer();
  } else if (
    action === "rack-toggle" &&
    Object.prototype.hasOwnProperty.call(RACK_SLOT_POWER, value) &&
    isRackSlotCurated(value)
  ) {
    st.rack.slots[value] = !st.rack.slots[value];
    st.masterStep = 2;
    st.tab = "configure";
    normalizeRackState();
    rebuildSite();
    toast(
      `${RACK_CONTENT[value].title.toUpperCase()} · ${st.rack.slots[value] ? "INSTALLED" : "SLOT EMPTY"}`
    );
  } else if (action === "rack-patch") {
    if (!calculateRack().patchReady) return;
    rackSim.patchLink = true;
    rackSim.patchProgress = 0;
    rackSim.patchStarted = performance.now();
    rackSim.patchCompletedNotified = false;
    rackSim.doorTarget = 1;
    playContactor();
    toast("PATCHING YELLOW ETHERNET · ROUTER PORT 2 → TDM PORT 1B");
    renderDrawer();
  } else if (action === "rack-trace") {
    if (!alarmPathReady()) return;
    rackSim.alarmTraceStart = performance.now();
    rackSim.alarmTraceActive = true;
    rackSim.alarmBadge = true;
    rackSim.doorTarget = 1;
    toast("ALARM HIGHWAY · OVP → SAU3 → SCU → SHU → MASTER DUG");
    renderDrawer();
  } else if (
    action === "power-source-mode" &&
    ["GRID_WITH_STANDBY", "DUAL_GENERATOR_OFFGRID"].includes(value)
  ) {
    st.power.sourceMode = value;
    resetPowerSimulation();
    rebuildSite();
    toast(
      value === "DUAL_GENERATOR_OFFGRID"
        ? "GENERATOR 2 UNLOCKED · OFF-GRID 12 h ROTATION"
        : "UTILITY + STANDBY ARCHITECTURE RESTORED"
    );
  } else if (action === "ats-mode" && ["CLASSIC_RELAY", "DIGITAL_PLC"].includes(value)) {
    st.power.atsMode = value;
    renderDrawer();
  } else if (action === "battery-strings") {
    st.power.batteryStrings = Number(value);
    normalizePowerState();
    rebuildSite();
  } else if (action === "battery-ah") {
    st.power.batteryAh = Number(value);
    normalizePowerState();
    rebuildSite();
  } else if (action === "battery-type") {
    st.power.batteryType = value;
    normalizePowerState();
    rebuildSite();
  } else if (action === "test-failover") {
    powerSim.failedRectifier = powerSim.failedRectifier === null ? 0 : null;
    const failover = calculatePower();
    playContactor();
    toast(
      powerSim.failedRectifier === null
        ? "RECTIFIER MODULE RESTORED"
        : failover.failoverPass
          ? "MODULE 1 FAILED · LOAD SHARED · 0 V DROP"
          : "MODULE 1 FAILED · DC CAPACITY WARNING"
    );
    renderDrawer();
    updateHUD();
  } else if (action === "power-blackout") startBlackout();
  else if (action === "restore-grid") restoreGrid();
  else if (action === "clear-selection") clearSelection();
  else if (action === "copy-code") copyCode();
});

$("#drawer").addEventListener("submit", (event) => {
  if (event.target.id !== "cli-form") return;
  event.preventDefault();
  const input = event.target.querySelector("#cli-input");
  executeCLI(input.value);
  const replacement = $("#cli-input");
  if (replacement) replacement.focus();
});

$("#drawer").addEventListener("keydown", (event) => {
  if (event.target.id !== "cli-input" || !["ArrowUp", "ArrowDown"].includes(event.key)) return;
  const history = st.terminal.inputHistory;
  if (!history.length) return;
  event.preventDefault();
  if (event.key === "ArrowUp") st.terminal.historyIndex = Math.max(0, st.terminal.historyIndex - 1);
  else st.terminal.historyIndex = Math.min(history.length, st.terminal.historyIndex + 1);
  event.target.value = history[st.terminal.historyIndex] || "";
});

$("#drawer").addEventListener("input", (event) => {
  const rfInput = event.target.dataset.rfInput;
  if (rfInput) {
    const sector = st.cellular.sectors[st.cellular.sector];
    const value = Number(event.target.value);
    if (rfInput === "azimuth") sector.azimuth = clamp(value, 0, 360);
    else if (rfInput === "downtilt") sector.downtilt = clamp(value, 0, 10);
    else if (rfInput === "txPower") sector.txPower = clamp(Math.round(value), 43, 49);
    event.target.style.setProperty(
      "--range-progress",
      `${rangeProgress(value, Number(event.target.min), Number(event.target.max))}%`
    );
    const output = $(
      rfInput === "azimuth"
        ? "#rf-azimuth-value"
        : rfInput === "downtilt"
          ? "#rf-downtilt-value"
          : "#rf-tx-value"
    );
    if (output)
      output.textContent =
        rfInput === "txPower"
          ? `${sector.txPower.toFixed(0)} dBm · ${txPowerWatts(sector.txPower)} W`
          : `${sector[rfInput].toFixed(1)}°`;
    updateCellularVisuals(performance.now());
    updateLiveReadouts();
    return;
  }
  const microwaveInput = event.target.dataset.mwInput;
  if (microwaveInput === "azimuth") {
    const value = clamp(Number(event.target.value), 0, 360);
    st.microwave.azimuth = value;
    microwaveSim.azimuth = st.microwave.azimuth;
    event.target.style.setProperty("--range-progress", `${rangeProgress(value, 0, 360)}%`);
    event.target.setAttribute("aria-valuetext", `${value.toFixed(1)} degrees`);
    updateMicrowaveVisuals(performance.now());
    updateLiveReadouts();
    updateHUD();
    updateMicrowaveTone();
    return;
  }
  if (microwaveInput === "spacing") {
    st.microwave.spacing = clamp(Number(event.target.value), 3, 6);
    event.target.style.setProperty(
      "--range-progress",
      `${rangeProgress(st.microwave.spacing, 3, 6)}%`
    );
    $("#mw-spacing-value").textContent = `${st.microwave.spacing.toFixed(1)} m`;
    scheduleRebuild();
    return;
  }
  const rackInput = event.target.dataset.rackInput;
  if (rackInput === "radio-count") {
    st.rack.radioCount = clamp(Math.round(Number(event.target.value)), 0, 12);
    event.target.style.setProperty(
      "--range-progress",
      `${rangeProgress(st.rack.radioCount, 0, 12)}%`
    );
    $("#rack-radio-count-value").textContent = `${st.rack.radioCount} / 12`;
    scheduleRebuild();
    return;
  }
  const input = event.target.dataset.powerInput;
  if (input) {
    const value = Number(event.target.value);
    const min = Number(event.target.min),
      max = Number(event.target.max);
    event.target.style.setProperty("--range-progress", `${rangeProgress(value, min, max)}%`);
    if (input === "radio-load") {
      st.power.radioLoadKw = value;
      normalizePowerState();
      $("#radio-load-value").textContent = `${value.toFixed(1)} kW`;
      const moduleSlider = $("#rectifier-count");
      if (moduleSlider) {
        moduleSlider.value = calculatePower().installed;
        moduleSlider.style.setProperty(
          "--range-progress",
          `${rangeProgress(calculatePower().installed, 1, 8)}%`
        );
        $("#rectifier-count-value").textContent = calculatePower().installed;
      }
      scheduleRebuild();
    } else if (input === "rectifier-count") {
      st.power.rectifiers = Math.round(value);
      $("#rectifier-count-value").textContent = value;
      scheduleRebuild();
    } else if (input === "climate-setpoint") {
      st.power.climateSetpoint = value;
      $("#climate-setpoint-value").textContent = `${value.toFixed(0)} °C`;
    } else if (input === "shelter-temperature") {
      powerSim.temperature = value;
      $("#shelter-temperature-value").textContent = `${value.toFixed(1)} °C`;
    } else if (input === "fuel-level") {
      powerSim.fuelRemainingL = value * 10;
      $("#fuel-level-value").textContent = `${value.toFixed(0)}%`;
    }
    updateHUD();
    return;
  }
  if (event.target.id !== "tower-height") return;
  const [min, max] = TOWERS[st.tower].range;
  st.H = clamp(Number(event.target.value), min, max);
  if (st.onboarding.active && !st.onboarding.towerSelected) {
    st.onboarding.towerSelected = true;
    const hint = $("#drawer-content .onboarding-hint");
    if (hint) {
      hint.outerHTML = `
        <div class="onboarding-next-wrap">
          <button class="onboarding-next-btn" data-action="onboarding-next" type="button">
            <span>Next: Select Vendor &amp; Cabinet</span>
            <span class="onboarding-next-arrow" aria-hidden="true">→</span>
          </button>
        </div>`;
    }
  }
  event.target.style.setProperty("--range-progress", `${((st.H - min) / (max - min)) * 100}%`);
  event.target.setAttribute("aria-valuetext", `${st.H} meters`);
  $("#height-value").textContent = `${st.H} m`;
  updateHUD();
  scheduleRebuild();
});

$("#drawer").addEventListener("change", (event) => {
  if (event.target.dataset.rfInput) {
    renderDrawer();
    return;
  }
  if (event.target.dataset.mwInput) {
    if (event.target.dataset.mwInput === "spacing") renderDrawer();
    return;
  }
  if (event.target.dataset.rackInput) {
    renderDrawer();
    return;
  }
  if (event.target.dataset.powerInput) {
    renderDrawer();
    return;
  }
  const powerChange = event.target.dataset.powerChange;
  if (powerChange === "auto-rectifiers") {
    st.power.autoRectifiers = event.target.checked;
    normalizePowerState();
    rebuildSite();
    return;
  }
  if (powerChange === "branch") {
    st.power.branches[event.target.dataset.branch] = event.target.checked;
    renderDrawer();
    updateHUD();
    return;
  }
  if (event.target.id === "tower-height") {
    renderDrawer();
    fitSite();
  }
  if (event.target.id === "grounding-toggle") {
    if (ENVIRONMENTS[st.env].mandatoryGrounding) {
      st.grounding = true;
      toast("GROUNDING IS MANDATORY ON THIS MOUNTAIN PEAK");
    } else st.grounding = event.target.checked;
    st.selectedId = null;
    rebuildSite();
  }
});

$("#drawer").addEventListener("pointermove", (event) => {
  if (!event.target.closest || !event.target.closest("[data-rf-graph]")) return;
  const result = st.cellular.sweeps[st.cellular.sector];
  const svg = $("#rf-sweep-graph");
  if (!result || !svg) return;
  const bounds = svg.getBoundingClientRect();
  if (!bounds.width) return;
  const svgX = ((event.clientX - bounds.left) / bounds.width) * 640;
  const distance = clamp(((svgX - 46) / 580) * 60, 0, 60);
  const point = result.points[Math.round(distance * 10)];
  const x = 46 + (point.distance / 60) * 580;
  const y = 16 + ((2.5 - point.vswr) / 1.5) * 210;
  $("#rf-cursor").style.display = "block";
  const line = $("#rf-cursor-line");
  line.setAttribute("x1", x);
  line.setAttribute("x2", x);
  const dot = $("#rf-cursor-dot");
  dot.setAttribute("cx", x);
  dot.setAttribute("cy", y);
  cellularSim.cursorDistance = point.distance;
  $("#rf-cursor-readout").textContent =
    `DTF ${point.distance.toFixed(1)}m · VSWR ${point.vswr.toFixed(2)} · ${point.vswr <= 1.32 ? "PASS" : "HIGH REFLECTION"}`;
});
$("#drawer").addEventListener("pointerout", (event) => {
  if (event.target.id !== "rf-graph-hit") return;
  const cursor = $("#rf-cursor");
  if (cursor) cursor.style.display = "none";
  cellularSim.cursorDistance = null;
});

$("#ai-architect-form").addEventListener("submit", (event) => {
  event.preventDefault();
  startAIBuild($("#ai-architect-input").value);
});
$("#ai-close-button").addEventListener("click", () => setAIArchitectOpen(false));
$("#ai-mobile-toggle").addEventListener("click", () => setAIArchitectOpen(true));
document.querySelectorAll("[data-ai-scenario]").forEach((button) => {
  button.addEventListener("click", () => {
    const blueprint = AI_BLUEPRINTS[button.dataset.aiScenario];
    if (blueprint) startAIBuild(blueprint.prompt);
  });
});

$("#terminal-toggle").addEventListener("click", toggleTerminal);
$("#drawer-toggle").addEventListener("click", () => {
  st.drawerOpen = !st.drawerOpen;
  renderDrawer();
});
$("#master-nav").addEventListener("click", (event) => {
  const button = event.target.closest("[data-step]");
  if (button) enterMasterStep(Number(button.dataset.step));
});

// -------------------------------------------------------------------------
// Orthographic camera, orbit / zoom and raycast selection
// -------------------------------------------------------------------------
const camera = new T.OrthographicCamera(-20, 20, 20, -20, 0.1, 600);
const cameraCurrent = { theta: 0.82, phi: 0.93, size: 31, target: V3(0, 15, 0) };
const cameraGoal = { theta: 0.82, phi: 0.93, size: 31, target: V3(0, 15, 0) };

function snapCameraToGoal() {
  cameraCurrent.theta = cameraGoal.theta;
  cameraCurrent.phi = cameraGoal.phi;
  cameraCurrent.size = cameraGoal.size;
  cameraCurrent.target.copy(cameraGoal.target);
}

function fitSite(immediate = false) {
  const rooftop = st.env === "URBAN_ROOFTOP";
  const guyed = st.tower === "GUYED_MAST";
  const h = st.H;
  cameraGoal.theta = rooftop ? 0.78 : 0.82;
  cameraGoal.phi = rooftop ? 0.9 : 0.93;
  cameraGoal.target.set(
    rooftop ? 0 : structureTop.x * 0.15,
    st.masterStep === 5 ? Math.max(1, h * 0.58) : rooftop ? Math.max(1, h * 0.25) : h * 0.37,
    rooftop ? 0 : structureTop.z * 0.15
  );
  cameraGoal.size = guyed
    ? Math.max(h * 0.63, (h * 0.6) / Math.max(window.innerWidth / window.innerHeight, 0.8))
    : rooftop
      ? Math.max(13, h * 0.85)
      : Math.max(15, h * 0.67);
  if (st.tower === "ROOFTOP_POLE") cameraGoal.size = 12;
  if (st.tower === "COW_TELESCOPIC_TRUCK") cameraGoal.size = Math.max(14, h * 0.72);
  // Reserve useful clear space above the bottom drawer. Narrow screens
  // need additional breathing room because their drawer is taller.
  cameraGoal.size *= window.innerWidth < 760 ? 1.5 : 1.1;
  if (immediate || reducedMotionQuery.matches) snapCameraToGoal();
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  syncHUDScroll();
}
window.addEventListener("resize", resize);
resize();

// Horizontal HUD scroller: chevrons, wheel-to-horizontal, and pointer drag.
(() => {
  const hud = $("#site-hud");
  const leftBtn = $("#hud-scroll-left");
  const rightBtn = $("#hud-scroll-right");
  if (!hud || !leftBtn || !rightBtn) return;

  const scrollStep = (dir) => {
    hud.scrollBy({
      left: dir * Math.max(180, Math.round(hud.clientWidth * 0.55)),
      behavior: reducedMotionQuery.matches ? "auto" : "smooth",
    });
  };
  leftBtn.addEventListener("click", () => scrollStep(-1));
  rightBtn.addEventListener("click", () => scrollStep(1));
  hud.addEventListener("scroll", syncHUDScroll, { passive: true });
  hud.addEventListener(
    "wheel",
    (event) => {
      if (hud.scrollWidth <= hud.clientWidth + 2) return;
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        event.preventDefault();
        hud.scrollLeft += event.deltaY;
        syncHUDScroll();
      }
    },
    { passive: false }
  );

  let dragging = false;
  let dragPointerId = null;
  let startX = 0;
  let startScrollLeft = 0;
  hud.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "touch" || hud.scrollWidth <= hud.clientWidth + 2) return;
    dragging = true;
    dragPointerId = event.pointerId;
    startX = event.clientX;
    startScrollLeft = hud.scrollLeft;
    hud.classList.add("is-dragging");
    hud.setPointerCapture?.(event.pointerId);
  });
  hud.addEventListener("pointermove", (event) => {
    if (!dragging || event.pointerId !== dragPointerId) return;
    hud.scrollLeft = startScrollLeft - (event.clientX - startX);
    syncHUDScroll();
  });
  const endDrag = (event) => {
    if (!dragging || (event && event.pointerId !== dragPointerId)) return;
    dragging = false;
    dragPointerId = null;
    hud.classList.remove("is-dragging");
  };
  hud.addEventListener("pointerup", endDrag);
  hud.addEventListener("pointercancel", endDrag);
})();

const raycaster = new T.Raycaster();
raycaster.params.Line.threshold = 0.08;
const pointer = new T.Vector2();
const activePointers = new Map();
let lastX = 0,
  lastY = 0,
  pinchDistance = 0,
  movement = 0;

function pickAt(clientX, clientY) {
  if (!siteRoot) return;
  pointer.set((clientX / window.innerWidth) * 2 - 1, -(clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(siteRoot.children, true);
  for (const hit of hits) {
    let object = hit.object;
    let visible = true;
    for (let cursor = object; cursor && cursor !== siteRoot; cursor = cursor.parent) {
      if (!cursor.visible) {
        visible = false;
        break;
      }
    }
    if (!visible) continue;
    while (object && object !== siteRoot) {
      if (object.userData.pick) {
        const id = object.userData.pick.id;
        const doorTarget = id === "rack-door" ? (rackSim.doorTarget > 0.5 ? 0 : 1) : null;
        selectComponent(id);
        if (doorTarget !== null) rackSim.doorTarget = doorTarget;
        return;
      }
      object = object.parent;
    }
  }
  clearSelection();
}

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  activePointers.set(event.pointerId, [event.clientX, event.clientY]);
  lastX = event.clientX;
  lastY = event.clientY;
  movement = 0;
});
canvas.addEventListener("pointermove", (event) => {
  if (!activePointers.has(event.pointerId)) return;
  activePointers.set(event.pointerId, [event.clientX, event.clientY]);
  if (activePointers.size === 2) {
    const [a, b] = [...activePointers.values()];
    const distance = Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (pinchDistance)
      cameraGoal.size = clamp((cameraGoal.size * pinchDistance) / distance, 0.32, 150);
    pinchDistance = distance;
    movement = 100;
    return;
  }
  const dx = event.clientX - lastX;
  const dy = event.clientY - lastY;
  movement += Math.abs(dx) + Math.abs(dy);
  cameraGoal.theta -= dx * 0.0055;
  cameraGoal.phi = clamp(cameraGoal.phi - dy * 0.004, 0.32, 1.38);
  lastX = event.clientX;
  lastY = event.clientY;
});
canvas.addEventListener("pointerup", (event) => {
  activePointers.delete(event.pointerId);
  pinchDistance = 0;
  if (movement <= 6) pickAt(event.clientX, event.clientY);
});
canvas.addEventListener("pointercancel", (event) => {
  activePointers.delete(event.pointerId);
  pinchDistance = 0;
});
canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    cameraGoal.size = clamp(cameraGoal.size * (1 + event.deltaY * 0.001), 0.32, 150);
  },
  { passive: false }
);

$("#fit-site").addEventListener("click", () => fitSite());
$("#zoom-in").addEventListener("click", () => {
  cameraGoal.size = clamp(cameraGoal.size * 0.82, 0.32, 150);
});
$("#zoom-out").addEventListener("click", () => {
  cameraGoal.size = clamp(cameraGoal.size * 1.22, 0.32, 150);
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName))
    clearSelection();
});

function updateSelectionTag() {
  const tag = $("#selection-tag");
  if (!selectionCenter || !st.selectedId) {
    tag.style.display = "none";
    return;
  }
  const projected = selectionCenter.clone().project(camera);
  const visible =
    projected.z > -1 &&
    projected.z < 1 &&
    Math.abs(projected.x) < 1.1 &&
    Math.abs(projected.y) < 1.1;
  if (!visible) {
    tag.style.display = "none";
    return;
  }
  tag.style.display = "block";
  tag.style.left = `${(projected.x * 0.5 + 0.5) * window.innerWidth}px`;
  tag.style.top = `${(-projected.y * 0.5 + 0.5) * window.innerHeight - 22}px`;
}

const clock = new T.Clock();
function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (st.heroOpen) {
    updateHeroMotion(dt);
    requestAnimationFrame(animate);
    return;
  }
  const now = performance.now();
  updatePowerSimulation(now, dt);
  updateMicrowaveVisuals(now);
  updateCellularVisuals(now);
  updateLaunchVisuals(now);
  updateRackVisuals(now, dt);
  updateAIFeatures(now, dt);
  const ease = 1 - Math.pow(0.002, dt);
  cameraCurrent.theta += (cameraGoal.theta - cameraCurrent.theta) * ease;
  cameraCurrent.phi += (cameraGoal.phi - cameraCurrent.phi) * ease;
  cameraCurrent.size += (cameraGoal.size - cameraCurrent.size) * ease;
  cameraCurrent.target.lerp(cameraGoal.target, ease);
  const aspect = window.innerWidth / window.innerHeight;
  const s = cameraCurrent.size;
  const verticalShift = window.innerWidth < 760 ? 0.17 : 0.12;
  // On wide screens the drawer is docked left, so the CAD viewport is
  // composed to the right instead of hiding foundations behind the card.
  const horizontalShift = window.innerWidth >= 1100 ? 0.34 : 0;
  const horizontalSize = s * aspect;
  camera.left = -horizontalSize * (1 + horizontalShift);
  camera.right = horizontalSize * (1 - horizontalShift);
  camera.top = s * (1 - verticalShift);
  camera.bottom = -s * (1 + verticalShift);
  camera.updateProjectionMatrix();
  const target = cameraCurrent.target;
  camera.position.set(
    target.x + 160 * Math.sin(cameraCurrent.phi) * Math.cos(cameraCurrent.theta),
    target.y + 160 * Math.cos(cameraCurrent.phi),
    target.z + 160 * Math.sin(cameraCurrent.phi) * Math.sin(cameraCurrent.theta)
  );
  camera.lookAt(target);
  if (selectionBox) selectionBox.update();
  renderer.render(scene, camera);
  updateSelectionTag();
  requestAnimationFrame(animate);
}

// Small public surface for diagnostics and future simulator phases.
window.TowerStudio = {
  state: st,
  environments: ENVIRONMENTS,
  towers: TOWERS,
  calculate: calculateEngineering,
  calculatePower,
  calculateRack,
  calculateMicrowave,
  dishGainDbi,
  microwaveTopologies: MICROWAVE_TOPOLOGIES,
  microwaveSimulation: microwaveSim,
  microwaveVisuals,
  smartGenerations: SMART_GENERATIONS,
  customGenCatalog: CUSTOM_GEN_CATALOG,
  customGenerationMetrics,
  smartProfile,
  applySmartProfile,
  getPowerPositions,
  syncHUDScroll,
  heroMotion,
  setHeroOpen,
  updateHeroPointer,
  resetHeroPointer,
  updateHeroMotion,
  aauModel,
  calculateSweep,
  sectorBeamGeometry,
  calculateAcceptance,
  siteAlarms,
  executeCLI,
  cliCommands,
  goOnAir,
  launch,
  launchVisuals,
  updateLaunch: updateLaunchVisuals,
  updateHUD,
  transmissionSceneMode,
  cellularSimulation: cellularSim,
  cellularVisuals,
  rackHousing,
  rackSimulation: rackSim,
  rackVisuals,
  enterMasterStep,
  updateRack: updateRackVisuals,
  updateCellular: updateCellularVisuals,
  powerSimulation: powerSim,
  powerAlarms,
  startBlackout,
  restoreGrid,
  updatePower: updatePowerSimulation,
  aiBlueprints: AI_BLUEPRINTS,
  parseAIArchitect,
  startAIBuild,
  aiBuild,
  updateAI: updateAIFeatures,
  setAIArchitectOpen,
  classifyRFWaveform,
  runAICopilot,
  applyTriageChoice,
  triage,
  select: selectComponent,
  registry,
  scene,
  camera,
  cameraGoal,
  cameraCurrent,
  rebuild: rebuildSite,
  code: codeSnippet,
};
window.CellForge = window.TowerStudio;

setAIArchitectOpen(st.ai.architectOpen);
syncAIArchitect();
rebuildSite();
syncHUDScroll();
fitSite(true);
initHeroTab();
animate();
$("#loading").classList.add("hidden");
