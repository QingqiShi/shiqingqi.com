import type { RejectionReason } from "./types.ts";

/** A mutation the server rejects; the batch goes on without it. */
export class MutationError extends Error {
  readonly reason: RejectionReason;

  constructor(reason: RejectionReason, message: string = reason) {
    super(message);
    this.name = "MutationError";
    this.reason = reason;
  }
}
