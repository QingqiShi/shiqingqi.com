import type { CreatureDef } from "../state/creature-schema";

/**
 * Pure reducer for the 4-step Pixel Creature Creator wizard.
 *
 * Kept as a hand-rolled reducer (rather than calling `useReducer` inline)
 * so the same logic is exercised by tests without mounting React. The shell
 * uses `useReducer` to dispatch actions; step components themselves never
 * touch the reducer — they receive a `(def, onChange)` pair and stay pure.
 */

export const STEP_COUNT = 4;

export type WizardStep = 1 | 2 | 3 | 4;

export const WIZARD_STEPS: readonly WizardStep[] = [1, 2, 3, 4];

export interface WizardState {
  def: CreatureDef;
  step: WizardStep;
  // `Set` so the shell can ask "has the user reached step N?" in O(1)
  // when deciding which breadcrumb pills are clickable.
  visitedSteps: Set<WizardStep>;
}

export type WizardAction =
  | { type: "SET_DEF"; def: CreatureDef }
  | { type: "GOTO_STEP"; step: WizardStep }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "SHUFFLE"; def: CreatureDef }
  | { type: "RESET"; def: CreatureDef }
  | {
      // BOOTSTRAP_DEEP_LINK is the wizard host's reaction to a `#<hash>`
      // fragment on `/create`: drop in the decoded def and unlock every
      // step at once so the user can jump straight to whichever choice
      // they want to revise. Internal-only — step components never use it.
      type: "BOOTSTRAP_DEEP_LINK";
      def: CreatureDef;
    };

function isWizardStep(value: number): value is WizardStep {
  return value >= 1 && value <= STEP_COUNT && Number.isInteger(value);
}

function withVisited(
  visited: Set<WizardStep>,
  step: WizardStep,
): Set<WizardStep> {
  if (visited.has(step)) return visited;
  const next = new Set(visited);
  next.add(step);
  return next;
}

export function createInitialWizardState(
  def: CreatureDef,
  visitedSteps: ReadonlySet<WizardStep> = new Set([1]),
): WizardState {
  return {
    def,
    step: 1,
    visitedSteps: new Set(visitedSteps),
  };
}

export function wizardReducer(
  state: WizardState,
  action: WizardAction,
): WizardState {
  switch (action.type) {
    case "SET_DEF":
      // Pure replace — the step components decide whether the chosen def is
      // still valid for the active step. The reducer never validates the
      // shape; that happens at the schema boundary.
      return { ...state, def: action.def };

    case "GOTO_STEP": {
      // Only allow jumps to steps the user has already visited; anything
      // else is silently rejected so the breadcrumb pills can't be used to
      // skip past required choices.
      if (!state.visitedSteps.has(action.step)) return state;
      if (state.step === action.step) return state;
      return { ...state, step: action.step };
    }

    case "NEXT": {
      // Stay put on the final step — the shell's "Finish" button doesn't
      // dispatch NEXT, but we still treat NEXT-at-last as a no-op for safety.
      const candidate = state.step + 1;
      if (!isWizardStep(candidate)) return state;
      return {
        ...state,
        step: candidate,
        visitedSteps: withVisited(state.visitedSteps, candidate),
      };
    }

    case "BACK": {
      const candidate = state.step - 1;
      if (!isWizardStep(candidate)) return state;
      return { ...state, step: candidate };
    }

    case "SHUFFLE":
      // Shuffle resets the journey: a fresh def with only step 1 visited.
      return createInitialWizardState(action.def);

    case "RESET":
      return createInitialWizardState(action.def);

    case "BOOTSTRAP_DEEP_LINK":
      return createInitialWizardState(
        action.def,
        new Set<WizardStep>([1, 2, 3, 4]),
      );

    default:
      // Exhaustive switch over WizardAction — TypeScript catches new
      // variants at compile time. Returning `state` keeps the runtime safe
      // if a future caller forgets to update this switch.
      return state;
  }
}
