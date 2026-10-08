// Keyboard and touch actions are independent for both players.
export function duoInput(root, onPause) {
  const held = new Map(),
    queued = new Set(),
    pointers = new Map(),
    listeners = [];
  const mapping = {
    a: ["wika", -1],
    d: ["wika", 1],
    w: ["wika", "jump"],
    ArrowLeft: ["michal", -1],
    ArrowRight: ["michal", 1],
    ArrowUp: ["michal", "jump"],
  };
  const add = (target, event, fn) => {
    target.addEventListener(event, fn);
    listeners.push(() => target.removeEventListener(event, fn));
  };
  const clear = () => {
    held.clear();
    queued.clear();
    pointers.clear();
    root
      .querySelectorAll("[data-duo-action]")
      .forEach((b) => b.classList.remove("held"));
  };
  add(window, "keydown", (e) => {
    if (
      e.target.closest?.("input,textarea,select") ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey
    )
      return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === "p" || key === "Escape") {
      e.preventDefault();
      if (!e.repeat) {
        clear();
        onPause();
      }
      return;
    }
    const action = mapping[key];
    if (!action) return;
    e.preventDefault();
    if (action[1] === "jump") {
      if (!e.repeat) queued.add(action[0]);
    } else held.set(key, action);
  });
  add(window, "keyup", (e) =>
    held.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key),
  );
  add(window, "blur", clear);
  add(window, "gameinputclear", clear);
  for (const b of root.querySelectorAll("[data-duo-action]")) {
    add(b, "pointerdown", (e) => {
      e.preventDefault();
      const id = b.dataset.duoOwner,
        action = b.dataset.duoAction;
      if (action === "jump") queued.add(id);
      pointers.set(e.pointerId, { id, action, b });
      b.classList.add("held");
      try {
        b.setPointerCapture(e.pointerId);
      } catch {}
    });
    const release = (e) => {
      pointers.delete(e.pointerId);
      b.classList.toggle(
        "held",
        [...pointers.values()].some((p) => p.b === b),
      );
    };
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
      add(b, type, release);
  }
  return {
    clear,
    read() {
      const value = {
        wika: { move: 0, jump: queued.has("wika") },
        michal: { move: 0, jump: queued.has("michal") },
      };
      for (const [id, direction] of held.values()) value[id].move += direction;
      for (const p of pointers.values())
        if (p.action !== "jump")
          value[p.id].move += p.action === "left" ? -1 : 1;
      queued.clear();
      return value;
    },
    destroy() {
      clear();
      listeners.forEach((fn) => fn());
    },
  };
}
