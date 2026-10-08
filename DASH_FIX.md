# Wika Dash — Fix Pass, 5 października 2026

Zakres: istniejąca gra 03, jej generator, tempo, scena i testy. Bez nowych ilustracji, frameworków i zmiany pozostałych gier, zapisu postępu lub audio.

## Przeszkody i tempo

Generator nie przełącza już crate/bird naprzemiennie. Zwykle losuje z szansą 50/50. Po dwóch jednakowych przeszkodach szansa kolejnego powtórzenia wynosi 25%; po trzech następuje zmiana typu. Daje to powtórzenia i nieprzewidywalne układy bez długich monotonnych serii.

Odstęp jest losowany od nowa dla każdej przeszkody: **1,2–2,0 s na starcie**, płynnie do **0,82–1,42 s przy 500 m**. To czas pomiędzy dotarciem przednich krawędzi colliderów do Wiki. Generator przelicza go na odległość, uwzględniając dalsze przyspieszanie podczas dojazdu. Usunięto sztywne minimum 648 jednostek, które powodowało puste fragmenty. Pierwsza przeszkoda nadal ma krótki rozbieg.

Każda para przechodzi walidację: po skrzynce następna skrzynka wymaga minimum 1,174 s, ptaszek 1,284 s (pełny skok 1,014 s + margines reakcji); po ptaszku skrzynka wymaga 0,85 s, kolejny ptaszek 0,75 s. Za krótki wynik powoduje ponowne losowanie typu i odstępu bez naliczania odrzuconej próby do serii. Po 16 nieudanych próbach generator wybiera górny bezpieczny odstęp aktualnego zakresu. Dlatego szybsze serie skoków korzystają z wyższej części zakresu — zachowana jest możliwość lądowania, mimo gęstszego układu.

Do 500 m mnożnik prędkości wynosi `1 + 0,0009 × d + 0,000001 × d²`. Daje dokładnie 1,00 / 1,10 / 1,22 / 1,36 / 1,52 / 1,70× przy 0 / 100 / 200 / 300 / 400 / 500 m. Dalej wzrost łagodnie wygasa do granicy 2,05× (451 jednostek/s), z ciągłą prędkością i nachyleniem krzywej na 500 m. Tło i teren przewijają się na podstawie tej samej drogi świata, więc też przyspieszają. Restart tworzy nowy stan: tempo, dystans, serca, kolejki i seria zaczynają od początku. Kolizje nadal wykonują podkroki maksymalnie 1/120 s. Spawning pozostaje w tej samej pętli fizyki; bez dodatkowych timerów.

## Scena i pętla

Nowy `js/games/dash-scenery.js` oddziela scenerię od fizyki. Wszystkie ilustracje trafiają do jednej ramy 1440×610 przez centralny `cover`: mają identyczną skalę, wysokość, crop i baseline, a proporcje nie są rozciągane. Desktop ma szeroki widok 1440×760, telefon pionowo 480×760 i poziomo 1080×430. Rozmiar wyświetlania mieści się w oknie. Zmiana orientacji zmienia widok i miejsce pojawiania się nowych przeszkód, zachowując bieżący bieg. Szeroki desktop pokazuje scenę zamiast dużych pustych bocznych pasów. Poziomy telefon ma krótszy kadr skupiony na pasie biegu oraz kompaktowy nagłówek i kontrolki; logiczna fizyka pozostaje taka sama.

Tło przewija się z parallax 0,16; teren z prędkością świata. Każda warstwa powiela całe kafle tak, aby pokrywać rzeczywistą szerokość canvasa. Obecne obrazy nie są autorskimi assetami seamless: sąsiadujące kafle są odbijane, dzięki czemu spotykają się te same piksele krawędzi. To usuwa pionowe cięcie i skok pętli, ale w dekoracji można dostrzec lustrzaną symetrię. Nie tworzono ani nie zapisywano nowych grafik. Scenerie zmieniają się przez crossfade przez ostatnie 120 m każdego odcinka 600 m, zamiast nagłego przełączenia.

Przygotowane warstwy są cachowane i współdzielone po restartach, a duże obrazy nie są skalowane od nowa co klatkę. Nieruchomy ready/pause nie jest rysowany ponownie bez zmiany. Resize i pozostałe listenery mają cleanup.

## Późniejszy seamless asset

1. Umieść dostarczony obraz w `assets/dash/backgrounds/`.
2. Zmień ścieżkę `dashRiverside` lub `dashValley` w `js/assetConfig.js`; preload korzysta z tej konfiguracji.
3. W `DASH_SCENERY` ustaw `loop: "seamless"`. `backgrounds` może zawierać jeden klucz albo kilka scenerii. Teren ma osobne `ground.asset`, `ground.loop` i `ground.height`.
4. Szerokość kafla wynika z wymiarów obrazu i wysokości sceny. Przewijanie, coverage i crossfade działają niezależnie od konkretnego pliku. Nie zmieniaj fizyki ani generatora.

## Pliki

- `js/games/dash-state.js`: losowanie, serie, odstępy, płynne tempo i spawn poza widokiem.
- `js/games/wika-dash.js`: integracja sceny, szeroki desktop, obrót bez resetu i cleanup resize.
- `js/games/dash-scenery.js`: nowy moduł konfiguracji, cache, pętli tła i foregroundu oraz crossfade.
- `styles/main.css`: usunięte sztywne proporcje 720/760 wyłącznie dla canvasa Dash.
- `scripts/check-dash.mjs`, `scripts/dash-browser-checks.js`: rozszerzone testy reguł i przeglądarki.
- `scripts/dash-scenery-browser-checks.js`, `scripts/dash-fix-performance-browser.js`: nowe testy rastera i wydajności.
- `README.md`, `TESTS.md`, ten raport: aktualny opis i wyniki.

## Testy

- `npm run check`: PASS; regresja pozostałych gier i audio zachowana.
- 150 dwuminutowych biegów przy 30/60/120 fps i 50 seedach na każdą częstotliwość: zero nieuniknionych kolizji dla automatu wykonującego skok/ślizg; cel 500 m/20 serc osiągalny, maksymalnie 7 aktywnych obiektów w tym teście. Nie jest to pomiar trudności dla początkującego człowieka.
- 1000 losowań: 502 skrzynie, 498 ptaszków; 375 powtórzeń i 624 zmian, maksymalna seria 3. Sprawdzone wszystkie pary i skrajne wartości RNG. 13 605 fizycznych odstępów w symulacjach: 0,80–1,984 s (pomiar klatkowy); zgodne z planem i czasem odzyskania kontroli. Dokładne mnożniki przyspieszania 0–500 m i reset do 220: PASS.
- Chromium: pełny bieg kończy się dokładnie po spełnieniu 500 m i 20 serc, pokazuje wynik 500 m / 20 serc, zapisuje `runner`; reload, pauza/wznowienie i restart działają. Oba tła mają ramę 1440×610 i skalę 1,270833. Sprawdzono dwa pełne cykle sceny do 2400 m.
- Dotyk: skok, przytrzymany ślizg i puszczenie; kontrolki i canvas mieszczą się na 360/393/430×852 oraz 932×430. Obrót nie resetuje dystansu. Desktop 1366×768 / 1366×900 / 1920×1080 sprawdzony na geometrycznych asercjach i zrzutach.
- Coverage obu trybów pętli przy różnych szerokościach i dużym scrollu: PASS. Test rastera przy końcu pętli i granicy crossfade nie wykazał nagłego skoku; teren po pełnym okresie identyczny. Tło po okresie ma śladową różnicę zaokrągleń ≤1 w pojedynczych kanałach (średnia około 0,000005/255).
- Lokalny test realnego RAF, 20 restartów i 12 cykli otwarcie/wyjście: jedna pętla, stała liczba listenerów w grze, po wyjściu 7 bazowych i RAF=0. Mediana klatki 16.7 ms, p95 16.7 ms. Mediana update+draw 0.2 ms; heap JS po GC wzrósł o 37304 bajty w krótkim teście. Dokładne pomiary w `output/playwright/dash-spacing-performance-report.json`; nie jest to gwarancja dla wszystkich urządzeń.
- Końcowe testy: zero błędów JavaScript i brakujących plików.

Aktualne raporty tempa: `output/playwright/dash-spacing-{browser,performance}-report.json`, `dash-spacing-unit-report.txt`. Raster z wcześniejszego passu: `dash-fix-scenery-report.json`. Zrzuty: `dash-fix-desktop.png`, `dash-fix-mobile.png`, `dash-fix-landscape.png`.

Testy wykonałem w Chromium przez klawiaturę, dotyk i zrzuty. Nie testowano na fizycznym iPhonie/Androidzie. Autorski asset seamless nadal da bardziej naturalne przejście niż lustrzane odbicie obecnych ilustracji.
