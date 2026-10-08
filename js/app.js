import { assets } from "./assetConfig.js";
import { finalConfig } from "./final-config.js?v=dash-goal-20";
import { preload } from "./preload.js";
import {
  readProgress,
  saveProgress,
  questUnlocked,
  collectionComplete,
  mainGameIds,
  saveMemoryLevels,
} from "./storage.js?v=final-qa-2";
import { sound, isMuted, toggleMute } from "./audio.js";
import { catcher } from "./games/catcher.js";
import { maze } from "./games/maze.js";
import { wikaDash } from "./games/wika-dash.js?v=mobile-fix-1";
import { renderGameCard } from "./game-card.js";
import { giftHunt } from "./games/gift-hunt.js";
import { memory } from "./games/memory.js?v=memory-crop-2";
import { wikaMichal } from "./games/wika-michal.js";
import { loveSnake } from "./games/love-snake.js";
import { gameSession } from "./game-session.js";
const app = document.querySelector("#app");
let progress = readProgress(),
  cleanup = () => {};
let menuObserver,
  releaseSession = () => {};
const games = [
  {
    id: "catcher",
    name: "Serduszkowy Zbieracz",
    desc: "Złap trochę miłości. Każde serduszko się liczy.",
    art: "coverCatcher",
    person: "wikaHappy",
    hint: "Serce +1 · bukiet/list +2 · prezent +3. Przepuszczony dobry przedmiot −1; złapane złamane serce −1. Cel: 20.",
    controls: ["left", "right"],
    start: catcher,
  },
  {
    id: "maze",
    name: "Miłosny Labirynt",
    desc: "Trzy serca i jedna droga prosto do Michała.",
    art: "coverMaze",
    person: "wikaIdle",
    hint: "Zbierz 3 serca i znajdź Michała. Bez pośpiechu.",
    controls: ["up", "left", "down", "right"],
    start: maze,
  },
  {
    id: "runner",
    name: "Wika Dash",
    desc: "Mały skok, wielka przygoda. Biegnij do mnie!",
    art: "coverDash",
    person: "wikaJump",
    hint: "Skacz nad skrzynkami, ślizgaj się pod ptaszkami i zbieraj serca.",
    controls: [],
    start: wikaDash,
  },
  {
    id: "memory",
    name: "Memory Wspomnień",
    desc: "Znajdź pary naszych małych, wielkich chwil.",
    art: "coverMemory",
    hint: "Odkrywaj karty i znajdź 8 par.",
    controls: [],
    start: memory,
  },
  {
    id: "snake",
    name: "Love Snake",
    desc: "Zbieraj serduszka i spraw, by miłość rosła.",
    art: "coverSnake",
    hint: "Zbieraj serduszka i rośnij razem z miłością! Cel: 20 punktów.",
    controls: ["up", "left", "down", "right"],
    start: loveSnake,
  },
  {
    id: "quest",
    name: "Magiczny Prezent",
    desc: "Ostatnia przygoda. Na końcu czeka coś dla Ciebie.",
    lockedDesc: "Ukończ 5 poprzednich gier",
    art: "coverGift",
    hint: "Znajdź list, bukiet i klucz. Omiń złamane serca i otwórz prezent.",
    controls: ["up", "left", "down", "right"],
    start: giftHunt,
  },
  {
    id: "duo",
    name: "Wika & Michał",
    desc: "Dwa kolory, jedna drużyna. Razem przez ruiny w chmurach.",
    art: "duoCover",

    hint: "Współpracujcie, zbierajcie klejnoty i otwórzcie wspólne przejście.",
    controls: [],
    badge: "BONUS",
    start: wikaMichal,
  },
];
const mainGames = games.filter((game) => mainGameIds.includes(game.id)),
  bonusGame = games.find((game) => game.id === "duo");
const img = (key, cls = "", alt = "") =>
  `<img src="${assets[key]}" class="${cls}" alt="${alt}">`;
function leave() {
  releaseSession();
  releaseSession = () => {};
  menuObserver?.disconnect();
  cleanup();
  cleanup = () => {};
  document.querySelector(".overlay")?.remove();
}
function menu() {
  leave();
  const mainCompleted = mainGameIds.filter((id) =>
    progress.includes(id),
  ).length;
  app.innerHTML = `<section class="intro"><div><p class="eyebrow">WIKTORIA + MICHAŁ · 3. ROCZNICA</p><h1>Mini gierki<br>dla Wiki</h1><p class="subtitle">6 małych gierek o nas</p><p class="subtitle">Wybierz grę i odblokuj niespodziankę</p></div><div class="intro-art">${img("wikaWave", "person wiki")}${img("michalBouquet", "person michal")}${img("heart", "heart")}</div></section><div class="section-line"><h2>Nasze małe przygody</h2><span>Graj w swoim tempie</span></div><section class="cards cards-cover" aria-label="Główna przygoda">${mainGames
    .map((g, i) =>
      renderGameCard(g, i, {
        locked: g.id === "quest" && !questUnlocked(progress),
        done: progress.includes(g.id),
      }),
    )
    .join(
      "",
    )}</section><section class="progress-panel"><div><strong>Postęp · ${mainCompleted}/6</strong><p>${questUnlocked(progress) ? "Magiczny Prezent jest odblokowany." : "Ukończ gry 01–05, aby odblokować Magiczny Prezent."}</p></div><div class="hearts" aria-label="Ukończono ${mainCompleted} z 6 gier">${mainGames.map((g) => img("heart", progress.includes(g.id) ? "filled" : "", g.name)).join("")}</div></section><div class="section-line bonus-heading"><h2>Bonusowa przygoda</h2><span>Specjalna gra dostępna od początku</span></div><section class="cards cards-cover bonus-cards" aria-label="Bonusowa przygoda">${renderGameCard(bonusGame, 0, { locked: false, done: progress.includes("duo") })}</section><div class="reset-row"><button id="reset" class="quiet">Resetuj postęp</button>${collectionComplete(progress) ? '<button id="view-final" class="quiet">Zobacz nasze zakończenie</button>' : ""}</div>`;
  const floatingHeart = app.querySelector(".intro-art .heart");
  menuObserver = new IntersectionObserver((entries) => {
    for (const entry of entries)
      entry.target.style.animationPlayState = entry.isIntersecting
        ? "running"
        : "paused";
  });
  menuObserver.observe(floatingHeart);
  app.querySelectorAll("[data-game]").forEach(
    (b) =>
      (b.onclick = () => {
        sound();
        openGame(b.dataset.game);
      }),
  );
  app.querySelector("#reset").onclick = resetDialog;
  app.querySelector("#view-final")?.addEventListener("click", finalScreen);
}
function resetDialog() {
  const el = document.createElement("div");
  el.className = "overlay";
  el.innerHTML =
    '<div class="dialog" role="dialog" aria-modal="true" aria-label="Reset postępu"><h2>Jeszcze raz od początku?</h2><p>Wyzerujesz ukończone gry na tym urządzeniu.</p><button class="primary" id="confirm-reset">Resetuj postęp</button><button class="quiet" id="cancel-reset">Zachowaj postęp</button></div>';
  document.body.append(el);
  el.querySelector("#confirm-reset").onclick = () => {
    progress = [];
    saveProgress(progress);
    saveMemoryLevels([]);
    menu();
  };
  el.querySelector("#cancel-reset").onclick = () => el.remove();
  el.querySelector("#cancel-reset").focus();
}
function openGame(id) {
  const g = games.find((x) => x.id === id);
  if (!g || (id === "quest" && !questUnlocked(progress))) return;
  leave();
  window.scrollTo(0, 0);
  const chapter =
    id === "duo"
      ? "BONUSOWA PRZYGODA"
      : `NASZA PRZYGODA · 0${mainGames.indexOf(g) + 1}`;
  app.innerHTML = `<section class="game-shell"><div class="game-heading"><div><p class="eyebrow">${chapter}</p><h1>${g.name}</h1><p>${g.hint}</p></div><button id="home" class="quiet">Wróć do menu</button></div><div class="hud"><span id="score">Gotowa?</span><button id="restart" class="quiet" style="padding:0">Od nowa</button></div>${id === "memory" ? '<div id="memory" class="memory-grid"></div>' : '<div class="canvas-wrap"><canvas width="720" height="480" aria-label="Plansza gry"></canvas></div>'}<div class="controls">${["maze", "quest", "snake"].includes(id) ? '<div class="dpad">' : ""}${g.controls.map((c) => `<button class="control ${c}" data-control="${c}" aria-label="${{ left: "W lewo", right: "W prawo", up: "W górę", down: "W dół", jump: "Skok" }[c]}">${id === "snake" ? img("snake" + c[0].toUpperCase() + c.slice(1)) : assets[c] ? img(c) : c === "up" ? "↑" : "↓"}</button>`).join("")}${["maze", "quest", "snake"].includes(id) ? "</div>" : ""}</div>${id === "memory" ? "" : `<p class="hint">${["maze", "quest", "snake"].includes(id) ? "Strzałki / WASD" : id === "catcher" ? "← → / A D" : "← → / A D · spacja / ↑: skok"} · na telefonie użyj przycisków</p>`}</section>`;
  app.querySelector("#home").onclick = menu;
  app.querySelector("#restart").onclick = () => openGame(id);
  cleanup = g.start({ root: app, win: (details) => win(id, details) });
  releaseSession = gameSession(app, id);
}
function confetti() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < 18; i++) {
    const el = document.createElement("img");
    el.src = assets.heart;
    el.className = "confetti";
    el.style.left = `${Math.random() * 100}%`;
    el.style.animationDelay = `${Math.random() * 1.5}s`;
    document.body.append(el);
    setTimeout(() => el.remove(), 7000);
  }
}
function win(id, details = {}) {
  cleanup();
  cleanup = () => {};
  if (!progress.includes(id)) progress.push(id);
  const saved = saveProgress(progress);
  sound("win");
  confetti();
  if (id !== "duo" && collectionComplete(progress)) {
    finalScreen();
    return;
  }
  const messages = {
    catcher: "Wygrałaś ❤️",
    maze: "Wika znalazła Michała ❤️",
    runner: "Małe kroki, wielka przygoda ❤️",
    memory: "Małe chwile, wielkie wspomnienia ❤️",
    quest: "Prezent znaleziony — kolejny krok do niespodzianki ❤️",
    snake: "Miłość rośnie z każdym serduszkiem ❤️",
    duo: "Wika i Michał — razem przez każdy level ❤️",
  };
  const el = document.createElement("div");
  el.className = "overlay";
  const summary =
    id === "duo"
      ? "Bonusowa przygoda ukończona"
      : `${mainGameIds.filter((gameId) => progress.includes(gameId)).length}/6 gier ukończonych`;
  el.innerHTML = `<div class="dialog" role="dialog" aria-modal="true" aria-label="Gra ukończona">${img("wikaHappy")}<h2>${details.title || messages[id]}</h2><p>${details.summary || summary}</p>${saved ? "" : "<p>Przeglądarka nie pozwala zapisać postępu. Pozostanie dostępny do zamknięcia strony.</p>"}<button class="primary">Wróć do menu</button></div>`;
  document.body.append(el);
  el.querySelector("button").onclick = menu;
  el.querySelector("button").focus();
}
function finalScreen() {
  leave();
  window.scrollTo(0, 0);
  const card = (className, icon, title, text) =>
    title || text
      ? `<section class="final-card ${className}"><span class="final-card-icon" aria-hidden="true">${icon}</span>${title ? `<h2>${title}</h2>` : ""}${text ? `<p>${text}</p>` : ""}</section>`
      : "";
  app.innerHTML = `<section class="final" aria-labelledby="final-title">
    <div class="final-intro final-reveal">
      ${img("bigHeart", "final-heart", "")}
      <p class="eyebrow">GŁÓWNA PRZYGODA UKOŃCZONA · 6/6</p>
      ${finalConfig.finalMessageTitle ? `<h1 id="final-title">${finalConfig.finalMessageTitle}</h1>` : ""}
      ${finalConfig.finalMessageText ? `<p class="final-message">${finalConfig.finalMessageText}</p>` : ""}
    </div>
    <div class="photo-slot final-reveal" style="--final-delay: .12s"><div class="photo-placeholder">${img("wikaHappy")}${img("michalBouquet")}</div></div>
    <div class="final-reveal" style="--final-delay: .22s">${card("final-gift-card", "🎁", finalConfig.finalGiftIntro, finalConfig.finalGiftHint)}</div>
    <div class="final-reveal" style="--final-delay: .32s">${card("final-outing-card", "♥", finalConfig.finalGoingOutTitle, finalConfig.finalGoingOutText)}</div>
    <div class="final-actions final-reveal" style="--final-delay: .42s"><button class="primary" id="final-again">Przeżyj jeszcze raz ❤️</button><button class="quiet" id="final-home">Wróć do menu</button></div>
  </section>`;
  const photo = new Image();
  photo.alt = "Nasze wspólne zdjęcie";
  photo.onload = () => {
    if (app.querySelector(".photo-slot"))
      app.querySelector(".photo-slot").replaceChildren(photo);
  };
  if (finalConfig.showFinalPhoto) photo.src = finalConfig.finalPhoto;
  app.querySelector("#final-again").onclick = () => openGame("quest");
  app.querySelector("#final-home").onclick = menu;
}
const mute = document.querySelector("#mute");
function updateMute() {
  mute.textContent = `Dźwięk: ${isMuted() ? "wyłączony" : "włączony"}`;
  mute.setAttribute("aria-pressed", String(isMuted()));
}
mute.onclick = () => {
  toggleMute();
  updateMute();
};
updateMute();
document.querySelector("#brand").onclick = (e) => {
  e.preventDefault();
  menu();
};
try {
  await preload((p) => {
    document.querySelector("#load-progress").value = p * 100;
  });
  menu();
  document.querySelector("#loading").classList.add("hidden");
  setTimeout(() => document.querySelector("#loading")?.remove(), 400);
} catch (error) {
  document.querySelector("#load-label").textContent =
    "Nie udało się wczytać grafik. Sprawdź połączenie i spróbuj ponownie.";
  const retry = document.createElement("button");
  retry.className = "primary";
  retry.textContent = "Spróbuj ponownie";
  retry.onclick = () => location.reload();
  document.querySelector("#loading").append(retry);
}
