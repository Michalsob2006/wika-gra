import { assets } from "./assetConfig.js";
import { audioAssets } from "./audio-config.js";
import { audioManager } from "./audio.js";
export const images = {};
export async function preload(onProgress) {
  let done = 0;
  const failed = [];
  const entries = Object.entries(assets);
  const total = entries.length + Object.keys(audioAssets).length;
  const settled = () => onProgress(++done / total);
  await Promise.all([
    audioManager.preload(settled),
    ...entries.map(
      ([key, src]) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = async () => {
            if (img.decode) await img.decode().catch(() => {});
            images[key] = img;
            settled();
            resolve();
          };
          img.onerror = () => {
            failed.push(src);
            settled();
            resolve();
          };
          img.src = src;
        }),
    ),
  ]);
  if (failed.length) throw new Error("Missing assets: " + failed.join(", "));
}
