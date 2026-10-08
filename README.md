# Mini gierki dla Wiki

Statyczna, romantyczna kolekcja siedmiu gier na trzecią rocznicę. HTML, CSS i JavaScript, bez frameworka, backendu, logowania, CDN i zewnętrznych usług. Wszystkie ilustracje pochodzą z dostarczonego folderu. Postęp i wyciszenie zapisują się na tym urządzeniu w localStorage.

Aktualny stan i końcowa walidacja: [FINAL_FIX.md](FINAL_FIX.md).

## Uruchomienie

W tym folderze uruchom:

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Otwórz `http://127.0.0.1:4173`. Alternatywnie: `npm start` (nie trzeba wykonywać `npm install`). Użyj serwera HTTP, ponieważ moduły JavaScript nie działają poprawnie po otwarciu `index.html` przez `file://`.

Aby sprawdzić na telefonie w tej samej sieci Wi-Fi, uruchom `python3 -m http.server 4173 --bind 0.0.0.0`, a na telefonie otwórz `http://ADRES_IP_KOMPUTERA:4173`.

## Struktura projektu

```text
index.html                    ekran ładowania i główny dokument
styles/main.css               wygląd, animacje, układ mobilny
js/
  app.js                      menu, uruchamianie gier, wyniki i finał
  assetConfig.js              ścieżki grafik i konfiguracja final.jpg
  memory-config.js            osiem obrazków / zdjęć do Memory
  preload.js                  wczytywanie grafik i postęp ładowania
  storage.js                  zapis ukończonych gier i blokada finału
  audio.js                    krótkie dźwięki Web Audio i wyciszenie
  games/
    core.js                   rysowanie, klawiatura, dotyk, pętla gry
    catcher.js                łapanie przedmiotów
    maze-map.js               generator logicznego labiryntu i szukanie drogi
    maze.js                   widok labiryntu i sterowanie
    runner-physics.js         poziomy, skok, kolizje i checkpointy
    runner.js                 rozszerzony Wika Run
    gift-hunt-map.js          mapa korytarzy i weryfikacja tras
    gift-hunt-state.js        ruch po siatce i reguły Gift Hunt
    gift-hunt.js              widok, HUD i animacja otwarcia prezentu
    memory.js                 tasowanie, pary i liczniki
    love-snake.js             widok, sterowanie, HUD i Game Over
    snake-state.js            siatka, punktacja, spawn, wzrost i rekord
assets/
  prepared/                   przycięte kopie istniejących PNG
  optimized/                  mniejsze WebP używane przez aplikację
  snake/                      dostarczone WebP Love Snake
  photos/
    memory/                   miejsce na photo1.jpg … photo8.jpg
    final.jpg                 dodaj później
scripts/
  check.mjs                   sprawdzenie map, fizyki i ścieżek
  browser-checks.js           scenariusz testów dla Playwright CLI
  prepare-assets.py           powtarzalne przycinanie dostarczonych grafik
  optimize-assets.py          optymalizacja kopii PNG do WebP
  mobile-checks.js            dotyk, multitouch i pomiar klatek
asset-inventory.json          nazwy, wymiary i bajty oryginalnych PNG
TESTS.md                      wyniki testów
characters/, items/, world/, ui/, raw/ — oryginalne assety
```

Wika Dash (03) to automatyczny runner na planszy 1440×760 na desktopie, 480×760 w pionie telefonu i 1080×430 w poziomie telefonu. Skok: spacja / ↑ / W; ślizg: ↓ / S; pauza: P / Esc lub przycisk. Na telefonie duże przyciski Skok i Ślizg; skok reaguje na pointerdown, a ślizg trwa wyłącznie podczas przytrzymania i kończy się po puszczeniu. Mobilne tempo wynosi 0,90× prędkości desktopowej z zachowaniem tej samej krzywej przyspieszania. Skrzynki wymagają skoku, ptaszki ślizgu. Kolizja kończy rundę, „Jeszcze raz” resetuje wszystkie jej liczniki. Utrata fokusu automatycznie pauzuje. Każde zdarzenie spawnu tworzy jedno serce. Przeszkody są losowe z limitem trzech powtórzeń; tempo rośnie płynnie z 1,0× do 1,7× przy 500 m, a dalej wolniej do 2,05×. Losowe odstępy maleją z 1,2–2,0 s do 0,82–1,42 s; walidacja każdej pary zachowuje czas na lądowanie i zmianę akcji. Scenerie korzystają ze wspólnego kadru `cover` 1440×610 i łagodnie przenikają się co 600 m. Szczegóły: [DASH_FIX.md](DASH_FIX.md). Minimum 500 m i 20 serduszek odblokowuje „Zapisz przygodę ✓”, ale bieg trwa bez limitu do decyzji gracza. Zapisywane są osobne rekordy dystansu i serc; gorszy wynik ich nie nadpisuje.

Nowy moduł `wika-dash.js` wraz z `dash-state.js` obsługuje ten widok. Dawne `runner.js` i `runner-physics.js` zachowano bez zmian jako poprzednią implementację. Pełny Mobile Fix Pass opisano poniżej.

Miłosny Labirynt ma poziom 1 (7×5) oraz poziom 2 (17×13), przewijany wokół Wiki. Oba używają dotychczasowego generatora DFS. W drugim poziomie serca są w bocznych ślepych odnogach poza główną drogą do Michała. Przycisk podpowiedzi pokazuje tylko następny krok na 2 sekundy. Dopiero ukończenie drugiego poziomu zapisuje sukces gry.

Gift Hunt w kafelku 05 ma planszę 15×11 z wąskimi korytarzami, 17 skrzyżowaniami, 7 pętlami i 8 ślepymi uliczkami. List, bukiet i klucz są w różnych strefach, a prezent w osobnej. Cztery złamane serca wybierają losową dostępną drogę na skrzyżowaniach i nie zawracają, jeśli mają inną możliwość. Jeden porusza się szybciej. Dodatkowo 24 małe serca dają po jednym punkcie, ale nie są warunkiem finału. Cała plansza jest widoczna bez przesuwania kamery. Ruch odbywa się płynnie między polami; krótkie naciśnięcie kierunku zapisuje skręt do następnego dostępnego zakrętu. Zderzenie powoduje krótki odrzut i sekundę nietykalności. Prezent aktywuje się po trzech przedmiotach; dotknięcie aktywnego prezentu uruchamia otwarcie, fade i finał. Gra nadal używa identyfikatora `quest`, żeby zachować zgodność z dotychczasowym localStorage. Istniejący postęp nie jest migrowany ani resetowany.

Love Snake (06) ma stałą siatkę **9×12** na telefonie i desktopie. Głowa zajmuje 89% pola, segmenty 82%, a itemy 76%. Start po kierunku; WASD, strzałki i D-pad. Cel: co najmniej 20 punktów. Serce +1, bukiet +2, prezent +3; złamane serce −2, ciemne −1. Wynik nie spada poniżej zera. Każdy dodatni item dodaje segment. Zawsze 1–2 serca; niezależne zegary produkują maksymalnie jedno złamane serce, ciemne serce, bukiet i prezent. Omijanie itemu nie blokuje następnego spawnu. Bonusy wygasają po 4–8 s; prezent pojawia się co 32–45 s. Tempo: 290/245/205/175 ms na pole przy progach 0/5/10/15. Ściana i własne ciało kończą rundę; ekran końca daje „Spróbuj ponownie” i menu. Restart czyści długość, wynik, kolejkę i zegary spawnów.

Love Snake jest dostępny od razu. Gift Hunt odblokowuje się po Zbieraczu, Labiryncie, Runnerze, Memory i Snake. Finał wymaga siedmiu ukończeń, w tym nowej wspólnej przygody Wika & Michał. Zapis `wiki-anniversary-v1` pozostaje zgodny; stare sukcesy są zachowane, a osobny rekord Snake zapisuje się pod `wiki-love-snake-best-v1`. Konfiguracja zdjęć Memory pozostaje zachowana; pauza zatrzymuje również timery kart.

12 dostarczonych WebP Snake jest skopiowanych do `assets/snake/` (85 520 bajtów łącznie; głowa 220×213, ciało i ogon 128×128, przyciski 96×96). Aktualna konfiguracja i preload obejmują 92 grafiki, w tym 31 grafik Wika & Michał (nowa Wika v2 i okładka). Nieudane ładowanie pozostawia ekran loadera z przyciskiem ponowienia zamiast uruchamiać grę z brakującymi grafikami.

## Wasze zdjęcia do Memory

1. Umieść osiem zdjęć w `assets/photos/memory/`, np. `photo1.jpg` do `photo8.jpg`.
2. Otwórz `js/memory-config.js`.
3. Podmień pola `src` w ośmiu wpisach na ścieżki zdjęć:

```js
{ id: 'heart', label: 'Nasz pierwszy spacer', src: 'assets/photos/memory/photo1.jpg' }
```

Zostaw unikalne `id`; każda konfiguracja automatycznie tworzy dwie identyczne karty. Pole `label` jest opisem zdjęcia dla czytników ekranu. Najlepiej użyć kwadratowych zdjęć, około 600–1000 px, skompresowanych do rozsądnego rozmiaru. Grafiki domyślne działają do momentu podmiany.

## Zdjęcie finałowe

Dodaj `assets/photos/final.jpg`, następnie ustaw `useFinalPhoto = true` w `js/assetConfig.js`. Domyślnie jest `false`, żeby nie wysyłać żądania do nieistniejącego pliku. Jeśli włączony plik nie załaduje się, ekran zachowa placeholder z ilustracjami Wiki i Michała.

## Hosting

Wystarczy statyczny hosting. Nie ma procesu budowania ani wymaganych zmiennych środowiskowych.

Do publikacji potrzebne są `index.html`, `styles/`, `js/` i `assets/`. Zachowaj ich względne ścieżki. GitHub Pages może serwować te pliki z katalogu głównego repozytorium; do Netlify / Vercel użyj katalogu z tymi plikami jako katalogu publikacji, bez komendy budowania. Foldery `raw/`, oryginalne assety, `output/` i narzędzia `scripts/` nie są potrzebne na hostingu. Postęp jest lokalny dla konkretnej przeglądarki i adresu strony.

## Kontrole i grafiki

- Zbieracz: strzałki lewo/prawo lub A/D; maksymalnie cztery spadające elementy.
- Labirynt: strzałki lub WASD. Dwa poziomy, po trzy wymagane serca; timer jest tylko informacyjny.
- Wika Run: strzałki lub A/D, skok: spacja / strzałka w górę / W.
- Gift Hunt: strzałki lub WASD; na telefonie D-pad.
- Telefon: duże przyciski dotykowe, także jednoczesny ruch i skok.
- Nie ma życia ani game over. Upadek przywraca Wiki do startu albo środkowego checkpointu.
- Dźwięki są generowane przez Web Audio po interakcji; nie wymagają plików muzycznych. Można je wyciszyć.
- Ładowanie kończy się po rzeczywistym preloadzie grafik i siedmiu plików audio. Audio ma limit 3,5 s na plik; błędy dźwięków nie blokują menu.
- Animacje respektują ustawienie ograniczonego ruchu w systemie.

Dostarczone osobne PNG miały czasem fragmenty sąsiednich elementów na krawędziach. `assets/prepared/` zawiera tylko przycięte kopie; oryginały pozostają nienaruszone. Wymiary oryginałów są w `asset-inventory.json`, a obszary przycięcia w `assets/prepared/manifest.json`. Ponowne przygotowanie grafik wymaga Pythona z Pillow: `python3 scripts/prepare-assets.py`. Do działania strony Pillow nie jest potrzebny.

## Testy

`npm run check` uruchamia testy bez instalowania zależności. Sprawdzają wszystkie używane ścieżki, osiągalność każdego pola w 200 labiryntach obu poziomów, boczne odnogi z sercami, dojście do mety, checkpoint, respawn, ruchome i kruche platformy, próg 5 serc oraz przedmioty, kolizje i blokadę prezentu w Gift Hunt.

Scenariusz integracyjny `scripts/browser-checks.js` jest przeznaczony do Playwright CLI (`run-code`). Odtwarza klawiaturę i Pointer Events oraz przyspiesza zegar animacji wyłącznie wewnątrz przeglądarki testowej. Nie ma kodów do pomijania gier w aplikacji. Wyniki i ograniczenia są w `TESTS.md`.

## TODO przed wręczeniem

- Dodać Wasze osiem zdjęć i zdjęcie finałowe.
- Zagrać raz na docelowym telefonie Wiki, aby ocenić wielkość postaci i wygodę sterowania.
- Opcjonalnie dopasować trudność i osobiste opisy zdjęć po pierwszym wspólnym przejściu.

## Optymalizacja z second pass

Wymiary i waga PNG przed zmianą są w `asset-performance-before.json`. `assets/optimized/manifest.json` zestawia źródło, wymiary, szacowane największe pole renderowania i rozmiar wynikowego WebP. Postacie mają maksymalnie 384 px, przedmioty 192 px, serca 128 px, a platformy i tła 512 px. Oryginalne PNG i przycięte kopie nadal istnieją.

Wygenerowane kopie odtworzysz przez `python3 scripts/optimize-assets.py` (Pillow). Zapisy są atomowe, aby podgląd nie odczytał częściowo zapisanego obrazka. Aplikacja preładuje i dekoduje wszystkie używane WebP przed wejściem do menu. Rysowanie używa ograniczonego cache sprite’ów w ich rzeczywistych rozmiarach, statycznego tła i gotowej warstwy żywopłotów. Szerokie platformy są składane z powtarzanych fragmentów grafiki. Elementy Wika Run poza kamerą nie są rysowane, a serce w nagłówku menu zatrzymuje animację poza viewportem.

## Pliki aktualizacji Love Snake

Dodane: `js/games/love-snake.js`, `js/games/snake-state.js`, `scripts/check-snake.mjs`, `scripts/snake-browser-checks.js` oraz 12 WebP w `assets/snake/`. Raport i zrzuty zapisano w `output/playwright/snake-*`.

Zmienione: `index.html`, `styles/main.css`, `js/app.js`, `js/assetConfig.js`, `js/preload.js`, `js/storage.js`, `README.md`, `TESTS.md`. Testy integracyjne dostosowane do sześciu gier: `scripts/check.mjs`, `scripts/browser-checks.js`, `scripts/gift-hunt-browser-checks.js`, `scripts/gift-hunt-touch-checks.js`, `scripts/mobile-checks.js`.

Przy pierwotnym dodaniu Snake logika wcześniejszych gier pozostała zachowana; późniejsze poprawki opisuje Mobile Fix Pass. Snake korzysta z dotychczasowych dźwięków i modułu rysowania. Referencja była odczytana z `/Users/michalsobczynski/Downloads/snake_assets_wiki/reference/snake_design_reference.png`; duży plik referencyjny i źródłowe PNG nie są pobierane przez grę.

## Audio z lokalnego macOS

Siedem efektów WAV w `assets/audio/sfx/` zastępuje generowane tony. Przygotowano je offline za pomocą systemowego `afconvert` i Pythona. Pełne pochodzenie i parametry: `assets/audio/sfx/README.md` oraz `manifest.json`. Odtwarzanie rozpoczyna się po pierwszej interakcji; `wiki-muted` zachowuje zgodność z poprzednim zapisem wyciszenia. Powtarzające się efekty nie nakładają się; mute przerywa aktywne i oczekujące odtwarzanie. Podłączono oddzielne serca/bonusy/negatywne itemy, danger ciemnego serca, Game Over, zwycięstwo i przyciski w całej aplikacji.

Nowe pliki: `js/audio-config.js`, siedem WAV wraz z manifestem i README, `scripts/prepare-audio.py`, `scripts/check-audio.mjs`, `scripts/audio-browser-checks.js`. Zmienione: `js/audio.js`, `js/preload.js`, etykieta ładowania w `index.html`, wywołania dźwięków w `catcher.js`, `runner.js`, `memory.js`, `gift-hunt.js`, `love-snake.js`, `scripts/check.mjs` oraz dokumentacja. Mechanika gier nie została zmieniona.

## Ilustrowane okładki i Wika Dash

Menu używa sześciu okładek z paczki `wika_codex_final_pack`, dopasowanych w proporcji 4:3 bez rozciągania. Karty są renderowane wspólnym komponentem `js/game-card.js`; numerowanie, statusy, CTA i blokada prezentu zachowane. Tytuły 03 i 05 to teraz Wika Dash oraz Magiczny Prezent.

Grafiki runtime: `assets/dash/` (19 używanych WebP). Konwersja: `scripts/prepare-dash-assets.py`; źródła oraz wymiary i przycięcia w `assets/dash/manifest.json`. Usunięto prawie przezroczyste marginesy sprite’ów, zachowując proporcje. Nowy skok pochodzi bezpośrednio z `characters/wika_dash_jump.png`; nie korzysta ze starego skoku Wiki. Referencje nie są pobierane przez aplikację. Cała przygotowana paczka 20 WebP zajmuje około 1,04 MiB; zawiera również opcjonalny, nieużywany przycisk settings.

Dodane: `js/game-card.js`, `js/games/wika-dash.js`, `js/games/dash-state.js`, `scripts/prepare-dash-assets.py`, `scripts/check-dash.mjs`, `scripts/dash-browser-checks.js`, WebP/manifest w `assets/dash/`. Zmienione: `js/app.js`, `js/assetConfig.js`, `styles/main.css`, integracja testów w `scripts/check.mjs`, `scripts/browser-checks.js`, `scripts/mobile-checks.js` oraz dokumentacja. Preload automatycznie obejmuje nowe assety; audio i localStorage zachowują dotychczasową konfigurację.

## Wika & Michał — przygoda 07, Fix Pass

Gra platformowo-logiczna dla dwóch osób przy jednej klawiaturze. Wika: **A / D**, skok **W**. Michał: **← / →**, skok **↑**. **P / Esc** pauzuje. Na telefonie obróć ekran poziomo; każda postać ma osobne przyciski dotykowe.

Wika zbiera serca i jest bezpieczna w różowej cieczy; Michał zbiera diamenty i jest bezpieczny w niebieskiej. Obca ciecz, kolce i upadek przywracają **tylko daną postać na start poziomu**. Zebrane przedmioty, dźwignie i druga postać zachowują stan. Każdy poziom ma po **5 serc i 5 diamentów**. Zakończenie wymaga wszystkich przedmiotów i obu osób przy swoich drzwiach.

- **Most spotkania:** przeciwne starty, wspólny dolny warsztat, różowy przycisk wysuwający most dla Michała, skrzynia jako stopień do serca i dźwigni, niebieska dźwignia uruchamiająca windę dla Wiki. Oboje odwiedzają wspólny środek i przeciwne skrzydło, a potem wracają górą do drzwi.
- **Dwie drogi, jeden most:** więcej pionowości, skrzynia i ciężki blok, dwa chwilowe przyciski, dwie dźwignie, dwa mosty i dwie windy. Najpierw Wika utrzymuje przejście dla Michała; później Michał utrzymuje przejście dla Wiki, aż jej dźwignia je zatrzaśnie. Ciężki blok pozwala dostać się do serca na prawej półce.

Platformy przepuszczają skok od dołu; skrzynie i zamknięte przejścia są pełnymi bryłami. Stały collider postaci 34×80 jest niezależny od ilustracji. Wszystkie pozy mają wspólny punkt stóp. Dostarczona Wika v2 i Michał są większe o 15,8%. Nowa okładka wypełnia kartę przez `object-fit: cover`.

Plansza 1200×660 mieści się wraz z HUD-em na 1280×800, 1366×768 i 1440×900; zajmuje około 79–89% szerokości ekranu. Gra nie ma checkpointów, flag ani podpisów na planszy. Dźwignie aktywuje właściwa postać po podejściu do małego triggera na tej samej podłodze. Przycisk w poziomie 1 zatrzaskuje się; przyciski poziomu 2 wymagają utrzymania postacią lub skrzynią.

Pełny raport diagnozy, lista zmienionych plików, pochodzenie grafik i wyniki testów: [QUALITY_FIX.md](QUALITY_FIX.md). Historyczna diagnoza: [DUO_FIX.md](DUO_FIX.md). Sukces nadal zapisuje się jako `duo` w istniejącym `wiki-anniversary-v1`; wcześniejszy postęp pozostaje zachowany.

## Mobile + UX + Visual Fix Pass

W grze strona korzysta z 100dvh i safe-area, blokuje przewijanie, overscroll, pinch, double tap, selekcję i przeciąganie ilustracji. Wyjście przywraca przewijane menu. Sterowanie reaguje na pointerdown; pointerup, pointercancel, utrata capture i fokusu czyszczą przytrzymania. Nagłówek i HUD są kompaktowe, stopka ukryta, a przyciski mieszczą się przy dolnej krawędzi. Pauza zatrzymuje fizykę oraz timery Memory.

Zbieracz ma większą postać i przedmioty, pionową planszę na telefonie oraz szeroki widok w poziomie. Obrót zachowuje aktualną rundę. Każdy przepuszczony dobry przedmiot odejmuje 1 punkt tylko raz, z −1, dźwiękiem i animacją HUD. Złapane serce daje +1, bukiet/list +2, prezent +3; złapane złamane serce −1, przepuszczone złamane serce jest neutralne. Wynik może być ujemny. Canvas dopasowuje proporcje do kontenera, a tło zachowuje całą ilustrację bez maski przycinającej.

`manifest.webmanifest`, istniejące serce w ikonach 192/512 px i Apple meta przygotowują „Dodaj do ekranu początkowego”. Brak service workera: aplikacja nie deklaruje pracy offline. Szczegóły zmian, pełna lista plików i ograniczenia testów: [MOBILE_FIX.md](MOBILE_FIX.md).
