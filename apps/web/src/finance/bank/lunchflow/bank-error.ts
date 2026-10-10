import type { BankErrorKind } from "./types.ts";

/** A bank provider call that failed after any retries. */
export class BankError extends Error {
  readonly kind: BankErrorKind;
  readonly status: number | undefined;

  constructor(kind: BankErrorKind, message: string = kind, status?: number) {
    super(message);
    this.name = "BankError";
    this.kind = kind;
    this.status = status;
  }
}
