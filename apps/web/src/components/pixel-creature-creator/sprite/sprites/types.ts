/**
 * Creature type definitions. Phase 2: types now carry an `accentColor` so
 * the upcoming review-screen card can theme itself per-type without
 * looking up palettes.
 */

// Leaf type — verdant, gentle.
export const leafType = {
  id: "leaf",
  label: { en: "Leaf", zh: "叶系" },
  accentColor: "#7eb86b",
};

// Dawn type — radiant morning warmth.
export const dawnType = {
  id: "dawn",
  label: { en: "Dawn", zh: "黎明系" },
  accentColor: "#f08a72",
};

// Dust type — earthy, grounded.
export const dustType = {
  id: "dust",
  label: { en: "Dust", zh: "尘土系" },
  accentColor: "#a07a52",
};

// Ember type — fiery, restless.
export const emberType = {
  id: "ember",
  label: { en: "Ember", zh: "余烬系" },
  accentColor: "#e85d3a",
};

// Frost type — chilly, crystalline.
export const frostType = {
  id: "frost",
  label: { en: "Frost", zh: "霜冻系" },
  accentColor: "#b4d8e8",
};

// Glow type — luminous, ethereal.
export const glowType = {
  id: "glow",
  label: { en: "Glow", zh: "微光系" },
  accentColor: "#ffce5e",
};

// Tide type — coastal, fluid.
export const tideType = {
  id: "tide",
  label: { en: "Tide", zh: "潮汐系" },
  accentColor: "#5aa9c8",
};

// Void type — shadowy, mysterious.
export const voidType = {
  id: "void",
  label: { en: "Void", zh: "虚空系" },
  accentColor: "#3a2a3f",
};
