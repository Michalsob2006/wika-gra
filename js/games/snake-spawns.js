export const COLS = 9,
  ROWS = 12;
export const items = [
  { type: "heart", asset: "snakeHeart", points: 1, growth: 1 },
  { type: "bouquet", asset: "snakeBouquet", points: 2, growth: 1 },
  { type: "gift", asset: "snakeGift", points: 3, growth: 1 },
  { type: "broken", asset: "snakeBroken", points: -2, growth: 0 },
  { type: "dark", asset: "snakeDark", points: -1, growth: 0 },
];
export const spawnRules = {
  heart: { max: 2, delay: [2.4, 4], ttl: [8, 12] },
  broken: { max: 1, delay: [6, 10], ttl: [4, 6] },
  dark: { max: 1, delay: [16, 24], ttl: [4, 6] },
  bouquet: { max: 1, delay: [11, 18], ttl: [5, 8] },
  gift: { max: 1, delay: [32, 45], ttl: [4, 6] },
};
const range = (bounds, rng) => bounds[0] + rng() * (bounds[1] - bounds[0]);
export function spawnItem(
  body,
  random = Math.random,
  type = "heart",
  occupied = [],
) {
  const blocked = new Set([...body, ...occupied].map((p) => p.y * COLS + p.x)),
    free = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      if (!blocked.has(y * COLS + x)) free.push({ x, y });
  if (!free.length) return null;
  return {
    ...free[Math.min(free.length - 1, Math.floor(random() * free.length))],
    type,
  };
}
export function initSpawns(s, random) {
  s.items = [];
  s.spawnTime = 0;
  s.nextSpawn = {};
  s.itemId = 0;
  for (const type of Object.keys(spawnRules))
    s.nextSpawn[type] = range(spawnRules[type].delay, random);
  add(s, "heart", random);
  add(s, "heart", random);
}
function add(s, type, random) {
  const p = spawnItem(s.body, random, type, s.items);
  if (!p) return false;
  s.items.push({
    ...p,
    id: ++s.itemId,
    expiresAt: s.spawnTime + range(spawnRules[type].ttl, random),
  });
  return true;
}
export function advanceSpawns(s, dt, random = Math.random) {
  if (s.status !== "playing") return;
  s.spawnTime += Math.max(0, dt);
  s.items = s.items.filter((i) => i.expiresAt > s.spawnTime);
  // Independent clocks keep running whether a player eats, avoids or ignores bonuses.
  for (const [type, rule] of Object.entries(spawnRules)) {
    if (s.spawnTime >= s.nextSpawn[type]) {
      if (s.items.filter((i) => i.type === type).length < rule.max)
        add(s, type, random);
      s.nextSpawn[type] = s.spawnTime + range(rule.delay, random);
    }
  }
  if (!s.items.some((i) => i.type === "heart")) add(s, "heart", random);
}
