import type { BankErrorKind } from "./types.ts";

/** A bank provider call that failed after any retries. */
export class BankError extends Error {
  readonly kind: BankErrorKind;

  constructor(kind: BankErrorKind, message: string = kind) {
    super(message);
    this.name = "BankError";
    this.kind = kind;
  }
}
