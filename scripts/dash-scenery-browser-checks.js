async (page) => {
  const c = await page
      .context()
      .browser()
      .newContext({ viewport: { width: 1366, height: 900 } }),
    p = await c.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  try {
    await p.goto("http://127.0.0.1:4173/");
    await p.locator("#loading").waitFor({ state: "detached" });
    const result = await p.evaluate(async () => {
      const { images } = await import("/js/preload.js"),
        { createDashScenery, DASH_SCENERY } =
          await import("/js/games/dash-scenery.js");
      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = 760;
      const ctx = canvas.getContext("2d"),
        scenery = createDashScenery(images);
      if (scenery !== createDashScenery(images)) throw Error("Scenery cache");
      const read = (travel, distance = 0, reduce = false) => {
        scenery.draw(ctx, 720, travel, distance, reduce);
        return ctx.getImageData(0, 0, 720, 760).data;
      };
      const diff = (a, b, limit = a.length) => {
        let sum = 0,
          max = 0;
        for (let i = 0; i < limit; i++) {
          const delta = Math.abs(a[i] - b[i]);
          sum += delta;
          max = Math.max(max, delta);
        }
        return { mean: sum / limit, max };
      };
      const width = Math.round(
          (610 * images.dashRiverside.width) / images.dashRiverside.height,
        ),
        period = (2 * width) / DASH_SCENERY.parallax;
      const backgroundPeriod = diff(
        read(123),
        read(123 + period),
        720 * 581 * 4,
      );
      const groundWidth = Math.round(
          (DASH_SCENERY.ground.height * images.dashPlatform.width) /
            images.dashPlatform.height,
        ),
        groundPeriod = diff(
          read(123, 0, true),
          read(123 + 2 * groundWidth, 0, true),
        );
      const boundary = period;
      const wrap = diff(
        read(boundary - 0.01),
        read(boundary + 0.01),
        720 * 581 * 4,
      );
      const transition = diff(
        read(9000, 600 - 0.001),
        read(9000, 600 + 0.001),
        720 * 581 * 4,
      );
      if (
        backgroundPeriod.max > 1 ||
        backgroundPeriod.mean > 0.001 ||
        groundPeriod.max !== 0 ||
        wrap.mean > 1 ||
        transition.mean > 1
      )
        throw Error(
          JSON.stringify({ backgroundPeriod, groundPeriod, wrap, transition }),
        );
      const config = { ...DASH_SCENERY, loop: "seamless" };
      createDashScenery(images, config).draw(ctx, 720, 123, 0);
      return {
        cached: true,
        backgroundPeriod,
        groundPeriod,
        wrap,
        transition,
        seamlessMode: true,
      };
    });
    await p.locator("[data-game=runner]").click();
    await p.locator("#dash-start").click();
    await p.waitForTimeout(250);
    await p.screenshot({ path: "output/playwright/dash-fix-desktop.png" });
    if (errors.length) throw Error(JSON.stringify(errors));
    return { ...result, errors };
  } finally {
    await c.close();
  }
};
