async (page) => {
  const context = await page
      .context()
      .browser()
      .newContext({
        viewport: { width: 360, height: 800 },
        isMobile: true,
        hasTouch: true,
      }),
    mobile = await context.newPage(),
    errors = [];
  mobile.on("pageerror", (e) => errors.push(e.message));
  await mobile.goto("http://127.0.0.1:4173");
  await mobile.waitForSelector("#loading", { state: "detached" });
  await mobile.evaluate(() =>
    localStorage.setItem(
      "wiki-anniversary-v1",
      JSON.stringify(["catcher", "maze", "runner", "memory", "snake"]),
    ),
  );
  await mobile.reload();
  await mobile.waitForSelector("#loading", { state: "detached" });
  await mobile.locator("[data-game=quest]").tap();
  await mobile.evaluate(() => {
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
      if (image.assetKey?.startsWith("wika"))
        window.actor = { x: this.getTransform().e, y: this.getTransform().f };
      return draw.call(this, image, ...args);
    };
  });
  await mobile.waitForTimeout(80);
  const before = await mobile.evaluate(() => actor),
    session = await context.newCDPSession(mobile),
    b = await mobile.locator("[data-control=right]").boundingBox();
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2, id: 1 }],
  });
  await mobile.waitForTimeout(250);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const released = await mobile.evaluate(() => actor);
  await mobile.waitForTimeout(200);
  const after = await mobile.evaluate(() => actor);
  if (released.x <= before.x || after.x <= released.x)
    throw Error("D-pad or persistent grid movement failed");
  await mobile.locator("#restart").tap();
  await mobile.waitForTimeout(60);
  const screenshots = [];
  for (const width of [360, 390, 430]) {
    await mobile.setViewportSize({ width, height: 844 });
    await mobile.waitForTimeout(150);
    const size = await mobile.locator("canvas").boundingBox();
    if (size.x < 0 || size.x + size.width > width + 1)
      throw Error("Board overflow");
    await mobile.screenshot({
      path: `output/playwright/gift-corridors-live-${width}.png`,
    });
    screenshots.push({ width, board: size });
  }
  await context.close();
  if (errors.length) throw Error(errors.join("\n"));
  return {
    touch: true,
    continuedAfterRelease: true,
    before,
    released,
    after,
    screenshots,
    errors,
  };
};
