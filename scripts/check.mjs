import assert from "node:assert/strict";
import fs from "node:fs";
import { assets } from "../js/assetConfig.js";
import {
  generateMazeLevel,
  pathTo,
  nearestHint,
} from "../js/games/maze-map.js";
import {
  makeLevel,
  makePlayer,
  advancePlatforms,
  stepPlayer,
  canFinishRunner,
} from "../js/games/runner-physics.js";
import { checkGiftHunt } from "./check-gift-hunt.mjs";
import { memoryCards, memoryLevels } from "../js/memory-config.js";
import { shuffle } from "../js/games/memory.js";
import {
  collectionComplete,
  mainGameIds,
  readMemoryLevels,
  readProgress,
  saveProgress,
  questUnlocked,
} from "../js/storage.js";
for (const path of Object.values(assets)) assert.ok(fs.existsSync(path), path);
for (let seed = 1; seed <= 100; seed++) {
  let n = seed;
  const rng = () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
  for (const level of [1, 2]) {
    const m = generateMazeLevel(level, rng);
    for (let i = 0; i < m.cells.length; i++)
      assert.ok(pathTo(m, m.start, i).length);
    const route = new Set(pathTo(m, m.start, m.finish));
    if (level === 2) {
      assert.equal(m.cols, 17);
      assert.equal(m.rows, 13);
      assert.ok(
        m.hearts.every(
          (id) =>
            !route.has(id) && m.cells[id].walls.filter((w) => !w).length === 1,
        ),
      );
    }
    const hint = nearestHint(m, m.start, new Set());
    assert.ok(pathTo(m, m.start, hint).length <= 2);
  }
}
const l = makeLevel(),
  p = makePlayer(l);
assert.equal(l.platforms.length, 16);
assert.equal(l.hearts.length, 7);
assert.equal(l.platforms.filter((s) => s.type === "moving").length, 2);
assert.equal(l.platforms.filter((s) => s.type === "falling").length, 2);
let falls = 0,
  frames = 0;
for (; frames < 12000 && p.x < l.width - 160; frames++) {
  advancePlatforms(l, 1 / 60);
  const s = l.platforms.find(
      (s) => s.active && p.x + p.w > s.x && p.x < s.x + s.w,
    ),
    crate = l.crates.find((c) => c.x > p.x && c.x - p.x < 75);
  const jump = p.grounded && ((s && p.x > s.x + s.w - 35) || !!crate);
  if (stepPlayer(p, l, 1 / 60, 1, jump)) falls++;
  for (const h of l.hearts)
    if (
      p.x < h.x + h.w &&
      p.x + p.w > h.x &&
      p.y < h.y + h.h &&
      p.y + p.h > h.y
    )
      h.collected = true;
}
assert.ok(p.x > l.width - 170, "Runner finish unreachable");
assert.equal(falls, 0);
assert.equal(p.checkpoint.id, 8);
assert.equal(canFinishRunner(p, l), true);
l.hearts.forEach((h) => (h.collected = false));
assert.equal(canFinishRunner(p, l), false);
l.hearts.slice(0, 4).forEach((h) => (h.collected = true));
assert.equal(canFinishRunner(p, l), false);
l.hearts[4].collected = true;
assert.equal(canFinishRunner(p, l), true);
p.y = 900;
assert.equal(stepPlayer(p, l, 1 / 60, 0, false), true);
assert.equal(p.x, p.checkpoint.x);
assert.equal(p.y, p.checkpoint.y);
const moving = l.platforms.find((s) => s.type === "moving"),
  oldY = moving.y;
advancePlatforms(l, 0.1);
assert.notEqual(moving.y, oldY);
p.x = moving.x + 50;
p.y = oldY - p.h;
p.grounded = true;
p.supportId = moving.id;
stepPlayer(p, l, 0.001, 0, false);
assert.ok(
  Math.abs(p.y + p.h - moving.y) < 0.01,
  "Player must ride moving platform",
);
const fragile = l.platforms.find((s) => s.type === "falling");
fragile.fallTime = 0.01;
advancePlatforms(l, 1.2);
assert.ok(fragile.y > fragile.baseY);
for (let i = 0; i < 400; i++) advancePlatforms(l, 1 / 60);
assert.equal(fragile.y, fragile.baseY);
assert.equal(fragile.active, true);
console.log("Gift Hunt grid:", checkGiftHunt());
assert.equal(questUnlocked(["catcher", "maze", "runner"]), false);
assert.equal(questUnlocked(["catcher", "maze", "runner", "memory"]), false);
assert.equal(shuffle(memoryCards.flatMap((c) => [c, c])).length, 16);
assert.deepEqual(mainGameIds, [
  "catcher",
  "maze",
  "runner",
  "memory",
  "snake",
  "quest",
]);
assert.equal(memoryLevels[1].images.length, 8);
assert.equal(new Set(memoryLevels[1].images.map((photo) => photo.src)).size, 8);
assert.ok(
  memoryLevels[1].images.every(
    (photo, index) =>
      photo.src === `assets/photos/memory/photo${index + 1}.webp`,
  ),
);
assert.equal(collectionComplete([...mainGameIds.slice(0, 5), "duo"]), false);
assert.equal(collectionComplete(mainGameIds), true);
const memoryStorage = new Map([
  [
    "wiki-anniversary-v1",
    JSON.stringify(["catcher", "memory", "duo", "unknown"]),
  ],
]);
globalThis.localStorage = {
  getItem: (key) => memoryStorage.get(key) ?? null,
  setItem: (key, value) => memoryStorage.set(key, String(value)),
};
assert.deepEqual(readProgress(), ["catcher", "memory", "duo"]);
assert.deepEqual(JSON.parse(memoryStorage.get("wiki-anniversary-main-v2")), [
  "catcher",
  "memory",
]);
assert.deepEqual(JSON.parse(memoryStorage.get("wiki-anniversary-bonus-v1")), [
  "duo",
]);
assert.deepEqual(readMemoryLevels(), [1]);
assert.equal(saveProgress([...mainGameIds, "duo"]), true);
assert.equal(
  JSON.parse(memoryStorage.get("wiki-anniversary-main-v2")).length,
  6,
);
delete globalThis.localStorage;
console.log(
  `OK: optimized asset paths; 200 connected mazes with branch hearts; runner ${frames / 60}s, 0 falls, checkpoint, moving/falling platforms, 5-heart gate; Gift Hunt items, lock, collisions, invulnerability; existing unlock and Memory.`,
);

assert.equal(
  questUnlocked(["catcher", "maze", "runner", "memory", "snake", "duo"]),
  true,
);
await import("./check-snake.mjs");

await import("./check-audio.mjs");

await import("./check-dash.mjs");

await import("./check-duo.mjs");

await import("./check-catcher.mjs");
