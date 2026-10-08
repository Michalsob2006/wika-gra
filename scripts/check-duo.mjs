import assert from "node:assert/strict";
import fs from "node:fs";
import {
  makeDuo,
  stepDuo,
  readyAtDoor,
  DUO_PHYSICS,
  leverZone,
} from "../js/games/duo-state.js";
import { duoLevels } from "../js/games/duo-levels.js";
import { DUO_SPRITES } from "../js/games/duo-sprite-config.js";
import { solveDuo } from "./duo-solutions.mjs";
const frames = (s, n, commands = {}) => {
  for (let i = 0; i < n; i++) stepDuo(s, 1 / 60, commands);
};
const results = [];
for (const fps of [30, 60, 120])
  for (const level of [0, 1]) {
    const r = solveDuo(level, 1 / fps),
      s = r.state;
    assert.equal(s.status, "complete");
    assert.equal(s.resets, 0);
    assert.ok(s.items.every((i) => i.collected));
    assert.ok(s.levers.every((l) => l.on));
    assert.ok(s.players.every((p) => readyAtDoor(s, p)));
    assert.ok(
      s.blocks.some(
        (b) => Math.abs(b.x - s.level.blocks.find((r) => r.id === b.id).x) > 30,
      ),
    );
    if (level === 1) {
      const changes = r.blockTrace
        .slice(1)
        .map((x, position) => x - r.blockTrace[position]);
      assert.ok(changes.some((change) => change > 0.01));
      assert.ok(changes.some((change) => change < -0.01));
    }
    results.push({
      level: level + 1,
      fps,
      seconds: +s.time.toFixed(2),
      hearts: s.items.filter((i) => i.owner === "wika").length,
      diamonds: s.items.filter((i) => i.owner === "michal").length,
    });
  }
// Every hazard for each person: only the hit person respawns; progress/mechanisms survive.
for (const index of [0, 1])
  for (const h of duoLevels[index].hazards)
    for (const id of ["wika", "michal"]) {
      const s = makeDuo(index),
        p = s.players.find((p) => p.id === id),
        other = s.players.find((p) => p.id !== id);
      frames(s, 3);
      const otherBefore = { x: other.x, y: other.y };
      s.items[0].collected = true;
      s.levers[0].on = true;
      p.x = h.x + 3;
      p.y = h.y + 7 - p.h;
      p.vy = 0;
      stepDuo(s, 0.02);
      const safe =
        (h.kind === "pink" && id === "wika") ||
        (h.kind === "blue" && id === "michal");
      assert.equal(p.respawns, safe ? 0 : 1, `${index} ${id} ${h.kind}`);
      assert.equal(s.resets, safe ? 0 : 1);
      assert.equal(other.x, otherBefore.x);
      assert.equal(other.y, otherBefore.y);
      assert.ok(s.items[0].collected && s.levers[0].on);
      if (!safe) {
        assert.equal(p.x, s.level.starts.find((start) => start.id === id).x);
        assert.ok(
          Math.abs(p.y - s.level.starts.find((start) => start.id === id).y) < 1,
        );
      }
    }
// A lever's small grounded trigger never respawns its owner, even after many entries.
for (const index of [0, 1])
  for (const config of duoLevels[index].levers) {
    const s = makeDuo(index),
      p = s.players.find((p) => p.id === config.owner);
    p.x = config.x - p.w / 2;
    p.y = config.y - p.h;
    frames(s, 5);
    assert.ok(s.levers.find((l) => l.id === config.id).on);
    assert.equal(p.respawns, 0);
    const zone = leverZone(config);
    assert.ok(
      !s.level.hazards.some(
        (h) =>
          zone.y + zone.h > h.y &&
          zone.y < h.y + h.h &&
          zone.x < h.x + h.w &&
          zone.x + zone.w > h.x,
      ),
      `${config.id}: safe trigger`,
    );
    const far = makeDuo(index),
      fp = far.players.find((p) => p.id === config.owner);
    fp.x = config.x + 90;
    fp.y = config.y - fp.h;
    frames(far, 3);
    assert.equal(far.levers.find((l) => l.id === config.id).on, false);
    const wall = makeDuo(index),
      wp = wall.players.find((p) => p.id === config.owner);
    wp.x = config.x - 40;
    wp.y = config.y - wp.h;
    wall.level.gates.push({
      id: "test-wall",
      x: config.x - 9,
      y: config.y - 80,
      w: 8,
      h: 80,
      control: "never",
    });
    frames(wall, 3);
    assert.equal(wall.levers.find((l) => l.id === config.id).on, false);
  }
// Blocks have gravity and bounded push motion. Player-only hazard triggers must
// never reset, block or jitter a box resting on solid ground.
for (const index of [0, 1])
  for (const original of duoLevels[index].blocks) {
    const s = makeDuo(index),
      b = s.blocks.find((b) => b.id === original.id);
    b.y -= 60;
    frames(s, 120);
    assert.ok(b.grounded && Math.abs(b.y - original.y) < 0.01);
    assert.ok(b.h < DUO_PHYSICS.jump ** 2 / (2 * DUO_PHYSICS.gravity));
    const h = s.level.hazards.find((h) => h.y + 7 === 610);
    if (h) {
      b.x = h.x;
      b.y = 610 - b.h;
      b.grounded = true;
      b.support = "workshop";
      const x = b.x;
      frames(s, 10);
      assert.ok(Math.abs(b.x - x) < 0.01 && Math.abs(b.y + b.h - 610) < 0.01);
      assert.equal(s.events.includes("block-respawn"), false);
    }
    assert.ok(b.minX >= 20 && b.maxX + b.w <= 1180);
  }

// The level-two crate crosses the coloured pool overlay smoothly at all target FPS.
for (const fps of [30, 60, 120]) {
  const s = makeDuo(1),
    b = s.blocks.find((b) => b.id === "crate"),
    w = s.players.find((p) => p.id === "wika");
  b.x = 275;
  b.y = 610 - b.h;
  b.minX = 20;
  b.maxX = 500;
  b.grounded = true;
  b.support = "workshop";
  w.x = b.x - w.w;
  w.y = 610 - w.h;
  w.grounded = true;
  w.support = "workshop";
  let previous = b.x;
  for (let frame = 0; frame < fps * 0.5; frame++) {
    stepDuo(s, 1 / fps, { wika: { move: 1 } });
    assert.ok(b.x >= previous - 0.001, "box moved backwards over hazard");
    assert.ok(b.x - previous <= b.pushSpeed / fps + 0.001, "box jitter step");
    previous = b.x;
  }
  assert.ok(b.x > 315, "box did not cross blue pool");
  assert.equal(s.events.includes("block-respawn"), false);
}
// Pressure plates need grounded contact, including a parked box; latch stays on deliberately.
for (const index of [0, 1])
  for (const config of duoLevels[index].buttons) {
    const s = makeDuo(index),
      p = s.players.find((p) => p.id === config.owner);
    p.x = config.x + 8;
    p.y = config.y - p.h;
    frames(s, 3);
    assert.ok(s.signals[config.id]);
    p.x = config.x + 200;
    p.y = 10;
    p.vy = 0;
    frames(s, 2);
    assert.equal(s.signals[config.id], config.latch);
    const airborne = makeDuo(index),
      a = airborne.players.find((p) => p.id === config.owner);
    a.x = config.x + 10;
    a.y = config.y - a.h - 25;
    frames(airborne, 1);
    assert.equal(airborne.signals[config.id], false);
    const boxed = makeDuo(index),
      b = boxed.blocks[0];
    b.x = config.x + 5;
    b.y = config.y - b.h;
    frames(boxed, 3);
    assert.ok(boxed.signals[config.id]);
  }
// Riders retain the moving surface through direction changes (one complete cycle).
for (const index of [0, 1])
  for (const id of ["wika", "michal"])
    for (const lc of duoLevels[index].lifts) {
      const s = makeDuo(index),
        l = s.lifts.find((l) => l.id === lc.id),
        p = s.players.find((p) => p.id === id);
      s.levers.find((r) => r.id === l.control).on = true;
      p.x = l.x + 35;
      p.y = l.y - p.h;
      p.grounded = true;
      p.support = l.id;
      for (
        let frame = 0;
        frame < Math.ceil((((l.from - l.to) * 2) / l.speed) * 60);
        frame++
      ) {
        const oldY = p.y,
          oldLift = l.y;
        stepDuo(s, 1 / 60);
        if (p.support === l.id) {
          assert.ok(Math.abs(p.y + p.h - l.y) < 0.01);
          assert.ok(Math.abs(p.y - oldY) < 2.5);
        }
        assert.equal(p.respawns, 0);
      }
    }
const pause = makeDuo();
pause.status = "paused";
const snapshot = JSON.stringify(pause);
frames(pause, 50, { wika: { move: 1, jump: true } });
assert.equal(JSON.stringify(pause), snapshot);
for (const [key, anchor] of Object.entries(DUO_SPRITES)) {
  assert.ok(
    anchor.x > 0 && anchor.x < 1 && anchor.y > 0.9 && anchor.y <= 1,
    key,
  );
}
assert.equal(
  duoLevels[1].collectibles.filter((i) => i.owner === "wika").length,
  5,
);
assert.equal(
  duoLevels[1].collectibles.filter((i) => i.owner === "michal").length,
  5,
);
assert.ok(fs.existsSync("assets/duo/v2/cover.webp"));
const lowerHeavy = duoLevels[1].blocks.find((block) => block.id === "stone");
assert.ok(lowerHeavy.minX <= 875 && lowerHeavy.maxX - lowerHeavy.minX >= 190);
assert.equal(
  duoLevels[1].hazards.some(
    (hazard) =>
      ["pink", "blue"].includes(hazard.kind) &&
      hazard.y + 7 === 610 &&
      hazard.x < lowerHeavy.maxX + lowerHeavy.w + 1 &&
      hazard.x + hazard.w > lowerHeavy.minX - 50,
  ),
  false,
);
console.log(
  "Duo v2: six complete input-only walkthroughs, individual start respawn, retained progress, safe lever triggers, walls, grounded plates, gravity/recovery, lift riders, anchors, pause.",
  results,
);

// A passive companion beside the crate must not act as an invisible wall.
for (const fps of [30, 60, 120]) {
  const s = makeDuo(1),
    b = s.blocks[0],
    [w, m] = s.players;
  w.x = b.x - w.w;
  w.y = 340 - w.h;
  m.x = b.x + b.w;
  m.y = 340 - m.h;
  let previous = b.x;
  for (let i = 0; i < fps * 0.4; i++) {
    stepDuo(s, 1 / fps, { wika: { move: 1 } });
    assert.ok(b.x >= previous && b.x - previous <= b.pushSpeed / fps + 0.001);
    assert.equal(b.y, 276);
    previous = b.x;
  }
  assert.ok(b.x > 220);
  assert.ok(m.x >= b.x + b.w - 0.001);
  assert.ok(!("checkpoint" in w) && !("checkpoints" in s.level));
}

const blocked = makeDuo(1),
  crate = blocked.blocks[0],
  [pusher, companion] = blocked.players;
pusher.x = crate.x - pusher.w;
pusher.y = 260;
companion.x = crate.x + crate.w;
companion.y = 260;
blocked.level.gates.push({
  id: "solid-wall",
  x: 310,
  y: 250,
  w: 20,
  h: 90,
  control: "never",
});
frames(blocked, 120, { wika: { move: 1 } });
assert.ok(crate.x <= 204.001 && companion.x + companion.w <= 310.001);
assert.equal(crate.y, 276);
