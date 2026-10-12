import type { InstructionChange } from "./types.ts";

/** The index of the line of `instructions` that is `target` once both are trimmed, or -1. */
export function findInstructionLine(
  instructions: string,
  target: string | null,
) {
  const wanted = target?.trim();
  if (!wanted) return -1;
  return instructions.split("\n").findIndex((line) => line.trim() === wanted);
}

/**
 * The instructions with `change` made: the line it replaces changed, or the
 * new line added at the end when that line is gone.
 */
export function applyInstructionChange(
  instructions: string,
  change: InstructionChange,
) {
  const line = change.line.trim();
  const index = findInstructionLine(instructions, change.replaces);
  if (index !== -1) {
    const lines = instructions.split("\n");
    lines[index] = line;
    return lines.join("\n").trim();
  }
  const kept = instructions.trimEnd();
  return kept === "" ? line : `${kept}\n${line}`;
}
