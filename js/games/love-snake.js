import {
  COLS,
  ROWS,
  makeSnake,
  requestDirection,
  tickInterval,
  elapse,
  stepSnake,
  items,
  readBest,
  saveBest,
} from "./snake-state.js";
import { drawImage, loop, input } from "./core.js";
import { sound } from "../audio.js";
export function loveSnake({ root, win }) {
  const shell = root.querySelector(".game-shell"),
    canvas = root.querySelector("canvas"),
    ctx = canvas.getContext("2d");
  shell.classList.add("snake-shell");
  const TILE = 40;
  canvas.width = COLS * TILE;
  canvas.height = ROWS * TILE;
  const restart = root.querySelector("#restart").onclick;
  root.querySelector(".hud").innerHTML =
    '<div class="snake-stat" id="score" aria-live="polite"></div><div class="snake-stat" id="snake-best"></div><button id="restart" class="quiet">Od nowa</button>';
  // The existing app owns restart/navigation; preserve its restart handler.
  root.querySelector("#restart").onclick = restart;
  const score = root.querySelector("#score"),
    bestNode = root.querySelector("#snake-best");
  const legend = document.createElement("p");
  legend.className = "snake-legend";
  legend.textContent =
    "♥ +1 · Bukiet +2 · Prezent +3 · Złamane −2 · Ciemne −1 · Bonusy znikają po kilku sekundach";
  shell.append(legend);
  let s = makeSnake(),
    best = readBest(),
    accumulator = 0,
    flash = 0,
    pulse = 0,
    particles = [],
    active = true,
    started = false;
  const keys = {
    ArrowUp: "up",
    w: "up",
    ArrowDown: "down",
    s: "down",
    ArrowLeft: "left",
    a: "left",
    ArrowRight: "right",
    d: "right",
  };
  const direction = (d) => {
    if (
      !document.body.classList.contains("game-paused") &&
      requestDirection(s, d)
    ) {
      started = true;
      root.querySelector(".hint").textContent =
        "Strzałki / WASD · na telefonie użyj przycisków";
    }
  };
  root.querySelector(".hint").textContent =
    "Naciśnij kierunek, by zacząć · ściana lub ciało kończy rundę";
  const controls = input(root);
  const keydown = (e) => {
    const d = keys[e.key] || keys[e.key.toLowerCase()];
    if (d) {
      e.preventDefault();
      if (!e.repeat) direction(d);
    }
  };
  window.addEventListener("keydown", keydown);
  const buttons = [...root.querySelectorAll("[data-control]")];
  const pointer = (e) => {
    e.preventDefault();
    direction(e.currentTarget.dataset.control);
    sound("button");
  };
  buttons.forEach((b) => b.addEventListener("pointerdown", pointer));
  const hud = () => {
    score.innerHTML = `Wynik: <strong>${s.score} / 20</strong>`;
    bestNode.innerHTML = `Najlepszy wynik<strong>${best}</strong>`;
  };
  hud();
  const terrain = document.createElement("canvas");
  terrain.width = canvas.width;
  terrain.height = canvas.height;
  const bg = terrain.getContext("2d");
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) {
      bg.fillStyle = (x + y) % 2 ? "#fff8f3" : "#fff3f0";
      bg.fillRect(x * TILE, y * TILE, TILE, TILE);
      bg.strokeStyle = "#f0e3df";
      bg.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE, TILE);
    }
  function gameOver() {
    sound("game-over");
    active = false;
    cancel();
    const el = document.createElement("div");
    el.className = "overlay";
    el.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-label="Koniec rundy Love Snake"><h2>Jeszcze jedno serduszko?</h2><p>Koniec rundy · Wynik: ${s.score} / 20</p><p>Najlepszy wynik: ${best}</p><button class="primary">Spróbuj ponownie</button><button class="quiet">Wróć do menu</button></div>`;
    document.body.append(el);
    el.querySelector(".primary").onclick = () => {
      sound("button");
      el.remove();
      root.querySelector("#restart").click();
    };
    el.querySelector(".quiet").onclick = () =>
      root.querySelector("#home").click();
    el.querySelector(".primary").focus();
  }
  const cancel = loop(
    (dt) => {
      if (!active) return;
      elapse(s, dt);
      flash = Math.max(0, flash - dt);
      pulse = Math.max(0, pulse - dt);
      particles = particles.filter((p) => {
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        return p.life > 0;
      });
      if (!started) return;
      accumulator += dt;
      if (accumulator >= tickInterval(s)) {
        accumulator -= tickInterval(s);
        const result = stepSnake(s);
        if (result === "dead") {
          gameOver();
          return;
        }
        if (s.pickup) {
          if (s.score > best) {
            best = s.score;
            saveBest(best);
          }
          hud();
          pulse = 0.35;
          if (s.pickup.points > 0) {
            sound(
              s.pickup.type === "heart" ? "collect-heart" : "collect-bonus",
            );
            for (let i = 0; i < 7; i++)
              particles.push({
                x: (s.pickup.x + 0.5) * TILE,
                y: (s.pickup.y + 0.5) * TILE,
                vx: (Math.random() - 0.5) * 90,
                vy: -30 - Math.random() * 60,
                life: 0.5,
              });
          } else {
            sound(s.pickup.type === "dark" ? "danger" : "negative");
            flash = 0.28;
          }
        }
        if (result === "won") {
          active = false;
          win();
        }
      }
    },
    (time) => {
      ctx.drawImage(terrain, 0, 0);
      for (const activeItem of s.items) {
        const item = items.find((i) => i.type === activeItem.type),
          size = TILE * 0.76;
        drawImage(
          ctx,
          item.asset,
          (activeItem.x + 0.5) * TILE - size / 2,
          (activeItem.y + 0.5) * TILE - size / 2,
          size,
          size,
        );
      }
      // Smooth movement between logical cells. Collision and pickups use only grid coordinates.
      const a = started ? Math.min(1, accumulator / tickInterval(s)) : 1;
      for (let i = s.body.length - 1; i >= 0; i--) {
        const p = s.body[i],
          old = s.previous[Math.min(i, s.previous.length - 1)] || p,
          x = (old.x + (p.x - old.x) * a + 0.5) * TILE,
          y = (old.y + (p.y - old.y) * a + 0.5) * TILE;
        const size = TILE * (i === 0 ? 0.89 + (pulse > 0 ? 0.01 : 0) : 0.82);
        drawImage(
          ctx,
          i === 0
            ? "snakeHead"
            : i === s.body.length - 1
              ? "snakeTail"
              : "snakeBody",
          x - size / 2,
          y - size / 2,
          size,
          size,
        );
      }
      for (const p of particles) {
        ctx.globalAlpha = p.life / 0.5;
        drawImage(ctx, "snakeHeart", p.x - 5, p.y - 5, 10, 10);
      }
      ctx.globalAlpha = 1;
      if (flash) {
        ctx.fillStyle = `rgba(123,35,59,${flash * 0.8})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    },
  );
  function stop() {
    active = false;
    cancel();
    controls.destroy();
    window.removeEventListener("keydown", keydown);
    buttons.forEach((b) => b.removeEventListener("pointerdown", pointer));
  }
  return stop;
}
