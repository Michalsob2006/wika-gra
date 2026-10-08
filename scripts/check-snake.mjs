import assert from "node:assert/strict";
import {
  makeSnake,
  requestDirection,
  stepSnake,
  elapse,
  items,
  spawnItem,
  COLS,
  ROWS,
  tickInterval,
  readBest,
  saveBest,
} from "../js/games/snake-state.js";
import { spawnRules } from "../js/games/snake-spawns.js";
assert.equal(COLS, 9);
assert.equal(ROWS, 12);
for (const info of items) {
  const s = makeSnake(() => 0.5);
  s.items = [{ x: 5, y: 6, type: info.type, expiresAt: 99 }];
  requestDirection(s, "right");
  assert.equal(stepSnake(s), "pickup");
  assert.equal(s.score, Math.max(0, info.points));
  assert.equal(s.body.length, 4 + info.growth);
}
const floor = makeSnake();
floor.score = 1;
floor.items = [{ x: 5, y: 6, type: "broken", expiresAt: 99 }];
requestDirection(floor, "right");
stepSnake(floor);
assert.equal(floor.score, 0);
const queued = makeSnake();
requestDirection(queued, "up");
assert.equal(requestDirection(queued, "down"), false);
requestDirection(queued, "left");
assert.deepEqual(queued.queue, ["up", "left"]);
const wall = makeSnake();
wall.body[0] = { x: 8, y: 6 };
requestDirection(wall, "right");
assert.equal(stepSnake(wall), "dead");
const frozen = JSON.stringify(wall);
elapse(wall, 9);
stepSnake(wall);
assert.equal(JSON.stringify(wall), frozen);
const self = makeSnake();
self.body = [
  { x: 3, y: 3 },
  { x: 3, y: 4 },
  { x: 4, y: 4 },
  { x: 4, y: 3 },
  { x: 4, y: 2 },
];
self.direction = "right";
self.status = "playing";
assert.equal(stepSnake(self), "dead");
const full = Array.from({ length: 108 }, (_, i) => ({
  x: i % 9,
  y: Math.floor(i / 9),
}));
assert.equal(spawnItem(full), null);
let seed = 123;
const rng = () => {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
};
const clock = makeSnake(rng);
clock.status = "playing";
let multi = false,
  gifts = 0,
  seen = new Set(),
  expired = 0;
for (let t = 0; t < 600; t += 0.1) {
  const before = new Set(clock.items.map((i) => i.id));
  elapse(clock, 0.1, rng);
  if (clock.items.some((i) => i.type !== "heart"))
    multi = multi || clock.items.some((i) => i.type === "heart");
  for (const i of clock.items)
    if (!seen.has(i.id)) {
      seen.add(i.id);
      if (i.type === "gift") gifts++;
    }
  for (const id of before) if (!clock.items.some((i) => i.id === id)) expired++;
  const occupied = new Set(
    [...clock.body, ...clock.items].map((p) => p.y * COLS + p.x),
  );
  assert.equal(occupied.size, clock.body.length + clock.items.length);
  assert.ok(clock.items.some((i) => i.type === "heart"));
  for (const [type, rule] of Object.entries(spawnRules))
    assert.ok(clock.items.filter((i) => i.type === type).length <= rule.max);
}
assert.ok(
  multi && expired > 30,
  "Ignoring every item still produces independent spawns and expiry",
);
assert.ok(gifts <= 20, "Gift rare: <=20 spawns in 10min");
assert.equal(clock.score, 0);
// Five complete rounds follow a legal Hamiltonian cycle, using the real spawn clocks.
const cycle = [{ x: 0, y: 0 }];
for (let y = 0; y < 12; y++) {
  const xs = Array.from({ length: 8 }, (_, i) => (y % 2 ? 8 - i : 1 + i));
  for (const x of xs) cycle.push({ x, y });
}
for (let y = 11; y > 0; y--) cycle.push({ x: 0, y });
const runs = [];
for (let round = 1; round <= 5; round++) {
  let n = round;
  const rand = () => {
    n = (1664525 * n + 1013904223) >>> 0;
    return n / 4294967296;
  };
  const s = makeSnake(rand);
  s.status = "playing";
  let seconds = 0,
    mixed = false;
  for (let k = 0; k < 3000 && s.status === "playing"; k++) {
    const head = s.body[0],
      i = cycle.findIndex((p) => p.x === head.x && p.y === head.y),
      next = cycle[(i + 1) % cycle.length],
      d =
        next.x > head.x
          ? "right"
          : next.x < head.x
            ? "left"
            : next.y > head.y
              ? "down"
              : "up";
    requestDirection(s, d);
    const dt = tickInterval(s);
    elapse(s, dt, rand);
    mixed = mixed || new Set(s.items.map((i) => i.type)).size > 1;
    stepSnake(s);
    seconds += dt;
  }
  assert.equal(s.status, "won");
  assert.ok(mixed);
  assert.ok(seconds > 20, "Bonuses do not trivialize the goal");
  runs.push({
    round,
    seconds: +seconds.toFixed(1),
    score: s.score,
    length: s.body.length,
  });
}
const map = new Map();
globalThis.localStorage = {
  getItem: (k) => map.get(k) || null,
  setItem: (k, v) => map.set(k, v),
};
assert.equal(readBest(), 0);
saveBest(22);
assert.equal(readBest(), 22);
globalThis.localStorage = {
  getItem: () => {
    throw Error();
  },
  setItem: () => {
    throw Error();
  },
};
assert.equal(readBest(), 0);
assert.equal(saveBest(4), false);
console.log(
  "Snake: 9×12, five full rounds, independent mixed spawns/expiry, rare gift, point floor, wall/self collision, queues, best storage.",
  { giftsIn600s: gifts, expired, runs },
);
