import {
  makeHuntMap,
  availableDirections,
  neighbor,
  cellCenter,
  huntPath,
} from "./gift-hunt-map.js";
function actor(map, cell, speed) {
  return {
    cell,
    target: null,
    progress: 0,
    direction: -1,
    speed,
    ...cellCenter(map, cell),
  };
}
export function makeHunt({ random = Math.random } = {}) {
  const map = makeHuntMap(),
    item = (key, label, cell) => ({
      key,
      label,
      cell,
      collected: false,
      ...cellCenter(map, cell),
    });
  const reserved = new Set([map.start, 16, 28, 136, 148]);
  const corridor = huntPath(map, map.start, 16);
  const all = [
    ...new Set([
      ...corridor,
      ...map.cells.flatMap((open, id) => (open ? [id] : [])),
    ]),
  ].filter((id) => !reserved.has(id));
  const smallHearts = Array.from({ length: 24 }, (_, i) => ({
    cell: all[Math.floor((i * all.length) / 24)],
    collected: false,
  }));
  return {
    map,
    random,
    player: actor(map, map.start, 3.5),
    time: 0,
    inputDirection: -1,
    queuedDirection: -1,
    invulnerable: 0,
    knockback: 0,
    hits: 0,
    lives: 3,
    gameOver: false,
    score: 0,
    giftActive: false,
    opened: false,
    effects: [],
    smallHearts,
    items: [
      item("letter", "List", 16),
      item("bouquet", "Bukiet", 28),
      item("key", "Klucz", 136),
    ],
    gift: { cell: 148, ...cellCenter(map, 148) },
    hazards: [
      actor(map, 48, 2.1),
      actor(map, 56, 2.3),
      actor(map, 109, 2.15),
      actor(map, 146, 3.05),
    ],
  };
}
function updatePosition(map, a) {
  const from = cellCenter(map, a.cell),
    to = a.target === null ? from : cellCenter(map, a.target);
  a.x = from.x + (to.x - from.x) * a.progress;
  a.y = from.y + (to.y - from.y) * a.progress;
}
function reverse(a) {
  if (a.target !== null) {
    const old = a.cell;
    a.cell = a.target;
    a.target = old;
    a.progress = 1 - a.progress;
  }
  a.direction = (a.direction + 2) % 4;
}
export function queueHuntTurn(state, direction) {
  if (direction < 0 || state.gameOver) return;
  state.queuedDirection = direction;
  if (
    state.knockback <= 0 &&
    state.player.target !== null &&
    direction === (state.player.direction + 2) % 4
  )
    reverse(state.player);
}
function moveActor(map, a, distance, choose, onArrival) {
  let remaining = distance;
  while (remaining > 1e-8) {
    if (a.target === null) {
      const direction = choose(a, availableDirections(map, a.cell));
      if (direction < 0) return;
      a.direction = direction;
      a.target = neighbor(map, a.cell, direction);
      a.progress = 0;
    }
    const step = Math.min(1 - a.progress, remaining);
    a.progress += step;
    remaining -= step;
    if (a.progress >= 1 - 1e-8) {
      a.cell = a.target;
      a.target = null;
      a.progress = 0;
      updatePosition(map, a);
      if (onArrival && onArrival() === false) return;
    }
    updatePosition(map, a);
  }
}
export function updateHazards(state, dt) {
  for (const h of state.hazards)
    moveActor(state.map, h, h.speed * dt, (a, options) => {
      const forward = options.filter(
          (d) => a.direction < 0 || d !== (a.direction + 2) % 4,
        ),
        choices = forward.length ? forward : options;
      return choices.length
        ? choices[Math.floor(state.random() * choices.length)]
        : -1;
    });
}
function collect(state, events) {
  const p = state.player;
  if (p.target !== null) return;
  for (const item of state.items)
    if (!item.collected && p.cell === item.cell) {
      item.collected = true;
      events.push("collect");
      state.effects.push({ key: item.key, cell: item.cell, age: 0 });
    }
  for (const heart of state.smallHearts)
    if (!heart.collected && p.cell === heart.cell) {
      heart.collected = true;
      state.score++;
      events.push("heart");
      state.effects.push({ key: "heart", cell: heart.cell, age: 0 });
    }
  state.giftActive = state.items.every((i) => i.collected);
  if (state.giftActive && p.cell === state.gift.cell) {
    state.opened = true;
    events.push("win");
  }
}
function hit(state, h) {
  const p = state.player;
  state.invulnerable = 1;
  state.knockback = 0.2;
  state.hits++;
  state.lives = Math.max(0, state.lives - 1);
  if (p.target !== null) reverse(p);
  const options = availableDirections(state.map, p.cell),
    away = options.sort((a, b) => {
      const aa = cellCenter(state.map, neighbor(state.map, p.cell, a)),
        bb = cellCenter(state.map, neighbor(state.map, p.cell, b));
      return (
        Math.hypot(bb.x - h.x, bb.y - h.y) - Math.hypot(aa.x - h.x, aa.y - h.y)
      );
    });
  state.knockDirection = p.target !== null ? p.direction : (away[0] ?? -1);
  const index = state.hazards.indexOf(h);
  if (index >= 0) state.hazards.splice(index, 1);
  if (state.lives === 0) state.gameOver = true;
}
export function stepHunt(state, dt, dx = 0, dy = 0) {
  if (state.opened || state.gameOver) return [];
  const events = [];
  const requested = dx < 0 ? 3 : dx > 0 ? 1 : dy < 0 ? 0 : dy > 0 ? 2 : -1;
  if (requested !== state.inputDirection) {
    state.inputDirection = requested;
    if (requested >= 0) queueHuntTurn(state, requested);
  }
  // Small substeps keep collisions and cell arrival reliable during slower frames.
  let remaining = Math.min(dt, 0.25);
  while (remaining > 1e-8 && !state.opened && !state.gameOver) {
    const step = Math.min(remaining, 0.016);
    remaining -= step;
    state.time += step;
    state.invulnerable = Math.max(0, state.invulnerable - step);
    updateHazards(state, step);
    const knocking = state.knockback > 0;
    state.knockback = Math.max(0, state.knockback - step);
    moveActor(
      state.map,
      state.player,
      (knocking ? 5 : state.player.speed) * step,
      (a, options) => {
        if (knocking)
          return options.includes(state.knockDirection)
            ? state.knockDirection
            : -1;
        if (options.includes(state.queuedDirection))
          return state.queuedDirection;
        return options.includes(a.direction) ? a.direction : -1;
      },
      () => {
        collect(state, events);
        return !state.opened;
      },
    );
    collect(state, events);
    if (!state.opened && state.invulnerable <= 0) {
      const hazard = state.hazards.find(
        (h) =>
          Math.hypot(h.x - state.player.x, h.y - state.player.y) <
          state.map.tile * 0.43,
      );
      if (hazard) {
        hit(state, hazard);
        events.push("hit");
        if (state.gameOver) events.push("game-over");
      }
    }
    for (const effect of state.effects) effect.age += step;
    state.effects = state.effects.filter((e) => e.age < 0.55);
  }
  return events;
}
