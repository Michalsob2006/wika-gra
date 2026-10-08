# Lokalne efekty dźwiękowe

Przygotowane bez pobierania plików ani narzędzi. Źródła z tego Maca skopiowano do katalogu tymczasowego i przekonwertowano systemowym `/usr/bin/afconvert`; ciszę przycięto, poziomy wyrównano i dodano krótkie wygaszenie standardową biblioteką Pythona. Powtarzalny skrypt: `scripts/prepare-audio.py`.

Runtime używa wyłącznie względnych ścieżek w `js/audio-config.js`. Pełna lista pochodzenia, SHA-256 i rozmiarów jest w `manifest.json`; nie jest importowana przez aplikację.

| Plik w assets/audio/sfx/ | Lokalne źródło | Czas |
| --- | --- | --- |
| collect-heart.wav | `/System/Library/Sounds/Tink.aiff` | 0.080 s |
| collect-bonus.wav | `/System/Library/Sounds/Glass.aiff` | 0.660 s |
| negative.wav | `/System/Library/Sounds/Basso.aiff` | 0.202 s |
| danger.wav | `/System/Library/Sounds/Submarine.aiff` | 0.691 s |
| game-over.wav | `/System/Library/Sounds/Sosumi.aiff` | 0.394 s |
| win.wav | `/System/Library/Sounds/Hero.aiff` | 0.778 s |
| click.wav | `/System/Library/Sounds/Pop.aiff` | 0.160 s |

WAV PCM 16-bit, mono, 22 050 Hz. Łącznie 131,102 bajtów. Pliki są samodzielne i nie wymagają dostępu do folderów systemowych.

AudioManager: lazy AudioContext po zaufanym pointerdown/keydown, jednoklatkowy cichy bufor dla mobile WebKit, dekodowanie z obsługą callbacków i Promise, siedem osobnych efektów, maksymalnie jeden aktywny/pending efekt danego typu i cztery głosy łącznie. Wygrana/Game Over przerywają wcześniejsze efekty. Mute natychmiast przerywa audio i oczekujące odtwarzanie, zapisując dotychczasowy klucz `wiki-muted`. Utrata fokusu/ukrycie strony zatrzymuje dźwięki.

Preload pobiera 7 plików razem z 42 grafikami, bez uruchamiania AudioContext. Limit pobrania: 3,5 s na efekt, także dla zawieszonego body odpowiedzi. Brakujący albo uszkodzony efekt zostaje wyłączony bez blokowania aplikacji; dekodowanie również ma limit 2 s.

Głośności GainNode: click 0,10; heart 0,24; bonus/negative 0,26; danger 0,25; game-over 0,30; win 0,50. Pliki mają ograniczony szczyt do 0,8, z wygaszeniem na końcu.
