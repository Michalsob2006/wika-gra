# Final Fix Pass — 5 października 2026

Zakres obejmuje istniejące gry 01, 03, 05 i 07 oraz wspólne zachowanie mobilne. Nie dodano gier, frameworków ani grafik i nie zmieniono głównego stylu.

## Wika & Michał

Źródłem zacinania skrzyni była kontrola jej dolnego paska przeciwko `hazards`. Kolorowa ciecz jest rysowana na krawędzi stałej platformy, więc przesuwany blok jednocześnie stał na podłożu i przecinał trigger. Kod resetował go do ostatniej bezpiecznej pozycji, co wyglądało jak drżenie, cofanie i blokada.

Bloki nie sprawdzają już warstwy hazardów. Ich ruch ograniczają wyłącznie platformy, ściany, granice, bramy i inne bloki. Kolorowa woda/lawa oraz kolce pozostały triggerami postaci. Usunięto instruktażowe rozwiązania z opisów poziomów; mechanizmy komunikują się kolorem, ruchem i stanem grafiki. Aktualny widok nie rysuje helper labeli, flag ani checkpointów. Respawn postaci jest niewidocznym powrotem na start.

Oba poziomy przeszły sześć pełnych przejść wejściem gracza: 30/60/120 FPS, 5/5 serc i 5/5 diamentów. Poziom 2 ukończono przez prawidłowe pchanie obu bloków, płyty, dźwignie, mosty i windy — bez teleportu i auto-complete. Dodatkowy test przesuwa skrzynię przez warstwę cieczy przy 30/60/120 FPS i sprawdza brak cofnięcia, resetu oraz skoku o 1 px.

## Wika Dash

Generator zachowuje losowe sekwencje crate/bird z maksymalną serią trzech, bez sztywnego przeplatania. Odstępy maleją z 1,2–2,0 s do 0,82–1,42 s; każda para przechodzi walidację lądowania i wyjścia ze ślizgu. Tempo ma mnożniki 1,00 / 1,10 / 1,22 / 1,36 / 1,52 / 1,70× przy 0 / 100 / 200 / 300 / 400 / 500 m, a później rośnie wolniej. Restart tworzy jeden świeży stan i jedną pętlę.

Tło oraz foreground korzystają z osobnych, powtarzanych kafli. Aktualne niesymetryczne grafiki są łączone lustrzanie, bez przerwy lub skoku; konfiguracja `loop: "seamless"` jest gotowa na późniejszy dedykowany asset.

## Magiczny Prezent

HUD pokazuje trzy życia. Kontakt z broken heart odejmuje dokładnie jedno życie, usuwa trafionego przeciwnika, uruchamia sekundę niewrażliwości, knockback i 2–3 cykle migania. Przy zerze stan gry zatrzymuje się i pojawia się modal „Spróbuj ponownie” / „Wróć do menu”. Restart przywraca trzy życia, pozycje, przeciwników, punkty i przedmioty.

Jeden start przeciwnika przeniesiono z komórki 108 do 109. Programowy test usuwa kolejno komórkę startową każdego broken heart i potwierdza, że wszystkie trzy przedmioty oraz prezent nadal mają alternatywną trasę.

## Serduszkowy Zbieracz i mobile

Zbieracz wypełnia dostępny canvas pełnym gradientem i kompletną ilustracją w jej naturalnych proporcjach. Dobre przepuszczone przedmioty odejmują jeden punkt i pokazują małe `−1` ze wstrząsem HUD; wynik obsługuje wartości ujemne.

Podczas gry dokument blokuje scroll, overscroll, pinch/double-tap zoom, zaznaczanie, callout, drag obrazków i tap highlight. Przyciski używają `pointerdown`, `pointerup`, `pointercancel` i `lostpointercapture`; anulowanie zawsze czyści stan wciśnięcia. Po powrocie do menu zachowanie strony jest przywracane.

## Zmienione pliki

- `js/games/duo-state.js`, `js/games/duo-levels.js`
- `js/games/gift-hunt-state.js`, `js/games/gift-hunt.js`
- `styles/main.css`
- `scripts/check-duo.mjs`, `scripts/check-gift-hunt.mjs`
- `scripts/gift-hunt-browser-checks.js`, `scripts/gift-hunt-lives-browser-checks.js`
- `scripts/mobile-ux-browser-checks.js`
- `README.md`, `TESTS.md`, `FINAL_FIX.md`

Wika Dash, Zbieracz i wspólny mobile layer zostały wdrożone we wcześniejszym passie; w tym przebiegu przeszły ponowną pełną regresję i nie wymagały kolejnej zmiany runtime.

## Wyniki

- `npm run check`: PASS.
- Duo: oba poziomy, 30/60/120 FPS, sześć pełnych przejść; Chromium 3405 / 5298 klatek, bez JS/404.
- Dash: 150 dwuminutowych symulacji, 13 605 par przeszkód 0,80–1,984 s; Chromium 510 m/20 serc, powtórzenia obu typów.
- Gift Hunt: pełne zebranie i odblokowanie prezentu z aktywnymi przeciwnikami; osobny browser test 3 trafień, game over i restartu do `❤️❤️❤️`.
- Zbieracz: każdy typ złapany/przepuszczony, ujemny wynik, desktop i 360/393/430/932 px.
- Mobile: siedem gier przy 360×640, 393×852 i 430×852; brak overflow, skali i scrolla; `pointercancel` i long press protections: PASS.
- Wydajność: po 20 restartach Duo, Zbieracza i Dash oraz 12 cyklach wejście/wyjście pozostaje jeden RAF, stała liczba listenerów w grze, 7 bazowych po wyjściu i 0 oczekujących RAF. Mediana update+draw: 0,4 ms Duo, 0,2 ms Zbieracz i Dash.

Testy wykonano w lokalnym Chromium. Fizyczny iPhone/Android pozostaje do końcowej oceny dotyku na urządzeniu.
