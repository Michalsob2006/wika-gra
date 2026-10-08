const LEGACY_KEY = "wiki-anniversary-v1",
  MAIN_KEY = "wiki-anniversary-main-v2",
  BONUS_KEY = "wiki-anniversary-bonus-v1",
  MEMORY_KEY = "wiki-anniversary-memory-v1";
export const mainGameIds = [
  "catcher",
  "maze",
  "runner",
  "memory",
  "snake",
  "quest",
];
export const bonusGameIds = ["duo"];
export const gameIds = [...mainGameIds, "duo"];
const readArray = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
};
const normalizeMain = (ids) => {
  const main = [...new Set(ids.filter((id) => mainGameIds.includes(id)))],
    prerequisites = mainGameIds.filter((id) => id !== "quest");
  return main.includes("quest") &&
    prerequisites.some((id) => !main.includes(id))
    ? main.filter((id) => id !== "quest")
    : main;
};
export function readProgress() {
  try {
    const legacy = readArray(LEGACY_KEY) || [],
      storedMain = readArray(MAIN_KEY),
      storedBonus = readArray(BONUS_KEY),
      rawMain = storedMain || legacy,
      main = normalizeMain(rawMain),
      bonus = (storedBonus || legacy).filter((id) => bonusGameIds.includes(id));
    if (
      !storedMain ||
      !storedBonus ||
      JSON.stringify(main) !==
        JSON.stringify([
          ...new Set(rawMain.filter((id) => mainGameIds.includes(id))),
        ])
    )
      saveProgress([...main, ...bonus]);
    if (!readArray(MEMORY_KEY))
      saveMemoryLevels(main.includes("memory") ? [1] : []);
    return [...new Set([...main, ...bonus])];
  } catch {
    return [];
  }
}
export function saveProgress(p) {
  try {
    const valid = [...new Set(p.filter((id) => gameIds.includes(id)))],
      main = normalizeMain(valid),
      bonus = valid.filter((id) => bonusGameIds.includes(id));
    localStorage.setItem(MAIN_KEY, JSON.stringify(main));
    localStorage.setItem(BONUS_KEY, JSON.stringify(bonus));
    // Keep the original key synchronized so older builds can still read saves.
    localStorage.setItem(LEGACY_KEY, JSON.stringify([...main, ...bonus]));
    return true;
  } catch {
    return false;
  }
}
export function questUnlocked(p) {
  return mainGameIds
    .filter((id) => id !== "quest")
    .every((id) => p.includes(id));
}

export function collectionComplete(p) {
  return mainGameIds.every((id) => p.includes(id));
}
export function readMemoryLevels() {
  const stored = readArray(MEMORY_KEY);
  if (stored) return stored.filter((level) => level === 1 || level === 2);
  const migrated = readProgress().includes("memory") ? [1] : [];
  saveMemoryLevels(migrated);
  return migrated;
}
export function saveMemoryLevels(levels) {
  try {
    localStorage.setItem(
      MEMORY_KEY,
      JSON.stringify([
        ...new Set(levels.filter((level) => [1, 2].includes(level))),
      ]),
    );
    return true;
  } catch {
    return false;
  }
}
