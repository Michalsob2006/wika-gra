import assert from "node:assert/strict";
import fs from "node:fs";
import { AudioManager } from "../js/audio.js";
import { audioAssets } from "../js/audio-config.js";
const priorStorage = globalThis.localStorage,
  store = new Map();
globalThis.localStorage = {
  getItem: (k) => store.get(k) || null,
  setItem: (k, v) => store.set(k, v),
};
const manifest = JSON.parse(fs.readFileSync("assets/audio/sfx/manifest.json"));
assert.equal(manifest.length, 7);
for (const [kind, { src, volume }] of Object.entries(audioAssets)) {
  const data = fs.readFileSync(src);
  assert.equal(data.toString("ascii", 0, 4), "RIFF");
  assert.equal(data.toString("ascii", 8, 12), "WAVE");
  assert.equal(data.readUInt16LE(22), 1);
  assert.equal(data.readUInt16LE(34), 16);
  const row = manifest.find((r) => r.effect === kind);
  assert.equal(row.bytes, data.length);
  assert.ok(row.durationSeconds > 0 && row.durationSeconds < 1.2);
  assert.ok(volume > 0 && volume <= 0.5);
  assert.ok(!src.includes("/System/"));
  let peak = 0,
    energy = 0;
  for (let i = 44; i < data.length; i += 2) {
    const sample = data.readInt16LE(i);
    peak = Math.max(peak, Math.abs(sample));
    energy += sample * sample;
  }
  assert.ok(energy > 0 && peak < 32767);
}
const sources = [],
  gains = [];
let created = 0;
const makeContext = () => {
  created++;
  return {
    state: "running",
    destination: {},
    createBuffer: () => ({}),
    resume() {
      this.state = "running";
      return Promise.resolve();
    },
    decodeAudioData(data, ok) {
      queueMicrotask(() => ok({ duration: 0.1 }));
    },
    createGain() {
      const gain = { gain: { value: 0 }, connect() {}, disconnect() {} };
      gains.push(gain);
      return gain;
    },
    createBufferSource() {
      const source = {
        connect() {},
        disconnect() {},
        start() {
          this.started = true;
        },
        stop() {
          this.stopped = true;
          this.onended?.();
        },
        finish() {
          this.onended?.();
        },
      };
      sources.push(source);
      return source;
    },
  };
};
const fetchAudio = async () => ({
  ok: true,
  arrayBuffer: async () => new ArrayBuffer(8),
});
const manager = new AudioManager({ fetchAudio, createContext: makeContext });
let settled = 0;
await manager.preload(() => settled++);
assert.equal(settled, 7);
assert.equal(created, 0);
assert.equal(await manager.play("collect"), false);
assert.equal(created, 0);
await manager.unlock();
await Promise.all(Object.keys(audioAssets).map((k) => manager.decode(k)));
assert.equal(manager.getStatus().decoded.length, 7);
for (const [kind, { volume }] of Object.entries(audioAssets)) {
  assert.equal(await manager.play(kind), true, kind);
  assert.equal(gains.at(-1).gain.value, volume);
  const voice = sources.at(-1);
  assert.equal(voice.started, true);
  assert.equal(await manager.play(kind), false);
  voice.finish();
  assert.ok(!manager.getStatus().playing.includes(kind));
}
// New manager avoids the cooldown of the earlier playback checks.
const burst = new AudioManager({ fetchAudio, createContext: makeContext });
await burst.preload();
await burst.unlock();
const simultaneous = await Promise.all(
  Array.from({ length: 30 }, () => burst.play("collect-heart")),
);
assert.equal(simultaneous.filter(Boolean).length, 1);
assert.deepEqual(burst.getStatus().playing, ["collect-heart"]);
const voice = sources.at(-1);
assert.equal(burst.toggleMute(), true);
assert.equal(voice.stopped, true);
assert.equal(store.get("wiki-muted"), "true");
assert.equal(await burst.play("danger"), false);
assert.equal(new AudioManager().muted, true);
assert.equal(burst.toggleMute(), false);
assert.equal(store.get("wiki-muted"), "false");
// Muting cancels an effect still waiting for decode.
let decodeDone;
const delayed = new AudioManager({
  fetchAudio,
  createContext: () => ({
    ...makeContext(),
    decodeAudioData(data, ok) {
      decodeDone = ok;
    },
  }),
});
await delayed.preload();
delayed.interacted = true;
delayed.context = delayed.createContext();
const pending = delayed.play("click");
delayed.toggleMute();
decodeDone({ duration: 0.1 });
assert.equal(await pending, false);
assert.equal(delayed.active.size, 0);
delayed.toggleMute();
const slow = new AudioManager({
  fetchAudio: () => new Promise(() => {}),
  timeoutMs: 20,
});
const start = Date.now();
await slow.preload();
assert.ok(Date.now() - start < 500);
assert.equal(slow.failed.size, 7);
const missing = new AudioManager({
  fetchAudio: async (src) => ({
    ok: !src.includes("danger"),
    status: 404,
    arrayBuffer: async () => new ArrayBuffer(8),
  }),
});
await missing.preload();
assert.deepEqual([...missing.failed], ["danger"]);
const corrupt = new AudioManager({
  fetchAudio,
  createContext: () => ({
    ...makeContext(),
    decodeAudioData(data, ok, fail) {
      fail();
    },
  }),
});
await corrupt.preload();
await corrupt.unlock();
assert.equal(await corrupt.play("negative"), false);
globalThis.localStorage = {
  getItem() {
    throw Error();
  },
  setItem() {
    throw Error();
  },
};
const unavailable = new AudioManager();
assert.equal(unavailable.muted, false);
assert.equal(unavailable.toggleMute(), true);
globalThis.localStorage = priorStorage;
console.log(
  "OK audio: 7 non-silent PCM WAVs/gains, gesture gate, decoding/play/end, 30-call deduplication, mute/stop/persistence/pending cancellation, transfer timeout/404/corrupt decode, unavailable storage.",
);
