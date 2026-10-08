async (page) => {
  const c = await page
      .context()
      .browser()
      .newContext({
        viewport: { width: 393, height: 852 },
        isMobile: true,
        hasTouch: true,
      }),
    p = await c.newPage();
  try {
    await p.goto("http://127.0.0.1:4173/");
    await p.locator("#loading").waitFor({ state: "detached" });
    await p.locator("[data-game=memory]").tap();
    const indices = await p.evaluate(() => {
      const b = [...document.querySelectorAll(".memory-card")];
      return [
        0,
        b.findIndex(
          (x) => x.querySelector("img").src !== b[0].querySelector("img").src,
        ),
      ];
    });
    for (const i of indices)
      await p.locator(`.memory-card[data-index="${i}"]`).tap();
    await p.locator(".session-pause-button").tap();
    await p.waitForTimeout(1000);
    if ((await p.locator(".memory-card.flipped").count()) !== 2)
      throw Error("Cards hidden during pause");
    await p.getByRole("button", { name: "Wracamy do gry" }).tap();
    await p.waitForTimeout(1100);
    if (await p.locator(".memory-card.flipped").count())
      throw Error("Cards not hidden after resume");
    await p.evaluate(() => {
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
    await p.locator(".session-pause-button").tap();
    await p.waitForTimeout(800);
    if (await p.locator(".overlay:not(.session-pause)").count())
      throw Error("Win while paused");
    await p.getByRole("button", { name: "Wracamy do gry" }).tap();
    await p.locator(".overlay:not(.session-pause)").waitFor();
    return {
      mismatchTimer: "frozen while paused",
      winTimer: "frozen while paused",
      pairs: "8/8",
    };
  } finally {
    await c.close();
  }
};
