> Raport historyczny. Aktualna wersja nie ma checkpointów Duo, a Zbieracz odejmuje punkt za każdy przepuszczony dobry przedmiot i dopuszcza wynik ujemny. Szczegóły: [QUALITY_FIX.md](QUALITY_FIX.md).

# Mobile + UX + Visual Fix Pass — 5 października 2026

Projekt działa lokalnie: http://127.0.0.1:4173/. Zachowano siedem gier, dotychczasowy styl, grafiki, audio, zdjęcia i zapis postępu. Bez frameworka, pobierania nowych assetów ani nowych gier.

## Zmiany

- Wspólny viewport gry: 100dvh, safe-area, kompaktowy nagłówek/HUD, ukryta stopka, dopasowanie canvas z zachowaniem proporcji. Zablokowane scroll, overscroll, pinch, double tap, selekcja, callout i drag obrazków podczas gry; menu odzyskuje scroll po wyjściu.
- Pointerdown bez oczekiwania na click; niezależne palce/klawisze, pointerup/cancel/lost capture, czyszczenie po blur. Pauza wszystkich gier; Memory zatrzymuje również timery odsłaniania i zwycięstwa.
- Zbieracz: większa Wika i przedmioty, plansza 480×720 w pionie telefonu, 960×360 w poziomie dotykowego urządzenia. Obrót zachowuje rundę. Przegapione serce −1 dokładnie raz, neutralne bonusy bez kary; minimum 0, napis −1 i lekki ruch HUD.
- Dash: większy widok na telefonie, przyciski 80 px. Skok na pointerdown, ślizg wyłącznie podczas trzymania. Pauza, reset i dotychczasowy endless/progress zachowane.
- Snake: identyczna siatka 9×12 wszędzie; głowa 89%, ciało 82%, itemy 76% pola. Niezależne spawny i timeouty: 1–2 serca, maksymalnie po jednym innym typie; rzadkie bukiety/ciemne serca i bardzo rzadki prezent. Bonusy TTL 4–8 s. +1/+2/+3, broken −2, dark −1; minimum 0. Cel ≥20, ściana/ciało kończy rundę, retry/menu działają.
- Wika & Michał: dwa nowe, pełne układy z górą/środkiem/dołem, szerokimi podłogami i widocznymi podporami. Po 5 i 6 klejnotów na postać. Dwóch bohaterów +30%, większe interaktywne elementy, przygaszone/rozmyte tła. Mosty, windy, dźwignie, kolorowe baseny, kolce i blokowane drzwi. Skrzynie mają bezpieczny zakres ruchu; są przeskakiwalne. Pion telefonu pokazuje obrót + wyjście; poziom ma osobne sterowanie Wika/Michał po bokach, także przy szerokości 932 px.
- Manifest standalone, Apple meta, viewport-fit i ikony 192/512 utworzone z istniejącego serca. Bez service workera; nie deklarujemy działania offline.

## Zmienione i dodane pliki

### Aplikacja / viewport / PWA

- `index.html`
- `styles/main.css`
- `js/app.js`
- `js/game-session.js` — nowy
- `js/games/core.js`
- `manifest.webmanifest` — nowy
- `assets/pwa/icon-192.png`, `assets/pwa/icon-512.png` — nowe kopie/kompozycje istniejącego serca

### Gry

- `js/games/catcher.js`, `js/games/catcher-state.js` (nowy)
- `js/games/love-snake.js`, `js/games/snake-state.js`, `js/games/snake-spawns.js` (nowy)
- `js/games/wika-dash.js`, `js/games/dash-state.js`
- `js/games/wika-michal.js`, `js/games/duo-levels.js`, `js/games/duo-state.js`, `js/games/duo-input.js`
- `js/games/memory.js`, `js/games/gift-hunt.js` — respektowanie wspólnej pauzy

### Testy i dokumentacja

- `scripts/check.mjs`
- `scripts/check-catcher.mjs` — nowy
- `scripts/check-snake.mjs`, `scripts/check-dash.mjs`, `scripts/check-duo.mjs`
- `scripts/duo-solutions.mjs`
- `scripts/browser-checks.js`, `scripts/dash-browser-checks.js`, `scripts/duo-browser-checks.js`, `scripts/snake-browser-checks.js`
- `scripts/mobile-ux-browser-checks.js`, `scripts/memory-pause-browser-checks.js` — nowe
- `README.md`, `TESTS.md`, `MOBILE_FIX.md` — aktualizacja / raport
- `output/playwright/mobile-fix-*.png`, `output/playwright/mobile-fix-*-report.json`, `output/playwright/mobile-fix-unit-report.txt` — dowody wizualne i wyniki

## Weryfikacja

`npm run check` przechodzi: 100 seedów labiryntów, poprzednia fizyka runnera, mapa/AI/kolizje Gift Hunt, AudioManager, nowe reguły Zbieracza i Snake, 50 długich rund Dash, oba poziomy Duo przy 30/60/120 fps. Pełne trasy Duo to wyłącznie ruch/skok: zero resetów, wszystkie klejnoty, przyciski, dźwignie, windy/mosty i właściwe drzwi. Poziom 1 około 51,9 s, poziom 2 około 79,5 s w symulacji.

Playwright CLI na lokalnym Chromium, w oddzielnych kontekstach testowych:

- Wszystkie 7 widoków przy 360×640, 393×852, 430×852: bez overflow, cała plansza i sterowanie w viewport; Duo pion ma komunikat o obrocie. Zbieracz i Duo w poziomie 932×430.
- Rzeczywiste dotykowe zdarzenia CDP: ruch podczas trzymania, puszczenie/anulowanie bez „zawieszenia”, jump od pointerdown, crouch tylko podczas trzymania, jednoczesny ruch Wiki i Michała. Pinch utrzymuje scale=1, brak scroll w grze; przewijanie menu wraca.
- Snake: 5 pełnych zwycięskich rund poprzez zdarzenia klawiatury, bez podmiany stanu gry (około 152,2 / 146,6 / 149,7 / 405,6 / 305,6 s czasu gry). W każdej współistniały różne itemy. Ponadto 5 przegranych o ścianę i retry; self-collision testowana w modelu.
- Duo: oba pełne poziomy przez keyboard events — 3116 / 4772 klatki, 5/5 + 5/5 i 6/6 + 6/6. Pauza, restart, blur, zapis 7/7 oraz reload/menu działają. Desktop 1280×800, 1366×768, 1440×900.
- Dash dotykowy: właściwe assety jump/crouch, pause/retry, automat osiąga ponad 500 m i co najmniej 22 serca; dystans dalej rośnie.
- Regresja kolekcji: Zbieracz, oba labirynty, Dash, wszystkie pary Memory, Gift Hunt (przedmioty, kolizje, odblokowanie i finał), 91 grafik, persistence. Zero pageerror, console error i brakujących żądań w scenariuszach.
- Memory: realne timery czekają podczas pauzy przy nietrafionej parze i komplecie 8 par; po wznowieniu prawidłowo chowają karty / kończą rundę.
- Manifest i obie ikony wczytują się poprawnie.

Raporty JSON w `output/playwright/mobile-fix-*-report.json`; bieżące scenariusze zapisane w `scripts/`. Przykład wywołania z zainstalowanym Playwright CLI:

```sh
npm run check
playwright-cli run-code "$(sed '$s/;$//' scripts/mobile-ux-browser-checks.js)"
```

## Nadal do sprawdzenia na prawdziwym iPhonie

Emulacja Chromium nie jest testem natywnego Safari. Ręcznie sprawdzić dynamiczny pasek Safari i notch/safe-area po obrocie, dłuższy multitouch, brak systemowego pinch/double tap/callout, powrót z tła oraz pierwsze odblokowanie audio. Sprawdzić także „Dodaj do ekranu początkowego” i tryb standalone na docelowym adresie (HTTPS przy publikacji). Nie pobierano dodatkowego WebKit ani narzędzi; brak fizycznego telefonu w tej sesji.
