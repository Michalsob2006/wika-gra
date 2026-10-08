import { drawImage, input, loop } from "./core.js";
import { makeHunt, stepHunt, queueHuntTurn } from "./gift-hunt-state.js";
import { cellCenter } from "./gift-hunt-map.js";
import { assets } from "../assetConfig.js";
import { sound } from "../audio.js";
export function giftHunt({ root, win }) {
  const canvas = root.querySelector("canvas"),
    ctx = canvas.getContext("2d"),
    controls = input(root),
    hud = root.querySelector("#score"),
    state = makeHunt(),
    map = state.map,
    tile = map.tile;
  const panel = document.createElement("div");
  panel.className = "hunt-panel";
  panel.hidden = true;
  root.querySelector(".canvas-wrap").append(panel);
  canvas.width = map.cols * tile;
  canvas.height = map.rows * tile;
  canvas.style.aspectRatio = `${map.cols} / ${map.rows}`;
  root.querySelector(".game-shell").style.maxWidth =
    "min(850px, max(340px, 76vh))";
  canvas.setAttribute(
    "aria-label",
    "Gift Hunt: cała plansza 15 na 11 pól, korytarze z żywopłotami",
  );
  root.querySelector(".hint").textContent =
    "Strzałki / WASD lub D-pad · ruch trwa do ściany · możesz wcześniej wybrać skręt";
  const terrain = document.createElement("canvas");
  terrain.width = canvas.width;
  terrain.height = canvas.height;
  const bg = terrain.getContext("2d");
  bg.fillStyle = "#f6efde";
  bg.fillRect(0, 0, terrain.width, terrain.height);
  // Walls are baked once. Join neighbouring hedge cells into continuous rows.
  for (let y = 0; y < map.rows; y++) {
    let x = 0;
    while (x < map.cols) {
      if (map.cells[y * map.cols + x]) {
        x++;
        continue;
      }
      const start = x;
      while (x < map.cols && !map.cells[y * map.cols + x]) x++;
      for (let col = start; col < x; col++)
        drawImage(bg, "hedge", col * tile, y * tile + 3, tile + 1, tile - 6);
    }
  }
  let lastStatus = "",
    opening = 0;
  const keys = {
    arrowup: 0,
    w: 0,
    arrowright: 1,
    d: 1,
    arrowdown: 2,
    s: 2,
    arrowleft: 3,
    a: 3,
  };
  const onKey = (e) => {
    const direction = keys[e.key.toLowerCase()];
    if (
      direction !== undefined &&
      !e.repeat &&
      !document.body.classList.contains("game-paused")
    )
      queueHuntTurn(state, direction);
  };
  const onPointer = (e) => {
    const control = e.target.closest("[data-control]")?.dataset.control;
    const direction = ["up", "right", "down", "left"].indexOf(control);
    if (direction >= 0 && !document.body.classList.contains("game-paused"))
      queueHuntTurn(state, direction);
  };
  const onPanel = (e) => {
    const action = e.target.closest("[data-hunt-action]")?.dataset.huntAction;
    if (action === "retry") root.querySelector("#restart").click();
    if (action === "home") root.querySelector("#home").click();
  };
  window.addEventListener("keydown", onKey);
  root.addEventListener("pointerdown", onPointer);
  panel.addEventListener("click", onPanel);
  const stop = loop(
    (dt) => {
      if (state.opened) {
        opening += dt;
        if (opening > 0.85) win();
        return;
      }
      if (state.gameOver) return;
      // Turns are queued at the input event, including taps between frames.
      const events = stepHunt(state, dt);
      if (events.includes("collect")) sound("collect-bonus");
      else if (events.includes("heart")) sound("collect-heart");
      if (events.includes("game-over")) {
        sound("game-over");
        controls.keys.clear();
        panel.hidden = false;
        panel.innerHTML =
          '<div class="dialog" role="dialog" aria-modal="true" aria-label="Koniec gry"><h2>Skończyły się serduszka</h2><p>Broken hearts wygrały tę rundę, ale prezent nadal czeka.</p><button class="primary" data-hunt-action="retry">Spróbuj ponownie</button><button class="quiet" data-hunt-action="home">Wróć do menu</button></div>';
      } else if (events.includes("hit")) sound("danger");
      if (events.includes("win")) controls.keys.clear();
      const status =
        state.items.map((i) => (i.collected ? "✓" : "□")).join("") +
        state.score +
        ":" +
        state.lives;
      if (status !== lastStatus) {
        lastStatus = status;
        hud.innerHTML = `<span class="hunt-inventory">${state.items.map((i) => `<span aria-label="${i.label}: ${i.collected ? "zebrany" : "do zebrania"}"><img src="${assets[i.key]}" alt=""> ${i.collected ? "✓" : "□"}</span>`).join("")}</span><span class="hunt-lives" aria-label="Życia: ${state.lives} z 3">${"❤️".repeat(state.lives)}${"♡".repeat(3 - state.lives)}</span><span class="hunt-goal">Serduszka: ${state.score} · ${state.giftActive ? "Prezent odblokowany!" : "Znajdź 3 przedmioty"}</span>`;
      }
    },
    (t) => {
      ctx.drawImage(terrain, 0, 0);
      for (const heart of state.smallHearts)
        if (!heart.collected) {
          const c = cellCenter(map, heart.cell);
          drawImage(ctx, "heart", c.x - 7, c.y - 7, 14, 14);
        }
      for (const item of state.items)
        if (!item.collected) {
          ctx.fillStyle = "#fae8ed";
          ctx.beginPath();
          ctx.arc(item.x, item.y, 19, 0, Math.PI * 2);
          ctx.fill();
          drawImage(ctx, item.key, item.x - 18, item.y - 18, 36, 36);
        }
      const g = state.gift,
        pulse = state.giftActive ? 1 + Math.sin(t * 3) * 0.055 : 1;
      ctx.save();
      if (!state.giftActive) {
        ctx.globalAlpha = 0.42;
        ctx.filter = "grayscale(1)";
      }
      const giftSize = 40 * pulse + opening * 36;
      drawImage(
        ctx,
        "gift",
        g.x - giftSize / 2,
        g.y - giftSize / 2,
        giftSize,
        giftSize,
        false,
        opening * 0.12,
      );
      ctx.restore();
      for (const h of state.hazards)
        drawImage(ctx, "broken", h.x - 19, h.y - 17, 38, 34);
      const p = state.player,
        moving = p.target !== null;
      ctx.save();
      if (state.invulnerable > 0)
        ctx.globalAlpha = Math.sin(t * Math.PI * 5) > 0 ? 0.35 : 1;
      // The body fits the corridor; the portrait extends upwards to stay readable
      // when the whole board is scaled to a narrow phone screen.
      drawImage(
        ctx,
        moving ? "wikaRun" : "wikaIdle",
        p.x - 22,
        p.y - 43 + (moving ? Math.sin(t * 15) * 1.2 : 0),
        44,
        66,
        p.direction === 3,
      );
      ctx.restore();
      for (const effect of state.effects) {
        const c = cellCenter(map, effect.cell);
        ctx.save();
        ctx.globalAlpha = 1 - effect.age / 0.55;
        const size = 20 + effect.age * 12;
        drawImage(
          ctx,
          effect.key,
          c.x - size / 2,
          c.y - 15 - effect.age * 35,
          size,
          size,
        );
        ctx.restore();
      }
      if (state.opened) {
        ctx.fillStyle = `rgba(255,249,244,${Math.min(0.85, opening)})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < 9; i++)
          drawImage(
            ctx,
            "heart",
            g.x + Math.cos(i * 0.7) * opening * 120,
            g.y - 30 - opening * (50 + i * 16),
            25,
            25,
          );
      }
    },
  );
  return () => {
    stop();
    controls.destroy();
    window.removeEventListener("keydown", onKey);
    root.removeEventListener("pointerdown", onPointer);
    panel.removeEventListener("click", onPanel);
  };
}
