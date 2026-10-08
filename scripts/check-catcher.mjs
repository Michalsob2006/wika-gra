import assert from "node:assert/strict";
import { makeCatcher, stepCatcher } from "../js/games/catcher-state.js";
for (const key of ["heart", "gift", "bouquet", "letter", "broken"]) {
  const s = makeCatcher();
  s.score = 5;
  s.items = [{ key, value: 1, x: 0, y: 500, w: 64, h: 64, speed: 1 }];
  const e = stepCatcher(s, 0.01);
  assert.equal(s.score, key === "broken" ? 5 : 4);
  assert.equal(s.items.length, 0);
  assert.equal(e.includes("miss"), key !== "broken");
  stepCatcher(s, 0.01);
  assert.equal(s.score, key === "broken" ? 5 : 4);
}
const zero = makeCatcher();
zero.items = [{ key: "heart", x: 0, y: 800, w: 64, h: 64, speed: 1 }];
stepCatcher(zero, 0.01);
assert.equal(zero.score, -1);
assert.ok(zero.feedback.length);
console.log(
  "Catcher: all missed good items -1 once, missed broken hearts neutral, signed scores and feedback.",
);

for (const [key, value] of [
  ["heart", 1],
  ["bouquet", 2],
  ["letter", 2],
  ["gift", 3],
  ["broken", -1],
]) {
  const s = makeCatcher();
  s.spawn = 100;
  s.score = -3;
  s.items = [
    { key, value, x: s.x + 25, y: s.height - 125, w: 64, h: 64, speed: 0 },
  ];
  stepCatcher(s, 0.01);
  assert.equal(s.score, -3 + value);
  stepCatcher(s, 0.01);
  assert.equal(s.score, -3 + value);
}
