import {
  COLS,
  ROWS,
  items,
  initSpawns,
  advanceSpawns,
} from "./snake-spawns.js";
export { COLS, ROWS, items, spawnItem } from "./snake-spawns.js";
export const TARGET = 20;
export const directions = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};
const same = (a, b) => a.x === b.x && a.y === b.y;
export function makeSnake(random = Math.random) {
  const body = [
    { x: 4, y: 6 },
    { x: 3, y: 6 },
    { x: 2, y: 6 },
    { x: 1, y: 6 },
  ];
  const s = {
    body,
    previous: body.map((p) => ({ ...p })),
    direction: "right",
    queue: [],
    score: 0,
    growth: 0,
    status: "ready",
    pickup: null,
  };
  initSpawns(s, random);
  return s;
}

export function requestDirection(s, direction) {
  if (!directions[direction] || ["dead", "won"].includes(s.status))
    return false;
  const last = s.queue.at(-1) || s.direction,
    a = directions[last],
    b = directions[direction];
  if (a.x + b.x === 0 && a.y + b.y === 0) return false;
  if (last !== direction && s.queue.length < 2) s.queue.push(direction);
  s.status = "playing";
  return true;
}
export function tickInterval(s) {
  const base = [0.29, 0.245, 0.205, 0.175][
    Math.min(3, Math.floor(s.score / 5))
  ];
  return base;
}
export function elapse(s, dt, random = Math.random) {
  advanceSpawns(s, dt, random);
}
export function stepSnake(s, random = Math.random) {
  if (s.status !== "playing") return null;
  s.pickup = null;
  if (s.queue.length) s.direction = s.queue.shift();
  const d = directions[s.direction],
    head = { x: s.body[0].x + d.x, y: s.body[0].y + d.y };
  const collected = s.items.find((i) => same(head, i)),
    info = collected ? items.find((i) => i.type === collected.type) : null;
  const growing = s.growth + (info?.growth || 0) > 0;
  const blockers = growing ? s.body : s.body.slice(0, -1);
  if (
    head.x < 0 ||
    head.x >= COLS ||
    head.y < 0 ||
    head.y >= ROWS ||
    blockers.some((p) => same(p, head))
  ) {
    s.status = "dead";
    return "dead";
  }
  s.previous = s.body.map((p) => ({ ...p }));
  s.body.unshift(head);
  s.growth += info?.growth || 0;
  if (s.growth > 0) s.growth--;
  else s.body.pop();
  if (info) {
    s.score = Math.max(0, s.score + info.points);
    s.items = s.items.filter((i) => i !== collected);
    s.pickup = { ...head, ...info };
    if (s.score >= TARGET) {
      s.status = "won";
      s.items = [];
      return "won";
    }

    return "pickup";
  }
  return "move";
}
export const BEST_KEY = "wiki-love-snake-best-v1";
export function readBest() {
  try {
    const n = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}
export function saveBest(score) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
    return true;
  } catch {
    return false;
  }
}
