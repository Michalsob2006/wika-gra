async (page) => {
  const c = await page
      .context()
      .browser()
      .newContext({ viewport: { width: 1366, height: 768 } }),
    p = await c.newPage(),
    errors = [],
    bad = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("response", (r) => {
    if (r.status() >= 400) bad.push(r.url());
  });
  try {
    await p.goto("http://127.0.0.1:4173/");
    await p.locator("#loading").waitFor({ state: "detached" });
    const cover = p.locator(".card:has([data-game=duo]) .cover-image");
    if (
      (await cover.getAttribute("src")) !== "assets/duo/v2/cover.webp" ||
      (await p.locator(".duo-cover-wika,.duo-cover-michal").count())
    )
      throw Error("Old cover shown");
    await p.locator("[data-game=duo]").scrollIntoViewIfNeeded();
    await p.screenshot({ path: "output/playwright/duo-fix-cover-desktop.png" });
    await p.locator("[data-game=duo]").click();
    await p.locator("#duo-panel-action").click();
    await p.screenshot({
      path: "output/playwright/duo-fix-level1-desktop.png",
    });
    await p.locator("#home").click();
    await p.setViewportSize({ width: 393, height: 852 });
    await p.locator("[data-game=duo]").scrollIntoViewIfNeeded();
    if (
      (await cover.evaluate((im) => getComputedStyle(im).objectFit)) !== "cover"
    )
      throw Error("Cover fit");
    await p.screenshot({ path: "output/playwright/duo-fix-cover-mobile.png" });
    await p.locator("[data-game=duo]").click();
    if (!(await p.getByText("Obróć telefon poziomo, żeby zagrać").isVisible()))
      throw Error("Rotate message");
    await p.screenshot({ path: "output/playwright/duo-fix-rotate-mobile.png" });
    await p.setViewportSize({ width: 932, height: 430 });
    await p.locator("#duo-panel-action").click();
    await p.waitForTimeout(80);
    await p.screenshot({ path: "output/playwright/duo-fix-level1-mobile.png" });
    if (!(await p.locator(".duo-touch").isVisible()))
      throw Error("Touch controls");
    const r = await p.locator("canvas").boundingBox();
    if (r.x < 0 || r.x + r.width > 932 || r.y + r.height > 430)
      throw Error("Landscape board");
    if (errors.length || bad.length)
      throw Error(JSON.stringify({ errors, bad }));
    return {
      cover: "v2 full card, object-fit cover, no old layers",
      portrait: "rotate notice",
      landscape: r,
      errors,
      missing: bad,
    };
  } finally {
    await c.close();
  }
};
