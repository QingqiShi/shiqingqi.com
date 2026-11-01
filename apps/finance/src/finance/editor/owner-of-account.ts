import type { EditorData } from "./use-editor-data.ts";

/** The active Member who owns `accountId`, who a new Transaction on it is for; null for a shared account. */
export function ownerOfAccount(
  data: Pick<EditorData, "lookups" | "members">,
  accountId: string | null,
): string | null {
  const owner =
    accountId === null
      ? null
      : (data.lookups.accountById.get(accountId)?.ownerMemberId ?? null);
  return owner !== null && data.members.some((member) => member.id === owner)
    ? owner
    : null;
}
