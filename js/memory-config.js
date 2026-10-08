import { assets } from "./assetConfig.js";
export const memoryCards = [
  { id: "heart", label: "Serce", src: assets.heart },
  { id: "bouquet", label: "Bukiet", src: assets.bouquet },
  { id: "coffee", label: "Kawa", src: assets.coffee },
  { id: "letter", label: "List", src: assets.letter },
  { id: "ticket", label: "Bilet", src: assets.ticket },
  { id: "gift", label: "Prezent", src: assets.gift },
  { id: "star", label: "Gwiazda", src: assets.star },
  { id: "key", label: "Klucz", src: assets.key },
];
const memoryPhotos = Array.from({ length: 8 }, (_, index) => ({
  id: `photo${index + 1}`,
  label: `Nasze zdjęcie ${index + 1}`,
  src: `assets/photos/memory/photo${index + 1}.webp`,
  crop: [0, 4].includes(index) ? "upper" : "center",
}));
export const memoryLevels = [
  { id: 1, type: "assets", label: "Ilustracje", images: memoryCards },
  { id: 2, type: "photos", label: "Nasze zdjęcia", images: memoryPhotos },
];
let photoCardsPromise;
export async function loadMemoryPhotoCards() {
  photoCardsPromise ??= (async () => {
    const photos = memoryLevels.find((level) => level.id === 2).images,
      responses = await Promise.all(
        photos.map((photo) =>
          fetch(photo.src, { cache: "no-cache" }).catch(() => null),
        ),
      );
    if (!responses.every((response) => response?.ok)) return [];
    const available = await Promise.all(
      photos.map(
        (photo) =>
          new Promise((resolve) => {
            const image = new Image();
            image.onload = () => resolve(photo);
            image.onerror = () => resolve(null);
            image.src = photo.src;
          }),
      ),
    );
    return available.every(Boolean) ? available : [];
  })();
  return photoCardsPromise;
}
