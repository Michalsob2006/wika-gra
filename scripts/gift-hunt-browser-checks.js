async (page) => {
  const context = await page
      .context()
      .browser()
      .newContext({ viewport: { width: 390, height: 844 } }),
    test = await context.newPage(),
    errors = [],
    missing = [];
  test.on("pageerror", (e) => errors.push(e.message));
  test.on("console", (m) => {
    if (["error", "warning"].includes(m.type())) errors.push(m.text());
  });
  test.on("response", (r) => {
    if (r.status() === 404) missing.push(r.url());
  });
  await test.addInitScript(() => {
    let seed = 3;
    window.setRandomSeed = (value) => (seed = value >>> 0);
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const frames = new Map();
    let id = 0,
      clock = performance.now();
    window.requestAnimationFrame = (fn) => {
      frames.set(++id, fn);
      return id;
    };
    window.cancelAnimationFrame = (id) => frames.delete(id);
    window.resetClock = () => (clock = performance.now());
    window.advance = () => {
      clock += 16;
      window.draws = [];
      const batch = [...frames.values()];
      frames.clear();
      batch.forEach((fn) => fn(clock));
    };
    window.key = (key, down) =>
      dispatchEvent(
        new KeyboardEvent(down ? "keydown" : "keyup", { key, bubbles: true }),
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
  await test.goto("http://127.0.0.1:4173");
  await test.waitForSelector("#loading", { state: "detached" });
  await test.evaluate(() => {
    const completed = ["catcher", "maze", "runner", "memory", "snake"];
    localStorage.setItem("wiki-anniversary-v1", JSON.stringify(completed));
    localStorage.setItem(
      "wiki-anniversary-main-v2",
      JSON.stringify(completed),
    );
    localStorage.setItem("wiki-anniversary-bonus-v1", "[]");
  });
  await test.reload();
  await test.waitForSelector("#loading", { state: "detached" });
  await test.evaluate(() => setRandomSeed(3));
  await test.locator("[data-game=quest]").click();
  await test.evaluate(() => {
    resetClock();
    advance();
  });
  if ((await test.locator(".hunt-lives").textContent()) !== "❤️❤️❤️")
    throw Error("Initial three-life HUD missing");
  const startX = await test.evaluate(
    () => draws.find((d) => d.key.startsWith("wika")).x,
  );
  await test.keyboard.press("ArrowRight");
  await test.evaluate(() => {
    for (let i = 0; i < 5; i++) advance();
  });
  const tappedX = await test.evaluate(
    () => draws.find((d) => d.key.startsWith("wika")).x,
  );
  if (tappedX <= startX)
    throw Error("Quick keyboard tap was lost between frames");
  await test.evaluate(() => setRandomSeed(3));
  await test.locator("#restart").click();
  await test.evaluate(() => {
    resetClock();
    advance();
  });
  const sizes = [];
  for (const [width, height] of [
    [360, 844],
    [390, 844],
    [430, 844],
    [1366, 768],
    [1920, 1080],
  ]) {
    await test.setViewportSize({ width, height });
    await test.waitForTimeout(80);
    const bounds = await test.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      width: document.querySelector("canvas").getBoundingClientRect().width,
      height: document.querySelector("canvas").getBoundingClientRect().height,
      bottom: document.querySelector("canvas").getBoundingClientRect().bottom,
      pixelWidth: document.querySelector("canvas").width,
      pixelHeight: document.querySelector("canvas").height,
    }));
    if (
      bounds.overflow ||
      bounds.bottom > height + 1 ||
      Math.abs(bounds.width / bounds.height - 15 / 11) > 0.01
    )
      throw Error(
        "Board does not fit " + width + ": " + JSON.stringify(bounds),
      );
    sizes.push({ viewportWidth: width, ...bounds });
    await test.evaluate(() => {
      advance();
      window.scrollTo(0, 0);
    });
    await test.waitForTimeout(100);
    await test.screenshot({
      path: `output/playwright/gift-corridors-${width}.png`,
    });
  }
  const result = await test.evaluate(async () => {
    const { makeHuntMap, huntPath } =
        await import("./js/games/gift-hunt-map.js"),
      map = makeHuntMap(),
      directions = ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"];
    let collectedHearts = 0;
    let input = -1,
      frames = 0,
      flashes = 0;
    function send(d) {
      if (d === input) return;
      if (input >= 0) key(directions[input], false);
      input = d;
      if (d >= 0) key(directions[d], true);
    }
    function go(goal, completed, max = 20000) {
      while (!completed() && frames++ < max) {
        const p = draws.find((d) => d.key.startsWith("wika"));
        if (p) {
          if (p.alpha < 1) flashes++;
          const x = Math.max(0, Math.min(14, Math.round(p.x / 44 - 0.5))),
            y = Math.max(0, Math.min(10, Math.round((p.y + 10) / 44 - 0.5))),
            cell = y * 15 + x,
            path = huntPath(map, cell, goal);
          if (path.length > 1) {
            const delta = path[1] - cell;
            send(delta === 1 ? 1 : delta === -1 ? 3 : delta === 15 ? 2 : 0);
          }
        }
        const hud = document.querySelector(".hunt-goal")?.textContent;
        if (hud)
          collectedHearts = Math.max(
            collectedHearts,
            Number(hud.match(/Serduszka: (\d+)/)?.[1] || 0),
          );
        advance();
      }
      if (!completed())
        throw Error(
          "Could not reach " +
            goal +
            ": " +
            JSON.stringify({
              lives: document.querySelector(".hunt-lives")?.textContent,
              gameOver: !document.querySelector(".hunt-panel")?.hidden,
              final: !!document.querySelector(".final"),
              actor: draws.find((d) => d.key.startsWith("wika")),
            }),
        );
    }
    function at(cell) {
      const p = draws.find((d) => d.key.startsWith("wika"));
      return (
        p &&
        Math.hypot(
          p.x - ((cell % 15) + 0.5) * 44,
          p.y + 10 - (Math.floor(cell / 15) + 0.5) * 44,
        ) < 7
      );
    }
    // Visit the closed gift first; it must not finish the collection.
    go(148, () => at(148));
    for (let i = 0; i < 12; i++) advance();
    if (document.querySelector(".final"))
      throw Error("Gift opened without items");
    send(-1);
    return {
      frames,
      flashes,
      hearts: collectedHearts,
      lockedGiftStayedClosed: !document.querySelector(".final"),
    };
  });
  await test.evaluate(() => setRandomSeed(7));
  await test.locator("#restart").click();
  await test.evaluate(() => {
    resetClock();
    advance();
  });
  const completion = await test.evaluate(async () => {
    const { makeHuntMap, huntPath } =
        await import("./js/games/gift-hunt-map.js"),
      map = makeHuntMap(),
      directions = ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"];
    let input = -1,
      frames = 0,
      flashes = 0,
      collectedHearts = 0;
    function send(d) {
      if (d === input) return;
      if (input >= 0) key(directions[input], false);
      input = d;
      if (d >= 0) key(directions[d], true);
    }
    function go(goal, completed, max = 20000) {
      while (!completed() && frames++ < max) {
        const p = draws.find((d) => d.key.startsWith("wika"));
        if (p) {
          if (p.alpha < 1) flashes++;
          const x = Math.max(0, Math.min(14, Math.round(p.x / 44 - 0.5))),
            y = Math.max(0, Math.min(10, Math.round((p.y + 10) / 44 - 0.5))),
            cell = y * 15 + x,
            path = huntPath(map, cell, goal);
          if (path.length > 1) {
            const delta = path[1] - cell;
            send(delta === 1 ? 1 : delta === -1 ? 3 : delta === 15 ? 2 : 0);
          }
        }
        const hud = document.querySelector(".hunt-goal")?.textContent;
        if (hud)
          collectedHearts = Math.max(
            collectedHearts,
            Number(hud.match(/Serduszka: (\d+)/)?.[1] || 0),
          );
        advance();
      }
      if (!completed())
        throw Error(
          "Could not reach " +
            goal +
            ": " +
            JSON.stringify({
              lives: document.querySelector(".hunt-lives")?.textContent,
              gameOver: !document.querySelector(".hunt-panel")?.hidden,
              final: !!document.querySelector(".final"),
              actor: draws.find((d) => d.key.startsWith("wika")),
            }),
        );
    }
    for (const [i, goal] of [16, 28, 136].entries()) {
      go(goal, () =>
        document
          .querySelectorAll(".hunt-inventory>span")
          [i].textContent.includes("✓"),
      );
      const inventory = [
        ...document.querySelectorAll(".hunt-inventory>span"),
      ].filter((b) => b.textContent.includes("✓")).length;
      if (inventory !== i + 1) throw Error("Inventory update failed");
    }
    if (
      !document
        .querySelector(".hunt-goal")
        .textContent.includes("Prezent odblokowany")
    )
      throw Error("Gift did not activate");
    go(148, () => !!document.querySelector(".final"));
    send(-1);
    return {
      frames,
      flashes,
      hearts: collectedHearts,
      progress: localStorage.getItem("wiki-anniversary-v1"),
      currentProgress: localStorage.getItem("wiki-anniversary-main-v2"),
      lives: document.querySelector(".hunt-lives")?.textContent,
      final: document.querySelector(".final .eyebrow")?.textContent,
    };
  });
  await context.close();
  if (errors.length || missing.length)
    throw Error(JSON.stringify({ errors, missing }));
  return { lockedGift: result, completion, sizes, errors, missing };
};
