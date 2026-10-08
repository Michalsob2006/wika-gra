import { GROUND, DASH_H } from "./dash-state.js";
// Replace asset keys here after adding the file to assetConfig/preload.
// Existing illustrations use reflected neighbors to join matching edge pixels.
// For authored seamless artwork, change loop to "seamless"; physics is independent.
export const DASH_SCENERY = {
  backgrounds: ["dashRiverside", "dashValley"],
  loop: "mirror",
  parallax: 0.16,
  sceneDistance: 600,
  crossfadeDistance: 120,
  frame: { width: 1440, height: GROUND, fit: "cover", x: 0.5, y: 0.5 },
  ground: { asset: "dashPlatform", loop: "mirror", height: 112 },
};
const mod = (n, d) => ((n % d) + d) % d;
export function repeatTiles(viewWidth, tileWidth, scroll, mode = "seamless") {
  const period = tileWidth * (mode === "mirror" ? 2 : 1),
    position = mod(scroll, period),
    first = Math.floor(position / tileWidth),
    offset = position % tileWidth,
    out = [];
  for (let n = 0, x = -offset; x < viewWidth; n++, x += tileWidth)
    out.push({ x, flip: mode === "mirror" && (first + n) % 2 === 1 });
  return out;
}
export function sceneBlend(distance, config = DASH_SCENERY) {
  const current =
      Math.floor(distance / config.sceneDistance) % config.backgrounds.length,
    phase = mod(distance, config.sceneDistance);
  return {
    current,
    next: (current + 1) % config.backgrounds.length,
    mix: Math.max(
      0,
      (phase - config.sceneDistance + config.crossfadeDistance) /
        config.crossfadeDistance,
    ),
  };
}
const sceneryCache = new WeakMap();
export function coverRect(
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  positionX = 0.5,
  positionY = 0.5,
) {
  const scale = Math.max(
      targetWidth / sourceWidth,
      targetHeight / sourceHeight,
    ),
    width = sourceWidth * scale,
    height = sourceHeight * scale;
  return {
    x: (targetWidth - width) * positionX,
    y: (targetHeight - height) * positionY,
    width,
    height,
    scale,
  };
}
export function createDashScenery(images, config = DASH_SCENERY) {
  let variants = sceneryCache.get(images);
  if (!variants) sceneryCache.set(images, (variants = new Map()));
  if (variants.has(config)) return variants.get(config);
  function layer(key, height) {
    const image = images[key],
      canvas = document.createElement("canvas");
    canvas.width = Math.round((height * image.width) / image.height);
    canvas.height = height;
    canvas.assetKey = key;
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, height);
    return canvas;
  }
  function backgroundLayer(key) {
    const image = images[key],
      frame = config.frame,
      canvas = document.createElement("canvas"),
      rect = coverRect(
        image.width,
        image.height,
        frame.width,
        frame.height,
        frame.x,
        frame.y,
      );
    canvas.width = frame.width;
    canvas.height = frame.height;
    canvas.assetKey = key;
    canvas.coverRect = rect;
    canvas
      .getContext("2d")
      .drawImage(image, rect.x, rect.y, rect.width, rect.height);
    return canvas;
  }
  const backgrounds = config.backgrounds.map(backgroundLayer),
    ground = layer(config.ground.asset, config.ground.height);
  function repeat(ctx, image, y, width, travel, mode) {
    for (const tile of repeatTiles(width, image.width, travel, mode)) {
      ctx.save();
      ctx.translate(tile.x + (tile.flip ? image.width : 0), y);
      if (tile.flip) ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0);
      ctx.restore();
    }
  }
  const scenery = {
    draw(ctx, width, travel, distance, reduce = false) {
      const { current, next, mix } = sceneBlend(distance, config),
        scroll = reduce ? 0 : travel * config.parallax;
      repeat(ctx, backgrounds[current], 0, width, scroll, config.loop);
      if (mix > 0) {
        ctx.save();
        ctx.globalAlpha = mix;
        repeat(ctx, backgrounds[next], 0, width, scroll, config.loop);
        ctx.restore();
      }
      ctx.fillStyle = "#efdbca";
      ctx.fillRect(0, GROUND, width, DASH_H - GROUND);
      repeat(ctx, ground, GROUND - 29, width, travel, config.ground.loop);
    },
  };
  variants.set(config, scenery);
  return scenery;
}
