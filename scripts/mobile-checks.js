async (page) => {
  const context = await page
      .context()
      .browser()
      .newContext({
        viewport: { width: 390, height: 844 },
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
  await mobile.evaluate(() => {
    const draw = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
      if (
        image.assetKey?.startsWith("wika") ||
        ["dashRun", "dashJump", "dashCrouch"].includes(image.assetKey)
      )
        window.wikiDraw = {
          x: this.getTransform().e,
          y: this.getTransform().f,
          key: image.assetKey,
        };
      return draw.call(this, image, ...args);
    };
  });
  const session = await context.newCDPSession(mobile),
    results = {};
  async function hold(names, duration = 250) {
    const points = [];
    for (const [i, name] of names.entries()) {
      const b = await mobile.locator(`[data-control=${name}]`).boundingBox();
      points.push({ x: b.x + b.width / 2, y: b.y + b.height / 2, id: i + 1 });
    }
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: points,
    });
    await mobile.waitForTimeout(duration);
    const state = await mobile.evaluate(() => wikiDraw);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    return state;
  }
  for (const id of ["runner", "maze", "quest"]) {
    await mobile.locator(`[data-game=${id}]`).tap();
    await mobile.waitForTimeout(80);
    const before = await mobile.evaluate(() => wikiDraw);
    let after = await hold(id === "runner" ? ["jump"] : ["right"]);
    if (id === "maze" && after.x === before.x && after.y === before.y)
      after = await hold(["up"]);
    results[id] = { before, after };
    if (id === "runner" && after.key !== "dashJump")
      throw Error("Multitouch jump failed");
    if (
      id === "maze" &&
      Math.abs(after.x - before.x) + Math.abs(after.y - before.y) < 5
    )
      throw Error("Maze touch movement failed");
    if (id === "quest" && after.x <= before.x)
      throw Error("Gift touch movement failed");
    await mobile
      .getByRole("button", { name: "Wróć do menu", exact: true })
      .tap();
  }
  await mobile.locator("[data-game=runner]").tap();
  await mobile.keyboard.down("ArrowRight");
  await mobile.keyboard.down(" ");
  await mobile.waitForTimeout(100);
  await mobile.keyboard.up(" ");
  results.frames = await mobile.evaluate(
    () =>
      new Promise((resolve) => {
        const values = [];
        let last = performance.now();
        function frame(now) {
          values.push(now - last);
          last = now;
          if (values.length < 120) requestAnimationFrame(frame);
          else {
            const sorted = values.slice(2).sort((a, b) => a - b);
            resolve({
              sample: values.length,
              median: sorted[Math.floor(sorted.length / 2)],
              p95: sorted[Math.floor(sorted.length * 0.95)],
            });
          }
        }
        requestAnimationFrame(frame);
      }),
  );
  await mobile.keyboard.up("ArrowRight");
  await context.close();
  if (errors.length) throw Error(errors.join("\n"));
  return { results, errors };
};
