// Depth-first generation creates a connected tree: every cell is reachable.
export function generateMaze(cols = 7, rows = 5, random = Math.random) {
  const cells = Array.from({ length: cols * rows }, () => ({
    walls: [true, true, true, true],
    visited: false,
  }));
  const stack = [(rows - 1) * cols];
  cells[stack[0]].visited = true;
  const directions = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  while (stack.length) {
    const id = stack.at(-1),
      x = id % cols,
      y = Math.floor(id / cols),
      options = [];
    directions.forEach(([dx, dy], d) => {
      const nx = x + dx,
        ny = y + dy,
        n = ny * cols + nx;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !cells[n].visited)
        options.push([n, d]);
    });
    if (!options.length) {
      stack.pop();
      continue;
    }
    const [next, d] = options[Math.floor(random() * options.length)];
    cells[id].walls[d] = false;
    cells[next].walls[(d + 2) % 4] = false;
    cells[next].visited = true;
    stack.push(next);
  }
  return {
    cols,
    rows,
    cells,
    start: (rows - 1) * cols,
    finish: cols - 1,
    hearts: [
      cols + 1,
      Math.floor(rows / 2) * cols + Math.floor(cols / 2),
      (rows - 2) * cols + cols - 2,
    ],
  };
}
export function pathTo(map, from, to) {
  const queue = [from],
    prev = new Map([[from, null]]),
    offset = [-map.cols, 1, map.cols, -1];
  for (const id of queue) {
    if (id === to) break;
    map.cells[id].walls.forEach((wall, d) => {
      const next = id + offset[d];
      if (!wall && !prev.has(next)) {
        prev.set(next, id);
        queue.push(next);
      }
    });
  }
  if (!prev.has(to)) return [];
  const path = [];
  for (let id = to; id !== null; id = prev.get(id)) path.unshift(id);
  return path;
}

// Keep the same DFS generator. Larger maps select deep dead ends outside
// the main route, so collecting hearts involves exploring side branches.
export function generateMazeLevel(level = 1, random = Math.random) {
  if (level === 1) return generateMaze(7, 5, random);
  let best;
  for (let i = 0; i < 16; i++) {
    const candidate = generateMaze(17, 13, random);
    candidate.route = pathTo(candidate, candidate.start, candidate.finish);
    const routeSet = new Set(candidate.route);
    const branches = candidate.cells.filter(
      (cell, id) =>
        !routeSet.has(id) && cell.walls.filter((w) => !w).length === 1,
    ).length;
    if (branches >= 3 && (!best || candidate.route.length > best.route.length))
      best = candidate;
  }
  // A finite fallback also handles a deterministic/random source that repeatedly
  // generates a single long corridor with too few side branches.
  if (!best) {
    best = generateMaze(17, 13, random);
    best.cells.forEach((cell) => (cell.walls = [true, true, true, true]));
    for (let y = 0; y < 13; y++)
      for (let x = 0; x < 16; x++) {
        const id = y * 17 + x;
        best.cells[id].walls[1] = false;
        best.cells[id + 1].walls[3] = false;
      }
    for (let y = 0; y < 12; y++) {
      const id = y * 17;
      best.cells[id].walls[2] = false;
      best.cells[id + 17].walls[0] = false;
    }
    best.route = pathTo(best, best.start, best.finish);
  }
  const onRoute = new Set(best.route),
    offset = [-best.cols, 1, best.cols, -1];
  const distance = new Map(best.route.map((id) => [id, 0])),
    queue = [...best.route];
  for (const id of queue)
    best.cells[id].walls.forEach((wall, d) => {
      const next = id + offset[d];
      if (!wall && !distance.has(next)) {
        distance.set(next, distance.get(id) + 1);
        queue.push(next);
      }
    });
  const branches = best.cells
    .map((c, id) => ({ id, depth: distance.get(id) }))
    .filter(
      (c) =>
        !onRoute.has(c.id) &&
        best.cells[c.id].walls.filter((w) => !w).length === 1,
    )
    .sort((a, b) => b.depth - a.depth);
  const selected = [];
  for (const candidate of branches) {
    if (selected.every((id) => pathTo(best, id, candidate.id).length > 10)) {
      selected.push(candidate.id);
      if (selected.length === 3) break;
    }
  }
  for (const candidate of branches) {
    if (selected.length === 3) break;
    if (!selected.includes(candidate.id)) selected.push(candidate.id);
  }
  if (selected.length < 3) throw Error("Brak bocznych odnóg labiryntu");
  best.hearts = selected;
  delete best.route;
  return best;
}
export function nearestHint(map, position, collected) {
  const targets = map.hearts.filter((id) => !collected.has(id));
  if (!targets.length) targets.push(map.finish);
  const routes = targets
    .map((id) => pathTo(map, position, id))
    .sort((a, b) => a.length - b.length);
  return routes[0]?.[1] ?? position;
}
