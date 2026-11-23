import type { StepUsage } from "../contracts/step-usage-schema.ts";

/** A step that failed after it built its input: the minutes keep what it saw. */
export class StepFailure extends Error {
  readonly input: unknown;
  readonly usage: StepUsage | null;
  readonly model: string | null;

  constructor(
    message: string,
    {
      input,
      usage = null,
      model = null,
    }: { input: unknown; usage?: StepUsage | null; model?: string | null },
  ) {
    super(message);
    this.name = "StepFailure";
    this.input = input;
    this.usage = usage;
    this.model = model;
  }
}

/** Too little time is left before the deadline to start the step; a later call runs it. */
export class DeadlineReached extends Error {
  constructor(key: string) {
    super(`Too little time is left to start ${key}.`);
    this.name = "DeadlineReached";
  }
}
