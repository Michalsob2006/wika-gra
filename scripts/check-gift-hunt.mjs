import assert from "node:assert/strict";
import {
  makeHunt,
  stepHunt,
  queueHuntTurn,
} from "../js/games/gift-hunt-state.js";
import {
  availableDirections,
  huntPath,
  neighbor,
  cellCenter,
} from "../js/games/gift-hunt-map.js";
export function checkGiftHunt() {
  const s = makeHunt({ random: () => 0.4 }),
    m = s.map,
    open = m.cells.flatMap((v, i) => (v ? [i] : []));
  assert.equal(m.cols, 15);
  assert.equal(m.rows, 11);
  assert.equal(s.smallHearts.length, 24);
  assert.equal(new Set(s.smallHearts.map((h) => h.cell)).size, 24);
  assert.equal(s.hazards.length, 4);
  assert.equal(s.lives, 3);
  assert.equal(s.gameOver, false);
  for (const cell of open)
    assert.ok(huntPath(m, m.start, cell).length, "Disconnected corridor");
  for (const o of [...s.items, s.gift])
    assert.ok(huntPath(m, m.start, o.cell).length);
  // A broken heart's current cell never seals the sole route to a main goal.
  for (const hazard of s.hazards) {
    const reachable = reachableWithout(m, m.start, hazard.cell);
    assert.ok(
      [...s.items, s.gift].every((target) => reachable.has(target.cell)),
      `Hazard ${hazard.cell} blocks the only route`,
    );
  }
  const junctions = open.filter(
      (c) => availableDirections(m, c).length >= 3,
    ).length,
    deadEnds = open.filter(
      (c) => availableDirections(m, c).length === 1,
    ).length,
    cycles =
      open.reduce((n, c) => n + availableDirections(m, c).length, 0) / 2 -
      open.length +
      1;
  assert.ok(junctions >= 5 && deadEnds >= 3 && cycles >= 3);
  for (const a of s.items)
    for (const b of s.items)
      if (a !== b) {
        const route = huntPath(m, a.cell, b.cell);
        assert.ok(route.length > 10);
        const directions = route.slice(1).map((cell, i) => cell - route[i]);
        assert.ok(new Set(directions).size > 1, "Straight item-to-item route");
      }
  for (let y = 0; y < m.rows - 1; y++)
    for (let x = 0; x < m.cols - 1; x++) {
      const id = y * m.cols + x;
      assert.ok(
        ![id, id + 1, id + m.cols, id + m.cols + 1].every((c) => m.cells[c]),
        "Corridor widened into a room",
      );
    }
  // Buffered turn: press the next direction while still between cells.
  const route = huntPath(m, s.player.cell, s.items[0].cell);
  s.hazards = [];
  queueHuntTurn(s, direction(m, route[0], route[1]));
  stepHunt(s, 0.1);
  assert.notEqual(s.player.target, null);
  const turn = direction(m, route[1], route[2]);
  queueHuntTurn(s, turn);
  for (let i = 0; i < 30; i++) stepHunt(s, 1 / 60);
  assert.ok(s.player.cell !== route[0]);
  function travel(state, goal) {
    for (let i = 0; i < 6000; i++) {
      if (state.opened || state.items.find((o) => o.cell === goal)?.collected)
        return;
      const p = state.player,
        path = huntPath(state.map, p.target ?? p.cell, goal);
      if (path.length > 1)
        queueHuntTurn(state, direction(state.map, path[0], path[1]));
      stepHunt(state, 1 / 60);
    }
    throw Error("Failed to reach " + goal);
  }
  const game = makeHunt();
  game.hazards = [];
  place(game, game.gift.cell);
  stepHunt(game, 0.016);
  assert.equal(game.opened, false);
  place(game, game.map.start);
  for (let i = 0; i < 3; i++) {
    travel(game, game.items[i].cell);
    assert.equal(game.giftActive, i === 2);
  }
  travel(game, game.gift.cell);
  assert.ok(game.opened);
  assert.ok(game.score > 0);
  assert.equal(game.score, game.smallHearts.filter((h) => h.collected).length);
  const optional = makeHunt();
  optional.hazards = [];
  optional.items.forEach((item) => (item.collected = true));
  place(optional, optional.gift.cell);
  stepHunt(optional, 0.016);
  assert.equal(optional.score, 0);
  assert.equal(optional.opened, true, "Small hearts must remain optional");
  // At a dead end, an unavailable turn cannot cross a wall.
  const blocked = makeHunt();
  blocked.hazards = [];
  place(blocked, 16);
  const wallDirection = [0, 1, 2, 3].find(
    (d) => !availableDirections(blocked.map, 16).includes(d),
  );
  queueHuntTurn(blocked, wallDirection);
  for (let i = 0; i < 100; i++) stepHunt(blocked, 1 / 60);
  assert.equal(blocked.player.cell, 16);
  assert.equal(blocked.player.target, null);
  // Enemy motion always occupies a legal cell or edge, over many random turns.
  const enemies = makeHunt();
  for (let frame = 0; frame < 12000; frame++) {
    stepHunt(enemies, 1 / 60);
    for (const a of [enemies.player, ...enemies.hazards]) {
      assert.ok(enemies.map.cells[a.cell]);
      if (a.target !== null) {
        assert.ok(enemies.map.cells[a.target]);
        assert.ok(
          availableDirections(enemies.map, a.cell).some(
            (d) => neighbor(enemies.map, a.cell, d) === a.target,
          ),
        );
      }
    }
  }
  const hit = makeHunt();
  hit.hazards = [{ ...hit.player, speed: 0 }];
  stepHunt(hit, 0.016);
  assert.equal(hit.hits, 1);
  assert.equal(hit.lives, 2);
  assert.equal(hit.hazards.length, 0, "contacted broken heart disappears");
  assert.ok(hit.invulnerable > 0.9);
  assert.ok(hit.knockback > 0);
  const at = { x: hit.player.x, y: hit.player.y };
  stepHunt(hit, 0.1);
  assert.equal(hit.hits, 1);
  assert.ok(
    Math.hypot(hit.player.x - at.x, hit.player.y - at.y) > 0,
    "No knockback movement",
  );
  for (let i = 0; i < 90; i++) stepHunt(hit, 1 / 60);
  assert.equal(hit.invulnerable, 0);
  for (let life = 2; life > 0; life--) {
    hit.invulnerable = 0;
    hit.knockback = 0;
    hit.player.target = null;
    hit.hazards.push({ ...hit.player, target: null, speed: 0 });
    const events = stepHunt(hit, 0.016);
    assert.equal(hit.lives, life - 1);
    assert.ok(events.includes("hit"));
    if (life === 1) assert.ok(events.includes("game-over"));
  }
  assert.equal(hit.gameOver, true);
  const dead = JSON.stringify(hit);
  stepHunt(hit, 1, 1, 0);
  assert.equal(JSON.stringify(hit), dead, "game over freezes state");
  const restarted = makeHunt();
  assert.equal(restarted.lives, 3);
  assert.equal(restarted.gameOver, false);
  assert.ok(restarted.items.every((item) => !item.collected));
  return {
    walkable: open.length,
    junctions,
    deadEnds,
    cycles,
    smallHearts: 24,
  };
}
function reachableWithout(map, start, blocked) {
  const seen = new Set(start === blocked ? [] : [start]),
    queue = [...seen];
  while (queue.length) {
    const cell = queue.shift();
    for (const direction of availableDirections(map, cell)) {
      const next = neighbor(map, cell, direction);
      if (next !== blocked && !seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}
function direction(map, a, b) {
  const delta = b - a;
  return delta === 1 ? 1 : delta === -1 ? 3 : delta === map.cols ? 2 : 0;
}
function place(state, cell) {
  Object.assign(state.player, {
    cell,
    target: null,
    progress: 0,
    direction: -1,
    ...cellCenter(state.map, cell),
  });
  state.queuedDirection = -1;
}
if (process.argv[1]?.endsWith("check-gift-hunt.mjs"))
  console.log("Gift Hunt grid:", checkGiftHunt());
