import { memoryLevels, loadMemoryPhotoCards } from "../memory-config.js?v=memory-crop-2";
import { sound } from "../audio.js";
import { readMemoryLevels, saveMemoryLevels } from "../storage.js";
export function shuffle(cards, random = Math.random) {
  const a = [...cards];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function memory({ root, win }) {
  const grid = root.querySelector("#memory"),
    hud = root.querySelector("#score");
  let first = null,
    locked = false,
    moves = 0,
    pairs = 0,
    cards = [],
    level = 1,
    timeout,
    alive = true;
  const paused = () =>
    document.hidden || document.body.classList.contains("game-paused");
  // Count only active play time: a pause cannot hide cards or complete a round.
  const later = (action, delay) => {
    let left = delay,
      last = performance.now();
    const tick = () => {
      if (!alive) return;
      const now = performance.now();
      if (!paused()) left -= Math.min(100, now - last);
      last = now;
      if (left <= 0) action();
      else timeout = setTimeout(tick, 40);
    };
    timeout = setTimeout(tick, 40);
  };
  const renderLevel = (nextLevel, images) => {
    level = nextLevel;
    first = null;
    locked = false;
    moves = 0;
    pairs = 0;
    cards = shuffle(images.flatMap((card) => [card, card]));
    grid.classList.remove("memory-notice");
    grid.dataset.level = String(level);
    grid.innerHTML = cards
      .map(
        (card, index) =>
          `<button class="memory-card" data-index="${index}" aria-label="Odkryj kartę ${index + 1}"><span class="back" aria-hidden="true">W</span><img class="${card.crop === "upper" ? "memory-photo-upper" : ""}" src="${card.src}" alt="${card.label}" draggable="false"></button>`,
      )
      .join("");
    score();
  };
  const notice = (title, body, button, action) => {
    grid.classList.add("memory-notice");
    grid.removeAttribute("data-level");
    grid.innerHTML = `<div class="memory-level-panel"><p class="eyebrow">MEMORY WSPOMNIEŃ</p><h2>${title}</h2><p>${body}</p><button class="primary" id="memory-next">${button}</button></div>`;
    grid.querySelector("#memory-next").onclick = action;
  };
  function score() {
    hud.textContent = `Poziom ${level}/2 · Ruchy: ${moves} · Pary: ${pairs}/8`;
  }
  const completeLevel = async () => {
    const completed = readMemoryLevels();
    if (!completed.includes(level)) saveMemoryLevels([...completed, level]);
    if (level === 2) {
      win();
      return;
    }
    locked = true;
    const photos = await loadMemoryPhotoCards();
    if (!alive) return;
    if (photos.length === 8)
      notice(
        "Poziom 1 ukończony ♥",
        "Czas odkryć osiem par z naszych zdjęć.",
        "Poziom 2",
        () => renderLevel(2, photos),
      );
    else
      notice(
        "Poziom 1 ukończony ♥",
        "Zdjęcia dodamy później. Po włożeniu photo1.webp–photo8.webp poziom 2 pojawi się automatycznie.",
        "Zakończ Memory",
        win,
      );
  };
  const click = (e) => {
    const button = e.target.closest("[data-index]");
    if (!button || locked || paused() || button.classList.contains("flipped"))
      return;
    const card = cards[Number(button.dataset.index)];
    button.classList.add("flipped");
    button.setAttribute("aria-label", card.label);
    sound();
    if (!first) {
      first = { button, card };
      return;
    }
    moves++;
    locked = true;
    const previous = first;
    first = null;
    if (card.id === previous.card.id) {
      pairs++;
      button.classList.add("matched");
      previous.button.classList.add("matched");
      button.disabled = true;
      previous.button.disabled = true;
      sound("collect-bonus");
      locked = false;
      score();
      if (pairs === 8)
        later(() => {
          if (alive) completeLevel();
        }, 500);
    } else {
      score();
      later(() => {
        if (!alive) return;
        for (const b of [button, previous.button]) {
          b.classList.remove("flipped");
          b.setAttribute(
            "aria-label",
            `Odkryj kartę ${Number(b.dataset.index) + 1}`,
          );
        }
        locked = false;
      }, 850);
    }
  };
  grid.addEventListener("click", click);
  grid.classList.add("memory-notice");
  grid.innerHTML =
    '<div class="memory-level-panel"><p>Sprawdzamy wspomnienia…</p></div>';
  (async () => {
    const saved = readMemoryLevels(),
      photos = await loadMemoryPhotoCards();
    if (!alive) return;
    if (saved.includes(1) && photos.length === 8) renderLevel(2, photos);
    else
      renderLevel(
        1,
        memoryLevels.find((candidate) => candidate.id === 1).images,
      );
  })();
  return () => {
    alive = false;
    clearTimeout(timeout);
    grid.removeEventListener("click", click);
  };
}
