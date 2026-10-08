import { generateMazeLevel, pathTo, nearestHint } from "./maze-map.js";
import { drawImage, input, loop } from "./core.js";
import { sound } from "../audio.js";
export function maze({ root, win }) {
  const ctx = root.querySelector("canvas").getContext("2d"),
    controls = input(root),
    hud = root.querySelector("#score");
  let level = 1,
    map,
    position,
    visual,
    collected,
    elapsed,
    cooldown,
    previousDirection,
    finished = false,
    transition = null,
    terrain,
    size,
    offsetX,
    offsetY,
    camera = { x: 0, y: 0 },
    hintUntil = 0,
    hintNext = null;
  const hintButton = document.createElement("button");
  hintButton.className = "quiet";
  hintButton.textContent = "Podpowiedź 💡";
  hintButton.id = "maze-hint";
  root.querySelector(".hud").insertAdjacentElement("afterend", hintButton);
  function startLevel(n) {
    level = n;
    map = generateMazeLevel(n);
    if (
      !map.hearts
        .concat(map.finish)
        .every((id) => pathTo(map, map.start, id).length)
    )
      throw Error("Labirynt bez przejścia");
    position = map.start;
    visual = { x: position % map.cols, y: Math.floor(position / map.cols) };
    collected = new Set();
    elapsed = 0;
    cooldown = 0;
    previousDirection = null;
    hintUntil = 0;
    hintNext = null;
    finished = false;
    size = n === 1 ? 82 : 72;
    offsetX = n === 1 ? 73 : 12;
    offsetY = n === 1 ? 35 : 12;
    camera = { x: 0, y: n === 1 ? 0 : Math.max(0, map.rows * size + 24 - 480) };
    terrain = document.createElement("canvas");
    terrain.width = map.cols * size + offsetX * 2;
    terrain.height = map.rows * size + offsetY * 2;
    const bg = terrain.getContext("2d");
    bg.fillStyle = "#fff7e5";
    bg.fillRect(offsetX, offsetY, map.cols * size, map.rows * size);
    map.cells.forEach((cell, i) => {
      const x = offsetX + (i % map.cols) * size,
        y = offsetY + Math.floor(i / map.cols) * size;
      if (cell.walls[0]) drawImage(bg, "hedge", x - 7, y - 10, size + 14, 22);
      if (cell.walls[3])
        drawImage(bg, "hedgeVertical", x - 10, y - 7, 22, size + 14);
      if (i % map.cols === map.cols - 1 && cell.walls[1])
        drawImage(bg, "hedgeVertical", x + size - 10, y - 7, 22, size + 14);
      if (i >= map.cols * (map.rows - 1) && cell.walls[2])
        drawImage(bg, "hedge", x - 7, y + size - 10, size + 14, 22);
    });
  }
  startLevel(1);
  hintButton.onclick = () => {
    if (finished) return;
    hintNext = nearestHint(map, position, collected);
    hintUntil = elapsed + 2;
    sound();
  };
  const stop = loop(
    (dt) => {
      if (finished) return;
      elapsed += dt;
      cooldown -= dt;
      const d = ["up", "right", "down", "left"].findIndex((k) =>
        controls.keys.has(k),
      );
      if (d === -1) {
        previousDirection = null;
        cooldown = 0;
      }
      if (d >= 0 && (cooldown <= 0 || d !== previousDirection)) {
        previousDirection = d;
        cooldown = 0.17;
        if (!map.cells[position].walls[d]) {
          position += [-map.cols, 1, map.cols, -1][d];
          if (map.hearts.includes(position) && !collected.has(position)) {
            collected.add(position);
            sound("collect");
          }
        }
      }
      visual.x += ((position % map.cols) - visual.x) * Math.min(1, dt * 20);
      visual.y +=
        (Math.floor(position / map.cols) - visual.y) * Math.min(1, dt * 20);
      if (level === 2) {
        camera.x = Math.max(
          0,
          Math.min(
            terrain.width - 720,
            offsetX + visual.x * size + size / 2 - 360,
          ),
        );
        camera.y = Math.max(
          0,
          Math.min(
            terrain.height - 480,
            offsetY + visual.y * size + size / 2 - 240,
          ),
        );
      }
      const text = `Poziom ${level}/2 · Serca: ${collected.size}/3 · ${Math.floor(elapsed)} s${position === map.finish && collected.size < 3 ? " · Jeszcze serduszka!" : ""}`;
      if (hud.textContent !== text) hud.textContent = text;
      if (
        position === map.finish &&
        collected.size === 3 &&
        Math.abs(visual.x - (position % map.cols)) < 0.03 &&
        Math.abs(visual.y - Math.floor(position / map.cols)) < 0.03
      ) {
        finished = true;
        if (level === 2) {
          win();
          return;
        }
        sound("win");
        transition = document.createElement("div");
        transition.className = "overlay";
        transition.innerHTML =
          '<div class="dialog" role="dialog" aria-modal="true" aria-label="Poziom 1 ukończony"><h2>Nieźle… ale znajdziesz mnie drugi raz? ❤️</h2><p>Teraz trochę większa przygoda.</p><button class="primary">Poziom 2</button></div>';
        document.body.append(transition);
        transition.querySelector("button").onclick = () => {
          transition.remove();
          transition = null;
          controls.keys.clear();
          startLevel(2);
        };
        transition.querySelector("button").focus();
      }
    },
    () => {
      ctx.fillStyle = "#edf2e7";
      ctx.fillRect(0, 0, 720, 480);
      ctx.drawImage(
        terrain,
        camera.x,
        camera.y,
        Math.min(720, terrain.width - camera.x),
        Math.min(480, terrain.height - camera.y),
        0,
        0,
        Math.min(720, terrain.width - camera.x),
        Math.min(480, terrain.height - camera.y),
      );
      ctx.save();
      ctx.translate(-camera.x, -camera.y);
      for (const id of map.hearts)
        if (!collected.has(id))
          drawImage(
            ctx,
            "heart",
            offsetX + (id % map.cols) * size + size / 2 - 18,
            offsetY + Math.floor(id / map.cols) * size + size / 2 - 18,
            36,
            36,
          );
      drawImage(
        ctx,
        "michalIdle",
        offsetX + (map.finish % map.cols) * size + size / 2 - 22,
        offsetY + Math.floor(map.finish / map.cols) * size + 8,
        44,
        62,
      );
      drawImage(
        ctx,
        "wikaIdle",
        offsetX + visual.x * size + size / 2 - 23,
        offsetY + visual.y * size + 8,
        46,
        65,
      );
      if (elapsed < hintUntil && hintNext !== null) {
        const x = offsetX + (hintNext % map.cols) * size + size / 2,
          y = offsetY + Math.floor(hintNext / map.cols) * size + size / 2;
        ctx.fillStyle = "#c8789760";
        ctx.beginPath();
        ctx.arc(x, y, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#944560";
        ctx.font = "24px system-ui";
        ctx.textAlign = "center";
        ctx.fillText(
          hintNext === position
            ? "♡"
            : hintNext - position === 1
              ? "→"
              : hintNext - position === -1
                ? "←"
                : hintNext - position === map.cols
                  ? "↓"
                  : "↑",
          x,
          y + 8,
        );
      }
      ctx.restore();
    },
  );
  return () => {
    stop();
    controls.destroy();
    hintButton.remove();
    transition?.remove();
  };
}
