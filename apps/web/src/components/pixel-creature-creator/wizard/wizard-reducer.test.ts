import { describe, expect, it } from "vitest";
import { DEFAULT_CREATURE } from "../state/creature-schema";
import {
  type WizardState,
  type WizardStep,
  createInitialWizardState,
  wizardReducer,
} from "./wizard-reducer";

function visited(state: WizardState): WizardStep[] {
  return [...state.visitedSteps].sort((a, b) => a - b);
}

describe("wizardReducer — SET_DEF", () => {
  it("replaces the def in place without changing step or visited steps", () => {
    const initial = createInitialWizardState(DEFAULT_CREATURE);
    const nextDef = { ...DEFAULT_CREATURE, name: "Mochi" };
    const next = wizardReducer(initial, { type: "SET_DEF", def: nextDef });
    expect(next.def).toEqual(nextDef);
    expect(next.step).toBe(1);
    expect(visited(next)).toEqual([1]);
  });
});

describe("wizardReducer — GOTO_STEP", () => {
  it("succeeds when the target step has been visited", () => {
    const initial = createInitialWizardState(
      DEFAULT_CREATURE,
      new Set<WizardStep>([1, 2, 3]),
    );
    const next = wizardReducer(initial, { type: "GOTO_STEP", step: 3 });
    expect(next.step).toBe(3);
  });

  it("rejects unvisited steps and returns the same state", () => {
    const initial = createInitialWizardState(DEFAULT_CREATURE);
    const next = wizardReducer(initial, { type: "GOTO_STEP", step: 4 });
    expect(next).toBe(initial);
    expect(next.step).toBe(1);
  });

  it("returns the same state when navigating to the active step", () => {
    const initial = createInitialWizardState(DEFAULT_CREATURE);
    const next = wizardReducer(initial, { type: "GOTO_STEP", step: 1 });
    expect(next).toBe(initial);
  });
});

describe("wizardReducer — NEXT", () => {
  it("advances by one and adds the destination to visited steps", () => {
    const initial = createInitialWizardState(DEFAULT_CREATURE);
    const next = wizardReducer(initial, { type: "NEXT" });
    expect(next.step).toBe(2);
    expect(visited(next)).toEqual([1, 2]);
  });

  it("walks all four steps in sequence", () => {
    let state = createInitialWizardState(DEFAULT_CREATURE);
    for (let target: WizardStep = 2; target <= 4; target += 1) {
      state = wizardReducer(state, { type: "NEXT" });
      expect(state.step).toBe(target);
    }
    expect(visited(state)).toEqual([1, 2, 3, 4]);
  });

  it("stays at step 4 when NEXT is dispatched on the final step", () => {
    let state = createInitialWizardState(DEFAULT_CREATURE);
    for (let i = 0; i < 3; i += 1) {
      state = wizardReducer(state, { type: "NEXT" });
    }
    expect(state.step).toBe(4);
    const after = wizardReducer(state, { type: "NEXT" });
    expect(after).toBe(state);
  });
});

describe("wizardReducer — BACK", () => {
  it("decreases by one without removing visited entries", () => {
    let state = createInitialWizardState(DEFAULT_CREATURE);
    state = wizardReducer(state, { type: "NEXT" });
    state = wizardReducer(state, { type: "NEXT" });
    expect(state.step).toBe(3);
    const back = wizardReducer(state, { type: "BACK" });
    expect(back.step).toBe(2);
    expect(visited(back)).toEqual([1, 2, 3]);
  });

  it("stays at step 1 when BACK is dispatched on the first step", () => {
    const initial = createInitialWizardState(DEFAULT_CREATURE);
    const next = wizardReducer(initial, { type: "BACK" });
    expect(next).toBe(initial);
  });
});

describe("wizardReducer — SHUFFLE", () => {
  it("returns a fresh state at step 1 with only step 1 visited", () => {
    let state = createInitialWizardState(DEFAULT_CREATURE);
    state = wizardReducer(state, { type: "NEXT" });
    state = wizardReducer(state, { type: "NEXT" });
    const shuffled = { ...DEFAULT_CREATURE, name: "Shuffled" };
    const next = wizardReducer(state, { type: "SHUFFLE", def: shuffled });
    expect(next.def).toEqual(shuffled);
    expect(next.step).toBe(1);
    expect(visited(next)).toEqual([1]);
  });
});

describe("wizardReducer — RESET", () => {
  it("resets def, step, and visited steps", () => {
    let state = createInitialWizardState(DEFAULT_CREATURE);
    state = wizardReducer(state, { type: "NEXT" });
    state = wizardReducer(state, { type: "NEXT" });
    state = wizardReducer(state, {
      type: "SET_DEF",
      def: { ...DEFAULT_CREATURE, name: "stale" },
    });
    const fresh = { ...DEFAULT_CREATURE, name: "fresh" };
    const next = wizardReducer(state, { type: "RESET", def: fresh });
    expect(next.def).toEqual(fresh);
    expect(next.step).toBe(1);
    expect(visited(next)).toEqual([1]);
  });
});

describe("wizardReducer — BOOTSTRAP_DEEP_LINK", () => {
  it("seeds the deep-linked def with every step visited", () => {
    const initial = createInitialWizardState(DEFAULT_CREATURE);
    const def = { ...DEFAULT_CREATURE, name: "Linked" };
    const next = wizardReducer(initial, {
      type: "BOOTSTRAP_DEEP_LINK",
      def,
    });
    expect(next.def).toEqual(def);
    expect(next.step).toBe(1);
    expect(visited(next)).toEqual([1, 2, 3, 4]);
  });
});

describe("wizardReducer — initial state helper", () => {
  it("seeds visitedSteps with {1} by default", () => {
    const state = createInitialWizardState(DEFAULT_CREATURE);
    expect(state.step).toBe(1);
    expect(visited(state)).toEqual([1]);
  });

  it("accepts a pre-populated visitedSteps set (deep-link case)", () => {
    const all = new Set<WizardStep>([1, 2, 3, 4]);
    const state = createInitialWizardState(DEFAULT_CREATURE, all);
    expect(visited(state)).toEqual([1, 2, 3, 4]);
  });
});
