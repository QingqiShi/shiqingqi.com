import { accountMutations } from "./account-mutations.ts";
import type { Mutation } from "./mutation-schema.ts";
import { ruleMutations } from "./rule-mutations.ts";
import { taxonomyMutations } from "./taxonomy-mutations.ts";
import { transactionMutations } from "./transaction-mutations.ts";
import type { WriteContext } from "./types.ts";

/** Applies one checked mutation inside an open write. Throws `MutationError` to reject it. */
export async function applyMutation(context: WriteContext, mutation: Mutation) {
  switch (mutation.name) {
    case "createTransaction": {
      return transactionMutations.create(context, mutation.args);
    }
    case "updateTransaction": {
      return transactionMutations.update(
        context,
        mutation.args.id,
        mutation.args.patch,
      );
    }
    case "deleteTransaction": {
      return transactionMutations.remove(context, mutation.args.id);
    }
    case "restoreTransaction": {
      return transactionMutations.restore(context, mutation.args.id);
    }
    case "confirmExpected": {
      return transactionMutations.confirmExpected(
        context,
        mutation.args.id,
        mutation.args.patch,
      );
    }
    case "skipExpected": {
      return transactionMutations.skipExpected(context, mutation.args.id);
    }
    case "putValuation": {
      return accountMutations.putValuation(context, mutation.args);
    }
    case "deleteValuation": {
      return accountMutations.deleteValuation(context, mutation.args.id);
    }
    case "upsertAccount": {
      return accountMutations.upsertAccount(context, mutation.args);
    }
    case "upsertGroup": {
      return accountMutations.upsertGroup(context, mutation.args);
    }
    case "setFxRate": {
      return accountMutations.setFxRate(context, mutation.args);
    }
    case "upsertCategory": {
      return taxonomyMutations.upsertCategory(context, mutation.args);
    }
    case "upsertPayee": {
      return taxonomyMutations.upsertPayee(context, mutation.args);
    }
    case "mergePayee": {
      return taxonomyMutations.mergePayee(context, mutation.args);
    }
    case "upsertTag": {
      return taxonomyMutations.upsertTag(context, mutation.args);
    }
    case "upsertMember": {
      return taxonomyMutations.upsertMember(context, mutation.args);
    }
    case "upsertRule": {
      return ruleMutations.upsertRule(context, mutation.args);
    }
  }
}
