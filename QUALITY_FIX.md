# Fix Pass — Duo, Zbieracz i tryb aplikacji, 5 października 2026

Aktualny raport zastępuje zasady checkpointów i punktacji opisane w poprzednich DUO_FIX/MOBILE_FIX. Pozostałe gry, grafiki, AudioManager, localStorage i główna pętla core zachowane.

## Wika & Michał

Usunięto wszystkie napisy rysowane na canvasie: checkpointy, instrukcje przycisków/dźwigni/wind, etykiety drzwi i imiona nad postaciami. Zniknęły flagi, CP w HUD i podpowiedź pod planszą. HUD zawiera poziom, liczniki i przyciski; sterowanie pozostaje poza planszą. Stany dźwigni komunikują obrót i delikatny kolorowy halo, przyciski zapadają się, drzwi rozjaśniają, nieaktywny most ma linię w kolorze sterującego mechanizmu.

Cała mechanika checkpointów została usunięta z danych poziomów i stanu graczy. Błąd przywraca tylko poszkodowaną postać na jej start danego poziomu. Druga postać, przedmioty i mechanizmy pozostają; chwilowa płyta naturalnie wyłącza się po zejściu. Respawn nie wygląda jak checkpoint i nie oznacza restartu poziomu.

Odtworzono blokowanie skrzyni poziomu 2: przy drugiej postaci stojącej tuż po przeciwnej stronie, 60 klatek pchania dawało ruch skrzyni 0 px. Druga postać była liczona jako nieruchoma ściana, mimo że bohaterowie nie blokują się wzajemnie. Obecnie skrzynia odsuwa towarzysza, nie przepychając go przez ściany, inne skrzynie ani krawędź świata; stojący na skrzyni bohater przesuwa się z nią. Ten sam test daje płynny ruch 110 px do istniejącego ograniczenia. Poprawiono pierwszy kontakt: szybkość pchania obejmuje wyłącznie pozostałą część kroku po pokonaniu szczeliny, zamiast dodawać pełny ruch skrzyni do szczeliny. Testy 30/60/120 fps sprawdzają monotoniczny ruch, stałe podłoże, brak skoków pozycji, respektowanie ścian i brak checkpointów. Bez przebudowy poziomów, nowe trasy nadal przechodzą naturalnie.

## Serduszkowy Zbieracz

Usunięto prostokątną maskę tła, która obcinała ilustrację. Wioska jest osadzona nad podłożem w pełnym kadrze i własnych proporcjach. Canvas dostosowuje proporcje do miejsca w kontenerze: bez szerokich bocznych pustych pasów. ResizeObserver koryguje rozmiar po zastosowaniu układu aplikacji i po obrocie telefonu, a bezpośrednie przerysowanie usuwa pustą klatkę po zmianie rozmiaru również podczas pauzy. Zachowano cache nieruchomego tła; observer jest sprzątany przy wyjściu.

Punktacja widoczna w HUD:

| Przedmiot | Złapany | Przepuszczony |
| --- | ---: | ---: |
| Serce | +1 | −1 |
| Bukiet / list | +2 | −1 |
| Prezent | +3 | −1 |
| Złamane serce | −1 | 0 |

Wynik może zejść poniżej zera i potem rosnąć normalnie. Kara naliczana raz przy usunięciu obiektu poza ekranem; feedback −1, krótki dźwięk i delikatna animacja licznika. Cel nadal 20 punktów. Brak ciągłego ponownego odejmowania za jeden przedmiot.

## Mobile

Zachowano istniejący tryb aktywnej gry: fixed/100dvh, overflow hidden, overscroll none, touch-action none, user-select i -webkit-user-select none, -webkit-touch-callout none, przezroczysty tap highlight. Blokady gestów, scrolla, contextmenu i selekcji działają tylko podczas gry i są usuwane na wyjściu. Menu zachowuje normalne przewijanie. Dotyk usuwa zbędny focus outline/cień, a klawiatura nadal ma widoczne oznaczenie fokusu. Nie zmieniano globalnego viewport tak, aby blokować powiększanie menu.

## Zmienione pliki

- `js/games/duo-state.js`, `duo-levels.js`, `wika-michal.js`: respawn, usunięte checkpointy i podpisy, pchanie oraz wizualny feedback.
- `js/games/catcher-state.js`, `catcher.js`: punktacja, tło, kadrowanie, sizing, feedback i reguły HUD.
- `js/game-session.js`, `styles/main.css`: rozróżnienie dotyku/klawiatury, fokus, reguły HUD i ukryta podpowiedź Duo.
- `js/app.js`: aktualny opis punktacji Zbieracza.
- `scripts/check-duo.mjs`, `check-catcher.mjs`, `duo-browser-checks.js`, `duo-respawn-browser-checks.js`, `duo-performance-browser-checks.js`, nowy `quality-browser-checks.js`: testy aktualnych zasad.
- `README.md`, `TESTS.md`, `DUO_FIX.md`, `MOBILE_FIX.md` i ten raport: aktualizacja oraz oznaczenie starszych zasad jako historyczne.

## Testy i ograniczenia

- `npm run check`: PASS, również regresja reguł innych gier i audio.
- Duo: oba poziomy ukończone w Chromium wejściem klawiatury, bez podmiany pozycji, przedmiotów lub mechanizmów. Wszystkie przyciski, dźwignie, skrzynie, windy i mosty wykorzystane; po 5/5 serc i 5/5 diamentów. Modele przechodzą oba poziomy przy 30/60/120 fps. Zapis, restart, pauza, blur i pozostałe widoki działają.
- Realny hazard w przeglądarce: Wika wraca do startu (stopy x=132/y=150), Michał pozostaje w swojej pozycji, zachowane 2/5 serc i 3/5 diamentów. Brak checkpointów i żadnego tekstu rysowanego na canvasie Duo potwierdzony instrumentacją.
- Zbieracz: w przeglądarce wszystkie pięć typów złapane i przepuszczone; dokładne wartości z tabeli, zejście poniżej zera, usunięcie raz. Kadry desktop, 932×430 oraz 360/393/430×852 sprawdzone na zrzutach i programowo; cała ilustracja mieści się, canvas wypełnia kontener z niewielkim marginesem obramowania.
- Mobilne Chromium: przytrzymanie działa, pointercancel zatrzymuje ruch, gesty i selection/contextmenu są anulowane. Symulowany pinch zachowuje skalę 1; scrollY=0 w grze. Wyjście usuwa blokady menu. Test dotyku to emulacja, nie fizyczny iPhone.
- Realny RAF: Duo mediana/p95 16,7 ms, maksimum 16,8 ms. Zbieracz mediana 16,7 ms/p95 16,8 ms, pojedyncza klatka około 50 ms; nie stwierdzono stałego spadku FPS. Mediana update+draw: Duo 0,3 ms, Zbieracz 0,2 ms. Nie oznacza gwarantowanych 60 fps na każdym urządzeniu.
- Po 20 restartów każdej gry: jedna oczekująca klatka, liczba listenerów nie rośnie. Po wyjściu wraca do 7 bazowych, RAF=0. 12 cykli Duo: heap po GC +57 924 bajty, bez narastających pętli/listenerów. Krótki test nie wyklucza wszystkich wycieków.
- Błędy JS i brakujące pliki w końcowych przebiegach: 0.

Raporty: `output/playwright/quality-{browser,duo,respawn,performance}-report.json`, `quality-unit-report.txt`. Zrzuty `quality-duo-level1.png`, `quality-duo-level2.png`, `quality-catcher-desktop.png`, `quality-catcher-{360,393,430}.png` i `quality-duo-respawn.png`.

Efekty obejrzano na zrzutach, a rozgrywkę i gesty sprawdzono w prawdziwej przeglądarce za pomocą automatycznych wejść. Nie wykonano ręcznego testu na fizycznym iPhonie/Androidzie ani wspólnej rozgrywki dwóch osób. Callout, magnifier oraz długie przytrzymanie Safari wymagają takiego sprawdzenia; Chromium nie potwierdza specyficznych zachowań iOS.
