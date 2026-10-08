// Full input-only walkthroughs. No teleport, item edits, signals or skip controls.
import { makeDuo, stepDuo, DUO_PHYSICS } from "../js/games/duo-state.js";
export function solveDuo(index, dt = 1 / 60) {
  const s = makeDuo(index),
    recording = [],
    trace = [],
    blockTrace = [];
  const player = (id) => s.players.find((p) => p.id === id);
  const tick = (commands = {}) => {
    const before = s.players.map((p) => ({
      id: p.id,
      x: p.x,
      feet: p.y + p.h,
      support: p.support,
    }));
    recording.push(structuredClone(commands));
    stepDuo(s, dt, commands);
    const heavy = s.blocks.find((block) => block.kind === "heavy");
    if (heavy) blockTrace.push(heavy.x);
    if (s.resets)
      throw Error(
        `Level ${index + 1} respawn at ${JSON.stringify(trace.at(-1))}: ${s.reason}; before ${JSON.stringify(before)} lifts ${JSON.stringify(s.lifts.map((l) => ({ x: l.x, y: l.y })))} trace ${JSON.stringify(trace.slice(-4))}`,
      );
  };
  const wait = (condition, max = 30) => {
    for (let n = 0; n < max / dt; n++) {
      if (condition()) return;
      tick();
    }
    throw Error(`Wait: ${JSON.stringify(s.players)}`);
  };
  function go(id, x, feet, jump = true, other = {}) {
    trace.push({ id, x, feet, jump, frame: recording.length });
    const tolerance = Math.max(3, (DUO_PHYSICS.speed * dt) / 2 + 0.6);
    for (let n = 0; n < 15 / dt; n++) {
      const p = player(id),
        move = Math.abs(p.x - x) < tolerance ? 0 : Math.sign(x - p.x);
      if (
        s.status === "complete" ||
        (!move && p.grounded && Math.abs(p.y + p.h - feet) < 3)
      )
        return;
      const obstacle = s.blocks.some(
        (b) =>
          p.y + p.h > b.y + 2 &&
          p.y < b.y + b.h &&
          (move > 0
            ? b.x >= p.x + p.w - 0.3 && b.x - p.x - p.w < 35
            : b.x + b.w <= p.x + 0.3 && p.x - b.x - b.w < 35),
      );
      const danger = s.level.hazards.some(
        (h) =>
          (h.kind === "spikes" ||
            (h.kind === "pink" ? id !== "wika" : id !== "michal")) &&
          Math.abs(p.y + p.h - h.y - 7) < 5 &&
          (move > 0
            ? h.x >= p.x + p.w - 3 && h.x - p.x - p.w < 52
            : h.x + h.w <= p.x + 3 && p.x - h.x - h.w < 52),
      );
      tick({
        ...other,
        [id]: {
          move,
          jump:
            jump && p.grounded && (p.y + p.h > feet + 3 || obstacle || danger),
        },
      });
    }
    throw Error(
      `L${index + 1} ${id} cannot reach ${x},${feet}; at ${JSON.stringify(player(id))}; boxes ${JSON.stringify(s.blocks)}; trace ${JSON.stringify(trace.slice(-4))}`,
    );
  }
  function board(id, liftId, side = "left") {
    const l = s.lifts.find((l) => l.id === liftId),
      entry =
        side === "left"
          ? l.x - (liftId === "left-lift" ? 155 : 66)
          : l.x + l.w + 32;
    go(id, entry, 610);
    wait(() => l.y > l.from - 50 && l.dy > 0);
    const target = l.x + l.w / 2 - DUO_PHYSICS.width / 2;
    tick({ [id]: { move: Math.sign(target - player(id).x), jump: true } });
    for (let n = 0; n < 14 / dt; n++) {
      const p = player(id);
      if (p.grounded && p.support === l.id) return;
      tick({
        [id]: {
          move: Math.abs(p.x - target) < 3 ? 0 : Math.sign(target - p.x),
        },
      });
    }
    throw Error(`Board ${id} ${liftId}: ${JSON.stringify(player(id))}`);
  }
  for (let n = 0; n < Math.ceil(0.08 / dt); n++) tick();
  if (index === 0) {
    go("wika", 150, 150);
    go("michal", 1055, 210);
    go("wika", 335, 350);
    go("wika", 410, 610);
    go("wika", 155, 610);
    go("wika", 250, 610, false);
    go("wika", 300, 546);
    go("wika", 300, 450);
    go("wika", 340, 450);
    go("michal", 880, 610);
    go("michal", 250, 610);
    go("michal", 170, 610);
    go("michal", 320, 350);
    go("wika", 1030, 610);
    board("wika", "shared-lift");
    wait(() => player("wika").y + 80 < 350);
    tick({ wika: { move: -1, jump: true } });
    go("wika", 595, 335);
    go("wika", 715, 210);
    go("wika", 1030, 210);
    go("wika", 600, 150);
    go("wika", 70, 150);
    go("michal", 720, 610);
    board("michal", "shared-lift");
    wait(() => player("michal").y + 80 < 350);
    tick({ michal: { move: -1, jump: true } });
    go("michal", 535, 335);
    go("michal", 715, 210);
    go("michal", 590, 150);
    go("michal", 205, 150);
    go("michal", 800, 210);
    go("michal", 1090, 210);
  } else {
    go("wika", 145, 160);
    go("michal", 1060, 180);
    go("wika", 335, 340);
    go("wika", 290, 340); // stand on plate while the other player crosses
    go("michal", 900, 405);
    tick({ michal: { move: -1, jump: true } });
    go("michal", 735, 340);
    go("michal", 265, 340);
    go("michal", 235, 340, false);
    go("michal", 95, 340);
    go("michal", 115, 340, false);
    // Park the left crate on the plate, keeping the shared middle bridge available.
    go("wika", 95, 340);
    go("wika", 245, 340, false);
    go("wika", 585, 340);
    go("michal", 825, 610);
    go("michal", 170, 610);
    go("michal", 850, 610);
    go("wika", 840, 610);
    wait(() => s.lifts[0].y < 400);
    board("wika", "left-lift");
    wait(() => player("wika").y + 80 < 190);
    go("wika", 650, 180);
    go("wika", 1030, 180); // latch final bridge; now Michał can leave plate
    go("wika", 365, 340);
    go("wika", 840, 610);
    // Exercise the lower heavy block in both directions before parking it
    // under the shelf. This mirrors the route players naturally try and
    // guards against the old coloured-pool reset/jitter bug.
    go("wika", 980, 610, false);
    go("wika", 1120, 610);
    go("wika", 951, 610, false);
    go("wika", 835, 610);
    go("wika", 1030, 610, false); // heavy block under high shelf
    go("wika", 1090, 530);
    go("wika", 1100, 465);
    board("wika", "right-lift");
    wait(() => player("wika").y + 80 < 190);
    go("wika", 280, 160);
    go("wika", 70, 160);
    board("michal", "right-lift", "right");
    wait(() => s.lifts[1].y < 370 && s.lifts[1].y > 345);
    tick({ michal: { move: -1, jump: true } });
    go("michal", 610, 340);
    go("michal", 655, 340);
    go("michal", 825, 610);
    board("michal", "right-lift", "right");
    wait(() => player("michal").y + 80 < 190);
    go("michal", 685, 180);
    go("michal", 1090, 180);
  }
  if (s.status !== "complete" || s.items.some((i) => !i.collected))
    throw Error(
      `Incomplete L${index + 1}: ${JSON.stringify(s.items.filter((i) => !i.collected))}; ${JSON.stringify(s.players)}`,
    );
  return { state: s, recording, trace, blockTrace };
}
