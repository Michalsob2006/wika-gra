async (page) => {
  const errors = [],
    missing = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      ["error", "warning"].includes(m.type()) &&
      !m.text().includes("server responded with a status of 404")
    )
      errors.push(m.text());
  });
  page.on("response", (r) => {
    if (
      r.status() === 404 &&
      !/\/assets\/photos\/memory\/photo[1-8]\.webp$/.test(r.url())
    )
      missing.push(r.url());
  });
  await page.addInitScript(() => {
    const frames = new Map();
    let id = 0,
      time = performance.now(),
      randomSeed = 1;
    window.setRandomSeed = (value) => (randomSeed = value >>> 0);
    Math.random = () => {
      randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0;
      return randomSeed / 4294967296;
    };
    window.requestAnimationFrame = (f) => {
      frames.set(++id, f);
      return id;
    };
    window.cancelAnimationFrame = (i) => frames.delete(i);
    window.testClock = () => (time = performance.now());
    window.advance = () => {
      time += 16;
      const list = [...frames.values()];
      frames.clear();
      window.draws = [];
      window.hintDrawn = false;
      list.forEach((f) => f(time));
    };
    window.key = (name, down) =>
      dispatchEvent(
        new KeyboardEvent(down ? "keydown" : "keyup", {
          key: name,
          bubbles: true,
        }),
      );
    const arc = CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.arc = function (...args) {
      if (args[2] === 17) window.hintDrawn = true;
      return arc.apply(this, args);
    };
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
      const t = this.getTransform();
      (window.draws ??= []).push({
        key: image.assetKey || image.src || "",
        x: t.e,
        y: t.f,
        alpha: this.globalAlpha,
      });
      return draw.call(this, image, ...args);
    };
  });
  const network = await page.context().newCDPSession(page);
  await network.send("Network.enable");
  await network.send("Network.setCacheDisabled", { cacheDisabled: true });
  await page.goto("http://127.0.0.1:4173");
  await page.waitForSelector("#loading", { state: "detached" });
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage))
      if (key.startsWith("wiki-anniversary-")) localStorage.removeItem(key);
  });
  await page.reload();
  await page.waitForSelector("#loading", { state: "detached" });
  const results = {
    locked: await page.locator("[data-game=quest]").isDisabled(),
    bonusAvailable: !(await page.locator("[data-game=duo]").isDisabled()),
  };
  if (!results.locked) throw Error("Gift Hunt unlocked before completion");
  if (!results.bonusAvailable) throw Error("Bonus locked on a fresh save");
  const order = await page
    .locator("[data-game]")
    .evaluateAll((buttons) => buttons.map((button) => button.dataset.game));
  if (
    JSON.stringify(order) !==
    JSON.stringify([
      "catcher",
      "maze",
      "runner",
      "memory",
      "snake",
      "quest",
      "duo",
    ])
  )
    throw Error("Game order: " + JSON.stringify(order));
  for (const width of [360, 390, 430, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error("Page overflow " + width);
  }
  await page.setViewportSize({ width: 1366, height: 1000 });
  await page.screenshot({ path: "output/playwright/second-pass-menu.png" });
  results.catcher = await page.evaluate(() => {
    testClock();
    document.querySelector("[data-game=catcher]").click();
    let n = 0;
    while (!document.querySelector(".overlay") && n++ < 30000) {
      advance();
      const p = draws.find((d) => /^wika/.test(d.key)),
        good = draws
          .filter(
            (d) =>
              ["heart", "bouquet", "letter", "gift"].includes(d.key) &&
              d.y > 0 &&
              d.y < 430,
          )
          .sort((a, b) => b.y - a.y),
        dx = p && good.length ? good[0].x - p.x : 0;
      key("ArrowLeft", dx < -8);
      key("ArrowRight", dx > 8);
    }
    key("ArrowLeft", false);
    key("ArrowRight", false);
    if (!document.querySelector(".overlay")) throw Error("Catcher failed");
    document.querySelector(".dialog button").click();
    return true;
  });
  results.maze = await page.evaluate(async () => {
    const { generateMazeLevel, pathTo } =
      await import("./js/games/maze-map.js");
    const original = Math.random;
    const complete = (n) => {
      let seed = 42 + n;
      const rng = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      const m = generateMazeLevel(n, rng);
      seed = 42 + n;
      Math.random = rng;
      testClock();
      if (n === 1) document.querySelector("[data-game=maze]").click();
      else document.querySelector(".dialog button").click();
      Math.random = original;
      advance();
      document.querySelector("#maze-hint").click();
      for (let i = 0; i < 5; i++) advance();
      if (!hintDrawn) throw Error("Hint did not appear");
      for (let i = 0; i < 140; i++) advance();
      if (hintDrawn) throw Error("Hint did not expire after 2 seconds");
      let current = m.start,
        moves = 0;
      for (const target of [...m.hearts, m.finish])
        for (const next of pathTo(m, current, target).slice(1)) {
          const d = next - current,
            k =
              d === 1
                ? "ArrowRight"
                : d === -1
                  ? "ArrowLeft"
                  : d === m.cols
                    ? "ArrowDown"
                    : "ArrowUp";
          key(k, true);
          for (let i = 0; i < 9; i++) advance();
          key(k, false);
          advance();
          current = next;
          moves++;
        }
      for (let i = 0; i < 30; i++) advance();
      if (!document.querySelector(".overlay"))
        throw Error("Maze level " + n + " failed");
      return { cols: m.cols, rows: m.rows, moves, hint: true };
    };
    const one = complete(1);
    if (
      JSON.parse(localStorage.getItem("wiki-anniversary-v1")).includes("maze")
    )
      throw Error("Level one incorrectly completes maze");
    const two = complete(2);
    document.querySelector(".dialog button").click();
    return { one, two };
  });
  results.runner = await page.evaluate(() => {
    testClock();
    document.querySelector("[data-game=runner]").click();
    document.querySelector("#dash-start").click();
    advance();
    let frames = 0,
      jumps = 0,
      slides = 0;
    while (document.querySelector("#dash-finish").hidden && frames++ < 5000) {
      const player = draws.find((d) =>
        ["dashRun", "dashJump", "dashCrouch"].includes(d.key),
      );
      const obstacle = draws.find(
        (d) =>
          (d.key === "dashCrate" && d.x - 46 + 16 + 57 > 201) ||
          (d.key === "dashBird" && d.x - 54 + 26 + 55 > 201),
      );
      key("ArrowDown", false);
      if (obstacle) {
        const gap =
          obstacle.x -
          (obstacle.key === "dashCrate" ? 46 : 54) +
          (obstacle.key === "dashCrate" ? 16 : 26) -
          246;
        if (gap < 75 && gap > -105) {
          if (obstacle.key === "dashCrate" && player?.key !== "dashJump") {
            key(" ", true);
            key(" ", false);
            jumps++;
          } else if (obstacle.key === "dashBird") {
            key("ArrowDown", true);
            slides++;
          }
        }
      }
      advance();
      if (document.querySelector("#dash-retry")) throw Error("Dash failed");
    }
    if (document.querySelector("#dash-finish").hidden)
      throw Error("Dash milestone unreachable");
    const hud = document.querySelector("#score").textContent,
      distance = document.querySelector("#dash-distance").textContent;
    document.querySelector("#dash-finish").click();
    document.querySelector(".dialog button").click();
    return { frames, jumps, slides, hud, distance };
  });
  // Memory level one remains immediately playable. Missing future photos are
  // represented by a clean completion panel instead of broken image cards.
  await page.evaluate(() =>
    document.querySelector("[data-game=memory]").click(),
  );
  await page.waitForSelector(".memory-card");
  await page.evaluate(() => {
    const groups = new Map();
    for (const b of document.querySelectorAll(".memory-card")) {
      const src = b.querySelector("img").src;
      if (!groups.has(src)) groups.set(src, []);
      groups.get(src).push(b);
    }
    for (const pair of groups.values()) {
      pair[0].click();
      pair[1].click();
    }
  });
  await page.waitForSelector("#memory-next");
  if (
    !(await page.locator(".memory-level-panel").innerText()).includes(
      "Zdjęcia dodamy później",
    )
  )
    throw Error("Missing photo fallback");
  await page.locator("#memory-next").click();
  await page.waitForSelector(".overlay");
  results.memory = true;
  await page.reload();
  await page.waitForSelector("#loading", { state: "detached" });
  results.persisted = await page.evaluate(
    () => JSON.parse(localStorage.getItem("wiki-anniversary-v1")).length === 4,
  );
  // Snake has a dedicated browser suite. Seed its verified completion so this
  // regression exercises the sixth main game and finale. Bonus is independent.
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("wiki-anniversary-v1"));
    p.push("snake");
    localStorage.setItem("wiki-anniversary-v1", JSON.stringify(p));
    localStorage.setItem(
      "wiki-anniversary-main-v2",
      JSON.stringify(p.filter((id) => id !== "duo")),
    );
  });
  await page.reload();
  await page.waitForSelector("#loading", { state: "detached" });
  results.unlocked = !(await page.locator("[data-game=quest]").isDisabled());
  results.gift = await page.evaluate(async () => {
    setRandomSeed(7);
    testClock();
    document.querySelector("[data-game=quest]").click();
    advance();
    const { makeHuntMap, huntPath } =
        await import("./js/games/gift-hunt-map.js"),
      map = makeHuntMap(),
      directions = ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"];
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
        const p = draws.find((d) => d.key?.startsWith("wika"));
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
        advance();
      }
      if (!completed()) throw Error("Could not reach " + goal);
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
      score: localStorage.getItem("wiki-anniversary-v1"),
      final: document.querySelector(".final .eyebrow").textContent,
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "output/playwright/second-pass-final.png" });
  await page.reload();
  await page.waitForSelector("#loading", { state: "detached" });
  results.savedFinal = (await page.locator("#view-final").count()) === 1;
  for (const id of ["maze", "runner", "quest"]) {
    await page.evaluate((id) => {
      testClock();
      document.querySelector(`[data-game=${id}]`).click();
      advance();
    }, id);
    await page.screenshot({
      path: `output/playwright/second-pass-${id}-mobile.png`,
    });
    await page
      .getByRole("button", { name: "Wróć do menu", exact: true })
      .click();
  }
  results.giftCollision = {
    flashes: results.gift.flashes,
    testedInCorridors: true,
  };
  results.loadedAssets = await page.evaluate(
    async () => Object.keys((await import("./js/preload.js")).images).length,
  );
  const expectedAssets = await page.evaluate(
    async () =>
      Object.keys((await import("./js/assetConfig.js")).assets).length,
  );
  if (results.loadedAssets !== expectedAssets)
    throw Error("Preload asset missing");
  results.errors = errors;
  results.missing = missing;
  if (errors.length || missing.length)
    throw Error(JSON.stringify({ errors, missing }));
  return results;
};
