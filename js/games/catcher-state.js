export function makeCatcher(width = 720, height = 480) {
  return {
    width,
    height,
    score: 0,
    x: width / 2 - 52,
    dir: 1,
    spawn: 0.5,
    items: [],
    feedback: [],
    finished: false,
  };
}
export const catcherTypes = [
  ["heart", 1],
  ["heart", 1],
  ["bouquet", 2],
  ["letter", 2],
  ["gift", 3],
  ["broken", -1],
];
const overlaps = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export function stepCatcher(s, dt, move = 0, random = Math.random) {
  const events = [];
  if (s.finished) return events;
  s.x = Math.max(0, Math.min(s.width - 104, s.x + move * 360 * dt));
  if (move) s.dir = move;
  s.feedback = s.feedback.filter((p) => (p.life -= dt) > 0);
  s.spawn -= dt;
  if (s.spawn <= 0 && s.items.length < 4) {
    const [key, value] =
      catcherTypes[Math.floor(random() * catcherTypes.length)];
    s.items.push({
      key,
      value,
      x: 16 + random() * (s.width - 96),
      y: -64,
      w: 64,
      h: 64,
      speed: s.height / 4 + random() * 35,
    });
    s.spawn = 0.9;
  }
  const player = { x: s.x + 25, y: s.height - 125, w: 54, h: 95 };
  for (const i of s.items) {
    i.y += i.speed * dt;
    if (overlaps(player, i)) {
      s.score += i.value;
      i.remove = true;
      events.push(
        i.value < 0
          ? "negative"
          : i.key === "heart"
            ? "collect-heart"
            : "collect-bonus",
      );
    } else if (i.y > s.height) {
      i.remove = true;
      if (["heart", "gift", "bouquet", "letter"].includes(i.key)) {
        s.score -= 1;
        s.feedback.push({ x: i.x + 32, y: s.height - 40, life: 1 });
        events.push("miss");
      }
    }
  }
  s.items = s.items.filter((i) => !i.remove);
  if (s.score >= 20) {
    s.finished = true;
    events.push("win");
  }
  return events;
}
