import { assets } from "./assetConfig.js";
export function renderGameCard(game, index, { locked, done }) {
  const action = locked ? "Zablokowane" : done ? "Jeszcze raz" : "Zagraj";
  const status = done
    ? "✓ Ukończone"
    : locked
      ? "♡ Jeszcze chwila"
      : "♡ Przed nami";
  const badge = game.badge || String(index + 1).padStart(2, "0");
  return `<article class="card ${locked ? "locked" : ""} ${done ? "completed" : ""} ${game.badge ? "bonus-card" : ""} ${game.coverPair ? "duo-card" : ""}">
  <div class="card-art"><img class="cover-image" src="${assets[game.art]}" alt="" width="720" height="540" decoding="async">${game.coverPair ? `<img class="duo-cover-wika" src="${assets.duoWikaIdle}" alt=""><img class="duo-cover-michal" src="${assets.duoMichalIdle}" alt=""><span class="duo-cover-title">Wika & Michał<small>RAZEM PRZEZ CHMURY</small></span>` : ""}<span class="number">${badge}</span></div>
  <div class="card-body"><h3>${game.name}</h3><p>${locked ? game.lockedDesc || "Ukończ pozostałe gry i otwórz niespodziankę." : game.desc}</p>
  <div class="card-bottom"><span class="status ${done ? "done" : ""}">${status}</span><button class="play" data-game="${game.id}" ${locked ? "disabled" : ""} aria-label="${action}: ${game.name}">${action}${locked ? "" : ' <span aria-hidden="true">↗</span>'}</button></div></div>
 </article>`;
}
