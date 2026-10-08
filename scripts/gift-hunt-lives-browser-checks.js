async (page) => {
  const context = await page
      .context()
      .browser()
      .newContext({ viewport: { width: 390, height: 844 } }),
    p = await context.newPage(),
    errors = [];
  p.on("pageerror", (error) => errors.push(error.message));
  await context.addInitScript(() => {
    const ids = new WeakMap(),
      active = new Set();
    let listenerId = 0;
    const add = EventTarget.prototype.addEventListener,
      remove = EventTarget.prototype.removeEventListener,
      tag = (target, type, listener, options) => {
        if (target !== window && target !== document) return null;
        if (!ids.has(listener)) ids.set(listener, ++listenerId);
        return `${target === window ? "w" : "d"}:${type}:${ids.get(listener)}:${!!(typeof options === "boolean" ? options : options?.capture)}`;
      };
    EventTarget.prototype.addEventListener = function (
      type,
      listener,
      options,
    ) {
      const value = tag(this, type, listener, options);
      if (value) active.add(value);
      return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (
      type,
      listener,
      options,
    ) {
      const value = tag(this, type, listener, options);
      if (value) active.delete(value);
      return remove.call(this, type, listener, options);
    };
    let seed = 1,
      clock = performance.now(),
      id = 0;
    const frames = new Map();
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    Object.defineProperty(performance, "now", { value: () => clock });
    requestAnimationFrame = (callback) => {
      frames.set(++id, callback);
      return id;
    };
    cancelAnimationFrame = (frame) => frames.delete(frame);
    window.metrics = { active, frames };
    window.advance = () => {
      clock += 16;
      window.draws = [];
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach((callback) => callback(clock));
    };
    window.key = (key, down) =>
      dispatchEvent(
        new KeyboardEvent(down ? "keydown" : "keyup", {
          key,
          bubbles: true,
        }),
      );
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
      if (image.assetKey) {
        const matrix = this.getTransform();
        (window.draws ??= []).push({
          key: image.assetKey,
          x: matrix.e,
          y: matrix.f,
          alpha: this.globalAlpha,
        });
      }
      return draw.call(this, image, ...args);
    };
  });
  await p.goto("http://127.0.0.1:4173");
  await p.locator("#loading").waitFor({ state: "detached" });
  await p.evaluate(() => {
    const completed = ["catcher", "maze", "runner", "memory", "snake"];
    localStorage.setItem("wiki-anniversary-v1", JSON.stringify(completed));
    localStorage.setItem(
      "wiki-anniversary-main-v2",
      JSON.stringify(completed),
    );
    localStorage.setItem("wiki-anniversary-bonus-v1", "[]");
  });
  await p.reload();
  await p.locator("#loading").waitFor({ state: "detached" });
  const baseline = await p.evaluate(() => metrics.active.size);
  await p.locator("[data-game=quest]").click();
  const gameListeners = await p.evaluate(() => metrics.active.size);
  const result = await p.evaluate(async () => {
    const { makeHuntMap, huntPath } =
        await import("/js/games/gift-hunt-map.js"),
      map = makeHuntMap(),
      keys = ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"];
    let held = -1,
      frames = 0;
    const send = (direction) => {
      if (held === direction) return;
      if (held >= 0) key(keys[held], false);
      held = direction;
      if (held >= 0) key(keys[held], true);
    };
    for (const goal of [148, 16, 28, 136, 148]) {
      while (
        document.querySelector(".hunt-panel")?.hidden &&
        frames++ < 30000
      ) {
        const actor = draws.find((entry) => entry.key.startsWith("wika"));
        if (actor) {
          const x = Math.max(0, Math.min(14, Math.round(actor.x / 44 - 0.5))),
            y = Math.max(
              0,
              Math.min(10, Math.round((actor.y + 10) / 44 - 0.5)),
            ),
            cell = y * 15 + x,
            path = huntPath(map, cell, goal);
          if (path.length > 1) {
            const delta = path[1] - cell;
            send(delta === 1 ? 1 : delta === -1 ? 3 : delta === 15 ? 2 : 0);
          }
        }
        advance();
      }
      if (!document.querySelector(".hunt-panel")?.hidden) break;
    }
    send(-1);
    return {
      frames,
      lives: document.querySelector(".hunt-lives")?.textContent,
      title: document.querySelector(".hunt-panel h2")?.textContent,
      retry: document.querySelector('[data-hunt-action="retry"]')?.textContent,
      home: document.querySelector('[data-hunt-action="home"]')?.textContent,
    };
  });
  if (
    result.lives !== "♡♡♡" ||
    result.title !== "Skończyły się serduszka" ||
    result.retry !== "Spróbuj ponownie" ||
    result.home !== "Wróć do menu"
  )
    throw Error("Gift Hunt game over UI: " + JSON.stringify(result));
  await p.locator('[data-hunt-action="retry"]').click();
  await p.evaluate(() => advance());
  const restarted = await p.evaluate(() => ({
    lives: document.querySelector(".hunt-lives")?.textContent,
    panel: document.querySelector(".hunt-panel")?.hidden,
    score: document.querySelector(".hunt-goal")?.textContent,
    inventory: [...document.querySelectorAll(".hunt-inventory > span")].map(
      (item) => item.textContent.trim(),
    ),
  }));
  if (
    restarted.lives !== "❤️❤️❤️" ||
    !restarted.panel ||
    !restarted.score?.includes("Serduszka: 0") ||
    restarted.inventory.some((item) => !item.includes("□"))
  )
    throw Error("Gift Hunt retry state: " + JSON.stringify(restarted));
  for (let restart = 0; restart < 20; restart++) {
    await p.locator("#restart").click();
    await p.evaluate(() => advance());
    if ((await p.evaluate(() => metrics.frames.size)) !== 1)
      throw Error("Gift Hunt duplicate RAF after restart " + restart);
    if ((await p.evaluate(() => metrics.active.size)) !== gameListeners)
      throw Error("Gift Hunt listener leak after restart " + restart);
  }
  await p.locator("#home").click();
  if ((await p.evaluate(() => metrics.frames.size)) !== 0)
    throw Error("Gift Hunt RAF left after menu");
  if ((await p.evaluate(() => metrics.active.size)) !== baseline)
    throw Error("Gift Hunt listeners left after menu");
  await context.close();
  if (errors.length) throw Error(errors.join("\n"));
  return {
    gameOver: result,
    restarted,
    restarts: 20,
    baselineListeners: baseline,
    gameListeners,
    pendingAfterMenu: 0,
    errors,
  };
};
