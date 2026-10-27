import type { ReplicaSnapshot } from "../replica/types.ts";
import type { MutationName } from "../sync/mutation-schema.ts";
import { accountMutations } from "./account-mutations.ts";
import { ruleMutations } from "./rule-mutations.ts";
import { taxonomyMutations } from "./taxonomy-mutations.ts";
import { transactionMutations } from "./transaction-mutations.ts";
import type {
  MutationArgs,
  MutationDraft,
  MutationScope,
  MutationSpecs,
} from "./types.ts";

const MUTATION_SPECS: MutationSpecs = {
  ...transactionMutations,
  ...accountMutations,
  ...taxonomyMutations,
  ...ruleMutations,
};

/** The reads, apply and inverse of the mutation that `call` names, bound to its args. */
export function bindMutation<Name extends MutationName>(call: {
  name: Name;
  args: MutationArgs<Name>;
}) {
  const spec = MUTATION_SPECS[call.name];
  return {
    reads: spec.reads.map(
      (stage) => (draft: MutationDraft) => stage(call.args, draft),
    ),
    apply: (scope: MutationScope) => {
      spec.apply(scope, call.args);
    },
    inverse: (snapshot: ReplicaSnapshot, createId: () => string) =>
      spec.inverse(snapshot, call.args, createId),
  };
}
