import type { StepUsage } from "../contracts/step-usage-schema.ts";

export type AgentFailure =
  "refusal" | "cut_off" | "invalid_output" | "timeout" | "api";

/** A model call that gave no valid answer. `transient` failures get one retry. */
export class AgentCallError extends Error {
  readonly failure: AgentFailure;
  readonly transient: boolean;
  readonly usage: StepUsage | null;

  constructor(
    failure: AgentFailure,
    message: string,
    {
      transient,
      usage = null,
    }: { transient: boolean; usage?: StepUsage | null },
  ) {
    super(message);
    this.name = "AgentCallError";
    this.failure = failure;
    this.transient = transient;
    this.usage = usage;
  }
}
