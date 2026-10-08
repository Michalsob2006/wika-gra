async (page) => {
  const browser = page.context().browser(),
    errors = [],
    missing = [],
    layouts = [];
  const check = (value, message) => {
    if (!value) throw Error(message);
  };
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
  });
  const p = await context.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => {
    if (
      m.type() === "error" &&
      !m.text().includes("server responded with a status of 404")
    )
      errors.push(m.text());
  });
  p.on("response", (r) => {
    if (
      r.status() >= 400 &&
      !/\/assets\/photos\/memory\/photo[1-8]\.webp$/.test(r.url())
    )
      missing.push(r.url());
  });
  await context.addInitScript(() => {
    localStorage.setItem(
      "wiki-anniversary-v1",
      JSON.stringify(["catcher", "maze", "runner", "memory", "quest", "snake"]),
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
        window.render = [];
        const pending = [...frames.values()];
        frames.clear();
        pending.forEach((f) => f(time));
      }
    };
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
      if (this.canvas === document.querySelector("canvas")) {
        const t = this.getTransform();
        (window.render ??= []).push({
          key: image.assetKey,
          x: t.e,
          y: t.f,
          args,
        });
      }
      return draw.call(this, image, ...args);
    };
  });
  try {
    await p.goto("http://127.0.0.1:4173/?v=mobile-fix");
    await p.locator("#loading").waitFor({ state: "detached" });
    check(
      await p
        .locator("meta[name=viewport]")
        .getAttribute("content")
        .then(
          (s) =>
            s.includes("viewport-fit=cover") && s.includes("maximum-scale=1"),
        ),
      "Viewport",
    );
    const manifest = await p.evaluate(
      async () => await (await fetch("/manifest.webmanifest")).json(),
    );
    check(
      manifest.display === "standalone" && manifest.icons.length === 2,
      "PWA manifest",
    );
    for (const icon of manifest.icons)
      check(
        (await p.request.get("http://127.0.0.1:4173/" + icon.src)).ok(),
        "PWA icon",
      );
    for (const width of [360, 393, 430]) {
      await p.setViewportSize({ width, height: width === 360 ? 640 : 852 });
      for (const game of [
        "catcher",
        "maze",
        "runner",
        "memory",
        "quest",
        "snake",
        "duo",
      ]) {
        await p.locator(`[data-game="${game}"]`).tap();
        await p.waitForTimeout(70);
        await p.evaluate(() => advance(2));
        const geometry = await p.evaluate(() => {
          const rect = (s) => {
            const e = document.querySelector(s);
            if (!e) return null;
            const r = e.getBoundingClientRect();
            return { x: r.x, y: r.y, w: r.width, h: r.height, b: r.bottom };
          };
          return {
            board: rect("canvas"),
            memory: rect("#memory"),
            controls: rect(".controls"),
            home: rect("#home"),
            rotate: document.body.classList.contains("game-rotate"),
            width: innerWidth,
            height: innerHeight,
            docW: document.documentElement.scrollWidth,
            docH: document.documentElement.scrollHeight,
            touch: getComputedStyle(document.body).touchAction,
            images: [...document.querySelectorAll("#app img")].every(
              (i) => !i.draggable,
            ),
          };
        });
        check(
          geometry.docW <= width + 1 && geometry.docH <= geometry.height + 1,
          `${game} ${width} overflow ${JSON.stringify(geometry)}`,
        );
        check(
          geometry.touch === "none" && geometry.images,
          `${game} gestures/images`,
        );
        if (game === "duo")
          check(
            geometry.rotate && geometry.home.b <= geometry.height,
            "Portrait rotation with menu",
          );
        else {
          const board = geometry.board || geometry.memory;
          check(
            board.w > 150 &&
              board.h > 150 &&
              board.x >= 0 &&
              board.b <= geometry.height + 1,
            `${game} board ${width}: ${JSON.stringify(geometry)}`,
          );
          if (geometry.controls)
            check(
              geometry.controls.b <= geometry.height + 1,
              `${game} controls fit`,
            );
        }
        layouts.push({ game, width, ...geometry });
        // Prevent browser scroll/selection/callout handlers and cleanly restore menu.
        check(
          await p.evaluate(() =>
            [
              "touchmove",
              "gesturestart",
              "gesturechange",
              "contextmenu",
              "dragstart",
              "selectstart",
            ].every(
              (type) =>
                !document.dispatchEvent(
                  new Event(type, { bubbles: true, cancelable: true }),
                ),
            ),
          ),
          `${game} cancel browser gestures`,
        );
        await p.locator("#home").tap();
        check(
          await p.evaluate(
            () =>
              !document.body.classList.contains("game-active") &&
              getComputedStyle(document.body).position !== "fixed",
          ),
          "Menu styles restored",
        );
      }
    }
    await p.setViewportSize({ width: 393, height: 852 });
    const cdp = await context.newCDPSession(p);
    const hold = async (selector, id = 1) => {
      const r = await p.locator(selector).boundingBox();
      const point = { x: r.x + r.width / 2, y: r.y + r.height / 2, id };
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [point],
      });
      return point;
    };
    const release = async () =>
      cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    const cancel = async () =>
      cdp.send("Input.dispatchTouchEvent", {
        type: "touchCancel",
        touchPoints: [],
      });
    await p.locator("[data-game=catcher]").tap();
    await p.evaluate(() => advance(1));
    const playerX = () =>
      p.evaluate(() => render.find((d) => /^wika/.test(d.key))?.x);
    const before = await playerX();
    await hold("[data-control=right]");
    await p.evaluate(() => advance(15));
    const after = await playerX();
    check(after > before + 30, "Catcher held direction moves immediately");
    await cancel();
    await p.evaluate(() => advance(1));
    const canceled = await playerX();
    await p.evaluate(() => advance(15));
    check((await playerX()) === canceled, "Canceled input stops movement");
    check(
      (await p.locator(".held,.pressed").count()) === 0,
      "No stuck pressed states",
    );
    // Real two-finger gesture: scale and viewport remain fixed.
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: 140, y: 360, id: 1 },
        { x: 240, y: 360, id: 2 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: 70, y: 360, id: 1 },
        { x: 310, y: 360, id: 2 },
      ],
    });
    await release();
    check(
      await p.evaluate(
        () => Math.abs(visualViewport.scale - 1) < 0.01 && scrollY === 0,
      ),
      "Pinch/scroll locked",
    );
    await p.locator(".session-pause-button").tap();
    const paused = await p.locator("canvas").evaluate((c) => c.toDataURL());
    await p.evaluate(() => advance(120));
    check(
      (await p.locator("canvas").evaluate((c) => c.toDataURL())) === paused,
      "Generic pause",
    );
    await p.getByRole("button", { name: "Wracamy do gry" }).tap();
    await p.locator("#home").tap();
    await p.locator("[data-game=runner]").tap();
    await p.locator("#dash-start").tap();
    await p.evaluate(() => advance(1));
    await hold("[data-control=jump]");
    await p.evaluate(() => advance(8));
    check(
      await p.evaluate(() => render.some((d) => d.key === "dashJump")),
      "Dash jump on pointerdown",
    );
    await release();
    await p.evaluate(() => advance(65));
    await hold("[data-control=crouch]");
    await p.evaluate(() => advance(8));
    check(
      await p.evaluate(() => render.some((d) => d.key === "dashCrouch")),
      "Held crouch",
    );
    await p.evaluate(() => advance(20));
    check(
      await p.evaluate(() => render.some((d) => d.key === "dashCrouch")),
      "Crouch remains while held",
    );
    await release();
    await p.evaluate(() => advance(1));
    check(
      await p.evaluate(() => render.some((d) => d.key === "dashRun")),
      "Release returns running",
    );
    await p.locator("#dash-pause").tap();
    const distance = await p.locator("#dash-distance").innerText();
    await p.evaluate(() => advance(100));
    check(
      (await p.locator("#dash-distance").innerText()) === distance,
      "Dash pause",
    );
    await p.locator("#dash-resume").tap();
    await p.locator("#restart").tap();
    check(await p.locator("#dash-start").isVisible(), "Dash restart");
    await p.locator("#home").tap();
    for (let round = 0; round < 5; round++) {
      if (round === 0) await p.locator("[data-game=snake]").tap();
      await p.locator("[data-control=right]").tap();
      await p.evaluate(() => advance(150));
      check(
        await p.getByRole("button", { name: "Spróbuj ponownie" }).isVisible(),
        `Snake wall ends round ${round + 1}`,
      );
      await p.getByRole("button", { name: "Spróbuj ponownie" }).tap();
      check(
        (await p.locator("#score").innerText()) === "Wynik: 0 / 20",
        "Snake retry clean",
      );
    }
    check(
      await p
        .locator("canvas")
        .evaluate((c) => c.width === 360 && c.height === 480),
      "Snake 9×12 board",
    );
    await p.locator("#home").tap();
    await p.locator("[data-game=catcher]").tap();
    await p.setViewportSize({ width: 932, height: 430 });
    await p.waitForTimeout(100);
    await p.evaluate(() => advance(2));
    const landscape = await p.locator("canvas").boundingBox();
    check(
      landscape.width > 932 * 0.9 && landscape.height > 250,
      "Catcher landscape fills width",
    );
    check(
      await p
        .locator("canvas")
        .evaluate((c) => c.height === 360 && c.width > 900),
      "Catcher landscape canvas",
    );
    await p.screenshot({
      path: "output/playwright/mobile-fix-catcher-landscape.png",
    });
    await p.setViewportSize({ width: 393, height: 852 });
    await p.waitForTimeout(100);
    check(
      await p
        .locator("canvas")
        .evaluate((c) => c.width === 480 && c.height > 700),
      "Catcher rotation keeps round",
    );
    await p.locator("#home").tap();
    await p.setViewportSize({ width: 932, height: 430 });
    await p.locator("[data-game=duo]").tap();
    await p.locator("#duo-panel-action").tap();
    await p.evaluate(() => advance(1));
    const positions = () =>
      p.evaluate(() =>
        Object.fromEntries(
          render
            .filter((d) => /duo(Wika|Michal)(Walk|Idle|Push|Jump)/.test(d.key))
            .map((d) => [d.key.startsWith("duoWika") ? "wika" : "michal", d.x]),
        ),
      );
    const start = await positions();
    const l = await p
        .locator("[data-duo-owner=wika][data-duo-action=right]")
        .boundingBox(),
      r = await p
        .locator("[data-duo-owner=michal][data-duo-action=left]")
        .boundingBox();
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: l.x + l.width / 2, y: l.y + l.height / 2, id: 1 },
        { x: r.x + r.width / 2, y: r.y + r.height / 2, id: 2 },
      ],
    });
    await p.evaluate(() => advance(15));
    const moving = await positions();
    check(
      moving.wika > start.wika && moving.michal < start.michal,
      "Duo simultaneous touch",
    );
    await cancel();
    await p.evaluate(() => advance(1));
    const stopped = await positions();
    await p.evaluate(() => advance(15));
    check(
      JSON.stringify(await positions()) === JSON.stringify(stopped),
      "Duo cancel independent controls",
    );
    await p.screenshot({ path: "output/playwright/mobile-fix-duo-touch.png" });
    await p.locator("#home").tap();
    await p.setViewportSize({ width: 393, height: 852 });
    await p.evaluate(() => scrollTo(0, 600));
    check(await p.evaluate(() => scrollY > 0), "Menu scroll restored");
    check(
      errors.length === 0 && missing.length === 0,
      `Errors ${JSON.stringify({ errors, missing })}`,
    );
    return {
      layouts,
      manifest: manifest.display,
      input:
        "hold, release, cancellation, jump, crouch, simultaneous Duo, pause, retry ×5, pinch passed",
      errors,
      missing,
    };
  } finally {
    await context.close();
  }
};
