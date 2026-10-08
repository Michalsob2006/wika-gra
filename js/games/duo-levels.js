export const DUO_WIDTH = 1200,
  DUO_HEIGHT = 660;
const floor = (id, x, y, w) => ({ id, x, y, w, h: 30, style: "ruin" });
const gem = (owner, x, surface) => ({
  owner,
  x,
  y: surface - 42,
  w: 32,
  h: 34,
});
const pool = (kind, x, surface, w) => ({ kind, x, y: surface - 7, w, h: 15 });
const door = (owner, x, surface, control) => ({
  owner,
  x,
  y: surface - 140,
  w: 96,
  h: 140,
  control,
});
const box = (id, x, surface, kind, minX, maxX) => ({
  id,
  x,
  y: surface - (kind === "heavy" ? 80 : 64),
  w: kind === "heavy" ? 76 : 72,
  h: kind === "heavy" ? 80 : 64,
  kind,
  pushSpeed: kind === "heavy" ? 85 : 115,
  minX,
  maxX,
});
const lift = (id, x, from, to, control, speed = 70) => ({
  id,
  x,
  y: from,
  w: 112,
  h: 20,
  from,
  to,
  speed,
  control,
});
const bridge = (id, x, y, w, control) => ({ id, x, y, w, h: 22, control });
export const duoLevels = [
  {
    name: "Most spotkania",
    background: "duoBg1",
    intro:
      "Dwie strony ruin i jedna wspólna droga. Kolory, ruch platform i blask mechanizmów pokażą wam, jak spotkać się pośrodku.",
    starts: [
      { id: "wika", x: 115, y: 70 },
      { id: "michal", x: 1050, y: 130 },
    ],
    platforms: [
      floor("start-left", 20, 150, 260),
      floor("start-right", 950, 210, 230),
      floor("middle-left", 20, 350, 385),
      floor("middle-right", 925, 400, 255),
      floor("shared-balcony", 500, 335, 150),
      floor("crate-ledge", 290, 450, 100),
      floor("return-gallery", 680, 210, 190),
      floor("workshop-left", 20, 610, 410),
      floor("workshop-right", 700, 610, 480),
    ],
    supports: [
      { x: 70, top: 180, bottom: 350 },
      { x: 232, top: 180, bottom: 350 },
      { x: 1118, top: 240, bottom: 400 },
      { x: 335, top: 480, bottom: 610 },
      { x: 560, top: 365, bottom: 590 },
      { x: 985, top: 430, bottom: 610 },
    ],
    blocks: [box("crate", 210, 610, "crate", 160, 292)],
    buttons: [
      { id: "pink-button", owner: "wika", x: 285, y: 610, w: 62, latch: true },
    ],
    levers: [
      { id: "pink-lever", owner: "wika", x: 378, y: 450 },
      { id: "blue-lever", owner: "michal", x: 165, y: 610 },
    ],
    gates: [],
    bridges: [
      bridge("meeting-bridge", 430, 610, 270, "pink-button"),
      bridge("home-bridge", 280, 150, 400, "pink-lever"),
      bridge("right-bridge", 870, 210, 80, "blue-lever"),
    ],
    lifts: [lift("shared-lift", 760, 570, 150, "blue-lever", 76)],
    hazards: [
      pool("pink", 72, 610, 48),
      pool("pink", 372, 610, 26),
      pool("pink", 1020, 610, 50),
      pool("pink", 235, 350, 50),
      pool("blue", 740, 610, 60),
      pool("blue", 930, 610, 45),
      pool("blue", 1100, 610, 50),
      pool("spikes", 440, 645, 250),
    ],
    collectibles: [
      gem("wika", 150, 150),
      gem("wika", 300, 450),
      gem("wika", 595, 335),
      gem("wika", 1035, 610),
      gem("wika", 1030, 210),
      gem("michal", 1060, 210),
      gem("michal", 205, 150),
      gem("michal", 310, 350),
      gem("michal", 535, 335),
      gem("michal", 260, 610),
    ],
    doors: [
      door("wika", 28, 150, "blue-lever"),
      door("michal", 1080, 210, "pink-lever"),
    ],
  },
  {
    name: "Dwie drogi, jeden most",
    background: "duoBg2",
    intro:
      "Tu każde z was otwiera drogę drugiej osobie. Obserwujcie kolory i ruch świata — finał czeka za wspólnym mostem.",
    starts: [
      { id: "wika", x: 105, y: 80 },
      { id: "michal", x: 1050, y: 100 },
    ],
    platforms: [
      floor("start-left", 20, 160, 310),
      floor("upper-centre", 440, 180, 320),
      floor("start-right", 940, 180, 240),
      floor("cooperation-left", 20, 340, 320),
      floor("cooperation-centre", 600, 340, 200),
      floor("middle-right", 880, 405, 150),
      floor("heavy-ledge", 1060, 465, 100),
      floor("workshop", 20, 610, 1160),
    ],
    supports: [
      { x: 66, top: 190, bottom: 340 },
      { x: 1030, top: 210, bottom: 405 },
      { x: 270, top: 370, bottom: 610 },
      { x: 670, top: 370, bottom: 580 },
      { x: 1100, top: 495, bottom: 610 },
    ],
    blocks: [
      box("crate", 180, 340, "crate", 145, 290),
      box("stone", 975, 610, "heavy", 875, 1070),
    ],
    buttons: [
      { id: "pink-button", owner: "wika", x: 285, y: 340, w: 62, latch: false },
      {
        id: "blue-button",
        owner: "michal",
        x: 845,
        y: 610,
        w: 62,
        latch: false,
      },
    ],
    levers: [
      { id: "blue-lever", owner: "michal", x: 115, y: 340 },
      { id: "pink-lever", owner: "wika", x: 1030, y: 180 },
    ],
    gates: [],
    bridges: [
      bridge("cooperation-bridge", 340, 340, 260, "pink-button"),
      bridge("final-bridge", 760, 180, 180, "final-route"),
    ],
    lifts: [
      lift("left-lift", 425, 610, 160, "blue-lever", 80),
      lift("right-lift", 650, 565, 180, "pink-lever", 74),
    ],
    hazards: [
      pool("pink", 20, 340, 50),
      pool("pink", 80, 610, 48),
      pool("pink", 690, 610, 45),
      pool("blue", 315, 610, 35),
      pool("blue", 980, 405, 40),
      pool("spikes", 515, 610, 35),
    ],
    collectibles: [
      gem("wika", 145, 160),
      gem("wika", 300, 340),
      gem("wika", 585, 340),
      gem("wika", 1030, 180),
      gem("wika", 1100, 465),
      gem("michal", 1060, 180),
      gem("michal", 145, 340),
      gem("michal", 170, 610),
      gem("michal", 655, 340),
      gem("michal", 685, 180),
    ],
    doors: [
      door("wika", 28, 160, "pink-lever"),
      door("michal", 1080, 180, "blue-lever"),
    ],
  },
];
