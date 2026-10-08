async (page) => {
  const browser = page.context().browser(),
    ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }),
    p = await ctx.newPage(),
    errors = [],
    missing = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("response", (r) => {
    if (r.status() >= 400) missing.push(r.url());
  });
  await p.goto("http://127.0.0.1:4173");
  await p.waitForSelector("#loading", { state: "detached" });
  const initial = await p.evaluate(async () => {
    const { audioManager } = await import("/js/audio.js");
    window.manager = audioManager;
    return { status: manager.getStatus(), context: manager.context };
  });
  if (
    initial.status.loaded.length !== 7 ||
    initial.context !== null ||
    initial.status.unlocked
  )
    throw Error("Audio created before gesture or missing preload");
  await p.locator("#brand").click();
  await p.waitForFunction(
    () =>
      manager.getStatus().decoded.length === 7 && manager.getStatus().unlocked,
  );
  await p.waitForTimeout(180);
  const played = [];
  for (const kind of [
    "click",
    "collect-heart",
    "collect-bonus",
    "negative",
    "danger",
    "game-over",
    "win",
  ]) {
    const result = await p.evaluate(async (kind) => {
      const { audioAssets } = await import("/js/audio-config.js");
      const accepted = await manager.play(kind),
        voice = manager.active.get(kind),
        buffer = voice?.source.buffer;
      let energy = 0;
      if (buffer) {
        const samples = buffer.getChannelData(0);
        for (const s of samples) energy += s * s;
      }
      return {
        kind,
        accepted,
        playing: manager.getStatus().playing,
        duration: buffer?.duration,
        energy,
        volume: voice?.gain.gain.value,
        expected: audioAssets[kind].volume,
      };
    }, kind);
    if (
      !result.accepted ||
      !result.playing.includes(kind) ||
      result.energy <= 0 ||
      Math.abs(result.volume - result.expected) > 1e-6
    )
      throw Error("Effect failed " + JSON.stringify(result));
    const duplicate = await p.evaluate((kind) => manager.play(kind), kind);
    if (duplicate) throw Error("Duplicate overlaps " + kind);
    await p.waitForFunction(
      (kind) => !manager.getStatus().playing.includes(kind),
      kind,
    );
    played.push(result);
  }
  const burst = await p.evaluate(async () => {
    const results = await Promise.all(
      Array.from({ length: 30 }, () => manager.play("collect-bonus")),
    );
    return results.filter(Boolean).length;
  });
  if (burst !== 1) throw Error("Overlap burst " + burst);
  await p.locator("#mute").click();
  if (
    !(await p.evaluate(
      () =>
        manager.muted &&
        manager.getStatus().playing.length === 0 &&
        localStorage.getItem("wiki-muted") === "true",
    ))
  )
    throw Error("Mute stop/persistence");
  if (await p.evaluate(() => manager.play("win"))) throw Error("Muted effect");
  await p.reload();
  await p.waitForSelector("#loading", { state: "detached" });
  if (
    !(await p
      .locator("#mute")
      .textContent()
      .then((s) => s.includes("wyłączony")))
  )
    throw Error("Persisted mute label");
  await p.locator("#mute").click();
  await p.waitForFunction(async () => {
    const { audioManager } = await import("/js/audio.js");
    return !audioManager.muted && audioManager.getStatus().unlocked;
  });
  if (
    !(await p.evaluate(async () => {
      const { audioManager } = await import("/js/audio.js");
      return audioManager.play("danger");
    }))
  )
    throw Error("Unmute resume");
  const phones = [];
  for (const device of [
    {
      name: "iPhone emulation",
      width: 390,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
    },
    {
      name: "Android emulation",
      width: 412,
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    },
  ]) {
    const mobileCtx = await browser.newContext({
        viewport: { width: device.width, height: 844 },
        isMobile: true,
        hasTouch: true,
        userAgent: device.userAgent,
      }),
      phone = await mobileCtx.newPage();
    phone.on("pageerror", (e) => errors.push(e.message));
    await phone.goto("http://127.0.0.1:4173");
    await phone.waitForSelector("#loading", { state: "detached" });
    if (
      !(await phone.evaluate(async () => {
        const { audioManager } = await import("/js/audio.js");
        return audioManager.context === null;
      }))
    )
      throw Error("Mobile autoplay");
    await phone.locator("[data-game=snake]").tap();
    await phone.waitForFunction(async () => {
      const { audioManager } = await import("/js/audio.js");
      return audioManager.getStatus().decoded.length === 7;
    });
    await phone.locator("[data-control=up]").tap();
    const state = await phone.evaluate(async () => {
      const { audioManager } = await import("/js/audio.js");
      return audioManager.getStatus();
    });
    if (!state.unlocked || state.failed.length) throw Error("Touch unlock");
    await phone.locator("#mute").tap();
    if (
      !(await phone.evaluate(
        () => localStorage.getItem("wiki-muted") === "true",
      ))
    )
      throw Error("Mobile mute");
    await phone.locator("#mute").tap();
    const audible = await phone.evaluate(async () => {
      const { audioManager } = await import("/js/audio.js");
      return audioManager.play("collect-bonus");
    });
    if (!audible) throw Error("Mobile resume");
    phones.push({
      name: device.name,
      width: device.width,
      unlocked: state.unlocked,
      decoded: state.decoded.length,
    });
    await mobileCtx.close();
  }
  const failureCtx = await browser.newContext(),
    failed = await failureCtx.newPage();
  failed.on("pageerror", (e) => errors.push(e.message));
  await failed.route("**/assets/audio/sfx/danger.wav", (r) =>
    r.fulfill({ status: 404, body: "not found" }),
  );
  await failed.route("**/assets/audio/sfx/win.wav", () => {});
  const start = Date.now();
  await failed.goto("http://127.0.0.1:4173");
  await failed.waitForSelector("#loading", {
    state: "detached",
    timeout: 6000,
  });
  const failure = await failed.evaluate(async () => {
    const { audioManager } = await import("/js/audio.js");
    return audioManager.getStatus();
  });
  if (
    failure.failed.length !== 2 ||
    Date.now() - start > 6000 ||
    (await failed.locator("[data-game]").count()) !== 7
  )
    throw Error("Audio failure blocks page");
  await failureCtx.close();
  const corruptCtx = await browser.newContext(),
    corrupt = await corruptCtx.newPage();
  corrupt.on("pageerror", (e) => errors.push(e.message));
  await corrupt.route("**/assets/audio/sfx/negative.wav", (r) =>
    r.fulfill({ status: 200, body: "corrupt WAV", contentType: "audio/wav" }),
  );
  await corrupt.goto("http://127.0.0.1:4173");
  await corrupt.waitForSelector("#loading", { state: "detached" });
  await corrupt.locator("#brand").click();
  await corrupt.waitForFunction(async () => {
    const { audioManager } = await import("/js/audio.js");
    return audioManager.getStatus().failed.includes("negative");
  });
  const recovery = await corrupt.evaluate(async () => {
    const { audioManager } = await import("/js/audio.js");
    return {
      negative: await audioManager.play("negative"),
      good: await audioManager.play("collect-bonus"),
    };
  });
  if (recovery.negative || !recovery.good)
    throw Error("Decode failure not isolated");
  await corruptCtx.close();
  await ctx.close();
  if (errors.length || missing.length)
    throw Error(JSON.stringify({ errors, missing }));
  return {
    initial: initial.status,
    played,
    burst,
    muting: true,
    persistence: true,
    phones,
    failure: failure.failed,
    preloadTimeoutMs: 3500,
    corruptRecovery: recovery,
    errors,
    missing,
    engine: browser.browserType().name(),
  };
};
