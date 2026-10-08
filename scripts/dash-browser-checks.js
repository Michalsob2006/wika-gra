async (page) => {
  const browser = page.context().browser(),
    context = await browser.newContext({
      viewport: { width: 393, height: 852 },
      isMobile: true,
      hasTouch: true,
    }),
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
    let seed = 703;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };
    let now = performance.now(),
      id = 0;
    const frames = new Map();
    Object.defineProperty(performance, "now", { value: () => now });
    window.requestAnimationFrame = (f) => {
      frames.set(++id, f);
      return id;
    };
    window.cancelAnimationFrame = (id) => frames.delete(id);
    window.advance = (seconds) => {
      let left = seconds;
      while (left > 0) {
        const dt = Math.min(0.016, left);
        left -= dt;
        now += dt * 1000;
        window.render = [];
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((f) => f(now));
      }
    };
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
      if (
        this.canvas === document.querySelector(".dash-shell canvas") &&
        image.assetKey
      ) {
        const t = this.getTransform();
        (window.render ??= []).push({
          key: image.assetKey,
          x: t.e,
          y: t.f,
          width: image.width,
          height: image.height,
          scale: image.coverRect?.scale,
        });
      }
      return draw.call(this, image, ...args);
    };
  });
  await p.goto("http://127.0.0.1:4173");
  await p.waitForSelector("#loading", { state: "detached" });
  const cards = await p.evaluate(() =>
    [...document.querySelectorAll(".cards .card")].map((c) => ({
      cover: c.querySelector(".cover-image").getAttribute("src"),
      number: c.querySelector(".number").textContent,
      image: c.querySelector(".cover-image").getBoundingClientRect().toJSON(),
      card: c.getBoundingClientRect().toJSON(),
    })),
  );
  if (
    cards.length !== 7 ||
    cards
      .slice(0, 6)
      .some((c, i) => c.number !== String(i + 1).padStart(2, "0")) ||
    cards[6].number !== "BONUS" ||
    cards.slice(0, 6).some((c) => !c.cover.includes("/covers/")) ||
    cards.some((c) => Math.abs(c.image.width / c.image.height - 4 / 3) > 0.02)
  )
    throw Error("Cover mapping/aspect");
  await p.screenshot({
    path: "output/playwright/dash-menu-393.png",
    fullPage: true,
  });
  await p.locator("[data-game=runner]").tap();
  await p.evaluate(() => advance(0.016));
  await p.locator("#dash-start").tap();
  await p.evaluate(() => advance(0.12));
  await p.screenshot({ path: "output/playwright/dash-run-393.png" });
  // Actual touch events must select both of the new character poses.
  await p.locator("[data-control=jump]").tap();
  await p.evaluate(() => advance(0.15));
  if (!(await p.evaluate(() => render.some((d) => d.key === "dashJump"))))
    throw Error("Corrected jump asset not rendered");
  await p.screenshot({ path: "output/playwright/dash-jump-393.png" });
  await p.evaluate(() => advance(1.05));
  const touch = await context.newCDPSession(p);
  const crouch = await p.locator("[data-control=crouch]").boundingBox();
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      {
        x: crouch.x + crouch.width / 2,
        y: crouch.y + crouch.height / 2,
        id: 1,
      },
    ],
  });
  await p.evaluate(() => advance(0.016));
  if (!(await p.evaluate(() => render.some((d) => d.key === "dashCrouch"))))
    throw Error("Crouch touch");
  await p.screenshot({ path: "output/playwright/dash-crouch-393.png" });
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await p.locator("#dash-pause").tap();
  const frozen = await p.locator("#dash-distance").textContent();
  await p.evaluate(() => advance(2));
  if ((await p.locator("#dash-distance").textContent()) !== frozen)
    throw Error("Pause moves world");
  await p.locator("#dash-resume").tap();
  await p.evaluate(() => advance(0.5));
  if ((await p.locator("#dash-distance").textContent()) === frozen)
    throw Error("Resume not moving");
  await p.locator("#restart").tap();
  await p.locator("#dash-start").tap();
  await p.evaluate(() => advance(7));
  if (!(await p.locator("#dash-retry").isVisible()))
    throw Error("Obstacle game over");
  await p.locator("#dash-retry").tap();
  if (
    !(await p.locator("#dash-start").isVisible()) ||
    (await p.locator("#dash-distance").textContent()) !== "0 m"
  )
    throw Error("Restart not clean");
  await p.locator("#dash-start").tap();
  const run = await p.evaluate(() => {
    let frames = 0,
      jumps = 0,
      slides = 0,
      lastBorn = -1000;
    const kindSequence = [],
      speedSamples = [],
      sceneGeometry = {};
    const key = (k) => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: k, bubbles: true }),
      );
      window.dispatchEvent(
        new KeyboardEvent("keyup", { key: k, bubbles: true }),
      );
    };
    while (document.querySelector("#dash-finish").hidden && frames++ < 5000) {
      if (frames % 200 === 1)
        speedSamples.push({
          seconds: (frames - 1) * 0.016,
          meters: parseInt(
            document.querySelector("#dash-distance").textContent,
          ),
        });
      const born = render.find(
        (d) => ["dashCrate", "dashBird"].includes(d.key) && d.x > 810,
      );
      if (born && frames - lastBorn > 60) {
        kindSequence.push(born.key);
        lastBorn = frames;
      }
      const player = render.find((d) =>
        ["dashRun", "dashJump", "dashCrouch"].includes(d.key),
      );
      const obstacle = render.find(
        (d) =>
          (d.key === "dashCrate" && d.x - 46 + 16 + 57 > 201) ||
          (d.key === "dashBird" && d.x - 54 + 26 + 55 > 201),
      );
      dispatchEvent(
        new KeyboardEvent("keyup", { key: "ArrowDown", bubbles: true }),
      );
      if (obstacle) {
        const boxLeft =
            obstacle.x -
            (obstacle.key === "dashCrate" ? 46 : 54) +
            (obstacle.key === "dashCrate" ? 16 : 26),
          gap = boxLeft - 246;
        if (gap < 100 && gap > -105) {
          if (obstacle.key === "dashCrate" && player?.key !== "dashJump") {
            key(" ");
            jumps++;
          } else if (obstacle.key === "dashBird") {
            dispatchEvent(
              new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
            );
            slides++;
          }
        }
      }
      advance(0.016);
      for (const layer of render.filter((d) =>
        ["dashRiverside", "dashValley"].includes(d.key),
      ))
        sceneGeometry[layer.key] = {
          width: layer.width,
          height: layer.height,
          scale: layer.scale,
        };
      if (document.querySelector("#dash-retry"))
        throw Error(
          "Autoplayer died at " +
            document.querySelector("#dash-distance").textContent,
        );
    }
    if (document.querySelector("#dash-finish").hidden)
      throw Error("No progression goal");
    const before = parseInt(
      document.querySelector("#dash-distance").textContent,
    );
    const result = document.querySelector(".dash-panel > div")?.innerText;
    // Reaching both requirements freezes the successful run.
    for (let i = 0; i < 20; i++) advance(0.016);
    return {
      frames,
      kindSequence,
      speedSamples,
      jumps,
      slides,
      distance: document.querySelector("#dash-distance").textContent,
      hearts: document.querySelector("#score").textContent,
      completed: result,
      stopped:
        parseInt(document.querySelector("#dash-distance").textContent) === before,
      sceneGeometry,
    };
  });
  if (!run.stopped || !run.completed.includes("Przygoda ukończona"))
    throw Error("Goal did not end in success: " + JSON.stringify(run));
  if (
    !run.completed.includes(run.distance) ||
    !run.completed.includes(`${parseInt(run.hearts.replace(/\D/g, ""))} serduszek`)
  )
    throw Error("Completion screen misses actual result");
  const scenes = Object.values(run.sceneGeometry);
  if (
    scenes.length !== 2 ||
    scenes.some(
      (scene) =>
        scene.width !== scenes[0].width ||
        scene.height !== scenes[0].height ||
        scene.scale !== scenes[0].scale,
    )
  )
    throw Error("Background segments use different framing");
  if (
    !run.kindSequence.some(
      (kind, i) => i > 0 && kind === run.kindSequence[i - 1],
    )
  )
    throw Error("Still alternating");
  const samples = run.speedSamples,
    velocity = (a, b) => (b.meters - a.meters) / 0.08 / (b.seconds - a.seconds);
  run.startSpeed = velocity(samples[0], samples[1]);
  run.laterSpeed = velocity(samples.at(-2), samples.at(-1));
  if (run.laterSpeed < run.startSpeed + 20)
    throw Error("No smooth acceleration");
  await p.locator("#dash-save").tap();
  const stored = await p.evaluate(() =>
    JSON.parse(localStorage.getItem("wiki-anniversary-v1")),
  );
  if (!stored.includes("runner")) throw Error("Progress runner missing");
  await p.locator(".dialog .primary").tap();
  await p.reload();
  await p.waitForSelector("#loading", { state: "detached" });
  if (
    !(await p
      .locator("[data-game=runner]")
      .textContent()
      .then((s) => s.includes("Jeszcze raz")))
  )
    throw Error("Progress not preserved");
  const mobileLayouts = [];
  for (const width of [360, 393, 430]) {
    await p.setViewportSize({ width, height: 852 });
    await p.locator("[data-game=runner]").tap();
    await p.evaluate(() => advance(0.016));
    await p.waitForTimeout(80);
    const b = await p.locator("canvas").boundingBox(),
      controls = await p.locator(".dash-controls").boundingBox(),
      jump = await p.locator("[data-control=jump]").boundingBox();
    const overflow = await p.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    );
    if (
      overflow ||
      b.x < 0 ||
      b.x + b.width > width ||
      b.y + b.height > 852 ||
      controls.y + controls.height > 852 ||
      jump.width < 52 ||
      jump.height < 52
    )
      throw Error(
        "Mobile layout " + JSON.stringify({ width, b, controls, jump }),
      );
    mobileLayouts.push({ width, board: b, controls });
    await p.locator("#home").tap();
  }
  await p.setViewportSize({ width: 932, height: 430 });
  await p.locator("[data-game=runner]").tap();
  await p.locator("#dash-start").tap();
  await p.evaluate(() => advance(0.25));
  await p.waitForTimeout(80);
  const landscapeBoard = await p.locator("canvas").boundingBox(),
    landscapeControls = await p.locator(".dash-controls").boundingBox();
  if (
    landscapeBoard.x < 0 ||
    landscapeBoard.x + landscapeBoard.width > 932 ||
    landscapeBoard.y + landscapeBoard.height > 430 ||
    landscapeControls.y + landscapeControls.height > 430
  )
    throw Error("Landscape fit");
  await p.screenshot({ path: "output/playwright/dash-fix-landscape.png" });
  const rotationDistance = await p.locator("#dash-distance").textContent();
  await p.setViewportSize({ width: 393, height: 852 });
  await p.waitForTimeout(80);
  if ((await p.locator("#dash-distance").textContent()) !== rotationDistance)
    throw Error("Rotation resets run");
  await p.locator("#home").tap();
  // Confirm existing games are reachable and render after card replacement.
  for (const id of ["catcher", "maze", "memory", "snake"]) {
    await p.locator(`[data-game=${id}]`).tap();
    await p.evaluate(() => advance(0.032));
    if (!(await p.locator(".game-shell").isVisible()))
      throw Error("Other game missing " + id);
    await p.locator("#home").tap();
  }
  await context.close();
  const desktopCtx = await browser.newContext({
      viewport: { width: 1366, height: 900 },
    }),
    desktop = await desktopCtx.newPage();
  desktop.on("pageerror", (e) => errors.push(e.message));
  desktop.on("response", (r) => {
    if (
      r.status() >= 400 &&
      !/\/assets\/photos\/memory\/photo[1-8]\.webp$/.test(r.url())
    )
      missing.push(r.url());
  });
  await desktopCtx.addInitScript(() => {
    let now = performance.now(),
      id = 0;
    const frames = new Map();
    Object.defineProperty(performance, "now", { value: () => now });
    window.requestAnimationFrame = (f) => {
      frames.set(++id, f);
      return id;
    };
    window.cancelAnimationFrame = (i) => frames.delete(i);
    window.advance = (seconds) => {
      let left = seconds;
      while (left > 0) {
        const dt = Math.min(0.016, left);
        left -= dt;
        now += dt * 1000;
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((f) => f(now));
      }
    };
  });
  await desktop.goto("http://127.0.0.1:4173");
  await desktop.waitForSelector("#loading", { state: "detached" });
  await desktop.screenshot({
    path: "output/playwright/dash-menu-desktop.png",
    fullPage: true,
  });
  await desktop.locator("[data-game=runner]").click();
  await desktop.locator("#dash-start").click();
  await desktop.keyboard.press("Space");
  await desktop.evaluate(() => advance(0.18));
  await desktop.screenshot({ path: "output/playwright/dash-desktop.png" });
  const desktopLayouts = [];
  for (const [width, height] of [
    [1366, 768],
    [1366, 900],
    [1920, 1080],
  ]) {
    await desktop.setViewportSize({ width, height });
    await desktop.waitForTimeout(100);
    const b = await desktop.locator("canvas").boundingBox(),
      c = await desktop.locator(".dash-controls").boundingBox();
    if (
      b.x < 0 ||
      b.x + b.width > width ||
      b.y + b.height > height ||
      c.y + c.height > height
    )
      throw Error("Desktop layout " + JSON.stringify({ width, height, b, c }));
    desktopLayouts.push({ width, height, board: b, controls: c });
  }
  await desktop.setViewportSize({ width: 1366, height: 900 });
  await desktop.keyboard.press("p");
  if (!(await desktop.locator("#dash-resume").isVisible()))
    throw Error("Keyboard pause");
  await desktop.keyboard.press("Escape");
  if (await desktop.locator("#dash-resume").isVisible())
    throw Error("Keyboard resume");
  await desktopCtx.close();
  if (errors.length || missing.length)
    throw Error(JSON.stringify({ errors, missing }));
  return {
    cards: cards.map((c) => ({ cover: c.cover, number: c.number })),
    jumpAsset: true,
    crouch: true,
    pause: true,
    retry: true,
    run,
    progress: stored,
    mobileLayouts,
    landscapeBoard,
    landscapeControls,
    otherGames: true,
    desktopLayouts,
    errors,
    missing,
  };
};
