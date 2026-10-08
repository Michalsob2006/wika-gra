// Own the app-like viewport only while a game is open. Menu scroll is restored on exit.
export function gameSession(root, id) {
  const body = document.body,
    html = document.documentElement,
    listeners = [],
    pressed = new Map();
  body.classList.add("game-active", `game-${id}`);
  html.classList.add("game-active");
  root.classList.add("game-view");
  root.dataset.game = id;
  const add = (node, type, fn, options) => {
    node.addEventListener(type, fn, options);
    listeners.push(() => node.removeEventListener(type, fn, options));
  };
  const prevent = (e) => e.preventDefault();
  for (const name of [
    "gesturestart",
    "gesturechange",
    "gestureend",
    "touchmove",
    "contextmenu",
    "dragstart",
    "selectstart",
  ])
    add(document, name, prevent, { passive: false });
  let touchActivated = null;
  add(document, "pointerdown", (e) => {
    body.classList.toggle("touch-input", e.pointerType === "touch");
    const b = e.target.closest?.("button");
    if (!b || b.disabled) return;
    pressed.set(e.pointerId, b);
    b.classList.add("pressed");
    if (
      e.pointerType === "touch" &&
      !b.matches("[data-control],[data-duo-action]")
    ) {
      e.preventDefault();
      touchActivated = b;
      b.click();
    }
  });
  add(
    document,
    "click",
    (e) => {
      if (
        e.detail &&
        (e.pointerType === "touch" ||
          e.target.closest?.("button") === touchActivated)
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        touchActivated = null;
      }
    },
    true,
  );
  add(window, "keydown", () => body.classList.remove("touch-input"));
  const release = (e) => {
    const b = pressed.get(e.pointerId);
    pressed.delete(e.pointerId);
    if (b && ![...pressed.values()].includes(b)) b.classList.remove("pressed");
  };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    add(document, type, release, true);
  const clear = () => {
    for (const b of pressed.values()) b.classList.remove("pressed");
    pressed.clear();
  };
  add(window, "blur", clear);
  const images = () =>
    root.querySelectorAll("img").forEach((im) => (im.draggable = false));
  const rotate = document.createElement("div");
  rotate.className = "rotate-notice";
  rotate.setAttribute("role", "status");
  rotate.innerHTML =
    '<span aria-hidden="true">↻</span><strong>Obróć telefon poziomo, żeby zagrać</strong>';
  if (id === "duo") root.querySelector(".game-shell").append(rotate);
  function fit() {
    images();
    const orientation =
      id === "duo" &&
      matchMedia("(max-width:900px) and (orientation:portrait)").matches;
    body.classList.toggle("game-rotate", orientation);
    const canvas = root.querySelector("canvas"),
      wrap = root.querySelector(".canvas-wrap");
    if (!canvas || !wrap) return;
    const w = wrap.clientWidth - 2,
      h = wrap.clientHeight - 2,
      ratio = canvas.width / canvas.height;
    if (w > 0 && h > 0) {
      const width = Math.min(w, h * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${width / ratio}px`;
    }
  }
  const resize = new ResizeObserver(fit);
  resize.observe(root);
  if (root.querySelector(".canvas-wrap"))
    resize.observe(root.querySelector(".canvas-wrap"));
  const mutations = new MutationObserver(fit);
  mutations.observe(root, { childList: true, subtree: true });
  add(window, "resize", fit);
  let pausePanel, pauseButton;
  function togglePause() {
    if (document.querySelector(".overlay:not(.session-pause)")) return;
    if (body.classList.contains("game-paused")) {
      body.classList.remove("game-paused");
      pausePanel?.remove();
      pauseButton?.setAttribute("aria-pressed", "false");
    } else {
      body.classList.add("game-paused");
      window.dispatchEvent(new Event("gameinputclear"));
      clear();
      pauseButton?.setAttribute("aria-pressed", "true");
      pausePanel = document.createElement("div");
      pausePanel.className = "overlay session-pause";
      pausePanel.innerHTML =
        '<div class="dialog" role="dialog" aria-modal="true" aria-label="Pauza"><h2>Chwila dla nas</h2><p>Przygoda zaczeka. P / Esc również wznawia grę.</p><button class="primary">Wracamy do gry</button></div>';
      body.append(pausePanel);
      pausePanel.querySelector("button").onclick = togglePause;
      pausePanel.querySelector("button").focus({ preventScroll: true });
    }
  }
  if (!["runner", "duo"].includes(id)) {
    pauseButton = document.createElement("button");
    pauseButton.className = "quiet session-pause-button";
    pauseButton.textContent = "Ⅱ";
    pauseButton.setAttribute("aria-label", "Pauza");
    pauseButton.setAttribute("aria-pressed", "false");
    root.querySelector(".hud").append(pauseButton);
    pauseButton.onclick = togglePause;
    add(window, "keydown", (e) => {
      if (["p", "P", "Escape"].includes(e.key) && !e.repeat) {
        e.preventDefault();
        togglePause();
      }
    });
    const auto = () => {
      if (
        !body.classList.contains("game-paused") &&
        !document.querySelector(".overlay")
      )
        togglePause();
    };
    add(window, "blur", auto);
    add(document, "visibilitychange", () => {
      if (document.hidden) auto();
    });
  }
  fit();
  return () => {
    listeners.forEach((fn) => fn());
    resize.disconnect();
    mutations.disconnect();
    clear();
    pausePanel?.remove();
    rotate.remove();
    body.classList.remove(
      "game-active",
      "game-paused",
      "game-rotate",
      "touch-input",
      `game-${id}`,
    );
    html.classList.remove("game-active");
    root.classList.remove("game-view");
    delete root.dataset.game;
  };
}
