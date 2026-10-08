import { drawImage, input, loop } from "./core.js";
import { images } from "../preload.js";
import { sound } from "../audio.js";
import { makeCatcher, stepCatcher } from "./catcher-state.js";
export function catcher({ root, win }) {
  const canvas = root.querySelector("canvas"),
    ctx = canvas.getContext("2d"),
    wrap = root.querySelector(".canvas-wrap"),
    size = () => {
      const portrait = matchMedia(
        "(max-width:650px) and (orientation:portrait)",
      ).matches;
      const ratio = (wrap.clientWidth - 2) / Math.max(1, wrap.clientHeight - 2);
      const height = matchMedia(
        "(pointer:coarse) and (orientation:landscape) and (max-height:600px)",
      ).matches
        ? 360
        : 480;
      return portrait
        ? [480, Math.round(480 / ratio)]
        : [Math.round(height * ratio), height];
    };
  [canvas.width, canvas.height] = size();
  root.querySelector(".game-shell").classList.add("catcher-shell");
  const s = makeCatcher(canvas.width, canvas.height),
    controls = input(root),
    hud = root.querySelector("#score");
  const scoreGroup = document.createElement("div");
  scoreGroup.className = "catcher-score";
  hud.before(scoreGroup);
  scoreGroup.append(hud);
  const rules = document.createElement("small");
  rules.textContent =
    "♥ +1 · bukiet/list +2 · prezent +3 · przepuszczone −1 · złamane −1";
  scoreGroup.append(rules);
  const terrain = document.createElement("canvas");
  function paintTerrain() {
    terrain.width = s.width;
    terrain.height = s.height;
    const bg = terrain.getContext("2d");
    const sky = bg.createLinearGradient(0, 0, 0, s.height);
    sky.addColorStop(0, "#e4f2f8");
    sky.addColorStop(1, "#ffe8ee");
    bg.fillStyle = sky;
    bg.fillRect(0, 0, s.width, s.height);
    const im = images.village;
    // Show the complete illustration at its native aspect ratio. Its transparent
    // sky blends into the painted sky; no rectangular crop cuts the rooftops.
    const scale = Math.min(s.width / im.width, (s.height - 25) / im.height);
    const w = im.width * scale,
      h = im.height * scale;
    bg.drawImage(im, (s.width - w) / 2, s.height - 25 - h, w, h);
    bg.fillStyle = "#f6e8d6";
    bg.fillRect(0, s.height - 25, s.width, 25);
  }
  paintTerrain();
  const resize = () => {
    const [width, height] = size();
    if (width === s.width && height === s.height) return;
    s.x = (s.x / (s.width - 104)) * (width - 104);
    for (const i of s.items) {
      i.x = (i.x / s.width) * width;
      i.y = (i.y / s.height) * height;
      i.speed *= height / s.height;
    }
    s.feedback = [];
    s.width = canvas.width = width;
    s.height = canvas.height = height;
    const fitted = Math.min(
      wrap.clientWidth - 2,
      ((wrap.clientHeight - 2) * width) / height,
    );
    canvas.style.width = `${fitted}px`;
    canvas.style.height = `${(fitted * height) / width}px`;
    paintTerrain();
    controls.clear();
    draw(performance.now() / 1000);
  };
  const viewportObserver = new ResizeObserver(resize);
  viewportObserver.observe(wrap);
  window.addEventListener("resize", resize);
  const stop = loop((dt) => {
    const move =
      Number(controls.keys.has("right")) - Number(controls.keys.has("left"));
    const events = stepCatcher(s, dt, move);
    for (const event of events) {
      if (event === "win") {
        win();
        return;
      }
      if (event === "miss") {
        sound("negative");
        if (!matchMedia("(prefers-reduced-motion:reduce)").matches)
          hud.animate(
            [
              { transform: "translateX(0)" },
              { transform: "translateX(-4px)" },
              { transform: "translateX(3px)" },
              { transform: "translateX(0)" },
            ],
            { duration: 220 },
          );
      } else sound(event);
    }
    const text = `Wynik: ${s.score} · Cel: 20`;
    if (hud.textContent !== text) hud.textContent = text;
  }, draw);
  function draw(t) {
    ctx.drawImage(terrain, 0, 0);
    drawImage(ctx, "cloud", 20, 40, 140, 60);
    drawImage(ctx, "cloud", s.width - 160, 65, 135, 60);
    for (const i of s.items) drawImage(ctx, i.key, i.x, i.y, i.w, i.h);
    const moving = controls.keys.has("left") || controls.keys.has("right");
    drawImage(
      ctx,
      moving ? "wikaRun" : "wikaIdle",
      s.x,
      s.height - 194 + (moving ? Math.sin(t * 16) * 2 : 0),
      104,
      172,
      s.dir < 0,
    );
    for (const p of s.feedback) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = "#c8557b";
      ctx.font = "700 26px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("−1", p.x, p.y - (1 - p.life) * 35);
      ctx.globalAlpha = 1;
    }
  }
  return () => {
    stop();
    controls.destroy();
    viewportObserver.disconnect();
    window.removeEventListener("resize", resize);
  };
}
