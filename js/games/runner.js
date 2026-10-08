import { drawImage, background, input, loop, overlaps } from "./core.js";
import {
  makeLevel,
  makePlayer,
  advancePlatforms,
  stepPlayer,
  canFinishRunner,
} from "./runner-physics.js";
import { sound } from "../audio.js";
export function runner({ root, win }) {
  const ctx = root.querySelector("canvas").getContext("2d"),
    controls = input(root),
    hud = root.querySelector("#score"),
    level = makeLevel(),
    p = makePlayer(level);
  let camera = 0,
    finished = false,
    lastJump = false,
    message = 0,
    messageText = "",
    checkpointSound = false;
  const stop = loop(
    (dt) => {
      if (finished) return;
      advancePlatforms(level, dt);
      message = Math.max(0, message - dt);
      const move =
          Number(controls.keys.has("right")) -
          Number(controls.keys.has("left")),
        jump = controls.keys.has("jump") || controls.keys.has("up");
      if (stepPlayer(p, level, dt, move, jump && !lastJump)) {
        sound("negative");
        message = 2;
        messageText = `Wracasz do ${p.checkpoint.id === 0 ? "startu" : "checkpointu"}`;
      }
      lastJump = jump;
      if (p.checkpoint.id === level.checkpointPlatform && !checkpointSound) {
        checkpointSound = true;
        sound("collect-bonus");
        message = 2;
        messageText = "Checkpoint zapisany ✓";
      }
      camera = Math.max(0, Math.min(level.width - 720, p.x - 250));
      for (const h of level.hearts)
        if (!h.collected && overlaps(p, h)) {
          h.collected = true;
          sound("collect");
        }
      const n = level.hearts.filter((h) => h.collected).length,
        atFinish = p.x > level.finish.x + level.finish.w - 220;
      const text = `Serca: ${n}/7 · ${atFinish && n < 5 ? `Brakuje Ci jeszcze ${5 - n} serduszek ❤️` : message ? messageText : `${checkpointSound ? "Checkpoint ✓ · " : ""}Cel: minimum 5 serc`}`;
      if (hud.textContent !== text) hud.textContent = text;
      if (canFinishRunner(p, level)) {
        finished = true;
        win();
      }
    },
    (t) => {
      background(ctx, t);
      ctx.save();
      ctx.translate(-camera, 0);
      for (const s of level.platforms) {
        if (!s.active || s.x + s.w < camera - 30 || s.x > camera + 750)
          continue;
        const shake =
          s.type === "falling" && s.fallTime > 0 && s.fallTime < 1.15
            ? Math.sin(t * 45) * 2
            : 0;
        drawImage(ctx, "platform", s.x + shake, s.y, s.w, 42);
        if (s.type !== "static") {
          ctx.fillStyle = s.type === "moving" ? "#6397ae" : "#b86f7e";
          ctx.fillRect(s.x + 10, s.y + 8, s.w - 20, 3);
          ctx.font = "14px system-ui";
          ctx.textAlign = "center";
          ctx.fillText(
            s.type === "moving" ? "ruchoma" : "krucha",
            s.x + s.w / 2,
            s.y + 62,
          );
        }
        if (s.id === level.checkpointPlatform) {
          drawImage(ctx, "flag", s.x + 35, s.y - 110, 48, 110);
          ctx.fillStyle = "#536f58";
          ctx.font = "14px system-ui";
          ctx.fillText(
            checkpointSound ? "Checkpoint ✓" : "Checkpoint",
            s.x + 95,
            s.y - 18,
          );
        }
      }
      for (const c of level.crates)
        if (c.x > camera - 50 && c.x < camera + 750)
          drawImage(ctx, "crate", c.x, c.y, c.w, c.h);
      for (const h of level.hearts)
        if (!h.collected && h.x > camera - 50 && h.x < camera + 750)
          drawImage(ctx, "heart", h.x, h.y + Math.sin(t * 3) * 3, h.w, h.h);
      drawImage(ctx, "flag", level.width - 55, level.finish.y - 115, 45, 115);
      drawImage(
        ctx,
        "michalBouquet",
        level.width - 130,
        level.finish.y - 105,
        55,
        105,
      );
      const moving = controls.keys.has("left") || controls.keys.has("right");
      drawImage(
        ctx,
        !p.grounded ? "wikaJump" : moving ? "wikaRun" : "wikaIdle",
        p.x - 8,
        p.y + (moving && p.grounded ? Math.sin(t * 18) * 2 : 0),
        p.w + 16,
        p.h,
        p.direction < 0,
        !p.grounded ? p.direction * 0.06 : 0,
      );
      ctx.restore();
    },
  );
  return () => {
    stop();
    controls.destroy();
  };
}
