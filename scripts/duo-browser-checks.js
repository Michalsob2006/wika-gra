async (page) => {
  const context = await page
      .context()
      .browser()
      .newContext({ viewport: { width: 1280, height: 800 } }),
    p = await context.newPage(),
    errors = [],
    missing = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("response", (r) => {
    if (
      r.status() >= 400 &&
      !/\/assets\/photos\/memory\/photo[1-8]\.webp$/.test(r.url())
    )
      missing.push(r.url());
  });
  await context.addInitScript(() => {
    if (!localStorage.getItem("wiki-anniversary-v1"))
      localStorage.setItem(
        "wiki-anniversary-v1",
        JSON.stringify([
          "catcher",
          "maze",
          "runner",
          "memory",
          "quest",
          "snake",
        ]),
      );
    let time = performance.now(),
      id = 0;
    const frames = new Map();
    Object.defineProperty(performance, "now", { value: () => time });
    window.requestAnimationFrame = (f) => {
      frames.set(++id, f);
      return id;
    };
    window.cancelAnimationFrame = (id) => frames.delete(id);
    window.advance = (n) => {
      for (let i = 0; i < n; i++) {
        time += 1000 / 60;
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((f) => f(time));
      }
    };
    window.drawn = new Set();
    window.positions = {};
    window.latestPlayers = {};
    window.heavyTrace = [];
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...args) {
      if (im?.assetKey?.startsWith("duo")) {
        window.drawn.add(im.assetKey);
        if (
          this.canvas.width === 1200 &&
          im.assetKey === "duoHeavyBlock" &&
          args[2] === 76 &&
          args[3] === 80
        )
          window.heavyTrace.push(this.getTransform().e);
        if (
          this.canvas.width === 1200 &&
          /duo(Wika|Michal)(Walk|Idle|Push|Jump)/.test(im.assetKey)
        ) {
          window.positions[im.assetKey] = [
            this.getTransform().e,
            this.getTransform().f,
            ...args,
          ];
          window.latestPlayers[
            im.assetKey.startsWith("duoWika") ? "wika" : "michal"
          ] = [this.getTransform().e, this.getTransform().f, im.assetKey];
        }
      }
      return draw.call(this, im, ...args);
    };
  });
  const check = (ok, message) => {
    if (!ok) throw Error(message);
  };
  try {
    const network = await context.newCDPSession(p);
    await network.send("Network.enable");
    await network.send("Network.setCacheDisabled", { cacheDisabled: true });
    await p.goto("http://127.0.0.1:4173/?v=duo-final-qa");
    await p.locator(".cards-cover").first().waitFor();
    await p.locator("#loading").waitFor({ state: "detached" });
    check((await p.locator("[data-game]").count()) === 7, "Seven games");
    check(
      (await p.getByText("Postęp · 6/6").count()) === 1,
      "Legacy progress preserved",
    );
    await p.screenshot({
      path: "output/playwright/duo-menu-desktop.png",
      fullPage: true,
    });
    await p.locator('[data-game="duo"]').click();
    await p.locator("#duo-panel-action").click();
    await p.evaluate(() => window.advance(5));
    await p.screenshot({ path: "output/playwright/quality-duo-level1.png" });
    const layouts = [];
    for (const [width, height] of [
      [1280, 800],
      [1440, 900],
      [1366, 768],
    ]) {
      await p.setViewportSize({ width, height });
      await p.waitForTimeout(80);
      const geo = await p.evaluate(() => {
        const r = (s) => {
          const b = document.querySelector(s).getBoundingClientRect();
          return { x: b.x, y: b.y, w: b.width, h: b.height, bottom: b.bottom };
        };
        return {
          board: r("canvas"),
          controls: r(".duo-controls"),

          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      check(
        !geo.overflow &&
          geo.board.x >= 0 &&
          geo.board.x + geo.board.w <= width + 1 &&
          geo.controls.bottom <= height,
        `Fits ${width}×${height}: ${JSON.stringify(geo)}`,
      );
      layouts.push({ width, height, ...geo });
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    // Simultaneous real browser keys and distinct jump poses; release/blur/pause later.
    await p.keyboard.down("d");
    await p.keyboard.down("ArrowLeft");
    await p.evaluate(() => window.advance(12));
    check(
      await p.evaluate(
        () =>
          window.drawn.has("duoWikaWalk") && window.drawn.has("duoMichalWalk"),
      ),
      "Separate walking assets",
    );
    await p.keyboard.up("d");
    await p.keyboard.up("ArrowLeft");
    await p.keyboard.press("w");
    await p.keyboard.press("ArrowUp");
    await p.evaluate(() => window.advance(12));
    check(
      await p.evaluate(
        () =>
          window.drawn.has("duoWikaJump") && window.drawn.has("duoMichalJump"),
      ),
      "Separate jumps",
    );
    await p.screenshot({ path: "output/playwright/duo-jump-desktop.png" });
    await p.keyboard.press("p");
    await p.getByRole("heading", { name: "Chwila dla nas" }).waitFor();
    const paused = await p.evaluate(() => JSON.stringify(window.positions));
    await p.evaluate(() => window.advance(120));
    check(
      (await p.evaluate(() => JSON.stringify(window.positions))) === paused,
      "Pause freezes players",
    );
    await p.keyboard.press("Escape");
    check(await p.locator(".duo-panel").isHidden(), "Keyboard resume");
    await p.keyboard.down("ArrowRight");
    await p.evaluate(() => window.advance(30));
    await p.keyboard.up("ArrowRight");
    await p.keyboard.down("d");
    await p.evaluate(() => window.advance(210));
    await p.keyboard.up("d");
    await p.locator("#restart").click();
    check(
      (await p.locator("#duo-hearts").innerText()) === "0 / 5",
      "Restart resets count",
    );
    async function replay(index) {
      return p.evaluate(async (index) => {
        const { solveDuo } = await import("/scripts/duo-solutions.mjs");
        const { recording } = solveDuo(index),
          keys = {
            wika: { "-1": "a", 1: "d", jump: "w" },
            michal: { "-1": "ArrowLeft", 1: "ArrowRight", jump: "ArrowUp" },
          };
        let held = new Set();
        for (const commands of recording) {
          const next = new Set();
          for (const id of ["wika", "michal"]) {
            const c = commands[id] || {};
            if (c.move) next.add(keys[id][String(c.move)]);
            if (c.jump) {
              window.dispatchEvent(
                new KeyboardEvent("keydown", {
                  key: keys[id].jump,
                  bubbles: true,
                }),
              );
              window.dispatchEvent(
                new KeyboardEvent("keyup", {
                  key: keys[id].jump,
                  bubbles: true,
                }),
              );
            }
          }
          for (const key of held)
            if (!next.has(key))
              window.dispatchEvent(
                new KeyboardEvent("keyup", { key, bubbles: true }),
              );
          for (const key of next)
            if (!held.has(key))
              window.dispatchEvent(
                new KeyboardEvent("keydown", { key, bubbles: true }),
              );
          held = next;
          window.advance(1);
        }
        for (const key of held)
          window.dispatchEvent(
            new KeyboardEvent("keyup", { key, bubbles: true }),
          );
        window.advance(5);
        return {
          frames: recording.length,
          hearts: document.querySelector("#duo-hearts").textContent,
          diamonds: document.querySelector("#duo-diamonds").textContent,
          panel: document.querySelector(".duo-panel").textContent,
          panelHidden: document.querySelector(".duo-panel").hidden,
          notice: document.querySelector(".duo-notice").textContent,
          latestPlayers: window.latestPlayers,
          drawn: [...window.drawn],
        };
      }, index);
    }
    const level1 = await replay(0);
    check(
      level1.panel.includes("Pierwszy poziom za nami") &&
        level1.hearts === "5 / 5" &&
        level1.diamonds === "5 / 5",
      `Level 1 keyboard solution: ${JSON.stringify(level1)}`,
    );
    await p.screenshot({ path: "output/playwright/duo-level1-complete.png" });
    await p.locator("#duo-panel-action").click();
    check(
      (await p.locator("#duo-number").innerText()) === "POZIOM 2 / 2",
      "Next level",
    );
    await p.locator("#duo-panel-action").click();
    await p.screenshot({ path: "output/playwright/quality-duo-level2.png" });
    await p.keyboard.down("ArrowLeft");
    await p.evaluate(() => window.advance(60));
    await p.keyboard.up("ArrowLeft");
    await p.locator("#restart").click();
    const level2 = await replay(1);
    const heavyMovement = await p.evaluate(() => {
      const changes = window.heavyTrace
        .slice(1)
        .map((x, index) => x - window.heavyTrace[index]);
      return {
        right: changes.some((change) => change > 0.01),
        left: changes.some((change) => change < -0.01),
        min: Math.min(...window.heavyTrace),
        max: Math.max(...window.heavyTrace),
      };
    });
    check(
      level2.panel.includes("Razem otwieramy") &&
        level2.hearts === "5 / 5" &&
        level2.diamonds === "5 / 5",
      `Level 2 keyboard solution: ${JSON.stringify(level2)}`,
    );
    check(
      level2.drawn.includes("duoWikaPush") &&
        level2.drawn.includes("duoMichalPush"),
      "Push assets shown",
    );
    check(
      heavyMovement.left && heavyMovement.right,
      `Heavy block both directions: ${JSON.stringify(heavyMovement)}`,
    );
    await p.locator("#duo-panel-action").click();
    await p
      .getByRole("heading", {
        name: "Wika i Michał — razem przez każdy level ❤️",
      })
      .waitFor();
    const progress = await p.evaluate(() =>
      JSON.parse(localStorage.getItem("wiki-anniversary-v1")),
    );
    check(
      progress.includes("duo") && progress.length === 7,
      "Completion saved",
    );
    await p.locator(".dialog .primary").click();
    check(
      (await p.locator('[data-game="duo"]').innerText()) === "Jeszcze raz ↗",
      "Completion menu",
    );
    await p.reload();
    await p.locator('[data-game="duo"]').waitFor();
    check(
      (await p.getByText("Postęp · 6/6").count()) === 1,
      "Main progress stays independent",
    );
    await p.locator('[data-game="duo"]').click();
    await p.locator("#duo-panel-action").click();
    await p.evaluate(() => window.advance(2));
    await p.evaluate(() => window.dispatchEvent(new Event("blur")));
    check(
      await p
        .locator(".duo-panel")
        .innerText()
        .then((t) => t.includes("Chwila dla nas")),
      "Auto pause on blur",
    );
    await p.getByRole("button", { name: "Wróć do menu" }).click();
    check(
      await p.evaluate(
        () =>
          !document.body.classList.contains("duo-playing") &&
          !document.querySelector("#app").classList.contains("duo-view"),
      ),
      "Clean styles on leaving",
    );
    // Keep the earlier collection's views intact.
    for (const id of [
      "catcher",
      "maze",
      "runner",
      "memory",
      "quest",
      "snake",
    ]) {
      await p.locator(`[data-game="${id}"]`).click();
      check((await p.locator(".game-shell").count()) === 1, `${id} view`);
      await p.getByRole("button", { name: "Wróć do menu" }).click();
    }
    check(
      errors.length === 0 && missing.length === 0,
      `Errors: ${errors}; requests: ${missing}`,
    );
    return {
      layouts,
      level1,
      level2,
      heavyMovement,
      progress,
      errors,
      missing,
    };
  } finally {
    await context.close();
  }
};
