// Sound, pass 2: the studio now answers with a small synthesised kit instead of
// staying silent. There is nothing to hear in this environment, so these tests
// check the things that can be checked: that the palette is complete and every
// cue the code asks for exists, that nothing is audible before a gesture, that
// each effect really builds and schedules nodes, and that the opt-out sticks.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHeadlessStudio, ROOT_DIR } from "./helpers/headless.mjs";

const JS = fs.readFileSync(path.join(ROOT_DIR, "src/js/app.js"), "utf8");
const HTML = fs.readFileSync(path.join(ROOT_DIR, "index.html"), "utf8");

// A minimal Web Audio stand-in. Every node records what was asked of it, and any
// parameter scheduled with a non-finite time or a zero exponential target throws
// — the two mistakes that make a synthesiser silent in a real browser.
function fakeWebAudio() {
  const created = [];
  const contexts = [];

  class Param {
    constructor(value = 0) {
      this.value = value;
      this.events = [];
    }
    setValueAtTime(value, time) {
      this.check(time, "set");
      this.events.push(["set", value, time]);
      this.value = value;
      return this;
    }
    linearRampToValueAtTime(value, time) {
      this.check(time, "linear");
      this.events.push(["linear", value, time]);
      this.value = value;
      return this;
    }
    exponentialRampToValueAtTime(value, time) {
      this.check(time, "exponential");
      if (!(value > 0)) throw new RangeError(`exponential ramp to ${value}`);
      this.events.push(["exponential", value, time]);
      this.value = value;
      return this;
    }
    setTargetAtTime(value, time, constant) {
      this.check(time, "target");
      this.events.push(["target", value, time, constant]);
      return this;
    }
    cancelScheduledValues(time) {
      this.events.push(["cancel", time]);
      return this;
    }
    check(time, kind) {
      if (!Number.isFinite(time) || time < 0) {
        throw new RangeError(`${kind} ramp at ${time}`);
      }
    }
  }

  class Node {
    constructor(kind) {
      this.kind = kind;
      this.outputs = [];
      this.started = null;
      this.stopped = null;
      created.push(this);
    }
    connect(node) {
      this.outputs.push(node);
      return node;
    }
    disconnect() {
      this.outputs.length = 0;
    }
  }

  class GainNode extends Node {
    constructor() {
      super("gain");
      this.gain = new Param(1);
    }
  }

  class OscillatorNode extends Node {
    constructor() {
      super("oscillator");
      this.type = "sine";
      this.frequency = new Param(440);
      this.detune = new Param(0);
    }
    start(time) {
      this.started = time;
    }
    stop(time) {
      this.stopped = time;
    }
  }

  class BiquadFilterNode extends Node {
    constructor() {
      super("filter");
      this.type = "lowpass";
      this.frequency = new Param(350);
      this.Q = new Param(1);
      this.gain = new Param(0);
    }
  }

  class AudioBufferSourceNode extends Node {
    constructor() {
      super("source");
      this.buffer = null;
      this.loop = false;
      this.playbackRate = new Param(1);
    }
    start(time) {
      this.started = time;
    }
    stop(time) {
      this.stopped = time;
    }
  }

  class AudioBuffer {
    constructor(channels, length, sampleRate) {
      this.numberOfChannels = channels;
      this.length = length;
      this.sampleRate = sampleRate;
      this.data = Array.from({ length: channels }, () => new Float32Array(length));
    }
    getChannelData(index) {
      return this.data[index];
    }
  }

  class FakeAudioContext {
    constructor() {
      this.state = "running";
      this.sampleRate = 48000;
      this.currentTime = 0;
      this.destination = new Node("destination");
      contexts.push(this);
    }
    createGain() {
      return new GainNode();
    }
    createOscillator() {
      return new OscillatorNode();
    }
    createBiquadFilter() {
      return new BiquadFilterNode();
    }
    createBufferSource() {
      return new AudioBufferSourceNode();
    }
    createBuffer(channels, length, sampleRate) {
      return new AudioBuffer(channels, length, sampleRate);
    }
    resume() {
      this.state = "running";
      return Promise.resolve();
    }
  }

  return { AudioContext: FakeAudioContext, created, contexts };
}

// A wake-up gesture, the same one the module listens for.
function wake(window) {
  window.document.dispatchEvent(new window.Event("pointerdown", { bubbles: true }));
}

test("every cue the code asks for is in the palette, and the palette is broad", () => {
  const { dom, studio } = createHeadlessStudio({ width: 1440, height: 900 });
  const names = studio.sound.names();
  assert.ok(names.length >= 16, `the kit has ${names.length} effects`);

  // The calls the app itself makes.
  const called = new Set([...JS.matchAll(/playSound\("([a-z]+)"\)/g)].map((m) => m[1]));
  // …and the cues the drawer action table asks for.
  const actionBlock = JS.slice(
    JS.indexOf("const ACTION_SOUNDS = {"),
    JS.indexOf("const SILENT_ACTIONS")
  );
  for (const match of actionBlock.matchAll(/:\s*"([a-z]+)",/g)) called.add(match[1]);

  for (const name of called) {
    assert.ok(names.includes(name), `playSound("${name}") has a recipe`);
  }
  // The palette covers the four families the notes describe.
  for (const name of [
    "tick",
    "select",
    "step",
    "confirm",
    "blocked",
    "toggle",
    "relay",
    "ratchet",
    "key",
    "weld",
    "servo",
    "whoosh",
    "sweep",
    "alarm",
    "onair",
    "toast",
  ]) {
    assert.ok(names.includes(name), `${name} is in the kit`);
  }
  dom.window.close();
});

test("nothing is audible before the page is touched, and nothing is created either", () => {
  const audio = fakeWebAudio();
  const { dom, window, studio } = createHeadlessStudio({
    width: 1440,
    height: 900,
    audioContext: audio.AudioContext,
  });
  assert.equal(audio.contexts.length, 0, "no AudioContext at load");
  assert.equal(studio.sound.play("tick"), false, "silent until a gesture");
  assert.equal(audio.contexts.length, 0, "and still no context");

  wake(window);
  assert.equal(studio.sound.play("tick"), true, "the first gesture wakes the kit");
  assert.equal(audio.contexts.length, 1, "one context, created on demand");
  dom.window.close();
});

test("each effect builds nodes and schedules them in order", () => {
  const audio = fakeWebAudio();
  const { dom, window, studio } = createHeadlessStudio({
    width: 1440,
    height: 900,
    audioContext: audio.AudioContext,
  });
  wake(window);

  for (const name of studio.sound.names()) {
    const before = audio.created.length;
    assert.equal(studio.sound.play(name), true, `${name} plays`);
    const nodes = audio.created.slice(before);
    assert.ok(nodes.length > 0, `${name} created nodes`);
    assert.ok(
      nodes.some((node) => node.kind !== "gain" && node.kind !== "filter"),
      `${name} has a source`
    );
    for (const node of nodes) {
      if (node.started === null) continue;
      assert.ok(Number.isFinite(node.started) && node.started >= 0, `${name}: start time`);
      assert.ok(
        Number.isFinite(node.stopped) && node.stopped > node.started,
        `${name}: stops after it starts`
      );
    }
    // Effects are short: nothing loops, nothing drones.
    assert.equal(
      nodes.some((node) => node.loop === true),
      false,
      `${name} does not loop`
    );
  }
  dom.window.close();
});

test("the same effect cannot machine-gun, and a drag ratchets at a walking pace", () => {
  const audio = fakeWebAudio();
  const { dom, window, studio } = createHeadlessStudio({
    width: 1440,
    height: 900,
    audioContext: audio.AudioContext,
  });
  wake(window);

  assert.equal(studio.sound.play("ratchet"), true);
  assert.equal(studio.sound.play("ratchet"), false, "two ticks in the same millisecond");

  // The drawer input handler asks for a ratchet on every slider move, and the
  // wheel handler re-dispatches `input` for the same effect.
  assert.match(JS, /addEventListener\("input"[\s\S]{0,160}?playSound\("ratchet"\)/);
  dom.window.close();
});

test("sound is opt-out, and the choice survives a reload", () => {
  const audio = fakeWebAudio();
  const first = createHeadlessStudio({
    width: 1440,
    height: 900,
    audioContext: audio.AudioContext,
  });
  wake(first.window);
  assert.equal(first.studio.sound.enabled(), true, "on by default");
  assert.equal(first.studio.sound.setEnabled(false), false);
  assert.equal(first.window.localStorage.getItem("tower-studio.sound.v1"), "off");
  assert.equal(first.studio.sound.play("tick"), false, "muted means muted");
  first.dom.window.close();

  // A page that boots with the preference already stored starts silent.
  const muted = createHeadlessStudio({
    width: 1440,
    height: 900,
    audioContext: fakeWebAudio().AudioContext,
    storage: { "tower-studio.sound.v1": "off" },
  });
  wake(muted.window);
  assert.equal(muted.studio.sound.enabled(), false, "the mute is remembered");
  muted.dom.window.close();
});

test("the menu row is a switch that keeps the menu open and shows its state", () => {
  const audio = fakeWebAudio();
  const { dom, window, document, studio } = createHeadlessStudio({
    width: 1440,
    height: 900,
    audioContext: audio.AudioContext,
  });
  wake(window);
  document.querySelector("#menu-toggle").click();
  const row = document.querySelector('[data-action="menu-sound"]');
  assert.ok(row, "the sound row lives in the menu");
  assert.equal(row.getAttribute("aria-checked"), "true");
  assert.match(row.querySelector("small").textContent, /On · M to mute/);

  row.click();
  assert.equal(studio.sound.enabled(), false);
  assert.equal(row.getAttribute("aria-checked"), "false");
  assert.match(row.querySelector("small").textContent, /Muted · M to unmute/);
  assert.equal(document.querySelector("#menu-panel").hidden, false, "the menu stays open");

  row.click();
  assert.equal(studio.sound.enabled(), true);
  dom.window.close();
});

test("M toggles the sound, but not from inside a field", () => {
  const { dom, window, document, studio } = createHeadlessStudio({ width: 1440, height: 900 });
  const press = (target) =>
    target.dispatchEvent(new window.KeyboardEvent("keydown", { key: "m", bubbles: true }));

  wake(window);
  press(window.document.body);
  assert.equal(studio.sound.enabled(), false, "M mutes");
  press(window.document.body);
  assert.equal(studio.sound.enabled(), true, "M unmutes");

  const input = document.querySelector("#ai-architect-input");
  input.focus();
  press(input);
  assert.equal(studio.sound.enabled(), true, "typing an m into a field is just an m");
  dom.window.close();
});

test("the interactions the notes promise really fire a cue", () => {
  const audio = fakeWebAudio();
  const { dom, window, document, studio } = createHeadlessStudio({
    width: 1440,
    height: 900,
    audioContext: audio.AudioContext,
  });
  wake(window);
  studio.state.onboarding.active = false;

  // A drawer action: the button's own sound, through the real handler.
  const probe = document.createElement("button");
  probe.type = "button";
  probe.dataset.action = "tab";
  probe.dataset.value = "overview";
  document.querySelector("#drawer").appendChild(probe);
  const before = audio.created.length;
  probe.click();
  assert.ok(audio.created.length > before, "clicking a drawer action makes a sound");
  probe.remove();

  // The cues that belong to a result rather than a click.
  for (const name of ["blocked", "onair", "sweep", "weld", "relay", "servo", "whoosh"]) {
    const sources = audio.created.length;
    assert.equal(studio.sound.play(name), true, `${name} is available`);
    assert.ok(audio.created.length > sources, `${name} builds nodes`);
  }

  // …and each is hooked where the state changes, not somewhere generic.
  assert.match(JS, /toast\(gate\.reason\.toUpperCase\(\)\);\s*\n\s*playSound\("blocked"\)/);
  assert.match(JS, /playSound\("step"\);\s*\n\s*return true;/);
  assert.match(JS, /playSound\("onair"\)/);
  assert.match(JS, /toast\(`SITE MASTER · SWEEPING SECTOR[^`]*`\);\s*\n\s*playSound\("sweep"\)/);
  assert.match(JS, /playSound\("weld"\)/);
  dom.window.close();
});

test("the sound surface is additive: the existing API is untouched", () => {
  const { dom, studio } = createHeadlessStudio({ width: 1440, height: 900 });
  for (const key of ["play", "setEnabled", "toggle", "enabled", "available", "names"]) {
    assert.equal(typeof studio.sound[key], "function", `sound.${key} is a function`);
  }
  assert.ok(studio.sound.volume > 0 && studio.sound.volume <= 0.5, "the master volume is modest");

  // The menu row is in the markup, its description is in the help sheet, and it
  // is not in the top bar — that stays at five buttons on every laptop.
  assert.match(HTML, /data-action="menu-sound"/);
  assert.match(HTML, /Mute or unmute the interface sounds/);
  assert.equal(HTML.slice(0, HTML.indexOf('id="menu-panel"')).includes("menu-sound"), false);
  dom.window.close();
});
