async (page) => {
  const c = await page
      .context()
      .browser()
      .newContext({ viewport: { width: 1366, height: 768 }, hasTouch: true }),
    p = await c.newPage(),
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
    window.choice = 0;
    window.catchIt = false;
    let randomCall = 0;
    Math.random = () => {
      const n = randomCall++ % 3;
      return n === 0
        ? choice
        : n === 1
          ? catchIt
            ? (document.querySelector("canvas").width / 2 - 43) /
              (document.querySelector("canvas").width - 96)
            : 0
          : 0.1;
    };
    window.canvasText = [];
    window.playerX = 0;
    window.backgroundRect = null;
    const text = CanvasRenderingContext2D.prototype.fillText,
      draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.fillText = function (s, ...a) {
      if (this.canvas === document.querySelector("canvas")) canvasText.push(s);
      return text.call(this, s, ...a);
    };
    CanvasRenderingContext2D.prototype.drawImage = function (im, ...a) {
      if (im.assetKey === "wikaIdle" || im.assetKey === "wikaRun")
        playerX = this.getTransform().e;
      if (im === window.village)
        backgroundRect = {
          x: a[0],
          y: a[1],
          w: a[2],
          h: a[3],
          canvasW: this.canvas.width,
          canvasH: this.canvas.height,
        };
      return draw.call(this, im, ...a);
    };
  });
  const check = (v, s) => {
    if (!v) throw Error(s);
  };
  const results = [];
  try {
    await p.goto("http://127.0.0.1:4173/");
    await p.locator("#loading").waitFor({ state: "detached" });
    await p.evaluate(async () => {
      village = (await import("/js/preload.js")).images.village;
    });
    await p.locator("[data-game=catcher]").click();
    const types = [
      ["heart", 0, 1],
      ["bouquet", 0.4, 2],
      ["letter", 0.55, 2],
      ["gift", 0.75, 3],
      ["broken", 0.95, -1],
    ];
    for (const [key, choice, value] of types)
      for (const catchIt of [false, true]) {
        await p.evaluate(
          ({ choice, catchIt }) => {
            window.choice = choice;
            window.catchIt = catchIt;
          },
          { choice, catchIt },
        );
        await p.locator("#restart").click();
        await p.evaluate(() => advance(1));
        const target = catchIt ? value : key === "broken" ? 0 : -1;
        await p.evaluate(
          ({ target, key, catchIt }) => {
            for (let n = 0; n < 420; n++) {
              advance(1);
              const text = document.querySelector("#score").textContent;
              if (target !== 0 && text.includes(`Wynik: ${target} ·`)) break;
              if (target === 0 && n === 419) break;
            }
          },
          { target, key, catchIt },
        );
        const score = await p.locator("#score").textContent();
        check(
          score.includes(`Wynik: ${target} ·`),
          `${key} ${catchIt}: ${score}`,
        );
        results.push({ key, catchIt, score });
      }
    // Signed scores continue changing rather than clamping at zero.
    await p.evaluate(() => {
      choice = 0;
      catchIt = false;
    });
    await p.locator("#restart").click();
    await p.evaluate(() => advance(420));
    check(
      /Wynik: −?-[1-9]/.test(await p.locator("#score").textContent()),
      "Signed score",
    );
    await p.screenshot({
      path: "output/playwright/quality-catcher-desktop.png",
    });
    const layouts = [];
    for (const width of [360, 393, 430]) {
      await p.setViewportSize({ width, height: 852 });
      await p.waitForTimeout(80);
      await p.evaluate(() => advance(2));
      const bounds = await p.evaluate(() => {
        const c = document.querySelector("canvas").getBoundingClientRect(),
          w = document.querySelector(".canvas-wrap").getBoundingClientRect();
        return {
          canvas: { x: c.x, y: c.y, w: c.width, h: c.height },
          wrap: { x: w.x, y: w.y, w: w.width, h: w.height },
          background: backgroundRect,
        };
      });
      check(
        bounds.canvas.x >= 0 &&
          bounds.canvas.x + bounds.canvas.w <= width &&
          bounds.canvas.y + bounds.canvas.h <= 852,
        "Board bounds",
      );
      check(
        Math.abs(bounds.wrap.w - bounds.canvas.w) < 5 &&
          Math.abs(bounds.wrap.h - bounds.canvas.h) < 5,
        "No letterbox gaps " + JSON.stringify(bounds),
      );
      const bg = bounds.background;
      check(
        bg.x >= -0.01 &&
          bg.y >= -0.01 &&
          bg.x + bg.w <= bg.canvasW + 0.01 &&
          bg.y + bg.h <= bg.canvasH,
        "No cropped village",
      );
      layouts.push({ width, ...bounds });
      await p.screenshot({
        path: `output/playwright/quality-catcher-${width}.png`,
      });
    }
    await p.setViewportSize({ width: 932, height: 430 });
    await p.waitForTimeout(80);
    await p.evaluate(() => advance(2));
    const landscape = await p.locator("canvas").boundingBox();
    check(
      landscape.x >= 0 &&
        landscape.x + landscape.width <= 932 &&
        landscape.y + landscape.height <= 430,
      "Landscape bounds",
    );
    await p.screenshot({
      path: "output/playwright/quality-catcher-landscape.png",
    });
    layouts.push({ width: 932, height: 430, canvas: landscape });
    await p.setViewportSize({ width: 393, height: 852 });
    await p.waitForTimeout(80);
    await p.evaluate(() => advance(2));
    const btn = p.locator("[data-control=right]");
    const css = await btn.evaluate((b) => {
      const c = getComputedStyle(b);
      return {
        touch: c.touchAction,
        select: c.userSelect,
        callout: c.getPropertyValue("-webkit-touch-callout"),
        highlight: c.webkitTapHighlightColor,
      };
    });
    check(
      css.touch === "none" &&
        css.select === "none" &&
        css.highlight === "rgba(0, 0, 0, 0)",
      "Touch CSS",
    );
    const blocked = await p.evaluate(() =>
      ["touchmove", "gesturestart", "contextmenu", "selectstart"].map(
        (type) => {
          const e = new Event(type, { bubbles: true, cancelable: true });
          document.dispatchEvent(e);
          return { type, blocked: e.defaultPrevented };
        },
      ),
    );
    check(
      blocked.every((r) => r.blocked),
      "Gesture prevent",
    );
    const before = await p.evaluate(() => playerX);
    await btn.dispatchEvent("pointerdown", {
      pointerId: 91,
      pointerType: "touch",
      bubbles: true,
    });
    await p.evaluate(() => advance(20));
    const after = await p.evaluate(() => playerX);
    check(after > before, "Touch movement");
    await btn.dispatchEvent("pointercancel", {
      pointerId: 91,
      pointerType: "touch",
      bubbles: true,
    });
    await p.evaluate(() => advance(3));
    const stopped = await p.evaluate(() => playerX);
    await p.evaluate(() => advance(20));
    check((await p.evaluate(() => playerX)) === stopped, "Cancel stops input");
    const cdp = await c.newCDPSession(p);
    await cdp.send("Input.synthesizePinchGesture", {
      x: 200,
      y: 350,
      scaleFactor: 1.7,
      gestureSourceType: "touch",
    });
    await cdp.send("Input.synthesizeScrollGesture", {
      x: 200,
      y: 350,
      yDistance: -350,
      gestureSourceType: "touch",
    });
    const viewport = await p.evaluate(() => ({
      scale: visualViewport.scale,
      scroll: scrollY,
      overflow: getComputedStyle(document.body).overflow,
    }));
    check(
      viewport.scale === 1 &&
        viewport.scroll === 0 &&
        viewport.overflow === "hidden",
      "No zoom/scroll",
    );
    await p.locator("#home").click();
    check(
      await p.evaluate(() => !document.body.classList.contains("game-active")),
      "Menu cleanup",
    );
    const unblocked = await p.evaluate(() => {
      const e = new Event("touchmove", { bubbles: true, cancelable: true });
      document.dispatchEvent(e);
      return !e.defaultPrevented;
    });
    check(unblocked, "Menu touch restored");
    await p.setViewportSize({ width: 1366, height: 768 });
    await p.evaluate(() => (canvasText = []));
    await p.locator("[data-game=duo]").click();
    await p.locator("#duo-panel-action").click();
    await p.evaluate(() => advance(10));
    check(
      await p.evaluate(() => canvasText.length === 0),
      "No text drawn on Duo board",
    );
    check(
      !/checkpoint|CP [0-9]/i.test(await p.locator(".hud").innerText()),
      "No checkpoint HUD",
    );
    if (errors.length || missing.length)
      throw Error(JSON.stringify({ errors, missing }));
    return {
      scores: results,
      layouts,
      css,
      blocked,
      viewport,
      touch: { before, after, stopped },
      duo: "No canvas labels or checkpoint HUD",
      menu: "Scroll and touch restored",
      errors,
      missing,
    };
  } finally {
    await c.close();
  }
};
