async (page) => {
  const c = await page
      .context()
      .browser()
      .newContext({ viewport: { width: 1366, height: 768 } }),
    p = await c.newPage();
  await c.addInitScript(() => {
    let t = performance.now(),
      id = 0;
    const callbacks = new Map();
    Object.defineProperty(performance, "now", { value: () => t });
    requestAnimationFrame = (f) => {
      callbacks.set(++id, f);
      return id;
    };
    cancelAnimationFrame = (id) => callbacks.delete(id);
    window.advance = (n) => {
      for (let i = 0; i < n; i++) {
        t += 1000 / 60;
        const list = [...callbacks.values()];
        callbacks.clear();
        list.forEach((f) => f(t));
      }
    };
    window.feet = {};
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...a) {
      if (
        this.canvas === document.querySelector("canvas") &&
        window.anchors?.[im.assetKey]
      ) {
        const m = this.getTransform(),
          anchor = anchors[im.assetKey];
        feet[im.assetKey.startsWith("duoWika") ? "wika" : "michal"] = {
          x: m.e + m.a * a[2] * anchor.x,
          y: m.f + a[3] * anchor.y,
        };
      }
      return draw.call(this, im, ...a);
    };
  });
  try {
    await p.goto("http://127.0.0.1:4173/");
    await p.locator("#loading").waitFor({ state: "detached" });
    await p.evaluate(async () => {
      anchors = (await import("/js/games/duo-sprite-config.js")).DUO_SPRITES;
    });
    await p.locator("[data-game=duo]").click();
    await p.locator("#duo-panel-action").click();
    const before = await p.evaluate(async () => {
      const { solveDuo } = await import("/scripts/duo-solutions.mjs"),
        r = solveDuo(0),
        until = r.trace.find(
          (t) => t.id === "wika" && t.x === 1030 && t.feet === 610,
        ).frame;
      let held = new Set();
      for (const cs of r.recording.slice(0, until)) {
        const next = new Set();
        for (const id of ["wika", "michal"]) {
          const c = cs[id] || {},
            keys =
              id === "wika"
                ? ["a", "d", "w"]
                : ["ArrowLeft", "ArrowRight", "ArrowUp"];
          if (c.move) next.add(keys[c.move > 0 ? 1 : 0]);
          if (c.jump) {
            dispatchEvent(new KeyboardEvent("keydown", { key: keys[2] }));
            dispatchEvent(new KeyboardEvent("keyup", { key: keys[2] }));
          }
        }
        for (const key of held)
          if (!next.has(key))
            dispatchEvent(new KeyboardEvent("keyup", { key }));
        for (const key of next)
          if (!held.has(key))
            dispatchEvent(new KeyboardEvent("keydown", { key }));
        held = next;
        advance(1);
      }
      for (const key of held)
        dispatchEvent(new KeyboardEvent("keyup", { key }));
      return {
        feet: structuredClone(feet),
        hearts: document.querySelector("#duo-hearts").textContent,
        diamonds: document.querySelector("#duo-diamonds").textContent,
      };
    });
    // Walk into the blue liquid deliberately, without a jump. The lever stays activated.
    await p.keyboard.down("d");
    await p.evaluate(() => {
      for (
        let i = 0;
        i < 200 && !document.querySelector(".duo-notice").textContent;
        i++
      )
        advance(1);
    });
    await p.keyboard.up("d");
    const after = await p.evaluate(() => ({
      feet: structuredClone(feet),
      hearts: document.querySelector("#duo-hearts").textContent,
      diamonds: document.querySelector("#duo-diamonds").textContent,
      notice: document.querySelector(".duo-notice").textContent,
    }));
    if (
      !after.notice.includes("Wika: obcy kolor") ||
      Math.abs(after.feet.wika.x - 132) > 0.01 ||
      Math.abs(after.feet.wika.y - 150) > 1 ||
      Math.abs(after.feet.michal.x - before.feet.michal.x) > 0.01 ||
      Math.abs(after.feet.michal.y - before.feet.michal.y) > 0.01 ||
      after.hearts !== before.hearts ||
      after.diamonds !== before.diamonds
    )
      throw Error(JSON.stringify({ before, after }));
    await p.screenshot({
      path: "output/playwright/quality-duo-respawn.png",
    });
    return {
      before,
      after,
      passed:
        "Only Wika respawned to level start; other player, collectibles and mechanisms preserved",
    };
  } finally {
    await c.close();
  }
};
