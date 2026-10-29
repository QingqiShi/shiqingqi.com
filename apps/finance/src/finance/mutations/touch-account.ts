import type { MutationScope } from "./types.ts";

export function touchAccount(
  scope: MutationScope,
  accountId: string,
  day: string,
) {
  const previous = scope.touched.get(accountId);
  if (previous === undefined || day < previous) {
    scope.touched.set(accountId, day);
  }
}
