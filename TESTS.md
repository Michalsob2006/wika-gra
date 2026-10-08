# Final Fix Pass — 5 października 2026

Raport: [FINAL_FIX.md](FINAL_FIX.md).

- `npm run check`: PASS. Duo, Dash, Gift Hunt, Zbieracz, Snake, audio i regresja aplikacji.
- Duo: oba poziomy ukończone wejściem przy 30/60/120 FPS; skrzynia przechodzi przez hazard overlay bez resetu, cofnięcia lub jittera. Brak checkpointów i helper labeli.
- Gift Hunt: trzy życia, pojedyncza utrata, usunięcie broken heart, niewrażliwość, game over i czysty restart: PASS w modelu oraz Chromium.
- Dash: 150 × 120 s i pełny bieg 510 m; losowe powtórzenia, ciaśniejsze bezpieczne odstępy, szybszy wzrost, czysty restart.
- Zbieracz: kompletna punktacja wszystkich obiektów, `−1` za przepuszczenie dobrego, pełne tło na desktopie i telefonie.
- Mobile Chromium: siedem gier na 360×640, 393×852, 430×852 i wybrane widoki 932×430; gesty, scroll, zoom, long press, hold/release/cancel: PASS.
- Performance: po 20 restartach i 12 wejściach/wyjściach stałe listenery, 0 pozostawionych RAF; mediany update+draw 0,2–0,4 ms.

---

# Wika Dash — aktualny Fix Pass, 5 października 2026

Raport: [DASH_FIX.md](DASH_FIX.md).

- 150 dwuminutowych biegów modelu, 30/60/120 fps: PASS. Losowe typy, maksymalna seria 3, bezpieczne odstępy, płynne przyspieszanie i restart od 220.
- Chromium: bieg 510 m/20 serc, występują powtórzenia przeszkód; mierzone tempo rośnie z około 223 do 324. Dotyk, pauza, retry, zapis/reload i responsywność: PASS.
- Tempo: dokładne mnożniki 1,00–1,70× przy 0–500 m. 13 605 rzeczywistych odstępów 0,80–1,984 s w pomiarze klatkowym; bez 3–4 s pustych fragmentów między przeszkodami i z poprawnym czasem odzyskania kontroli dla każdej pary.
- Raster: coverage, odbijana pętla, tryb natywny seamless i ciągły crossfade: PASS. Nowe grafiki nie były generowane.
- Wydajność i lifecycle: jedna pętla, po restartach stała liczba listenerów; cleanup po wyjściu. Zero JS/404. Raporty tempa: `output/playwright/dash-spacing-{browser,performance}-report.json`, `dash-spacing-unit-report.txt`; raster: `dash-fix-scenery-report.json`.

Poniżej wcześniejsze poprawki innych gier oraz historyczne przebiegi Dash; dawne proporcje, tempo i przeplatanie przeszkód Dash są zastąpione aktualnym raportem.

---

# Aktualny Quality Fix Pass — 5 października 2026

Raport: [QUALITY_FIX.md](QUALITY_FIX.md).

- Duo: bez checkpointów i napisów na canvasie; indywidualny respawn na start z zachowaniem postępu. Naprawiony kontakt skrzynia/druga postać. Oba poziomy ukończone w Chromium klawiaturą, po 5/5 serc i diamentów; 30/60/120 fps w modelu.
- Zbieracz: wszystkie dobre miss −1, wynik ze znakiem; pozytywne wartości i neutralny missed broken sprawdzone dla wszystkich typów. Pełne tło i canvas bez bocznych pasów na desktop/360/393/430.
- Mobile Chromium: dotyk/cancel, blokady gestów i zaznaczania; pinch scale=1, scrollY=0; menu odzyskuje dotyk i przewijanie.
- `npm run check`: PASS. Około 60 fps w lokalnym pomiarze; po 20 restartów obu gier bez dodatkowych pętli/listenerów. JS/404: 0. Fizyczne iOS pozostaje do ręcznej weryfikacji.

Poniższe raporty są historyczne. Opisy checkpointów i dawnej punktacji Zbieracza nie dotyczą aktualnej wersji.

---

# Wika & Michał — aktualny Fix Pass, 5 października 2026

Pełna diagnoza i lista plików: [DUO_FIX.md](DUO_FIX.md).

- `npm run check`: PASS; sześć pełnych przejść Duo przy 30/60/120 fps, indywidualne powroty na start, zachowanie postępu, małe triggery i blokowanie ścianą, płyty, skrzynie, windy, kotwice stóp i pauza.
- Chromium: oba poziomy ukończone wyłącznie wejściem klawiatury, po **5/5 serc i 5/5 diamentów**. Wszystkie mechanizmy i bloki wykorzystane. 3405 / 5298 klatek; zero błędów JS i brakujących plików.
- Realny RAF: mediana 16,7 ms / p95 16,8 ms. 20 restartów zachowuje jedną pętlę; 12 wejść/wyjść przywraca bazowe listenery i usuwa RAF. Stara wersja również miała medianę 16,7 ms; stałego spadku FPS nie odtworzono. Globalny hazard-reset odtworzono i naprawiono.
- Test przeglądarkowy hazardu: respawn tylko trafionej postaci do niewidocznego startu, druga postać i przedmioty zachowane. Nowe grafiki/cover, desktop i mobile landscape: PASS.
- Raporty: `output/playwright/duo-fix-*-report.json`. Fizyczne urządzenia i pierwsza rozgrywka dwóch osób pozostają do ręcznej oceny.

---

Poniższe wyniki Mobile Fix Pass oraz starszych aktualizacji są historyczne. Liczby przedmiotów i stare reguły respawnu Duo nie opisują aktualnego Fix Pass.

# Mobile + UX + Visual Fix Pass — 5 października 2026

Aktualne zasady, pliki i szczegóły testów: [MOBILE_FIX.md](MOBILE_FIX.md).

- `npm run check`: PASS, w tym 5 pełnych rund Snake, spawny/expiry, Zbieracz i 50 rund Dash, wszystkie mechanizmy Duo i oba nowe poziomy przy 30/60/120 fps.
- Mobile Chromium: siedem gier na 360×640, 393×852, 430×852; Zbieracz i Duo poziomo 932×430. Bez overflow. Pointer hold/release/cancel, jump, crouch, multitouch Duo, pause/retry, pinch i przywrócenie scroll menu: PASS.
- Snake w przeglądarce: 5 pełnych zwycięstw + 5 wall/retry. Stałe 9×12 również na desktopie. Niezależne itemy, cel ≥20 i zapis poprawne.
- Duo w przeglądarce: pełne nowe trasy 3116 / 4772 klatki; 5/5 + 5/5 oraz 6/6 + 6/6, zero resetów. Zapis i reload 7/7, klawiatura, pause/restart/menu: PASS.
- Regresja pozostałych gier i finału, realne timery pauzy Memory, manifest i ikony: PASS. Raportowane błędy JS/konsoli i brakujące pliki: 0.
- Fizyczny iPhone/Safari/standalone nadal wymagają ręcznej weryfikacji; emulacja nie zastępuje urządzenia.

Raporty: `output/playwright/mobile-fix-{browser,snake,duo,dash,memory,regression}-report.json`.

---

## Archiwum wcześniejszych przebiegów

Poniżej opisano poprzednie wersje. Ich rozmiary plansz i liczby collectible nie opisują obecnego Mobile Fix Pass.

# Wika & Michał — 07, wyniki z 5 października 2026

- `npm run check` przeszło: dotychczasowe labirynty, Gift Hunt, Snake, AudioManager, Dash oraz nowa gra. `scripts/check-duo.mjs` sprawdza 30 lokalnych assetów, obie ciecze dla obu postaci, kolce, reset poziomu, zamknięte przejścia, pchanie skrzyni, brak skoku w powietrzu, przyciski naciskane postacią/blokiem, wożenie postaci przez windę, pauzę i jednoczesne wejście do właściwych drzwi ze wszystkimi klejnotami.
- `scripts/duo-solutions.mjs` przechodzi oba poziomy wyłącznie komendami ruchu i skoku przy 30, 60 i 120 fps: bez teleportów, podmieniania collectible i odblokowywania sygnałów. Zero upadków/resetów; komplet 8 i 12 klejnotów. Szybki automat: około 21,7 / 23,2 s; to dowód osiągalności, nie pomiar czasu pierwszej ludzkiej rozgrywki.
- Playwright CLI `scripts/duo-browser-checks.js` odtwarza te same trasy jako zdarzenia klawiatury. Poziom 1: 1300 klatek, 4/4 serca i 4/4 diamenty; poziom 2: 1392 klatki, po 6/6. Widoczne osobne idle/walk/jump/push dla obu postaci, równoczesne sterowanie, restart, P/Esc, pauza przy utracie fokusu. Poziom 1 nie zapisuje całej gry; ukończenie poziomu 2 zapisuje `duo`, finał i 7/7 pozostają po odświeżeniu.
- Cała plansza, HUD, sterowanie i podpowiedź mieszczą się w 1280×800, 1366×768 i 1440×900. Plansza odpowiednio około 880×484, 822×452 i 1062×584. Bez poziomego przewijania; widok sprawdzony na zrzutach. Test desktopowy w Chromium; nie fizyczny MacBook ani Safari. Dotykowego overlayu dla nowej gry jeszcze nie dodano (zgodnie z zakresem desktop-first).
- Zachowany stary postęp: 6 ukończeń → 6/7, bez utraty sukcesów; stare pięć gier nadal odblokowuje Gift Hunt. Finał kolekcji wymaga teraz również `duo`.
- Pełna regresja `scripts/browser-checks.js` przeszła: Zbieracz, oba Labirynty, Dash, Memory, Gift Hunt i finał. W regresji sukcesy Snake i Duo są ustawione jako fixture po ich osobnych testach. 91 grafik załadowanych, zero błędów/ostrzeżeń JS i 404. Nowa suita dodatkowo otwiera wszystkie sześć dotychczasowych widoków po zamknięciu Duo i potwierdza posprzątanie stylów.
- Wszystkie 12 modułów z wcześniejszego manifestu SHA-256 w `js/games/` pozostają identyczne. Nie zmieniono również implementacji Dash, wspólnego core ani AudioManagera.
- 30 osobnych WebP, 1 359 614 bajtów, z paczki `wika_michal_codex_pack_final`; wszystkie 8 póz postaci wykorzystane. Oryginalne PNG zachowane, referencje wyłączone z przygotowania i runtime. Tła i nieruchome platformy cachowane, nieruchoma plansza pauzy nie jest ponownie rysowana.

Raporty: `output/playwright/duo-test-results.json`, `duo-regression-results.json`. Zrzuty: `duo-menu-desktop.png`, `duo-level1-desktop.png`, `duo-jump-desktop.png`, `duo-level1-complete.png`, `duo-level2-desktop.png`.

Poniżej historyczne wyniki poprzednich aktualizacji.

---

# Ilustrowane menu i Wika Dash — aktualne wyniki

- Sześć nowych okładek: poprawne przypisanie 01–06, proporcja 4:3, object-fit bez deformacji, spójne CTA/statusy, sześć równych kart. Zrzut całego menu 393×852 sprawdzony wizualnie; desktop również.
- `npm run check` zawiera `scripts/check-dash.mjs`: 150 losowych dwuminutowych biegów bez nieuniknionych przeszkód; skok/lądowanie/brak skoku w powietrzu, ślizg czasowy, przejście pod ptaszkiem, skrzynka/ptaszek kończą rundę, brak ruchu po śmierci oraz podczas pauzy, zbieranie serc raz i dokładny warunek 500 m + 20 serc. Osobno potwierdza brak sukcesu dla 500 m/19 serc oraz 499 m/20 serc.
- Playwright `scripts/dash-browser-checks.js`: rzeczywisty dotyk Skok i Ślizg, pauza/wznowienie, kolizja, pełny restart, mobilne tempo 0,90× oraz dalszy bieg po 500 m i 20 sercach. Dopiero „Zapisz przygodę ✓” zapisuje `runner` i pokazuje wynik; rekord ma co najmniej 500 m / 20 serc. Oba segmenty tła raportują identyczne 1440×610 oraz tę samą skalę. Desktop zachowuje tempo 1,00×.
- Mobile pass: labirynt ma wrapper 3:2 bez pustych pasów i przyciski 78×72 px. Dash ma targety 96×92 px w pionie. Wika & Michał ma sześć targetów 68×66 px z safe-area; rzeczywiste cztery jednoczesne dotknięcia potwierdziły prawo+skok i lewo+skok obu postaci oraz niezależne anulowanie pointerów.
- Plansza i duże przyciski mieszczą się w widokach 360×852, 393×852 oraz 430×852 bez poziomego przewijania. Przyciski akcji mają minimum 84 px. Cała plansza i sterowanie również mieszczą się na 1366×768, 1366×900 oraz 1920×1080. Test telefonu to emulacja Chromium, nie fizyczny sprzęt.
- Pełna regresja `scripts/browser-checks.js`: Zbieracz, oba Labirynty, nowy Dash, Memory i Magiczny Prezent przechodzą do finału; zachowany zapis po reloadzie. 61 grafik załadowanych, zero błędów/ostrzeżeń JS i 404. Snake zachowuje niezmieniony kod i dostępność.
- SHA-256: wszystkie 10 wcześniej istniejących modułów w `js/games/` identyczne jak przed aktualizacją. Nowy Dash jest izolowany w dwóch nowych modułach i zachowuje identyfikator postępu `runner`. Audio, storage i shared core nie zmienione.
- Asset skoku pochodzi z `/Users/michalsobczynski/Downloads/wika_codex_final_pack/characters/wika_dash_jump.png`, z nową podwiniętą pozą. Przygotowane WebP, cropping oraz rozmiary w `assets/dash/manifest.json`. Oryginały paczki nie zmienione. 20 przygotowanych WebP: 1 095 298 bajtów; 19 używanych w preloadzie, opcjonalne settings nie pobierane. Referencje nie trafiają do runtime.
- Render: tło i teren cachowane, rysowanie nieruchomego ready/pause pomijane po pierwszej klatce, pętla kończy się po kolizji. Proporcje postaci i przeszkód zachowane, kolizje obejmują korpus zamiast ozdobnych włosów/skrzydeł.

Raporty: `output/playwright/dash-test-results.json`, `dash-regression-results.json`. Zrzuty `dash-menu-393.png`, `dash-menu-desktop.png`, `dash-run-393.png`, `dash-jump-393.png`, `dash-crouch-393.png`, `dash-desktop.png`.

Poniżej zachowano historyczne wyniki wcześniejszych aktualizacji.

---

# Audio lokalne — wyniki aktualnych testów

- Wszystkie 7 WAV odtworzone systemowym `afplay` (każdy exit 0) oraz przez prawdziwe AudioBufferSourceNode w Chromium. Każdy bufor ma dodatnią energię, poprawną długość i ustawioną głośność. WAV PCM mono 16-bit; brak przesterowanych próbek, 131 102 bajty łącznie.
- `npm run check` obejmuje `scripts/check-audio.mjs`: format/pochodzenie, lazy AudioContext, brak odtwarzania przed gestem, dekodowanie, play/end, głośności, 30 równoczesnych wywołań → jedna instancja efektu, mute/stop/persist, przerwanie oczekującego odtwarzania po mute, timeout, 404, błąd dekodera oraz niedostępny localStorage.
- `scripts/audio-browser-checks.js`: preload 7/7 bez autoplay; pierwsze rzeczywiste kliknięcie odblokowuje kontekst i dekoduje 7/7. Wszystkie efekty odtwarzane osobno, duplikaty odrzucone, koniec usuwa aktywny głos. Mute natychmiast zatrzymuje efekt i zachowuje ustawienie po reloadzie; unmute ponownie umożliwia audio.
- Mobilne konteksty Chromium z dotykiem oraz konfiguracją iPhone 390 px i Android 412 px: przed dotykiem brak AudioContext; tap odblokowuje audio, D-pad działa, mute i unmute poprawne. To emulacja Chromium, nie fizyczne urządzenia ani rzeczywisty Safari/WebKit. Nie instalowano brakującego silnika WebKit z internetu.
- Celowy HTTP 404 dla danger oraz zawieszone pobieranie win: menu z 6 grami nadal uruchamia się po limicie 3,5 s, pięć pozostałych efektów załadowane. Uszkodzony WAV wyłącza tylko swój efekt; poprawny bonus nadal odtwarzany. Błędy dekodowania obsłużone także dla Promise API. Zero nieobsłużonych błędów JS.
- Pełna regresja dotychczasowych gier i finału przeszła; logika punktacji, map, fizyki i progresu nadal przechodzi `npm run check`. Normalny przebieg: zero błędów JavaScript i 404.
- Kod runtime `js/` nie zawiera `/System/Library` ani odwołań do systemowych plików AIFF. Dokładne źródła zapisano w `assets/audio/sfx/manifest.json`. Źródła odczytano lokalnie; konwersja systemowym afconvert, testy z cache przy wyłączonym pobieraniu npm.

Raport: `output/playwright/audio-test-results.json`. Skrypt browserowy uruchamiany przez Playwright CLI `run-code`.

Poniżej historyczne wyniki Love Snake i wcześniejszych aktualizacji.

---

# Love Snake — wyniki aktualnych testów

- `npm run check`: wszystkie pięć typów itemów, punktacja i wzrost (prezent +2 segmenty), wynik ≥0, boost dokładnie 3 s i powrót do tempa zależnego od wyniku, cztery progi szybkości, bufor dwóch skrętów bez zawracania, ściany, własne ciało, prawidłowe wejście na zwalniany ogon, zatrzymanie po porażce, wygrana przy 20.
- 10 000 losowych spawnów: poprawne pola poza wężem. Wyliczone wagi dokładnie 80/8/4/5/3%. Rekord i postęp działają również przy niedostępnym localStorage (bez błędu aplikacji).
- `scripts/snake-browser-checks.js` (Playwright CLI): wygrana prawdziwej rundy przez klawiaturę przy kontrolowanym RNG; poprawny HUD 20/20, zapis rekordu i sukcesu `snake`. WASD, strzałki, reverse ignorowany, Game Over przy ścianie i własnym ciele, pełny restart i menu.
- Dotykowy kontekst Chromium: wszystkie cztery kierunki D-pada. Widoki 360×844, 390×844, 430×844: cała plansza i D-pad widoczne, bez poziomego przewijania; przyciski 56×52 px. Desktop: 1366×768, 1366×900 oraz 1920×1080 — cała plansza i D-pad również widoczne. Zrzuty `output/playwright/snake-mobile-*.png` oraz `snake-desktop.png` sprawdzone wizualnie. To emulacja, bez fizycznego telefonu.
- Wszystkie 12 WebP Snake załadowane przed menu. Celowe przerwanie pobierania głowy pozostawia loader; przycisk ponowienia odzyskuje poprawną aplikację. W normalnym przebiegu zero błędów JS i HTTP/404.
- Regresja `scripts/browser-checks.js`: Zbieracz, oba Labirynty, Runner/checkpoint/respawn, Memory i Gift Hunt nadal przechodzą; finał 6/6, zapis po odświeżeniu, 42 załadowane assety, brak błędów i 404. Suite poprzednich gier ustawia ukończenie Snake po osobnym pełnym teście Snake.
- SHA-256: wszystkie 10 istniejących modułów w `js/games/` identyczne z początkiem tej zmiany. Zmieniono tylko integrację menu/postępu/assetów/loadera, scoped style Snake oraz testowe dane odblokowania Gift Hunt.

Poniżej zachowano historyczne wyniki wcześniejszych aktualizacji.

---

# Aktualizacja Gift Hunt — plansza korytarzy

Zmiany produkcyjne ograniczają się do `js/games/gift-hunt.js`, `gift-hunt-state.js` oraz nowego `gift-hunt-map.js`. Sumy SHA-256 potwierdzają brak zmian w pozostałych modułach aplikacji, innych grach, menu, CSS, konfiguracji assetów, Memory oraz localStorage.

- Plansza 15×11: 76 połączonych pól korytarzy, 17 skrzyżowań, 7 niezależnych pętli i 8 ślepych uliczek. Nie ma otwartych bloków 2×2, więc korytarze mają szerokość jednego pola.
- BFS potwierdza osiągalność każdego pola, trzech głównych przedmiotów oraz prezentu. Przedmioty leżą w trzech oddalonych strefach; ścieżki pomiędzy nimi wymagają zakrętów.
- Wiki i cztery złamane serca zajmują wyłącznie otwarte pola albo poprawne krawędzie pomiędzy sąsiadami. Sprawdzone przez 12 000 klatek symulacji. Jedno złamane serce jest szybsze.
- Buforowany skręt, krótki tap klawiatury między klatkami, zatrzymanie przed ścianą, odrzut i sekunda nietykalności przechodzą testy.
- 24 małe serca dają po 1 punkcie. Test potwierdza też możliwość zakończenia przy 0 punktów, gdy zebrano trzy główne przedmioty.
- W przeglądarce odwiedzono zamknięty prezent przed zbieraniem przedmiotów, następnie zebrano list, bukiet i klucz, odblokowano prezent i ukończono finał. HUD i opcjonalne punkty aktualizują się; widoczny flash występuje przy trafieniach.
- Wszystkie grafiki załadowane, brak ostrzeżeń i błędów konsoli oraz brak 404.
- Cała plansza mieści się w widoku 360×844, 390×844, 430×844, 1366×768 i 1920×1080 bez poziomego scrolla. Portret Wiki ma około 33 px wysokości przy szerokości telefonu 360 px.
- Osobny mobilny kontekst Chromium potwierdza prawdziwy dotyk D-pada i kontynuację ruchu po zwolnieniu przycisku. Sprawdzenie odbywa się w emulacji; fizycznego telefonu nie użyto.

Testy: `node scripts/check-gift-hunt.mjs`, `npm run check`, scenariusze Playwright CLI `scripts/gift-hunt-browser-checks.js` i `scripts/gift-hunt-touch-checks.js`. Zrzuty: `output/playwright/gift-corridors-live-360.png` oraz warianty 390/430 i desktop.

Poniżej zachowano historyczne wyniki poprzedniego second pass.

---

# Second pass — wyniki testów, 3 października 2026

## Zachowane części

Sumy SHA-256 potwierdzają brak zmian w `js/storage.js`, `js/games/memory.js` i `js/memory-config.js`. Identyfikator gry 05 nadal to `quest`, więc istniejący zapis i odblokowania działają bez migracji. Menu zachowało układ, typografię, kolorystykę i style kart; zmieniła się nazwa gry 05.

## Logika (`npm run check`)

- Wszystkie używane pliki zoptymalizowanych grafik istnieją.
- 200 map obu poziomów: każde pole osiągalne od startu.
- Poziom 2: 17×13, trzy serca w ślepych bocznych odnogach poza główną ścieżką do Michała.
- Dodatkowo sprawdzono stałe źródła losowości 0, 0.5 i 0.9999: generator kończy pracę, fallback ma trzy osiągalne odnogi.
- Wika Run: 16 platform, 7 serc, 2 ruchome i 2 kruche platformy. Automat osiąga metę w 51,45 s bez upadków.
- Checkpoint na platformie 09, respawn wraca do niego. Postać przenosi się razem z ruchomą platformą; krucha platforma opada i wraca.
- Meta jest zablokowana przy 0 i 4 sercach oraz dostępna przy 5 sercach.
- Gift Hunt: wszystkie przedmioty, blokada prezentu przed zebraniem kompletu, otwarcie po trzech przedmiotach, kolizje żywopłotów, odrzut i nietykalność po trafieniu.
- Dotychczasowy warunek odblokowania i liczba kart Memory nadal poprawne.

## Pełne przejście w Chromium / Playwright

`browser-checks.js` steruje aplikacją przez jej interfejs, klawiaturę i zegar animacji przyspieszony wyłącznie w przeglądarce testowej.

- Serduszkowy Zbieracz ukończony bez zmiany mechaniki.
- Labirynt: poziom 1 ukończony w 24 ruchach, poziom 2 w 302 ruchach dla testowego seeda. Po pierwszym poziomie nie zapisuje sukcesu gry.
- Podpowiedź na obu poziomach pojawia się i znika po około 2 s.
- Wika Run: pełne przejście ze wszystkimi 7 sercami, zapis checkpointu, celowy upadek po checkpointcie, respawn i ponowne dojście do Michała. Symulowany czas: 55,68 s.
- Memory działa z niezmienionym kodem i zapisuje ukończenie.
- Po odświeżeniu zapisane cztery sukcesy odblokowują Gift Hunt.
- Gift Hunt: zebranie listu, bukietu i klucza, dotarcie do prezentu, animacja otwarcia i prawidłowy ekran finałowy.
- Osobny scenariusz kieruje Wiki w złamane serce: widoczny flash (26 klatek o zmniejszonej przezroczystości), a nietykalność wygasa. Kontakt z prezentem bez przedmiotów nie otwiera finału.
- Finał zapisuje się po odświeżeniu.
- Wszystkie 30 używanych assetów wczytane. Brak błędów, ostrzeżeń konsoli i odpowiedzi 404 w końcowym przejściu.
- Szerokości 360, 390, 430, 1366 i 1920 px bez poziomego scrolla dokumentu.
- Zrzuty `second-pass-*` w `output/playwright/` sprawdzono wizualnie, w tym drugi poziom labiryntu i planszę Gift Hunt.

## Dotyk i płynność

`mobile-checks.js` używa osobnego kontekstu Chromium z `isMobile` i `hasTouch`, 390×844, oraz rzeczywistych zdarzeń dotyku przez protokół przeglądarki. Zegar jest zwykły, bez przyspieszania.

- Wika Run: równoczesny dotyk ruchu i skoku uruchamia `wikaJump` i przesuwa postać.
- Labirynt: dotyk otwartego kierunku przesuwa Wiki do sąsiedniej komórki.
- Gift Hunt: D-pad przesuwa postać płynnie.
- Próba 120 klatek podczas biegu i skoku: mediana około 16,7 ms, p95 około 16,8 ms, czyli około 60 FPS.
- Brak błędów JavaScript.

## Grafiki

Używane PNG przed zmianą: **7 670 660 B**. Odpowiedniki WebP: **658 708 B**, redukcja **91,41%**. Wymiary i orientacyjne największe pola renderowania są w `asset-performance-before.json` oraz `assets/optimized/manifest.json`; podsumowanie jest w `asset-performance-summary.json`.

Kopie WebP zachowują przezroczystość, a oryginalne grafiki pozostały nienaruszone. Złamane serce zachowuje obie oddzielone połówki. Sprite’y są buforowane w rozmiarach renderowania; szerokie platformy używają powtarzanych segmentów odpowiadających colliderom. Tło i żywopłoty labiryntu są renderowane do osobnych buforów. Animacja serca menu zatrzymuje się poza viewportem.

## Ograniczenia

Nie testowano na fizycznym iPhonie ani Androidzie. Wynik FPS dotyczy lokalnej emulacji Chromium. Cel 60–90 s dla początkującego gracza jest założeniem projektowym: minimum automatu wynosi około 51 s, a rzeczywisty czas zależy od zatrzymywania się przed skokami i liczby upadków. Zdjęcia osobiste nie zostały dostarczone; placeholder i konfiguracja `useFinalPhoto` pozostały dostępne.
