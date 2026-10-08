export const GRAVITY = 1150,
  SPEED = 215,
  JUMP = 490;
export function makeLevel() {
  const widths = [
    760, 630, 710, 640, 240, 730, 240, 720, 820, 690, 730, 240, 700, 240, 730,
    830,
  ];
  const heights = [
    390, 355, 380, 340, 370, 345, 385, 360, 390, 345, 365, 335, 375, 350, 380,
    390,
  ];
  const gaps = [
    105, 130, 145, 80, 80, 90, 105, 120, 130, 145, 75, 80, 90, 100, 135,
  ];
  let x = 0;
  const platforms = widths.map((w, i) => {
    const s = {
      id: i,
      x,
      y: heights[i],
      baseX: x,
      baseY: heights[i],
      w,
      h: 40,
      type: [4, 11].includes(i)
        ? "moving"
        : [6, 13].includes(i)
          ? "falling"
          : "static",
      dx: 0,
      dy: 0,
      active: true,
      fallTime: 0,
      resetTime: 0,
    };
    x += w + (gaps[i] || 0);
    return s;
  });
  const hearts = [1, 3, 5, 8, 10, 12, 14].map((i, n) => ({
    x: platforms[i].x + platforms[i].w * (n === 2 ? 0.75 : 0.5),
    y: platforms[i].y - 65,
    w: 38,
    h: 38,
    collected: false,
  }));
  const crates = [2, 3, 5, 9, 12, 14].map((i) => ({
    id: `crate-${i}`,
    x: platforms[i].x + 150,
    y: platforms[i].y - 43,
    w: 43,
    h: 43,
    active: true,
  }));
  return {
    platforms,
    hearts,
    crates,
    width: x,
    finish: platforms.at(-1),
    speed: SPEED,
    time: 0,
    checkpointPlatform: 8,
  };
}
export function makePlayer(level) {
  return {
    x: 45,
    y: level.platforms[0].y - 86,
    w: 43,
    h: 86,
    vy: 0,
    grounded: true,
    supportId: 0,
    checkpoint: { x: 45, y: level.platforms[0].y - 86, id: 0 },
    direction: 1,
  };
}
export function advancePlatforms(level, dt) {
  level.time += dt;
  for (const s of level.platforms) {
    const oldX = s.x,
      oldY = s.y;
    if (s.type === "moving")
      s.y = s.baseY + Math.sin(level.time * 1.3 + s.id) * 18;
    if (s.type === "falling") {
      if (s.fallTime > 0) {
        s.fallTime += dt;
        if (s.fallTime > 1.15) s.y += 230 * dt;
        if (s.y > 560) {
          s.active = false;
          s.resetTime += dt;
        }
      }
      if (s.resetTime > 3) {
        s.y = s.baseY;
        s.active = true;
        s.fallTime = 0;
        s.resetTime = 0;
      }
    }
    s.dx = s.x - oldX;
    s.dy = s.y - oldY;
  }
}
export function stepPlayer(p, level, dt, move, jump) {
  const support = level.platforms.find((s) => s.id === p.supportId);
  if (p.grounded && support?.active) {
    p.x += support.dx;
    p.y += support.dy;
  }
  if (jump && p.grounded) {
    p.vy = -JUMP;
    p.grounded = false;
    p.supportId = null;
  }
  if (move) p.direction = move;
  const oldX = p.x;
  p.x = Math.max(0, Math.min(level.width - p.w, p.x + move * level.speed * dt));
  for (const c of level.crates) {
    if (
      p.x < c.x + c.w &&
      p.x + p.w > c.x &&
      p.y < c.y + c.h &&
      p.y + p.h > c.y + 2
    )
      p.x = oldX <= c.x ? c.x - p.w : c.x + c.w;
  }
  const bottom = p.y + p.h;
  p.vy += GRAVITY * dt;
  p.y += p.vy * dt;
  p.grounded = false;
  p.supportId = null;
  for (const s of [...level.platforms, ...level.crates]) {
    if (
      s.active &&
      p.vy >= 0 &&
      bottom <= s.y + 2 &&
      p.y + p.h >= s.y &&
      p.x + p.w > s.x + 3 &&
      p.x < s.x + s.w - 3
    ) {
      p.y = s.y - p.h;
      p.vy = 0;
      p.grounded = true;
      p.supportId = s.id;
      if (s.type === "falling" && !s.fallTime) s.fallTime = dt;
      if (
        s.id === level.checkpointPlatform &&
        p.x >= s.x + 20 &&
        p.x + p.w <= s.x + s.w - 20
      )
        p.checkpoint = { x: s.x + 45, y: s.baseY - p.h, id: s.id };
      break;
    }
  }
  if (p.y > 580) {
    p.x = p.checkpoint.x;
    p.y = p.checkpoint.y;
    p.vy = 0;
    p.grounded = true;
    p.supportId = p.checkpoint.id;
    for (const s of level.platforms)
      if (s.type === "falling") {
        s.y = s.baseY;
        s.active = true;
        s.fallTime = 0;
        s.resetTime = 0;
        s.dy = 0;
      }
    return true;
  }
  return false;
}
export function canFinishRunner(p, level) {
  return (
    p.x > level.finish.x + level.finish.w - 170 &&
    p.grounded &&
    level.hearts.filter((h) => h.collected).length >= 5
  );
}
