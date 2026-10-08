import { assets } from "../assetConfig.js";
import { images } from "../preload.js";
import { sound } from "../audio.js";
import { loop } from "./core.js";
import { DUO_WIDTH, DUO_HEIGHT } from "./duo-levels.js";
import { makeDuo, stepDuo, collectedFor, totalFor } from "./duo-state.js";
import { duoInput } from "./duo-input.js";
import { DUO_SPRITES, DUO_SPRITE_HEIGHT } from "./duo-sprite-config.js";

export function wikaMichal({ root, win }) {
  const shell = root.querySelector(".game-shell"),
    canvas = root.querySelector("canvas"),
    ctx = canvas.getContext("2d"),
    wrap = root.querySelector(".canvas-wrap");
  shell.classList.add("duo-shell");
  root.classList.add("duo-view");
  document.body.classList.add("duo-playing");
  canvas.width = DUO_WIDTH;
  canvas.height = DUO_HEIGHT;
  canvas.setAttribute(
    "aria-label",
    "Wika i Michał: dwie postacie, dwa kolory, wspólna przygoda.",
  );
  wrap.classList.add("duo-stage");
  root.querySelector(".game-heading p:not(.eyebrow)").textContent =
    "Dwa kolory. Jedna drużyna. Wspólna droga przez chmury.";
  root.querySelector(".hud").innerHTML =
    `<div class="duo-level"><span id="duo-number">POZIOM 1 / 2</span><strong id="duo-level-name"></strong></div><div class="duo-counter pink"><img src="${assets.duoWikaIdle}" alt="Wika"><span><small>Wika · serca</small><strong id="duo-hearts">0 / 5</strong></span></div><div class="duo-counter blue"><img src="${assets.duoMichalIdle}" alt="Michał"><span><small>Michał · diamenty</small><strong id="duo-diamonds">0 / 5</strong></span></div><div class="duo-tools"><button class="quiet" id="duo-pause" aria-label="Pauza" aria-pressed="false">Ⅱ Pauza</button><button id="restart" class="quiet" aria-label="Restart poziomu">↻ Restart</button></div>`;
  root.querySelector(".hud").setAttribute("aria-live", "off");
  root.querySelector(".controls").innerHTML =
    '<span class="duo-key pink"><b>Wika</b> <kbd>A</kbd><kbd>D</kbd> ruch · <kbd>W</kbd> skok</span><span class="duo-key blue"><b>Michał</b> <kbd>←</kbd><kbd>→</kbd> ruch · <kbd>↑</kbd> skok</span>';
  root.querySelector(".controls").classList.add("duo-controls");
  root.querySelector(".duo-tools").append(root.querySelector("#home"));
  const touch = document.createElement("div");
  touch.className = "duo-touch";
  touch.innerHTML = ["wika", "michal"]
    .map(
      (id) =>
        `<div class="duo-touch-group ${id}"><span>${id === "wika" ? "Wika" : "Michał"}</span><button data-duo-owner="${id}" data-duo-action="jump" aria-label="${id === "wika" ? "Wika" : "Michał"}: skok">↑</button><div><button data-duo-owner="${id}" data-duo-action="left" aria-label="${id === "wika" ? "Wika" : "Michał"}: w lewo">←</button><button data-duo-owner="${id}" data-duo-action="right" aria-label="${id === "wika" ? "Wika" : "Michał"}: w prawo">→</button></div></div>`,
    )
    .join("");
  shell.append(touch);
  const hint = root.querySelector(".hint");
  hint.classList.add("duo-hint");
  hint.hidden = true;
  const panel = document.createElement("div");
  panel.className = "duo-panel";
  wrap.append(panel);
  const live = document.createElement("p");
  live.className = "duo-notice";
  live.setAttribute("role", "status");
  shell.append(live);
  const hearts = root.querySelector("#duo-hearts"),
    diamonds = root.querySelector("#duo-diamonds"),
    pause = root.querySelector("#duo-pause");
  let s = makeDuo(),
    lastHUD = "",
    lastPaint = "",
    backdrop;
  const cache = new Map();
  // Keep the supplied files separate; cache their actual rendered size, not a sheet.
  function sprite(key, x, y, w, h, flip = false, opacity = 1) {
    const im = images[key];
    if (!im) return;
    const k = `${key}:${Math.round(w)}:${Math.round(h)}`;
    let tile = cache.get(k);
    if (!tile) {
      tile = document.createElement("canvas");
      tile.width = Math.max(1, Math.ceil(w));
      tile.height = Math.max(1, Math.ceil(h));
      tile.assetKey = key;
      tile.getContext("2d").drawImage(im, 0, 0, tile.width, tile.height);
      cache.set(k, tile);
    }
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(x + (flip ? w : 0), y);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(tile, 0, 0, w, h);
    ctx.restore();
  }
  function proportional(key, cx, bottom, height, flip = false, opacity = 1) {
    const im = images[key],
      w = (height * im.width) / im.height;
    sprite(key, cx - w / 2, bottom - height, w, height, flip, opacity);
  }
  function character(p) {
    const key = `duo${p.id === "wika" ? "Wika" : "Michal"}${p.pose[0].toUpperCase() + p.pose.slice(1)}`;
    const im = images[key],
      anchor = DUO_SPRITES[key],
      height = DUO_SPRITE_HEIGHT;
    const width = (height * im.width) / im.height;
    const foot = p.x + p.w / 2,
      flipped = p.facing < 0;
    const x = foot - width * (flipped ? 1 - anchor.x : anchor.x);
    sprite(
      key,
      x,
      p.y + p.h - height * anchor.y,
      width,
      height,
      flipped,
      p.invulnerable > 0 && Math.sin(s.time * 28) > 0 ? 0.5 : 1,
    );
  }
  function platform(p, key = "duoPlatformStraight") {
    if (key === "duoBridgePlatform") {
      const n = Math.ceil(p.w / 100),
        w = p.w / n;
      for (let i = 0; i < n; i++) sprite(key, p.x + i * w, p.y, w + 1, 34);
    } else {
      const n = Math.ceil(p.w / 230),
        w = p.w / n;
      for (let i = 0; i < n; i++) sprite(key, p.x + i * w, p.y, w + 1, 42);
    }
  }
  function staticScene() {
    backdrop = document.createElement("canvas");
    backdrop.width = DUO_WIDTH;
    backdrop.height = DUO_HEIGHT;
    const c = backdrop.getContext("2d");
    c.filter = "blur(3px) saturate(.65)";
    c.drawImage(
      images[s.level.background],
      -4,
      -4,
      DUO_WIDTH + 8,
      DUO_HEIGHT + 8,
    );
    c.filter = "none";
    // Soft veil makes small characters readable against the detailed painted sky.
    c.fillStyle = "rgba(255,250,246,.48)";
    c.fillRect(0, 0, DUO_WIDTH, DUO_HEIGHT);
    // Static geometry is cached after painting into the visible context once.
    ctx.clearRect(0, 0, DUO_WIDTH, DUO_HEIGHT);
    ctx.drawImage(backdrop, 0, 0);
    for (const support of s.level.supports)
      proportional(
        "duoPlatformColumn",
        support.x,
        support.bottom,
        support.bottom - support.top,
      );
    for (const p of s.level.platforms) {
      const pieces = Math.ceil(p.w / 165),
        pw = p.w / pieces;
      for (let i = 0; i < pieces; i++)
        sprite("duoPlatformBlock", p.x + i * pw, p.y + 13, pw + 1, 68);
      platform(p);
      sprite("duoPlatformEdge", p.x + p.w - 72, p.y, 72, 44);
    }
    if (s.level.finalDoor) {
      const d = s.level.finalDoor;
      proportional("duoFinalDoor", d.x + d.w / 2, d.y + d.h, d.h);
    }
    c.drawImage(canvas, 0, 0);
  }
  function draw() {
    const key = `${s.index}:${s.status}:${s.time}:${s.flash}`;
    if (lastPaint === key) return;
    lastPaint = key;
    ctx.drawImage(backdrop, 0, 0);
    for (const g of s.level.gates)
      if (!s.signals[g.control]) {
        for (let y = g.y; y < g.y + g.h; y += 52)
          sprite("duoHeavyBlock", g.x, y, g.w, Math.min(52, g.y + g.h - y));
      }
    for (const b of s.level.bridges) {
      if (s.signals[b.control]) platform(b, "duoBridgePlatform");
      else {
        ctx.setLineDash([6, 7]);
        ctx.strokeStyle = b.control.startsWith("blue") ? "#79aaca" : "#bb87a1";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y + 5);
        ctx.lineTo(b.x + b.w, b.y + 5);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    for (const h of s.level.hazards) {
      const key =
        h.kind === "pink"
          ? "duoPinkLava"
          : h.kind === "blue"
            ? "duoBlueWater"
            : "duoSpikes";
      if (h.kind !== "spikes") {
        ctx.fillStyle = "#ad8085";
        ctx.fillRect(h.x, h.y + 9, h.w, 18);
        ctx.fillStyle = "#e9c9b8";
        ctx.fillRect(h.x - 4, h.y + 8, 5, 22);
        ctx.fillRect(h.x + h.w, h.y + 8, 5, 22);
      }
      sprite(key, h.x, h.y - 3, h.w, 28);
    }
    for (const l of s.lifts) {
      sprite(
        "duoMovingPlatform",
        l.x - 4,
        l.y - 75,
        l.w + 8,
        101,
        false,
        l.active ? 1 : 0.55,
      );
    }
    for (const b of s.buttons) {
      sprite(
        b.owner === "wika" ? "duoButtonPink" : "duoButtonBlue",
        b.x,
        b.y - (b.on ? 13 : 22),
        b.w,
        b.on ? 15 : 25,
      );
    }
    for (const l of s.levers) {
      if (l.on) {
        ctx.fillStyle =
          l.owner === "wika" ? "rgba(236,126,174,.22)" : "rgba(94,170,220,.22)";
        ctx.beginPath();
        ctx.arc(l.x, l.y - 25, 30, 0, Math.PI * 2);
        ctx.fill();
      }
      proportional(
        l.owner === "wika" ? "duoLeverPink" : "duoLeverBlue",
        l.x,
        l.y + 1,
        56,
        l.on,
      );
    }
    for (const d of s.level.doors) {
      const ready =
        collectedFor(s, d.owner) === totalFor(s, d.owner) &&
        (!d.control || s.signals[d.control]);
      proportional(
        d.owner === "wika" ? "duoDoorPink" : "duoDoorBlue",
        d.x + d.w / 2,
        d.y + d.h + 2,
        d.h,
        false,
        ready ? 1 : 0.62,
      );
    }
    for (const i of s.items)
      if (!i.collected)
        proportional(
          i.owner === "wika" ? "duoHeartCollectible" : "duoDiamondCollectible",
          i.x + i.w / 2,
          i.y + i.h + Math.sin(s.time * 3 + i.id) * 2,
          32,
        );
    for (const b of s.blocks)
      sprite(
        b.kind === "crate" ? "duoCrate" : "duoHeavyBlock",
        b.x,
        b.y,
        b.w,
        b.h,
      );
    for (const p of s.players) {
      ctx.fillStyle = "rgba(70,46,63,.13)";
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2, p.y + p.h + 2, 21, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      character(p);
    }
    if (s.flash > 0) {
      ctx.fillStyle = `rgba(255,237,245,${Math.min(0.25, s.flash * 0.2)})`;
      ctx.fillRect(0, 0, DUO_WIDTH, DUO_HEIGHT);
    }
  }
  function updateHUD() {
    const w = collectedFor(s, "wika"),
      m = collectedFor(s, "michal");
    const key = `${s.index}:${w}:${m}:${s.reason}:${s.flash > 0}`;
    if (key === lastHUD) return;
    lastHUD = key;
    root.querySelector("#duo-number").textContent = `POZIOM ${s.index + 1} / 2`;
    root.querySelector("#duo-level-name").textContent = s.level.name;
    hearts.textContent = `${collectedFor(s, "wika")} / ${totalFor(s, "wika")}`;
    diamonds.textContent = `${collectedFor(s, "michal")} / ${totalFor(s, "michal")}`;
    live.textContent = s.flash > 0 ? s.reason : "";
  }
  function showPanel(title, description, button, action, secondary = "") {
    panel.hidden = false;
    panel.innerHTML = `<div class="duo-dialog" role="dialog" aria-label="${title}"><p class="eyebrow">WIKA & MICHAŁ · RAZEM LEPIEJ</p><h2>${title}</h2><p>${description}</p><button class="primary" id="duo-panel-action">${button}</button>${secondary}</div>`;
    panel.querySelector("#duo-panel-action").onclick = action;
    panel.querySelector("#duo-panel-action").focus({ preventScroll: true });
  }
  const controls = duoInput(root, togglePause);
  function startLevel(index, ready = true) {
    s = makeDuo(index);
    controls.clear();
    pause.textContent = "Ⅱ Pauza";
    pause.setAttribute("aria-pressed", "false");
    lastHUD = "";
    lastPaint = "";
    staticScene();
    updateHUD();
    draw();
    if (ready) {
      s.status = "ready";
      showPanel(
        s.level.name,
        s.level.intro,
        index ? "Zaczynamy poziom 2" : "Zagrajmy razem",
        () => {
          controls.clear();
          s.status = "playing";
          panel.hidden = true;
          sound("click");
        },
      );
    } else panel.hidden = true;
  }
  function togglePause() {
    if (s.status === "playing") {
      s.status = "paused";
      controls.clear();
      pause.textContent = "▶ Wznów";
      pause.setAttribute("aria-pressed", "true");
      showPanel(
        "Chwila dla nas",
        "Przygoda zaczeka. P / Esc również wznawia grę.",
        "Wracamy do gry",
        togglePause,
      );
    } else if (s.status === "paused") {
      s.status = "playing";
      controls.clear();
      panel.hidden = true;
      pause.textContent = "Ⅱ Pauza";
      pause.setAttribute("aria-pressed", "false");
    }
  }
  root.querySelector("#restart").onclick = () => {
    sound("click");
    startLevel(s.index, false);
  };
  pause.onclick = togglePause;
  const autoPause = () => {
    if (s.status === "playing") togglePause();
  };
  const visibility = () => {
    if (document.hidden) autoPause();
  };
  window.addEventListener("blur", autoPause);
  document.addEventListener("visibilitychange", visibility);
  startLevel(0);
  const stop = loop((dt) => {
    const events = stepDuo(s, dt, controls.read());
    for (const event of new Set(events)) {
      if (event === "heart") sound("collect-heart");
      if (event === "diamond") sound("collect-bonus");
      if (event === "mechanism") sound("click");
      if (event === "respawn" || event === "block-respawn") {
        sound("negative");
      }
      if (event === "complete") {
        controls.clear();
        sound("win");
        if (s.index === 0)
          showPanel(
            "Pierwszy poziom za nami ♥",
            "Oboje przy drzwiach i wszystkie klejnoty zebrane. W chmurach czeka kolejna wspólna zagadka.",
            "Poziom 2 →",
            () => startLevel(1),
          );
        else
          showPanel(
            "Razem otwieramy każde drzwi ♥",
            "Dwa poziomy, dwa kolory i jedna drużyna. Wasza wspólna przygoda jest ukończona.",
            "Zapisz naszą przygodę",
            () => win(),
          );
      }
    }
    updateHUD();
  }, draw);
  return () => {
    stop();
    controls.destroy();
    window.removeEventListener("blur", autoPause);
    document.removeEventListener("visibilitychange", visibility);
    panel.remove();
    cache.clear();
    root.classList.remove("duo-view");
    document.body.classList.remove("duo-playing");
  };
}
