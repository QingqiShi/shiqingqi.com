import type { Run, RunStep } from "../types.ts";

export interface PlannedStep {
  key: string;
  position: number;
  role: RunStep["role"];
}

const DAILY: PlannedStep[] = [
  { key: "data", position: 0, role: "system" },
  { key: "screen", position: 1, role: "system" },
  { key: "macro", position: 2, role: "strategist" },
  { key: "pm_draft", position: 100, role: "pm" },
  { key: "checks_draft", position: 101, role: "system" },
  { key: "risk_review", position: 102, role: "risk" },
  { key: "pm_final", position: 200, role: "pm" },
  { key: "checks_final", position: 201, role: "system" },
  { key: "risk_signoff", position: 202, role: "risk" },
  { key: "commit", position: 203, role: "system" },
];

const STRATEGY: PlannedStep[] = [
  { key: "data", position: 0, role: "system" },
  { key: "screen", position: 1, role: "system" },
  { key: "macro", position: 2, role: "strategist" },
  { key: "pm_strategy", position: 3, role: "pm" },
  { key: "risk_strategy", position: 4, role: "risk" },
  { key: "commit", position: 5, role: "system" },
];

function analystStep(symbol: string, index: number): PlannedStep {
  return { key: `analyst:${symbol}`, position: 10 + index, role: "analyst" };
}

function followUpStep(symbol: string, index: number): PlannedStep {
  return { key: `followup:${symbol}`, position: 103 + index, role: "analyst" };
}

/**
 * A step whose failure does not stop the meeting: the PM is told that the
 * note or the answer is missing. Once it has failed, it is never run again,
 * since a later step may already have read its absence.
 */
function isSoft(key: string): boolean {
  return key.startsWith("analyst:") || key.startsWith("followup:");
}

/** Steps that run at the same time: the analysts, or the review and the follow-ups. */
function groupOf(key: string): string {
  if (key.startsWith("analyst:")) return "analysts";
  if (key === "risk_review" || key.startsWith("followup:")) return "review";
  return key;
}

function symbolOf(key: string): string {
  return key.slice(key.indexOf(":") + 1);
}

/** The order of the steps of each kind of meeting, and how they group. */
export const stepPlan = {
  initial: (kind: Run["kind"]) => (kind === "daily" ? DAILY : STRATEGY),
  analystStep,
  followUpStep,
  isSoft,
  groupOf,
  symbolOf,
};
