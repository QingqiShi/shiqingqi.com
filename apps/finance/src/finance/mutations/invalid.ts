import { MutationError } from "../sync/mutation-error.ts";

export function invalid(message: string): never {
  throw new MutationError("invalid", message);
}
