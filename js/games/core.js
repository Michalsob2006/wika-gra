import { images } from "../preload.js";
export const W = 720,
  H = 480;
// Store each frequently used render size once, rather than resampling the
// original image on every animation frame. Bounded cache survives game switches.
const sprites = new Map();
export function drawImage(ctx, key, x, y, w, h, flip = false, angle = 0) {
  const img = images[key];
  if (!img) return;
  const fillsBounds = ["platform", "hedge", "hedgeVertical"].includes(key);
  const scale = Math.min(w / img.width, h / img.height),
    width = Math.max(1, Math.round(fillsBounds ? w : img.width * scale)),
    height = Math.max(1, Math.round(fillsBounds ? h : img.height * scale));
  const cacheKey = `${key}:${width}:${height}`;
  let sprite = sprites.get(cacheKey);
  if (!sprite) {
    sprite = document.createElement("canvas");
    sprite.width = width;
    sprite.height = height;
    sprite.assetKey = key;
    const painter = sprite.getContext("2d");
    if (key === "platform") {
      // Tile the long ground artwork so visible terrain matches the collider,
      // including wide platforms, without stretching a single island.
      const tiles = Math.ceil(width / 210),
        part = width / tiles;
      for (let i = 0; i < tiles; i++)
        painter.drawImage(img, i * part, 0, part + 1, height);
    } else painter.drawImage(img, 0, 0, width, height);
    if (sprites.size >= 128) sprites.delete(sprites.keys().next().value);
    sprites.set(cacheKey, sprite);
  }
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  if (angle) ctx.rotate(angle);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(sprite, -width / 2, -height / 2);
  ctx.restore();
}
let landscape;

export function background(ctx, time = 0) {
  if (!landscape) {
    landscape = document.createElement("canvas");
    landscape.width = W;
    landscape.height = H;
    const bg = landscape.getContext("2d");
    bg.fillStyle = "#eaf4f8";
    bg.fillRect(0, 0, W, H);
    drawImage(bg, "village", 0, 345, W, 110);
    bg.fillStyle = "#f5eee2";
    bg.fillRect(0, 445, W, 35);
  }
  ctx.drawImage(landscape, 0, 0);
  drawImage(ctx, "cloud", 45 + Math.sin(time * 0.1) * 8, 35, 155, 65);
  drawImage(ctx, "cloud", 490, 55, 130, 55);
}

export function input(root) {
  const keys = new Set(),
    keyboard = new Map(),
    pointers = new Map();
  const names = {
    ArrowLeft: "left",
    a: "left",
    A: "left",
    ArrowRight: "right",
    d: "right",
    D: "right",
    ArrowUp: "up",
    w: "up",
    W: "up",
    " ": "jump",
    ArrowDown: "down",
    s: "down",
    S: "down",
  };
  const buttons = [...root.querySelectorAll("[data-control]")];
  const sync = () => {
    keys.clear();
    for (const name of keyboard.values()) keys.add(name);
    for (const { name } of pointers.values()) keys.add(name);
    for (const b of buttons)
      b.classList.toggle(
        "held",
        [...pointers.values()].some((p) => p.button === b),
      );
  };
  const down = (e) => {
    if (names[e.key] && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      keyboard.set(e.code || e.key, names[e.key]);
      sync();
    }
  };
  const up = (e) => {
    keyboard.delete(e.code || e.key);
    sync();
  };
  const clear = () => {
    keyboard.clear();
    pointers.clear();
    sync();
  };
  const press = (e) => {
    e.preventDefault();
    const b = e.currentTarget;
    pointers.set(e.pointerId, { name: b.dataset.control, button: b });
    try {
      b.setPointerCapture(e.pointerId);
    } catch {}
    sync();
  };
  const release = (e) => {
    pointers.delete(e.pointerId);
    sync();
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", clear);
  window.addEventListener("gameinputclear", clear);
  document.addEventListener("visibilitychange", clear);
  for (const b of buttons) {
    b.addEventListener("pointerdown", press);
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      b.addEventListener(type, release);
  }
  return {
    keys,
    clear,
    destroy() {
      clear();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      window.removeEventListener("gameinputclear", clear);
      document.removeEventListener("visibilitychange", clear);
      for (const b of buttons) {
        b.removeEventListener("pointerdown", press);
        for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
          b.removeEventListener(type, release);
      }
    },
  };
}
export function loop(update, draw) {
  let frame,
    last = performance.now(),
    time = 0,
    running = true;
  function tick(now) {
    if (!running) return;
    const dt = Math.max(0, Math.min((now - last) / 1000, 0.032));
    last = now;
    if (
      !document.hidden &&
      !document.body.classList.contains("game-paused") &&
      !document.body.classList.contains("game-rotate")
    ) {
      time += dt;
      update(dt, time);
      if (!running) return;
      draw(time);
    }
    if (running) frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
  return () => {
    running = false;
    cancelAnimationFrame(frame);
  };
}
export function overlaps(a, b) {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}
