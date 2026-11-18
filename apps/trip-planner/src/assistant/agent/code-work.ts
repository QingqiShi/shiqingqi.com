/** What the code-execution tool did in a turn: it read a skill, or it ran code. */
export type CodeWork = "skill" | "code";

/** The code-execution tool, which runs on the model's side, and the one line that a turn shows for it. */
export const codeWork = {
  toolName: "code_execution",
  /** A skill is a folder under `/skills/` in the container, which the model reads with this tool. */
  of(input: unknown): CodeWork {
    const text =
      typeof input === "string" ? input : JSON.stringify(input ?? null);
    return text.includes("/skills/") ? "skill" : "code";
  },
  /** The one line of a turn: a skill read wins over a computation. */
  stronger(a: CodeWork, b: CodeWork): CodeWork {
    return a === "skill" || b === "skill" ? "skill" : "code";
  },
};
