// Logical units are independent of canvas CSS size. Hair/wings are visual,
// collisions cover Wiki's torso and solid parts of the obstacles.
export const DASH_W = 720,
  DASH_H = 760,
  GROUND = 610;
export const DASH_GOAL = { distance: 500, hearts: 20 };
export const HERO = { x: 105, height: 174, crouchHeight: 92 };
export function makeDash(random = Math.random) {
  return {
    random,
    viewWidth: DASH_W,
    status: "ready",
    travel: 0,
    distance: 0,
    elapsed: 0,
    hearts: 0,
    feet: GROUND,
    vy: 0,
    grounded: true,
    jumpBuffer: 0,
    crouchUntil: 0,
    nextObstacle: 440,
    nextHeart: 180,
    obstacles: [],
    items: [{ x: 490, y: GROUND - 66, w: 40, h: 40 }],
    particles: [],
    eligible: false,
    announced: false,
    lastKind: null,
    kindRun: 0,
    serial: 0,
  };
}
export const DASH_PACING = {
  startSpeed: 240,
  maxSpeed: 493,
  jumpVelocity: 730,
  gravity: 1440,
  heartMinSeconds: 1.55,
  heartMaxSeconds: 2.05,
  heartPairChance: 0.7,
};
export const dashSpeed = ({ distance }) => {
  const d = Math.max(0, distance);
  const multiplier =
    d <= 500
      ? 1 + 0.0009 * d + 0.000001 * d * d
      : 1.7 + 0.35 * (1 - Math.exp(-(d - 500) / (0.35 / 0.0019)));
  return DASH_PACING.startSpeed * multiplier;
};
export function dashSpacingRange(s) {
  const progress = Math.min(
    1,
    Math.max(0, (dashSpeed(s) / DASH_PACING.startSpeed - 1) / 0.7),
  );
  return { min: 1.2 - 0.38 * progress, max: 2 - 0.58 * progress };
}
export function minimumDashTransition(from, to) {
  // A jump lasts 1.014s. Reserve an early takeoff and a separate reaction
  // after landing before a bird; crouch release needs less recovery time.
  if (from === "crate")
    return (
      (2 * DASH_PACING.jumpVelocity) / DASH_PACING.gravity +
      (to === "bird" ? 0.27 : 0.16)
    );
  return to === "crate" ? 0.85 : 0.75;
}
const encounterTravel = (o) =>
  o.x + (o.kind === "crate" ? 16 : 26) - (HERO.x + 141);
function travelAfterSeconds(travel, seconds) {
  const steps = 64,
    dt = seconds / steps;
  for (let i = 0; i < steps; i++) {
    const speed = dashSpeed({ distance: travel * 0.08 });
    travel += dashSpeed({ distance: (travel + (speed * dt) / 2) * 0.08 }) * dt;
  }
  return travel;
}
export function planDashObstacle(s, previous) {
  const range = dashSpacingRange(s),
    beforeKind = s.lastKind,
    beforeRun = s.kindRun;
  let kind, seconds, minimum;
  for (let attempt = 0; attempt < 16; attempt++) {
    s.lastKind = beforeKind;
    s.kindRun = beforeRun;
    kind = nextDashKind(s);
    seconds = range.min + s.random() * (range.max - range.min);
    minimum = minimumDashTransition(previous.kind, kind);
    if (seconds >= minimum) break;
    if (attempt === 15) seconds = Math.max(minimum, range.max);
  }
  const x =
    travelAfterSeconds(encounterTravel(previous), seconds) +
    (HERO.x + 141) -
    (kind === "crate" ? 16 : 26);
  return { kind, x, spacingSeconds: seconds };
}
export function nextDashKind(s) {
  const crateChance =
    s.lastKind === "crate" && s.kindRun >= 2
      ? 0.25
      : s.lastKind === "bird" && s.kindRun >= 2
        ? 0.75
        : 0.5;
  const kind =
    s.kindRun >= 3
      ? s.lastKind === "crate"
        ? "bird"
        : "crate"
      : s.random() < crateChance
        ? "crate"
        : "bird";
  s.kindRun = kind === s.lastKind ? s.kindRun + 1 : 1;
  s.lastKind = kind;
  return kind;
}
export const crouching = (s) => s.grounded && s.crouchUntil > s.elapsed;
export function heroBox(s) {
  return crouching(s)
    ? { x: HERO.x + 70, y: s.feet - 64, w: 60, h: 57 }
    : { x: HERO.x + 96, y: s.feet - 148, w: 45, h: 137 };
}
export function obstacleBox(o, travel) {
  return o.kind === "crate"
    ? { x: o.x - travel + 16, y: o.y + 14, w: 57, h: 66 }
    : { x: o.x - travel + 26, y: o.y + 25, w: 55, h: 50 };
}
export function requestDashAction(s, action) {
  if (s.status !== "playing") return false;
  if (action === "jump") {
    s.jumpBuffer = 0.16;
    return true;
  }
  if (action === "crouch" && s.grounded) {
    s.crouchUntil = s.elapsed + 0.05;
    return true;
  }
  return false;
}
const overlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export function stepDash(s, dt, { crouch = false } = {}) {
  const events = [];
  if (s.status !== "playing") return events;
  let remaining = Math.min(0.1, Math.max(0, dt));
  while (remaining > 0 && s.status === "playing") {
    const delta = Math.min(1 / 120, remaining);
    remaining -= delta;
    s.elapsed += delta;
    s.crouchUntil = crouch && s.grounded ? s.elapsed + 0.05 : 0;
    if (s.jumpBuffer > 0 && s.grounded) {
      s.vy = -DASH_PACING.jumpVelocity;
      s.grounded = false;
      s.crouchUntil = 0;
      s.jumpBuffer = 0;
      events.push("jump");
    }
    s.jumpBuffer = Math.max(0, s.jumpBuffer - delta);
    if (!s.grounded) {
      s.vy += DASH_PACING.gravity * delta;
      s.feet += s.vy * delta;
      if (s.feet >= GROUND) {
        s.feet = GROUND;
        s.vy = 0;
        s.grounded = true;
      }
    }
    s.travel += dashSpeed(s) * delta;
    s.distance = s.travel * 0.08;
    if (s.travel >= s.nextObstacle) {
      // Random runs are allowed; a short streak cap prevents monotonous chains.
      const planned = s.plannedObstacle || {
        kind: nextDashKind(s),
        x: s.travel + Math.max(DASH_W, s.viewWidth) + 60,
      };
      const { kind } = planned;
      s.obstacles.push({
        id: ++s.serial,
        kind,
        x: planned.x,
        spacingSeconds: planned.spacingSeconds,
        y: kind === "crate" ? GROUND - 90 : GROUND - 195,
        w: kind === "crate" ? 92 : 108,
        h: kind === "crate" ? 90 : 102,
      });
      s.plannedObstacle = planDashObstacle(s, s.obstacles.at(-1));
      s.nextObstacle = s.plannedObstacle.x - Math.max(DASH_W, s.viewWidth) - 60;
    }
    if (s.travel >= s.nextHeart) {
      const startX = s.travel + Math.max(DASH_W, s.viewWidth) + 40,
        count = s.random() < DASH_PACING.heartPairChance ? 2 : 1;
      for (let index = 0; index < count; index++)
        s.items.push({
          x: startX + index * 54,
          y: GROUND - 66,
          w: 40,
          h: 40,
        });
      const heartDelay =
        DASH_PACING.heartMinSeconds +
        s.random() *
          (DASH_PACING.heartMaxSeconds - DASH_PACING.heartMinSeconds);
      s.nextHeart = s.travel + dashSpeed(s) * heartDelay;
    }
    const player = heroBox(s);
    for (const item of s.items) {
      if (
        !item.collected &&
        overlap(player, { ...item, x: item.x - s.travel })
      ) {
        item.collected = true;
        s.hearts++;
        events.push("heart");
        s.particles.push({ x: item.x - s.travel + 20, y: item.y + 20, age: 0 });
      }
    }
    if (s.obstacles.some((o) => overlap(player, obstacleBox(o, s.travel)))) {
      s.status = "dead";
      events.push("hit");
    }
    s.obstacles = s.obstacles.filter((o) => o.x - s.travel + o.w > -50);
    s.items = s.items.filter((o) => !o.collected && o.x - s.travel + o.w > -50);
    s.eligible =
      s.distance >= DASH_GOAL.distance && s.hearts >= DASH_GOAL.hearts;
    if (s.eligible && !s.announced) {
      s.announced = true;
      events.push("goal");
    }
    for (const p of s.particles) p.age += delta;
    s.particles = s.particles.filter((p) => p.age < 0.55);
  }
  return events;
}
