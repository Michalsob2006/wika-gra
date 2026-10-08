import { createDashScenery } from "./dash-scenery.js?v=dash-goal-20";
import { assets } from "../assetConfig.js";
import { images } from "../preload.js";
import { drawImage, input, loop } from "./core.js";
import { sound } from "../audio.js";
import {
  DASH_H,
  GROUND,
  HERO,
  DASH_GOAL,
  makeDash,
  stepDash,
  requestDashAction,
  crouching,
} from "./dash-state.js?v=dash-goal-20";
export function wikaDash({ root, win }) {
  const shell = root.querySelector(".game-shell"),
    canvas = root.querySelector("canvas"),
    ctx = canvas.getContext("2d");
  shell.classList.add("dash-shell");
  const viewWidth = () =>
    matchMedia("(max-width:650px) and (orientation:portrait)").matches
      ? 480
      : matchMedia("(pointer:coarse)").matches
        ? 1080
        : 1440;
  canvas.width = viewWidth();
  const viewHeight = () =>
    matchMedia(
      "(pointer:coarse) and (orientation:landscape) and (max-height:600px)",
    ).matches
      ? 430
      : DASH_H;
  canvas.height = viewHeight();
  canvas.setAttribute(
    "aria-label",
    "Wika Dash: skacz nad skrzynkami i ślizgaj się pod ptaszkami",
  );
  const wrap = root.querySelector(".canvas-wrap");
  wrap.classList.add("dash-stage");
  const home = root.querySelector("#home");
  home.innerHTML = `<img src="${assets.dashBackButton}" alt=""><span>Wróć do menu</span>`;
  const restart = root.querySelector("#restart").onclick;
  root.querySelector(".hud").setAttribute("aria-live", "off");
  root.querySelector(".hud").innerHTML =
    `<div class="dash-stat"><span>Dystans</span><strong id="dash-distance">0 m</strong></div><div class="dash-stat"><span>Serduszka</span><strong id="score">♡ 0</strong></div><button id="dash-pause" class="dash-icon" aria-label="Pauza" aria-pressed="false"><img src="${assets.dashPauseButton}" alt=""></button><button id="restart" class="quiet">Od nowa</button>`;
  root.querySelector("#restart").onclick = restart;
  const controlsNode = root.querySelector(".controls");
  controlsNode.classList.add("dash-controls");
  controlsNode.innerHTML = `<button class="control dash-action" data-control="jump" aria-label="Skok"><img src="${assets.dashJumpButton}" alt=""><span>Skok</span></button><button class="control dash-action" data-control="crouch" aria-label="Ślizg"><img src="${assets.dashCrouchButton}" alt=""><span>Ślizg</span></button>`;
  root.querySelector(".hint").textContent =
    "Spacja / ↑ / W: skok · ↓ / S: ślizg · P / Esc: pauza";
  const goal = document.createElement("div");
  goal.className = "dash-goal";
  goal.setAttribute("aria-live", "polite");
  goal.innerHTML = `<span>Cel: ${DASH_GOAL.distance} m i ${DASH_GOAL.hearts} serduszek</span><button class="play" id="dash-finish" hidden>Zapisz przygodę ✓</button>`;
  shell.append(goal);
  const distance = root.querySelector("#dash-distance"),
    heart = root.querySelector("#score"),
    pause = root.querySelector("#dash-pause"),
    finish = root.querySelector("#dash-finish");
  const controls = input(root),
    s = makeDash();
  s.viewWidth = canvas.width;
  let lastHUD = "",
    disposed = false;
  let lastPaint;
  const onResize = () => {
    const width = viewWidth(),
      height = viewHeight();
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    s.viewWidth = width;
    lastPaint = null;
  };
  window.addEventListener("resize", onResize);
  const panel = document.createElement("div");
  panel.className = "dash-panel";
  wrap.append(panel);
  function panelContent(title, body, buttons) {
    panel.hidden = false;
    panel.innerHTML = `<div role="dialog" aria-label="${title}"><p class="eyebrow">WIKA DASH · NASZA PRZYGODA</p><h2>${title}</h2><p>${body}</p>${buttons}</div>`;
  }
  function start() {
    panel.hidden = true;
    s.status = "playing";
  }
  function setPause() {
    if (s.status === "playing") {
      s.status = "paused";
      controls.clear();
      s.jumpBuffer = 0;
      pause.setAttribute("aria-pressed", "true");
      pause.setAttribute("aria-label", "Wznów bieg");
      panelContent(
        "Mała przerwa ♡",
        "Nasza przygoda poczeka na Ciebie.",
        '<button class="primary" id="dash-resume">Biegnij dalej</button>',
      );
      panel.querySelector("button").onclick = () => {
        start();
        pause.setAttribute("aria-pressed", "false");
        pause.setAttribute("aria-label", "Pauza");
        pause.focus();
      };
      panel.querySelector("button").focus();
    } else if (s.status === "paused") {
      start();
      pause.setAttribute("aria-pressed", "false");
      pause.setAttribute("aria-label", "Pauza");
    }
  }
  function gameOver() {
    stop();
    sound("game-over");
    pause.disabled = true;
    controls.clear();
    panelContent(
      "Jeszcze jeden spacer?",
      `${Math.floor(s.distance)} m · ${s.hearts} serduszek. Skrzynki przeskakujemy, pod ptaszkami się ślizgamy.`,
      `<button class="primary" id="dash-retry">Jeszcze raz</button>${s.eligible ? '<button class="play" id="dash-save">Zapisz przygodę ✓</button>' : ""}<button class="quiet" id="dash-menu">Wróć do menu</button>`,
    );
    panel.querySelector("#dash-retry").onclick = () =>
      root.querySelector("#restart").click();
    panel.querySelector("#dash-menu").onclick = () => home.click();
    panel.querySelector("#dash-save")?.addEventListener("click", win);
    panel.querySelector("#dash-retry").focus();
  }
  function completeRun() {
    s.status = "won";
    stop();
    pause.disabled = true;
    controls.clear();
    panelContent(
      "Przygoda ukończona ❤️",
      `${Math.floor(s.distance)} m · ${s.hearts} serduszek. Cel 500 m i 20 serduszek zdobyty!`,
      '<button class="primary" id="dash-save">Zapisz przygodę ✓</button><button class="quiet" id="dash-menu">Wróć do menu</button>',
    );
    panel.querySelector("#dash-save").onclick = win;
    panel.querySelector("#dash-menu").onclick = () => home.click();
    panel.querySelector("#dash-save").focus();
  }
  panelContent(
    "Gotowa na małą przygodę?",
    "Biegniesz sama. Skacz nad skrzynkami i ślizgaj się pod ptaszkami. Zbieraj serduszka po drodze.",
    '<button class="primary" id="dash-start">Zacznij bieg ♡</button>',
  );
  panel.querySelector("#dash-start").onclick = start;
  pause.onclick = setPause;
  finish.onclick = () => {
    if (s.eligible) win();
  };
  const action = (name) => requestDashAction(s, name);
  const onKey = (e) => {
    const name = e.key.toLowerCase();
    if ([" ", "arrowup", "w", "arrowdown", "s", "p", "escape"].includes(name)) {
      e.preventDefault();
      if (e.repeat) return;
      if (name === "p" || name === "escape") {
        setPause();
        return;
      }
      if (s.status === "ready") start();
      action([" ", "arrowup", "w"].includes(name) ? "jump" : "crouch");
    }
  };
  const onPointer = (e) => {
    const button = e.target.closest("[data-control]");
    if (button) {
      if (s.status === "ready") start();
      if (button.dataset.control === "crouch") controls.keys.add("crouch");
      action(button.dataset.control);
    }
  };
  window.addEventListener("keydown", onKey);
  controlsNode.addEventListener("pointerdown", onPointer);
  const onBlur = () => {
    if (s.status === "playing") setPause();
  };
  window.addEventListener("blur", onBlur);
  const onVisibility = () => {
    if (document.hidden) onBlur();
  };
  document.addEventListener("visibilitychange", onVisibility);
  const scenery = createDashScenery(images);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stop = loop(
    (dt) => {
      const events = stepDash(s, dt, {
        crouch: controls.keys.has("crouch") || controls.keys.has("down"),
      });
      if (events.includes("heart")) sound("collect-heart");
      if (events.includes("hit")) {
        gameOver();
        return;
      }
      if (events.includes("goal")) {
        goal.classList.add("reached");
        finish.hidden = false;
        completeRun();
      }
      const stamp = `${Math.floor(s.distance)}:${s.hearts}`;
      if (stamp !== lastHUD) {
        lastHUD = stamp;
        distance.textContent = `${Math.floor(s.distance)} m`;
        heart.textContent = `♡ ${s.hearts}`;
        finish.hidden = !s.eligible;
      }
    },
    () => {
      const stamp = `${s.status}:${s.elapsed}:${s.hearts}`;
      if (stamp === lastPaint) return;
      lastPaint = stamp;
      ctx.save();
      ctx.translate(0, canvas.height - DASH_H);
      scenery.draw(ctx, canvas.width, s.travel, s.distance, reduce);
      const crouch = crouching(s),
        height = crouch ? HERO.crouchHeight : HERO.height,
        width = crouch
          ? (height * images.dashCrouch.width) / images.dashCrouch.height
          : (height * images[s.grounded ? "dashRun" : "dashJump"].width) /
            images[s.grounded ? "dashRun" : "dashJump"].height;
      for (const item of s.items)
        drawImage(ctx, "dashHeart", item.x - s.travel, item.y, item.w, item.h);
      for (const o of s.obstacles)
        drawImage(
          ctx,
          o.kind === "crate" ? "dashCrate" : "dashBird",
          o.x - s.travel,
          o.y +
            (o.kind === "bird" && !reduce ? Math.sin(s.elapsed * 4) * 3 : 0),
          o.w,
          o.h,
        );
      const bounce =
        s.status === "playing" && s.grounded && !crouch && !reduce
          ? Math.sin(s.elapsed * 16) * 2
          : 0;
      drawImage(
        ctx,
        !s.grounded ? "dashJump" : crouch ? "dashCrouch" : "dashRun",
        HERO.x,
        s.feet - height + bounce,
        width,
        height,
      );
      for (const p of s.particles) {
        ctx.globalAlpha = 1 - p.age / 0.55;
        drawImage(ctx, "dashHeart", p.x - 9, p.y - p.age * 95, 18, 18);
      }
      ctx.globalAlpha = 1;
      // Subtle foreground petals, away from the actionable lane.
      if (!reduce) {
        ctx.fillStyle = "#ee9cae70";
        for (let i = 0; i < 6; i++) {
          const x = (i * 137 - s.elapsed * 9 + 800) % canvas.width,
            y = 100 + i * 40 + Math.sin(s.elapsed + i) * 8;
          ctx.beginPath();
          ctx.ellipse(x, y, 4, 8, -0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    },
  );
  return () => {
    if (disposed) return;
    disposed = true;
    stop();
    controls.destroy();
    window.removeEventListener("resize", onResize);
    window.removeEventListener("keydown", onKey);
    controlsNode.removeEventListener("pointerdown", onPointer);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("visibilitychange", onVisibility);
    panel.remove();
  };
}
