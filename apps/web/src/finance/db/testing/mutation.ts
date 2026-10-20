import { randomUUID } from "node:crypto";
import type {
  MutationInput,
  MutationName,
} from "../../sync/mutation-schema.ts";

export function mutation<Name extends MutationName>(
  name: Name,
  args: Extract<MutationInput, { name: Name }>["args"],
  id: string = randomUUID(),
) {
  return { id, name, args };
}
