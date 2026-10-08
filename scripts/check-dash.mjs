import assert from "node:assert/strict";
import fs from "node:fs";
import {
  makeDash,
  stepDash,
  requestDashAction,
  crouching,
  heroBox,
  obstacleBox,
  dashSpeed,
  DASH_PACING,
  nextDashKind,
  dashSpacingRange,
  minimumDashTransition,
  planDashObstacle,
  GROUND,
  DASH_GOAL,
} from "../js/games/dash-state.js";
import { renderGameCard } from "../js/game-card.js";
import { assets, dashAssets } from "../js/assetConfig.js";
for (const path of Object.values(dashAssets)) assert.ok(fs.existsSync(path));
const idle = makeDash(() => 0.5),
  unchanged = JSON.stringify(idle);
stepDash(idle, 0.032);
assert.equal(JSON.stringify(idle), unchanged);
idle.status = "playing";
requestDashAction(idle, "jump");
stepDash(idle, 0.016);
assert.ok(!idle.grounded && idle.feet < GROUND);
assert.equal(crouching(idle), false);
const firstV = idle.vy;
requestDashAction(idle, "jump");
stepDash(idle, 0.02);
assert.ok(idle.vy > firstV, "no air jump");
for (let i = 0; i < 150; i++) stepDash(idle, 1 / 120);
assert.equal(idle.feet, GROUND);
assert.equal(idle.grounded, true);
const duck = makeDash();
duck.status = "playing";
assert.equal(requestDashAction(duck, "crouch"), true);
stepDash(duck, 0.01, { crouch: true });
assert.equal(crouching(duck), true);
assert.ok(heroBox(duck).h < heroBox(makeDash()).h);
for (let i = 0; i < 200; i++) stepDash(duck, 1 / 120, { crouch: true });
assert.equal(crouching(duck), true);
stepDash(duck, 0.01, { crouch: false });
assert.equal(crouching(duck), false);
const paused = makeDash();
paused.status = "paused";
const frozen = JSON.stringify(paused);
stepDash(paused, 0.032);
assert.equal(JSON.stringify(paused), frozen);
assert.equal(requestDashAction(paused, "jump"), false);
for (const kind of ["crate", "bird"]) {
  const s = makeDash();
  s.status = "playing";
  s.obstacles = [
    {
      kind,
      x: 205,
      y: kind === "crate" ? GROUND - 90 : GROUND - 195,
      w: 100,
      h: 100,
    },
  ];
  const events = stepDash(s, 0.01);
  assert.equal(s.status, "dead");
  assert.ok(events.includes("hit"));
  const dead = JSON.stringify(s);
  stepDash(s, 0.1);
  assert.equal(JSON.stringify(s), dead);
}
const safe = makeDash();
safe.status = "playing";
safe.obstacles = [{ kind: "bird", x: 205, y: GROUND - 195, w: 108, h: 102 }];
requestDashAction(safe, "crouch");
stepDash(safe, 0.01, { crouch: true });
assert.equal(safe.status, "playing");
let leastHearts = Infinity,
  mostHearts = 0,
  maxEntities = 0,
  measuredPairs = 0,
  shortestGap = Infinity,
  longestGap = 0;
for (const fps of [30, 60, 120])
  for (let seed = 1; seed <= 50; seed++) {
    let n = seed;
    const rng = () => {
      n = (n * 1664525 + 1013904223) >>> 0;
      return n / 4294967296;
    };
    const s = makeDash(rng);
    s.status = "playing";
    const arrived = new Set();
    let lastArrival;
    for (let frames = 0; frames < fps * 120; frames++) {
      const box = heroBox(s),
        o = s.obstacles.find(
          (o) =>
            obstacleBox(o, s.travel).x + obstacleBox(o, s.travel).w > box.x,
        );
      if (o) {
        const gap = obstacleBox(o, s.travel).x - box.x - box.w;
        if (gap < dashSpeed(s) * 0.23 && gap > -105) {
          if (o.kind === "crate" && s.grounded) requestDashAction(s, "jump");
          else if (o.kind === "bird") requestDashAction(s, "crouch");
        }
      }
      stepDash(s, 1 / fps, {
        crouch:
          o?.kind === "bird" &&
          obstacleBox(o, s.travel).x - box.x - box.w < 100,
      });
      if (s.status !== "playing")
        throw Error("Unavoidable obstacle seed " + seed + " at " + s.distance);
      for (const obstacle of s.obstacles) {
        const leadingEdge = obstacle.x + (obstacle.kind === "crate" ? 16 : 26);
        if (arrived.has(obstacle.id) || leadingEdge - s.travel > 246) continue;
        arrived.add(obstacle.id);
        if (lastArrival) {
          const gap = s.elapsed - lastArrival.elapsed;
          const tolerance = 1 / fps + 0.006;
          assert.ok(
            gap + tolerance >=
              minimumDashTransition(lastArrival.kind, obstacle.kind),
            "actual encounter leaves recovery time",
          );
          assert.ok(
            Math.abs(gap - obstacle.spacingSeconds) <= tolerance,
            "planned gap matches physical encounters during acceleration",
          );
          assert.ok(gap <= 2 + tolerance, "no long empty stretches");
          measuredPairs++;
          shortestGap = Math.min(shortestGap, gap);
          longestGap = Math.max(longestGap, gap);
        }
        lastArrival = { kind: obstacle.kind, elapsed: s.elapsed };
      }
      maxEntities = Math.max(maxEntities, s.items.length + s.obstacles.length);
      if (frames === fps * 40 - 1) {
        assert.ok(s.eligible, "goal not reachable by 40s");
        leastHearts = Math.min(leastHearts, s.hearts);
        mostHearts = Math.max(mostHearts, s.hearts);
      }
    }
    assert.ok(s.distance > 2000);
    assert.ok(dashSpeed(s) <= DASH_PACING.maxSpeed);
    assert.ok(maxEntities < 15);
  }
assert.ok(leastHearts >= DASH_GOAL.hearts, "too few hearts to reach the goal");
assert.ok(mostHearts <= 40, "hearts spawn too frequently");
const score = makeDash();
score.status = "playing";
score.items = [{ x: 200, y: GROUND - 66, w: 40, h: 40 }];
assert.ok(stepDash(score, 0.01).includes("heart"));
assert.equal(score.hearts, 1);
stepDash(score, 0.01);
assert.equal(score.hearts, 1);
const card = renderGameCard(
  { id: "runner", name: "Wika Dash", art: "coverDash", desc: "Test" },
  2,
  { locked: false, done: true },
);
assert.ok(card.includes("03"));
assert.ok(card.includes(assets.coverDash));
assert.ok(card.includes("Jeszcze raz"));
assert.ok(!card.includes("disabled"));
const locked = renderGameCard(
  { id: "quest", name: "Magiczny Prezent", art: "coverGift", desc: "Test" },
  5,
  { locked: true, done: false },
);
assert.ok(locked.includes("disabled"));
assert.ok(locked.includes("06"));
assert.ok(DASH_GOAL.distance === 500 && DASH_GOAL.hearts === 20);
for (const [distance, hearts, eligible] of [
  [500, 19, false],
  [499, 20, false],
  [500, 20, true],
]) {
  const goal = makeDash(() => 0.5);
  goal.status = "playing";
  goal.travel = distance / 0.08;
  goal.hearts = hearts;
  goal.nextHeart = Infinity;
  goal.nextObstacle = Infinity;
  goal.items = [];
  const events = stepDash(goal, 0.00001);
  assert.equal(goal.eligible, eligible);
  assert.equal(events.includes("goal"), eligible);
}
console.log(
  "OK Wika Dash: 150 seeded 120s runs at 30/60/120 fps, jump/no air jump/landing, hold/release crouch, bird clearance, collisions/death freeze, pause, heart groups, goal500/20, bounded spawn/speed, cover cards and asset paths. Minimum hearts at40s:",
  leastHearts,
  "to",
  mostHearts,
  "max entities:",
  maxEntities,
);
console.log("Actual obstacle encounter spacing:", {
  measuredPairs,
  shortestGap,
  longestGap,
});

// Independent RNG samples include repeats, switches, and both kinds, without long runs.
let randomState = 9183;
const variety = makeDash(() => {
  randomState = (randomState * 1664525 + 1013904223) >>> 0;
  return randomState / 2 ** 32;
});
const kinds = Array.from({ length: 1000 }, () => nextDashKind(variety));
let repeats = 0,
  switches = 0,
  run = 1,
  maxRun = 1;
for (let i = 1; i < kinds.length; i++) {
  if (kinds[i] === kinds[i - 1]) {
    repeats++;
    run++;
  } else {
    switches++;
    run = 1;
  }
  maxRun = Math.max(maxRun, run);
}
const crates = kinds.filter((k) => k === "crate").length;
assert.ok(
  repeats > 250 &&
    switches > 250 &&
    crates > 400 &&
    crates < 600 &&
    maxRun === 3,
);
for (const distance of [0, 100, 300, 500, 2000])
  for (const from of ["crate", "bird"])
    for (const rng of [() => 0, () => 0.999999]) {
      const s = makeDash(rng);
      s.distance = distance;
      s.travel = distance / 0.08;
      s.lastKind = from;
      s.kindRun = 1;
      const next = planDashObstacle(s, { kind: from, x: s.travel + 780 });
      assert.ok(next.spacingSeconds >= minimumDashTransition(from, next.kind));
      assert.ok(next.spacingSeconds <= dashSpacingRange(s).max + 0.001);
    }
for (const [distance, multiplier] of [
  [0, 1],
  [100, 1.1],
  [200, 1.22],
  [300, 1.36],
  [400, 1.52],
  [500, 1.7],
])
  assert.ok(
    Math.abs(dashSpeed({ distance }) / DASH_PACING.startSpeed - multiplier) <
      1e-10,
  );
let lastSpeed = dashSpeed(makeDash());
for (let distance = 0; distance < 10000; distance++) {
  const speed = dashSpeed({ distance });
  assert.ok(
    speed >= lastSpeed &&
      speed - lastSpeed < 0.47 &&
      speed < DASH_PACING.maxSpeed,
  );
  lastSpeed = speed;
}
assert.equal(dashSpeed(makeDash()), DASH_PACING.startSpeed);
assert.ok(dashSpeed({ distance: 1000 }) > dashSpeed({ distance: 0 }) + 70);
console.log("Dash random distribution:", {
  crates,
  repeats,
  switches,
  maxRun,
  speedAt1000: dashSpeed({ distance: 1000 }),
});

const { repeatTiles, sceneBlend, coverRect, DASH_SCENERY } =
  await import("../js/games/dash-scenery.js");
for (const [sourceWidth, sourceHeight] of [
  [1440, 480],
  [1200, 900],
  [900, 1200],
]) {
  const rect = coverRect(
    sourceWidth,
    sourceHeight,
    DASH_SCENERY.frame.width,
    DASH_SCENERY.frame.height,
  );
  assert.ok(rect.width >= DASH_SCENERY.frame.width);
  assert.ok(rect.height >= DASH_SCENERY.frame.height);
  assert.ok(
    Math.abs(rect.width / rect.height - sourceWidth / sourceHeight) < 1e-9,
    "cover crop preserves the asset ratio",
  );
}
for (const width of [360, 480, 720, 1920])
  for (const tile of [1830, 560])
    for (const mode of ["mirror", "seamless"])
      for (const scroll of [
        -0.01,
        0,
        tile - 0.01,
        tile,
        tile + 0.01,
        2 * tile - 0.01,
        2 * tile,
        1e8,
      ]) {
        const list = repeatTiles(width, tile, scroll, mode);
        assert.ok(list[0].x <= 0 && list.at(-1).x + tile >= width);
        for (let i = 1; i < list.length; i++)
          assert.ok(Math.abs(list[i].x - list[i - 1].x - tile) < 1e-7);
        const period = tile * (mode === "mirror" ? 2 : 1),
          other = repeatTiles(width, tile, scroll + period, mode);
        assert.equal(list.length, other.length);
        list.forEach((t, i) => {
          assert.ok(Math.abs(t.x - other[i].x) < 1e-6);
          assert.equal(t.flip, other[i].flip);
        });
      }
for (const distance of [600, 1200, 1800]) {
  const before = sceneBlend(distance - 0.0001),
    after = sceneBlend(distance);
  assert.ok(
    before.mix > 0.99999 && after.mix === 0 && before.next === after.current,
  );
}
assert.equal(sceneBlend(300).mix, 0);
const sceneLoop = DASH_SCENERY.sceneDistance * DASH_SCENERY.backgrounds.length;
for (const distance of [0, 540, 600, 1140, 1200, 1740, 2400]) {
  const first = sceneBlend(distance),
    second = sceneBlend(distance + sceneLoop),
    third = sceneBlend(distance + sceneLoop * 2);
  assert.deepEqual(first, second);
  assert.deepEqual(first, third);
}
console.log(
  "Scenery: one centered cover frame, fixed baseline, complete tile coverage, two full mirror/scene loops, continuous crossfade.",
);
