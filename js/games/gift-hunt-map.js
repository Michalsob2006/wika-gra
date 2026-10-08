import { generateMaze } from "./maze-map.js";
export const TILE = 44;
export const DIRECTIONS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
export function makeHuntMap() {
  let seed = 905;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const graph = generateMaze(7, 5, random),
    degree = (id) => graph.cells[id].walls.filter((w) => !w).length;
  const candidates = [];
  for (let id = 0; id < 35; id++)
    for (const d of [1, 2]) {
      const next = id + (d === 1 ? 1 : 7);
      if ((d === 1 && id % 7 === 6) || (d === 2 && id >= 28)) continue;
      if (graph.cells[id].walls[d])
        candidates.push({ id, next, d, rank: random() });
    }
  candidates.sort((a, b) => a.rank - b.rank);
  let loops = 0;
  for (const { id, next, d } of candidates) {
    if (degree(id) < 2 || degree(next) < 2) continue;
    graph.cells[id].walls[d] = false;
    graph.cells[next].walls[(d + 2) % 4] = false;
    if (++loops === 7) break;
  }
  const cols = 15,
    rows = 11,
    cells = Array(cols * rows).fill(false);
  for (let id = 0; id < 35; id++) {
    const x = 1 + (id % 7) * 2,
      y = 1 + Math.floor(id / 7) * 2;
    cells[y * cols + x] = true;
    graph.cells[id].walls.forEach((wall, d) => {
      if (!wall) {
        const [dx, dy] = DIRECTIONS[d];
        cells[(y + dy) * cols + x + dx] = true;
      }
    });
  }
  const map = { cols, rows, cells, tile: TILE, start: 9 * cols + 7 };
  if (huntPath(map, map.start, 1 * cols + 1).length === 0)
    throw Error("Nieprawidłowa mapa Gift Hunt");
  return map;
}
export function availableDirections(map, cell) {
  const x = cell % map.cols,
    y = Math.floor(cell / map.cols);
  return DIRECTIONS.map(([dx, dy], d) => ({ x: x + dx, y: y + dy, d }))
    .filter(
      (p) =>
        p.x >= 0 &&
        p.x < map.cols &&
        p.y >= 0 &&
        p.y < map.rows &&
        map.cells[p.y * map.cols + p.x],
    )
    .map((p) => p.d);
}
export function neighbor(map, cell, direction) {
  const [dx, dy] = DIRECTIONS[direction];
  return cell + dx + dy * map.cols;
}
export function huntPath(map, start, target) {
  const queue = [start],
    previous = new Map([[start, null]]);
  for (const cell of queue) {
    if (cell === target) break;
    for (const d of availableDirections(map, cell)) {
      const next = neighbor(map, cell, d);
      if (!previous.has(next)) {
        previous.set(next, cell);
        queue.push(next);
      }
    }
  }
  if (!previous.has(target)) return [];
  const path = [];
  for (let id = target; id !== null; id = previous.get(id)) path.unshift(id);
  return path;
}
export function cellCenter(map, cell) {
  return {
    x: ((cell % map.cols) + 0.5) * map.tile,
    y: (Math.floor(cell / map.cols) + 0.5) * map.tile,
  };
}
