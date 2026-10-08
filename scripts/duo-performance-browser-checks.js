async (page) => {
  const c = await page
      .context()
      .browser()
      .newContext({ viewport: { width: 1366, height: 768 } }),
    p = await c.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await c.addInitScript(() => {
    const fnIds = new WeakMap(),
      active = new Set(),
      pending = new Set();
    let seq = 0,
      last = 0;
    const times = [],
      work = [];
    const add = EventTarget.prototype.addEventListener,
      remove = EventTarget.prototype.removeEventListener;
    const tag = (target, type, fn, options) => {
      if (target !== window && target !== document) return null;
      if (!fnIds.has(fn)) fnIds.set(fn, ++seq);
      return `${target === window ? "w" : "d"}:${type}:${fnIds.get(fn)}:${!!(typeof options === "boolean" ? options : options?.capture)}`;
    };
    EventTarget.prototype.addEventListener = function (type, fn, options) {
      const id = tag(this, type, fn, options);
      if (id) active.add(id);
      return add.call(this, type, fn, options);
    };
    EventTarget.prototype.removeEventListener = function (type, fn, options) {
      const id = tag(this, type, fn, options);
      if (id) active.delete(id);
      return remove.call(this, type, fn, options);
    };
    const raf = requestAnimationFrame,
      cancel = cancelAnimationFrame;
    requestAnimationFrame = (f) => {
      let id = raf((t) => {
        pending.delete(id);
        const before = performance.now(),
          playing = document.querySelector(".duo-shell,.catcher-shell");
        if (playing && last) times.push(t - last);
        last = playing ? t : 0;
        f(t);
        if (playing) work.push(performance.now() - before);
      });
      pending.add(id);
      return id;
    };
    cancelAnimationFrame = (id) => {
      pending.delete(id);
      return cancel(id);
    };
    window.metrics = { active, pending, times, work };
  });
  try {
    await p.goto("http://127.0.0.1:4173/");
    await p.locator("#loading").waitFor({ state: "detached" });
    const baseline = await p.evaluate(() => metrics.active.size);
    await p.locator("[data-game=duo]").click();
    await p.locator("#duo-panel-action").click();
    await p.keyboard.down("d");
    await p.waitForTimeout(1200);
    await p.keyboard.up("d");
    await p.keyboard.press("w");
    await p.waitForTimeout(2800);
    const performanceStats = await p.evaluate(() => {
      const stats = (a) => {
        a = [...a].sort((a, b) => a - b);
        return {
          count: a.length,
          median: a[Math.floor(a.length * 0.5)],
          p95: a[Math.floor(a.length * 0.95)],
          max: a.at(-1),
        };
      };
      return {
        frameMs: stats(metrics.times),
        updateAndDrawMs: stats(metrics.work),
      };
    });
    const listeners = await p.evaluate(() => metrics.active.size);
    for (let i = 0; i < 20; i++) {
      await p.locator("#restart").click();
      if ((await p.evaluate(() => metrics.active.size)) !== listeners)
        throw Error("Listeners grew on restart");
      if ((await p.evaluate(() => metrics.pending.size)) !== 1)
        throw Error("Duplicate RAF");
    }
    await p.locator("#home").click();
    if ((await p.evaluate(() => metrics.active.size)) !== baseline)
      throw Error("Listener leak on leave");
    if ((await p.evaluate(() => metrics.pending.size)) !== 0)
      throw Error("RAF leak on leave");
    await p.evaluate(() => {
      metrics.times.length = 0;
      metrics.work.length = 0;
    });
    await p.locator("[data-game=catcher]").click();
    await p.keyboard.down("ArrowRight");
    await p.waitForTimeout(1000);
    await p.keyboard.up("ArrowRight");
    await p.waitForTimeout(3000);
    const catcherPerformance = await p.evaluate(() => {
      const stats = (a) => {
        a = [...a].sort((x, y) => x - y);
        return {
          count: a.length,
          median: a[Math.floor(a.length * 0.5)],
          p95: a[Math.floor(a.length * 0.95)],
          max: a.at(-1),
        };
      };
      return {
        frameMs: stats(metrics.times),
        updateAndDrawMs: stats(metrics.work),
      };
    });
    const catcherListeners = await p.evaluate(() => metrics.active.size);
    for (let i = 0; i < 20; i++) {
      await p.locator("#restart").click();
      if (
        (await p.evaluate(() => metrics.active.size)) !== catcherListeners ||
        (await p.evaluate(() => metrics.pending.size)) !== 1
      )
        throw Error("Catcher restart leak");
    }
    await p.locator("#home").click();
    if (
      (await p.evaluate(() => metrics.active.size)) !== baseline ||
      (await p.evaluate(() => metrics.pending.size)) !== 0
    )
      throw Error("Catcher cleanup");
    const cdp = await c.newCDPSession(p);
    await cdp.send("HeapProfiler.collectGarbage");
    const heapBefore = await cdp.send("Runtime.getHeapUsage");
    for (let i = 0; i < 12; i++) {
      await p.locator("[data-game=duo]").click();
      await p.locator("#duo-panel-action").click();
      await p.locator("#home").click();
      if ((await p.evaluate(() => metrics.active.size)) !== baseline)
        throw Error("Lifecycle leak");
    }
    await cdp.send("HeapProfiler.collectGarbage");
    const heapAfter = await cdp.send("Runtime.getHeapUsage");
    if (heapAfter.usedSize - heapBefore.usedSize > 2e6)
      throw Error("Heap grows >2MB");
    if (errors.length) throw Error(JSON.stringify(errors));
    return {
      performanceStats,
      catcherPerformance,
      catcherListeners,
      catcherRestarts: 20,
      restarts: 20,
      openCloseCycles: 12,
      globalListenersBaseline: baseline,
      globalListenersInGame: listeners,
      globalListenersAfter: await p.evaluate(() => metrics.active.size),
      pendingRAFAfter: await p.evaluate(() => metrics.pending.size),
      heapBefore: heapBefore.usedSize,
      heapAfter: heapAfter.usedSize,
      heapDelta: heapAfter.usedSize - heapBefore.usedSize,
      errors,
    };
  } finally {
    await c.close();
  }
};
