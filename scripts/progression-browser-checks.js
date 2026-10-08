async (page) => {
  const browser = page.context().browser(),
    expectedOrder = [
      "catcher",
      "maze",
      "runner",
      "memory",
      "snake",
      "quest",
      "duo",
    ];
  const inspect = async (target) => ({
    order: await target
      .locator("[data-game]")
      .evaluateAll((buttons) => buttons.map((button) => button.dataset.game)),
    progress: await target.locator(".progress-panel strong").innerText(),
    questLocked: await target.locator("[data-game=quest]").isDisabled(),
    questText: await target.locator(".card:has([data-game=quest])").innerText(),
    duoDisabled: await target.locator("[data-game=duo]").isDisabled(),
    duoText: await target.locator(".card:has([data-game=duo])").innerText(),
  });

  const freshContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    freshPage = await freshContext.newPage();
  await freshPage.goto("http://127.0.0.1:4173/?v=progression-fresh");
  await freshPage.locator("#loading").waitFor({ state: "detached" });
  const fresh = await inspect(freshPage);
  if (
    JSON.stringify(fresh.order) !== JSON.stringify(expectedOrder) ||
    fresh.progress !== "Postęp · 0/6" ||
    !fresh.questLocked ||
    !fresh.questText.includes("Ukończ 5 poprzednich gier") ||
    fresh.duoDisabled ||
    !fresh.duoText.includes("BONUS")
  )
    throw Error("Fresh progression: " + JSON.stringify(fresh));
  await freshPage.screenshot({
    path: "output/playwright/progression-menu-390.png",
    fullPage: true,
  });
  await freshContext.close();

  const migrationContext = await browser.newContext(),
    migrationPage = await migrationContext.newPage();
  await migrationContext.addInitScript(() => {
    localStorage.setItem(
      "wiki-anniversary-v1",
      JSON.stringify(["catcher", "maze", "runner", "memory", "snake", "duo"]),
    );
  });
  await migrationPage.goto("http://127.0.0.1:4173/?v=progression-migration");
  await migrationPage.locator("#loading").waitFor({ state: "detached" });
  const migrated = await inspect(migrationPage),
    storage = await migrationPage.evaluate(() => ({
      main: JSON.parse(localStorage.getItem("wiki-anniversary-main-v2")),
      bonus: JSON.parse(localStorage.getItem("wiki-anniversary-bonus-v1")),
      memory: JSON.parse(localStorage.getItem("wiki-anniversary-memory-v1")),
    }));
  if (
    migrated.progress !== "Postęp · 5/6" ||
    migrated.questLocked ||
    JSON.stringify(storage.main) !==
      JSON.stringify(["catcher", "maze", "runner", "memory", "snake"]) ||
    JSON.stringify(storage.bonus) !== JSON.stringify(["duo"]) ||
    JSON.stringify(storage.memory) !== JSON.stringify([1])
  )
    throw Error("Migration: " + JSON.stringify({ migrated, storage }));
  await migrationContext.close();

  const staleContext = await browser.newContext(),
    stalePage = await staleContext.newPage();
  await staleContext.addInitScript(() => {
    const stale = ["catcher", "maze", "runner", "memory", "quest"];
    localStorage.setItem("wiki-anniversary-v1", JSON.stringify(stale));
    localStorage.setItem("wiki-anniversary-main-v2", JSON.stringify(stale));
    localStorage.setItem("wiki-anniversary-bonus-v1", "[]");
  });
  await stalePage.goto("http://127.0.0.1:4173/?v=progression-stale");
  await stalePage.locator("#loading").waitFor({ state: "detached" });
  const stale = await inspect(stalePage),
    normalizedStorage = await stalePage.evaluate(() => ({
      main: JSON.parse(localStorage.getItem("wiki-anniversary-main-v2")),
      legacy: JSON.parse(localStorage.getItem("wiki-anniversary-v1")),
    }));
  if (
    stale.progress !== "Postęp · 4/6" ||
    !stale.questLocked ||
    stale.questText.includes("Ukończone") ||
    [normalizedStorage.main, normalizedStorage.legacy].some(
      (value) =>
        JSON.stringify(value) !==
        JSON.stringify(["catcher", "maze", "runner", "memory"]),
    )
  )
    throw Error(
      "Stale pre-Snake progression: " +
        JSON.stringify({ stale, normalizedStorage }),
    );
  await staleContext.close();

  const completeContext = await browser.newContext(),
    completePage = await completeContext.newPage();
  await completeContext.addInitScript(() => {
    localStorage.setItem(
      "wiki-anniversary-v1",
      JSON.stringify(["catcher", "maze", "runner", "memory", "snake", "quest"]),
    );
  });
  await completePage.goto("http://127.0.0.1:4173/?v=progression-complete");
  await completePage.locator("#loading").waitFor({ state: "detached" });
  const complete = await inspect(completePage);
  if (
    complete.progress !== "Postęp · 6/6" ||
    (await completePage.locator("#view-final").count()) !== 1 ||
    complete.duoText.includes("Ukończone")
  )
    throw Error("Independent bonus: " + JSON.stringify(complete));
  await completePage.locator("#view-final").click();
  await completePage.locator('.photo-slot > img[alt="Nasze wspólne zdjęcie"]').waitFor();
  const finalView = await completePage.evaluate(async () => {
    const { finalConfig } = await import("/js/final-config.js");
    return {
      fields: Object.keys(finalConfig),
      progress: document.querySelector(".final .eyebrow")?.textContent,
      actions: [...document.querySelectorAll(".final-actions button")].map(
        (button) => button.textContent,
      ),
      cards: [...document.querySelectorAll(".final-card")].map((card) =>
        card.innerText,
      ),
      photo: {
        src: document.querySelector('.photo-slot > img')?.getAttribute("src"),
        loaded: document.querySelector('.photo-slot > img')?.naturalWidth > 0,
      },
    };
  });
  if (
    ![
      "finalMessageTitle",
      "finalMessageText",
      "finalGiftIntro",
      "finalGiftHint",
      "finalGoingOutTitle",
      "finalGoingOutText",
      "finalPhoto",
      "showFinalPhoto",
    ].every((field) => finalView.fields.includes(field)) ||
    !finalView.progress.includes("6/6") ||
    finalView.photo.src !== "assets/photos/final.webp" ||
    !finalView.photo.loaded ||
    finalView.cards.length !== 2 ||
    JSON.stringify(finalView.actions) !==
      JSON.stringify(["Przeżyj jeszcze raz ❤️", "Wróć do menu"])
  )
    throw Error("Final config/view: " + JSON.stringify(finalView));
  await completeContext.close();
  return { fresh, migrated, storage, stale, normalizedStorage, complete, finalView };
};
