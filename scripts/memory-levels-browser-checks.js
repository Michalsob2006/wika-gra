async (page) => {
  const browser = page.context().browser(),
    photoPattern = /\/assets\/photos\/memory\/photo[1-8]\.webp$/;
  const completePairs = async (target) => {
    await target.evaluate(() => {
      const groups = new Map();
      for (const card of document.querySelectorAll(".memory-card")) {
        const src = card.querySelector("img").src;
        if (!groups.has(src)) groups.set(src, []);
        groups.get(src).push(card);
      }
      for (const pair of groups.values()) {
        pair[0].click();
        pair[1].click();
      }
    });
  };

  const missingContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    missingPage = await missingContext.newPage(),
    unexpected = [];
  missingPage.on("response", (response) => {
    if (response.status() >= 400 && !photoPattern.test(response.url()))
      unexpected.push(response.url());
  });
  await missingPage.route("**/assets/photos/memory/photo*.webp", (route) =>
    route.fulfill({ status: 404, body: "missing test photo" }),
  );
  await missingPage.goto("http://127.0.0.1:4173/?v=memory-levels");
  await missingPage.locator("#loading").waitFor({ state: "detached" });
  await missingPage.locator("[data-game=memory]").click();
  await missingPage
    .locator('.memory-grid[data-level="1"] .memory-card')
    .first()
    .waitFor();
  await completePairs(missingPage);
  await missingPage.locator("#memory-next").waitFor();
  const fallback = await missingPage.locator(".memory-level-panel").innerText();
  if (!fallback.includes("Zdjęcia dodamy później"))
    throw Error("No clean missing-photo fallback: " + fallback);
  if (await missingPage.locator('img[src*="/photos/memory/"]').count())
    throw Error("Missing photo rendered as a broken image");
  await missingPage.screenshot({
    path: "output/playwright/memory-photos-fallback.png",
  });
  await missingContext.close();

  const photoContext = await browser.newContext({
      viewport: { width: 430, height: 900 },
    }),
    photoPage = await photoContext.newPage();
  await photoContext.addInitScript(() => {
    localStorage.setItem("wiki-anniversary-memory-v1", JSON.stringify([1]));
  });
  await photoPage.goto("http://127.0.0.1:4173/?v=memory-levels-photos");
  await photoPage.locator("#loading").waitFor({ state: "detached" });
  await photoPage.locator("[data-game=memory]").click();
  await photoPage
    .locator('.memory-grid[data-level="2"] .memory-card')
    .first()
    .waitFor();
  const levelTwo = await photoPage.evaluate(() => {
    const sources = [...document.querySelectorAll(".memory-card img")].map(
      (image) => image.getAttribute("src"),
    );
    const counts = Object.fromEntries(
      [...new Set(sources)].map((source) => [
        source,
        sources.filter((candidate) => candidate === source).length,
      ]),
    );
    const grid = document.querySelector("#memory").getBoundingClientRect();
    return {
      count: sources.length,
      unique: Object.keys(counts).length,
      counts,
      decoded: [...document.querySelectorAll(".memory-card img")].every(
        (image) => image.complete && image.naturalWidth > 0,
      ),
      level: document.querySelector("#score").textContent,
      fits: grid.left >= 0 && grid.right <= innerWidth + 1,
    };
  });
  if (
    levelTwo.count !== 16 ||
    levelTwo.unique !== 8 ||
    Object.values(levelTwo.counts).some((count) => count !== 2) ||
    !levelTwo.decoded ||
    !levelTwo.level.includes("Poziom 2/2") ||
    !levelTwo.fits
  )
    throw Error("Level two layout: " + JSON.stringify(levelTwo));
  await photoPage.setViewportSize({ width: 360, height: 800 });
  const mobileFits = await photoPage.evaluate(() => {
    const grid = document.querySelector("#memory").getBoundingClientRect(),
      card = document.querySelector(".memory-card").getBoundingClientRect();
    return (
      grid.left >= 0 &&
      grid.right <= innerWidth + 1 &&
      card.width >= 54 &&
      card.height >= 54
    );
  });
  if (!mobileFits) throw Error("Level two does not fit 360px");
  await completePairs(photoPage);
  await photoPage.screenshot({
    path: "output/playwright/memory-level2-360.png",
  });
  await photoPage.locator(".overlay").waitFor();
  const savedLevels = await photoPage.evaluate(() =>
    JSON.parse(localStorage.getItem("wiki-anniversary-memory-v1")),
  );
  if (JSON.stringify(savedLevels) !== JSON.stringify([1, 2]))
    throw Error("Memory levels not saved: " + JSON.stringify(savedLevels));
  await photoContext.close();
  if (unexpected.length)
    throw Error("Unexpected missing files: " + JSON.stringify(unexpected));
  return { fallback, levelTwo, mobileFits, savedLevels };
};
