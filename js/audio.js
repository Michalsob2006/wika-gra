import { audioAssets } from "./audio-config.js";
const aliases = { button: "click", collect: "collect-heart" };
const MUTE_KEY = "wiki-muted";
export class AudioManager {
  constructor({
    fetchAudio = (...args) => fetch(...args),
    createContext = () =>
      new (window.AudioContext || window.webkitAudioContext)(),
    timeoutMs = 3500,
  } = {}) {
    this.fetchAudio = fetchAudio;
    this.createContext = createContext;
    this.timeoutMs = timeoutMs;
    this.context = null;
    this.interacted = false;
    this.muted = false;
    this.epoch = 0;
    this.raw = new Map();
    this.buffers = new Map();
    this.decoding = new Map();
    this.active = new Map();
    this.pending = new Set();
    this.failed = new Set();
    this.lastPlayed = new Map();
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === "true";
    } catch {}
  }
  preload(onSettled = () => {}) {
    if (!this.loading)
      this.loading = Promise.all(
        Object.entries(audioAssets).map(async ([kind, { src }]) => {
          const controller = new AbortController();
          let timer;
          try {
            const request = (async () => {
              const response = await this.fetchAudio(src, {
                signal: controller.signal,
              });
              if (!response.ok) throw Error("Audio HTTP " + response.status);
              return response.arrayBuffer();
            })();
            // Bound the whole transfer, including a response whose body never finishes.
            const deadline = new Promise((_, reject) => {
              timer = setTimeout(() => {
                controller.abort();
                reject(Error("Audio timeout"));
              }, this.timeoutMs);
            });
            const data = await Promise.race([request, deadline]);
            if (!data.byteLength) throw Error("Empty audio");
            this.raw.set(kind, data);
          } catch {
            this.failed.add(kind);
          } finally {
            clearTimeout(timer);
            onSettled(kind);
          }
        }),
      ).then(() => this.getStatus());
    return this.loading;
  }
  unlock() {
    this.interacted = true;
    if (this.muted) return Promise.resolve(false);
    try {
      if (!this.context) {
        this.context = this.createContext();
        // A silent one-frame buffer starts inside the gesture for mobile WebKit.
        const source = this.context.createBufferSource();
        source.buffer = this.context.createBuffer(1, 1, 22050);
        source.connect(this.context.destination);
        source.onended = () => source.disconnect();
        source.start(0);
      }
      const resumed =
        this.context.state === "running"
          ? Promise.resolve()
          : this.context.resume();
      return Promise.resolve(resumed)
        .then(() => {
          if (this.context.state !== "running") return false;
          for (const kind of this.raw.keys()) void this.decode(kind);
          return true;
        })
        .catch(() => false);
    } catch {
      return Promise.resolve(false);
    }
  }
  decode(kind) {
    if (this.buffers.has(kind)) return Promise.resolve(this.buffers.get(kind));
    if (this.decoding.has(kind)) return this.decoding.get(kind);
    if (!this.context || !this.raw.has(kind) || this.failed.has(kind))
      return Promise.resolve(null);
    let timer,
      finished = false;
    const decode = new Promise((resolve) => {
      const finish = (buffer) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (buffer) {
          this.buffers.set(kind, buffer);
          this.raw.delete(kind);
        } else this.failed.add(kind);
        resolve(buffer || null);
      };
      timer = setTimeout(() => finish(null), 2000);
      try {
        // Callback form also works on older mobile Safari.
        const decoding = this.context.decodeAudioData(
          this.raw.get(kind).slice(0),
          finish,
          () => finish(null),
        );
        decoding?.catch(() => finish(null));
      } catch {
        finish(null);
      }
    });
    this.decoding.set(kind, decode);
    return decode;
  }
  async play(name = "click") {
    const kind = aliases[name] || name,
      config = audioAssets[kind];
    if (
      !config ||
      this.muted ||
      !this.interacted ||
      !this.context ||
      this.failed.has(kind) ||
      this.pending.has(kind) ||
      this.active.has(kind)
    )
      return false;
    if (typeof document !== "undefined" && document.hidden) return false;
    if (["win", "game-over"].includes(kind)) this.stopAll();
    const epoch = this.epoch,
      requested = Date.now();
    this.pending.add(kind);
    try {
      if (this.context.state !== "running") await this.context.resume();
      const buffer = await this.decode(kind);
      if (
        !buffer ||
        this.muted ||
        epoch !== this.epoch ||
        Date.now() - requested > 750 ||
        this.context.state !== "running"
      )
        return false;
      if (typeof document !== "undefined" && document.hidden) return false;
      if (
        this.active.has(kind) ||
        this.active.size >= 4 ||
        Date.now() - (this.lastPlayed.get(kind) || 0) < 75
      )
        return false;
      const source = this.context.createBufferSource(),
        gain = this.context.createGain();
      source.buffer = buffer;
      gain.gain.value = config.volume;
      source.connect(gain);
      gain.connect(this.context.destination);
      const voice = { source, gain };
      this.active.set(kind, voice);
      this.lastPlayed.set(kind, Date.now());
      source.onended = () => {
        if (this.active.get(kind) === voice) this.active.delete(kind);
        source.disconnect();
        gain.disconnect();
      };
      source.start(0);
      return true;
    } catch {
      return false;
    } finally {
      if (epoch === this.epoch) this.pending.delete(kind);
    }
  }
  stopAll() {
    this.epoch++;
    this.pending.clear();
    for (const { source, gain } of this.active.values()) {
      try {
        source.stop();
        source.disconnect();
        gain.disconnect();
      } catch {}
    }
    this.active.clear();
  }
  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) this.stopAll();
    else if (this.interacted) void this.unlock();
    try {
      localStorage.setItem(MUTE_KEY, String(this.muted));
    } catch {}
    return this.muted;
  }
  getStatus() {
    return {
      muted: this.muted,
      unlocked: this.interacted && this.context?.state === "running",
      loaded: [...new Set([...this.raw.keys(), ...this.buffers.keys()])],
      decoded: [...this.buffers.keys()],
      failed: [...this.failed],
      playing: [...this.active.keys()],
      pending: [...this.pending],
    };
  }
}
export const audioManager = new AudioManager();
export const isMuted = () => audioManager.muted;
export const toggleMute = () => audioManager.toggleMute();
export const sound = (kind = "button") => audioManager.play(kind);
if (typeof window !== "undefined") {
  const gesture = (e) => {
    if (e.isTrusted) void audioManager.unlock();
  };
  window.addEventListener("pointerdown", gesture, {
    capture: true,
    passive: true,
  });
  window.addEventListener("keydown", gesture, { capture: true });
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (e.isTrusted && e.target.closest?.("[data-control]"))
        void sound("click");
    },
    { passive: true },
  );
  document.addEventListener("click", (e) => {
    const button = e.target.closest?.("button, #brand");
    if (
      e.isTrusted &&
      button &&
      !button.disabled &&
      !button.matches("[data-control]")
    )
      void sound("click");
  });
  window.addEventListener("blur", () => audioManager.stopAll());
  window.addEventListener("pagehide", () => audioManager.stopAll());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) audioManager.stopAll();
  });
}
