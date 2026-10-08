> Raport historyczny. Aktualna wersja nie ma checkpointów Duo, a Zbieracz odejmuje punkt za każdy przepuszczony dobry przedmiot i dopuszcza wynik ujemny. Szczegóły: [QUALITY_FIX.md](QUALITY_FIX.md).

# Wika & Michał — Fix Pass, 5 października 2026

Zakres: gra 07, jej grafiki i karta w menu. Pozostałe gry, wspólna pętla core, AudioManager, zapis postępu i konfiguracja zdjęć zachowane. Brak nowych frameworków, pobranych narzędzi i generowanych ilustracji.

## Diagnoza przed zmianami

Oba stare poziomy obejrzano w przeglądarce. Błąd dolnej dźwigni odtworzono zdarzeniami klawiatury, a następnie potwierdzono w modelu fizyki. Na poziomie 1 dojście od środka do niebieskiej dźwigni (x=810) prowadziło przez kolce (x=745–800, y=590–612). Stopy Michała dotykały hazardu przed wejściem w trigger dźwigni. Handler hazardu zastępował stan całego poziomu przez `makeDuo()`, cofając obie postacie, przedmioty i mechanizmy. Sama dźwignia nie wywoływała resetu.

Naprawa: bezpieczne dojścia i małe triggery na właściwej podłodze; collider hazardu obejmuje stopy, nie PNG. Śmierć odtwarza tylko jedną postać z jej ostatniego bezpiecznego checkpointu. Nie ma ignorowania hazardów przy dźwigniach. Checkpointy startowe, po pierwszej sekcji i przed finałem są niezależne dla każdej osoby.

Nie udało się potwierdzić stałego spadku FPS w starej wersji na tym Macu. Pomiar przed zmianami: mediana klatki 16,7 ms, p95 16,8 ms, pojedyncza maksymalna klatka 33,37 ms; update i draw miały medianę 0,4 ms. Potwierdzonym źródłem nagłego szarpnięcia był globalny reset przy hazardzie. Poprawiono także wyrównanie stóp między pozami, wybór najbliższej powierzchni lądowania oraz pchanie i przenoszenie przez windy.

Stara wersja już używała jednej pętli RAF i cache tła. W obecnej wersji zachowano ten układ, dodano cache geometrii kolizji zamiast składania nowych list w podkrokach, sprite'y przygotowane do stałego rozmiaru, aktualizację HUD-u tylko po zmianie oraz cleanup sterowania. W Duo nie ma setInterval. Nie należy interpretować pomiarów jako dowodu przyspieszenia starej wersji.

## Nowe poziomy i reguły

**1 — Most spotkania:** przeciwne górne starty, asymetryczne galerie, wspólny dolny warsztat. Różowy zatrzaskowy przycisk wysuwa most dla Michała. Przesuwana skrzynia służy do wejścia na półkę z sercem i różową dźwignią. Michał przechodzi do lewego skrzydła i włącza niebieską dźwignię, uruchamiając windę dla Wiki. Oboje zbierają przedmioty na wspólnym balkonie oraz w przeciwnym skrzydle, używają górnych mostów i wracają do swoich drzwi. Po 5 przedmiotów; krótkie skoki nad obcą cieczą i winda nad wodą.

**2 — Dwie drogi, jeden most:** większa pionowość; skrzynia i ciężki blok; po dwie dźwignie, chwilowe płyty, windy i mosty. Wika utrzymuje lewą płytę, umożliwiając Michałowi przejście do niebieskiej dźwigni. Skrzynia może utrzymywać tę płytę później. Następnie Michał musi stanąć na dolnej niebieskiej płycie, aby Wika przeszła górą do przeciwnego skrzydła. Jej różowa dźwignia zatrzaskuje tę trasę i uruchamia drugą windę. Ciężki blok umożliwia wejście na prawą półkę z sercem. Po 5 serc i diamentów, własne drzwi po wspólnym powrocie przez środek.

Postać ma stały collider 34×80, niezależny od obrazu. Ilustracje wysokości 132 zamiast 114 (+15,8%) mają punkty stóp znormalizowane dla wszystkich ośmiu póz. Platformy przepuszczają skok od dołu; bryły i zamknięte przejścia blokują ruch. Pchanie respektuje ściany i bezpieczne ograniczenia, skrzynie mają grawitację i wracają osobno do bezpiecznej pozycji po hazardzie. Windy przenoszą delta położenia na stojącą postać. Interakcja dźwigni wymaga stania na jej podłodze w małej strefie; przeszkoda między postacią a dźwignią blokuje aktywację.

Płyta chwilowa wyłącza się po odejściu; zatrzaskowa jest opisana na planszy. Drzwi wymagają kompletu właściwych przedmiotów i obu postaci; wcześniejsze wejście pokazuje nazwę oczekiwanej osoby. Cel 2–3 minut pierwszej rozgrywki pozostaje do sprawdzenia przez dwie osoby — szybki automat nie mierzy czasu poznawania zagadki.

## Grafiki i pliki

Nowe źródła: `/Users/michalsobczynski/Downloads/wika_michal_fixpack_v2/assets/wika/wika_{idle,walk,jump,push}.png` oraz `assets/cover/wika_michal_cover.png` w tej samej paczce. Przygotowano tylko crop przezroczystych marginesów i WebP, bez zmiany ilustracji. Pięć nowych grafik ma 341 954 bajty łącznie. Stare grafiki Wiki nie są używane przez tę grę. Michał i otoczenie pozostają z oryginalnej paczki. Lokalizacje źródłowe są wyłącznie w skrypcie i manifeście, nie w runtime.

Zmienione pliki runtime:

- `js/games/duo-levels.js` — oba układy i powiązania mechanizmów.
- `js/games/duo-state.js` — fizyka, interakcje, pchanie, checkpointy i indywidualny respawn.
- `js/games/wika-michal.js` — kotwice sprite'ów, HUD checkpointów, feedback, cache i drzwi.
- `js/games/duo-input.js` — komentarz opisujący istniejące niezależne sterowanie.
- `js/games/duo-sprite-config.js` — nowa konfiguracja skali i punktów stóp.
- `js/assetConfig.js` — nowe ścieżki czterech póz Wiki i covera.
- `js/app.js` — karta 07 używa jednego dostarczonego covera.
- `styles/main.css` — wyłącznie dodatkowe reguły karty/Duo i kompaktowego układu desktop.
- `assets/duo/v2/wika/wika_{idle,walk,jump,push}.webp`, `assets/duo/v2/cover.webp`, `assets/duo/v2/manifest.json` — nowe pliki.

Narzędzia i dokumentacja: `scripts/prepare-duo-fix-assets.py`, `scripts/check-duo.mjs`, `scripts/duo-solutions.mjs`, `scripts/duo-browser-checks.js`, nowe `scripts/duo-performance-browser-checks.js`, `scripts/duo-respawn-browser-checks.js`, `scripts/duo-visual-browser-checks.js`, `README.md`, `TESTS.md` oraz ten raport.

## Weryfikacja

- `npm run check`: PASS, również wszystkie pozostałe reguły gier i audio.
- Sześć pełnych przejść modelem przez komendy ruchu/skoku: oba poziomy przy 30/60/120 fps, komplet po 5 przedmiotów dla każdej osoby, zero respawnów. Czasy automatu: poziom 1 około 56,7–56,9 s; poziom 2 około 88,3 s.
- Przeglądarka Chromium: oba poziomy ukończone od startu do drzwi zdarzeniami klawiatury. Użyte wszystkie dźwignie i płyty, przesunięte oba rodzaje bloków, jazda windami i przejście mostami. Poziom 1: 3405 klatek; poziom 2: 5298 klatek. Nie ustawiano pozycji, przedmiotów ani sygnałów na skróty. Zegar RAF przyspieszono wyłącznie dla odtwarzania wejścia.
- Indywidualny respawn w przeglądarce: wejście Wiki w obcy kolor cofa ją do CP1. Michał pozostaje dokładnie w tej samej pozycji; zachowane 2/5 serc, 3/5 diamentów i mechanizmy. Osobne testy modelu obejmują obie postacie i każdy hazard.
- Testy modelu: bezpieczne i małe triggery dźwigni, interakcja blokowana ścianą, przyciski postać/skrzynia/powietrze, latch/release, grawitacja i odzyskanie skrzyń, jazda każdą windą, kolizje brył, punkty stóp, zamrożona pauza.
- Zapis Duo, powrót do menu, reload 7/7, klawiatura, utrata fokusu, restart oraz otwarcie wszystkich pozostałych gier: PASS. Testy pracują w izolowanym profilu; zapis użytkownika nie jest resetowany.
- Realny RAF: mediana 16,7 ms, p95 i maksimum 16,8 ms podczas ruchu/skoku; około 60 fps. Update i draw: mediana 0,7 ms, p95 1,5 ms, maksimum 9,4 ms. Pomiar lokalny w krótkim oknie, nie gwarancja dla każdego sprzętu.
- 20 restartów: nadal jedna oczekująca klatka RAF i 27 listenerów globalnych podczas gry. 12 wejść/wyjść: liczba listenerów wraca z 27 do bazowych 7; RAF po wyjściu 0. Heap po GC wzrósł o około 92 KB, bez narastania pętli/listenerów; krótki test nie wyklucza wszystkich możliwych wycieków.
- Desktop 1280×800 / 1366×768 / 1440×900: plansza 1140×627 / 1082×595 / 1172×645; HUD i sterowanie widoczne bez overflow. Mobile 393×852: nowy cover i komunikat obrotu; 932×430: plansza 660×363 i kontrolki mieszczą się.
- W końcowych przebiegach zero błędów JavaScript i brakujących plików. Cover i obie plansze sprawdzone na zrzutach.

Raporty maszynowe i zrzuty: `output/playwright/duo-fix-*-report.json`, `duo-fix-unit-report.txt`, `duo-fix-level1-desktop.png`, `duo-fix-level2-desktop.png`, `duo-fix-cover-{desktop,mobile}.png`, `duo-fix-level1-mobile.png`, `duo-fix-individual-respawn.png`. Dowód starego błędu: `duo-fix-before-lever.png`, `duo-fix-before-reset.png`.

Do ręcznego sprawdzenia: pierwsza wspólna rozgrywka dwóch osób i jej czas, komfort przy klawiaturze konkretnego MacBooka, Safari/iPhone/Android na fizycznym urządzeniu oraz jednoczesny dotyk obu osób. Testy Chromium i modelu nie zastępują tych urządzeń. Nie stwierdzono pozostającego błędu blokującego ukończenie poziomów.
