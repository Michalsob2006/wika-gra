async (page) => {
  const context = await page
      .context()
      .browser()
      .newContext({
        viewport: { width: 393, height: 852 },
        isMobile: true,
        hasTouch: true,
      }),
    p = await context.newPage(),
    errors = [],
    missing = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("response", (r) => {
    if (r.status() >= 400) missing.push(r.url());
  });
  await context.addInitScript(() => {
    let time = performance.now(),
      id = 0;
    const frames = new Map();
    Object.defineProperty(performance, "now", { value: () => time });
    window.requestAnimationFrame = (f) => {
      frames.set(++id, f);
      return id;
    };
    window.cancelAnimationFrame = (id) => frames.delete(id);
    window.advance = () => {
      time += 1000 / 60;
      window.types = new Set();
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((f) => f(time));
    };
    window.seed = (n) => {
      Math.random = () => {
        n = (1664525 * n + 1013904223) >>> 0;
        return n / 4294967296;
      };
    };
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...args) {
      if (this.canvas === document.querySelector("canvas")) {
        const t = this.getTransform();
        if (im.assetKey === "snakeHead")
          window.head = {
            x: Math.round(t.e / 40 - 0.5),
            y: Math.round(t.f / 40 - 0.5),
          };
        if (im.assetKey?.startsWith("snake")) window.types?.add(im.assetKey);
      }
      return draw.call(this, im, ...args);
    };
  });
  try {
    await p.goto("http://127.0.0.1:4173/");
    await p.locator("#loading").waitFor({ state: "detached" });
    const rounds = [];
    for (let round = 1; round <= 5; round++) {
      await p.evaluate((n) => seed(n), round);
      await p.locator("[data-game=snake]").tap();
      const result = await p.evaluate(() => {
        const cycle = [{ x: 0, y: 0 }];
        for (let y = 0; y < 12; y++) {
          for (let i = 0; i < 8; i++)
            cycle.push({ x: y % 2 ? 8 - i : 1 + i, y });
        }
        for (let y = 11; y > 0; y--) cycle.push({ x: 0, y });
        let last = "",
          frames = 0,
          mixed = false;
        advance();
        while (!document.querySelector(".overlay") && frames++ < 40000) {
          const h = window.head,
            tag = `${h.x},${h.y}`;
          if (tag !== last) {
            const i = cycle.findIndex((c) => c.x === h.x && c.y === h.y);
            if (i < 0) throw Error("Invalid displayed head");
            const n = cycle[(i + 1) % cycle.length],
              key =
                n.x > h.x
                  ? "ArrowRight"
                  : n.x < h.x
                    ? "ArrowLeft"
                    : n.y > h.y
                      ? "ArrowDown"
                      : "ArrowUp";
            dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
            dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true }));
            last = tag;
          }
          advance();
          mixed ||=
            [...types].filter((k) =>
              [
                "snakeHeart",
                "snakeBroken",
                "snakeDark",
                "snakeBouquet",
                "snakeGift",
              ].includes(k),
            ).length > 1;
        }
        return {
          frames,
          seconds: +(frames / 60).toFixed(1),
          mixed,
          score: document.querySelector("#score").innerText,
          dialog: document.querySelector(".dialog")?.textContent,
        };
      });
      if (
        Number(result.score.match(/Wynik: (\d+)/)?.[1]) < 20 ||
        !result.mixed ||
        result.dialog.includes("Koniec rundy")
      )
        throw Error(`Snake ${round}: ${JSON.stringify(result)}`);
      rounds.push({ round, ...result });
      if (round === 5)
        await p.screenshot({
          path: "output/playwright/mobile-fix-snake-win.png",
        });
      await p.locator(".dialog .primary").tap();
    }
    await p.setViewportSize({ width: 1366, height: 768 });
    await p.locator("[data-game=snake]").click();
    if (
      !(await p
        .locator("canvas")
        .evaluate((c) => c.width === 360 && c.height === 480))
    )
      throw Error("Desktop grid differs");
    await p.locator("#home").click();
    if (errors.length || missing.length)
      throw Error(JSON.stringify({ errors, missing }));
    return { rounds, desktopGrid: "9×12", errors, missing };
  } finally {
    await context.close();
  }
};
