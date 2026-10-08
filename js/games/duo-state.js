import { duoLevels, DUO_WIDTH, DUO_HEIGHT } from "./duo-levels.js";
export const DUO_PHYSICS = {
  speed: 205,
  jump: 560,
  gravity: 1150,
  width: 34,
  height: 80,
};
export const overlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export function makeDuo(index = 0) {
  const level = structuredClone(duoLevels[index]);
  for (const p of [...level.platforms, ...level.bridges, ...level.lifts])
    p.oneWay = true;
  const s = {
    index,
    level,
    status: "playing",
    time: 0,
    resets: 0,
    flash: 0,
    reason: "",
    events: [],
    signals: {},
    geometryVersion: 0,
    players: level.starts.map((p) => ({
      ...p,
      w: DUO_PHYSICS.width,
      h: DUO_PHYSICS.height,
      vx: 0,
      vy: 0,
      grounded: false,
      support: null,
      coyote: 0,
      buffer: 0,
      facing: p.id === "wika" ? 1 : -1,
      pose: "idle",
      respawns: 0,
      invulnerable: 0,
    })),
    blocks: level.blocks.map((b) => ({
      ...b,
      vy: 0,
      grounded: false,
      support: null,
      safe: { x: b.x, y: b.y },
    })),
    lifts: level.lifts.map((l) => ({
      ...l,
      active: false,
      travel: 0,
      dx: 0,
      dy: 0,
    })),
    items: level.collectibles.map((c, i) => ({
      ...c,
      id: i,
      collected: false,
    })),
    levers: level.levers.map((l) => ({ ...l, on: false, near: false })),
    buttons: level.buttons.map((b) => ({ ...b, on: false })),
  };
  return s;
}
export const totalFor = (s, id) => s.items.filter((i) => i.owner === id).length;
export const collectedFor = (s, id) =>
  s.items.filter((i) => i.owner === id && i.collected).length;
export function readyAtDoor(s, p) {
  const d = s.level.doors.find((d) => d.owner === p.id);
  return (
    p.grounded &&
    Math.abs(p.y + p.h - d.y - d.h) < 4 &&
    p.x + p.w >= d.x - 1 &&
    p.x <= d.x + d.w + 1 &&
    collectedFor(s, p.id) === totalFor(s, p.id) &&
    (!d.control || s.signals[d.control])
  );
}
export function solids(s, includeBlocks = true) {
  return [
    ...s.level.platforms,
    ...s.level.bridges.filter((b) => s.signals[b.control]),
    ...s.lifts,
    ...s.level.gates.filter((g) => !s.signals[g.control]),
    ...(includeBlocks ? s.blocks : []),
  ];
}
const cache = new WeakMap();
function surfaces(s) {
  let c = cache.get(s);
  if (!c || c.version !== s.geometryVersion) {
    const world = solids(s, false);
    c = {
      version: s.geometryVersion,
      world,
      players: [...world, ...s.blocks],
      blocks: s.blocks.map((b) => [
        ...world,
        ...s.blocks.filter((a) => a !== b),
      ]),
    };
    cache.set(s, c);
  }
  return c;
}
function moveY(body, dt, world) {
  const bottom = body.y + body.h,
    top = body.y;
  body.vy = Math.min(750, body.vy + DUO_PHYSICS.gravity * dt);
  const next = body.y + body.vy * dt;
  let landed = null,
    ceiling = null;
  for (const r of world) {
    if (body.x + body.w <= r.x + 0.01 || body.x >= r.x + r.w - 0.01) continue;
    if (
      body.vy >= 0 &&
      bottom <= r.y + 1.5 &&
      next + body.h >= r.y &&
      (!landed ||
        r.y < landed.y ||
        (Math.abs(r.y - landed.y) < 0.001 && r.from !== undefined))
    )
      landed = r;
    else if (
      !r.oneWay &&
      body.vy < 0 &&
      top >= r.y + r.h - 1 &&
      next <= r.y + r.h &&
      (!ceiling || r.y + r.h > ceiling.y + ceiling.h)
    )
      ceiling = r;
  }
  body.y = landed ? landed.y - body.h : ceiling ? ceiling.y + ceiling.h : next;
  body.grounded = !!landed;
  body.support = landed?.id || null;
  if (landed || ceiling) body.vy = 0;
}
function push(s, b, amount, p, world) {
  let allowed = amount;
  for (const r of [...world, ...s.blocks]) {
    if (
      r === b ||
      r === p ||
      r.oneWay ||
      b.y + b.h <= r.y + 1 ||
      b.y >= r.y + r.h - 1
    )
      continue;
    if (amount > 0 && r.x >= b.x + b.w - 0.1)
      allowed = Math.min(allowed, Math.max(0, r.x - b.x - b.w));
    if (amount < 0 && r.x + r.w <= b.x + 0.1)
      allowed = Math.max(allowed, Math.min(0, r.x + r.w - b.x));
  }
  // A companion can be displaced, but never through a wall or another block.
  for (const other of s.players) {
    if (other === p) continue;
    const riding = other.grounded && other.support === b.id;
    if (!riding && (other.y + other.h <= b.y + 1 || other.y >= b.y + b.h - 1))
      continue;
    const gap = riding
      ? 0
      : amount > 0
        ? other.x - b.x - b.w
        : b.x - other.x - other.w;
    if (gap < -0.1) continue;
    let clearance =
      amount > 0 ? DUO_WIDTH - 20 - other.x - other.w : other.x - 20;
    for (const r of [...world, ...s.blocks]) {
      if (
        r === b ||
        r.oneWay ||
        other.y + other.h <= r.y + 1 ||
        other.y >= r.y + r.h - 1
      )
        continue;
      if (amount > 0 && r.x >= other.x + other.w - 0.1)
        clearance = Math.min(clearance, Math.max(0, r.x - other.x - other.w));
      if (amount < 0 && r.x + r.w <= other.x + 0.1)
        clearance = Math.min(clearance, Math.max(0, other.x - r.x - r.w));
    }
    allowed =
      amount > 0
        ? Math.min(allowed, gap + clearance)
        : Math.max(allowed, -gap - clearance);
  }
  const old = b.x;
  b.x = Math.max(
    b.minX ?? 20,
    Math.min(b.maxX ?? DUO_WIDTH - 20 - b.w, b.x + allowed),
  );
  const delta = b.x - old;
  // The other player is a companion, not an invisible wall. Move a contacted
  // companion aside, and carry standing riders with the box.
  for (const other of s.players) {
    if (other === p || !delta) continue;
    if (other.grounded && other.support === b.id) other.x += delta;
    else if (overlap(other, b)) other.x = delta > 0 ? b.x + b.w : b.x - other.w;
  }
  return delta;
}
function moveX(p, move, dt, s, c) {
  let amount = move * DUO_PHYSICS.speed * dt;
  const old = p.x;
  p.pose = move ? "walk" : "idle";
  if (move) p.facing = move;
  for (const b of s.blocks) {
    if (p.y + p.h <= b.y + 1 || p.y >= b.y + b.h - 1) continue;
    if (
      (amount > 0 && old + p.w <= b.x + 0.2 && old + p.w + amount > b.x) ||
      (amount < 0 && old >= b.x + b.w - 0.2 && old + amount < b.x + b.w)
    ) {
      const gap =
          amount > 0
            ? Math.max(0, b.x - old - p.w)
            : -Math.max(0, old - b.x - b.w),
        delta = push(
          s,
          b,
          Math.sign(amount) *
            Math.min(Math.abs(amount - gap), b.pushSpeed * dt),
          p,
          c.world,
        );
      amount = gap + delta;
      p.pose = "push";
    }
  }
  p.x += amount;
  for (const r of c.players) {
    if (r.oneWay || !overlap(p, r)) continue;
    if (amount > 0 && old + p.w <= r.x + 0.5) p.x = r.x - p.w;
    else if (amount < 0 && old >= r.x + r.w - 0.5) p.x = r.x + r.w;
  }
  p.x = Math.max(20, Math.min(DUO_WIDTH - 20 - p.w, p.x));
  p.vx = (p.x - old) / dt;
}
function setSignal(s, id, on) {
  if (!!s.signals[id] !== !!on) s.geometryVersion++;
  s.signals[id] = !!on;
}
export function leverZone(l) {
  return { x: l.x - 22, y: l.y - 84, w: 44, h: 84 };
}
function mechanisms(s, dt) {
  for (const b of s.buttons) {
    const held = [...s.players, ...s.blocks].some(
      (p) =>
        p.grounded &&
        p.x + p.w > b.x + 6 &&
        p.x < b.x + b.w - 6 &&
        Math.abs(p.y + p.h - b.y) < 1.6,
    );
    const on = held || (b.latch && b.on);
    if (on !== b.on) s.events.push("mechanism");
    b.on = on;
    setSignal(s, b.id, on);
  }
  for (const l of s.levers) {
    const p = s.players.find((p) => p.id === l.owner),
      zone = leverZone(l),
      near =
        p.grounded &&
        overlap(p, zone) &&
        Math.abs(p.x + p.w / 2 - l.x) < 27 &&
        Math.abs(p.y + p.h - l.y) < 2;
    const from = p.x + p.w / 2,
      y = l.y - 30;
    const line = {
      x: Math.min(from, l.x),
      y: y - 1,
      w: Math.max(1, Math.abs(from - l.x)),
      h: 2,
    };
    const wall = [
      ...s.level.gates.filter((g) => !s.signals[g.control]),
      ...s.blocks,
    ].some((r) => overlap(line, r));
    l.near = near && !wall;
    if (l.near && !l.on) {
      l.on = true;
      s.events.push("mechanism");
    }
    setSignal(s, l.id, l.on);
  }
  setSignal(
    s,
    "final-route",
    s.signals["blue-button"] || s.signals["pink-lever"],
  );
  for (const l of s.lifts) {
    const old = l.y;
    l.active = !!s.signals[l.control];
    if (l.active) {
      l.travel += l.speed * dt;
      const range = l.from - l.to,
        phase = l.travel % (2 * range);
      l.y = l.from - (phase <= range ? phase : 2 * range - phase);
    }
    l.dy = l.y - old;
    for (const body of [...s.players, ...s.blocks])
      if (body.grounded && body.support === l.id) {
        body.y += l.dy;
        body.x += l.dx;
      }
  }
}
function respawn(s, p, hazard) {
  const c = s.level.starts.find((start) => start.id === p.id);
  p.x = c.x;
  p.y = c.y;
  p.vx = p.vy = 0;
  p.buffer = p.coyote = 0;
  p.support = null;
  p.grounded = false;
  p.pose = "idle";
  p.invulnerable = 1;
  p.respawns++;
  s.resets++;
  s.flash = 0.45;
  s.reason = `${p.id === "wika" ? "Wika" : "Michał"}: ${hazard?.kind === "spikes" ? "kolce" : hazard ? "obcy kolor" : "upadek"} — spróbuj jeszcze raz.`;
  s.events.push("respawn");
}
function tick(s, dt, commands) {
  s.time += dt;
  s.flash = Math.max(0, s.flash - dt);
  mechanisms(s, dt);
  const c = surfaces(s);
  for (let i = 0; i < s.blocks.length; i++) {
    const b = s.blocks[i];
    moveY(b, dt, c.blocks[i]);
    // Coloured pools are player triggers painted over the floor edge. They are
    // deliberately absent from block physics, so a box cannot jitter or reset
    // while it is being pushed across a pool.
    if (b.y > DUO_HEIGHT + 80) {
      b.x = b.safe.x;
      b.y = b.safe.y;
      b.vy = 0;
      b.support = null;
      b.grounded = false;
      s.events.push("block-respawn");
    } else if (b.grounded && s.level.platforms.some((p) => p.id === b.support))
      b.safe = { x: b.x, y: b.y };
  }
  for (const p of s.players) {
    p.invulnerable = Math.max(0, p.invulnerable - dt);
    const command = commands[p.id] || {};
    p.coyote = p.grounded ? 0.1 : Math.max(0, p.coyote - dt);
    p.buffer = Math.max(0, p.buffer - dt);
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -DUO_PHYSICS.jump;
      p.buffer = p.coyote = 0;
      p.grounded = false;
      p.support = null;
      s.events.push("jump");
    }
    moveX(p, Math.sign(command.move || 0), dt, s, c);
    moveY(p, dt, c.players);
    if (!p.grounded) p.pose = "jump";
    const feet = { x: p.x + 3, y: p.y + p.h - 5, w: p.w - 6, h: 5 },
      hazard = s.level.hazards.find(
        (h) =>
          overlap(feet, h) &&
          (h.kind === "spikes" ||
            (h.kind === "pink" ? p.id !== "wika" : p.id !== "michal")),
      );
    if ((hazard && p.invulnerable <= 0) || p.y > DUO_HEIGHT + 80) {
      respawn(s, p, hazard);
      continue;
    }
    for (const item of s.items)
      if (!item.collected && item.owner === p.id && overlap(p, item)) {
        item.collected = true;
        s.events.push(p.id === "wika" ? "heart" : "diamond");
      }
  }
  if (s.players.every((p) => readyAtDoor(s, p))) {
    s.status = "complete";
    s.events.push("complete");
    return false;
  }
  return true;
}
export function stepDuo(s, seconds, commands = {}) {
  s.events = [];
  if (s.status !== "playing") return s.events;
  for (const p of s.players) if (commands[p.id]?.jump) p.buffer = 0.14;
  let left = Math.max(0, Math.min(seconds, 0.1));
  while (left > 1e-8) {
    const dt = Math.min(left, 1 / 120);
    left -= dt;
    if (!tick(s, dt, commands)) break;
  }
  return s.events;
}
