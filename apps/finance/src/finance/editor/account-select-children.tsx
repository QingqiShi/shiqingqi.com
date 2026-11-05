import { isPickableAccount } from "../domain/accounts/is-pickable-account.ts";
import type { AccountRow } from "../sync/row-schemas.ts";
import type { EditorDraft } from "./editor-draft.ts";
import type { EditorData } from "./use-editor-data.ts";

export function accountSelectChildren(
  data: EditorData,
  draft: EditorDraft,
  keep: (candidate: AccountRow) => boolean,
) {
  const accountChoices = data.accounts.filter(
    (candidate) =>
      isPickableAccount(candidate) ||
      candidate.id === draft.accountId ||
      candidate.id === draft.toAccountId,
  );
  const accountOptions = data.accountGroups
    .map((group) => ({
      group,
      accounts: accountChoices.filter(
        (candidate) => candidate.groupId === group.id,
      ),
    }))
    .filter((entry) => entry.accounts.length > 0);
  return accountOptions
    .map(({ group, accounts }) => ({
      group,
      accounts: accounts.filter(keep),
    }))
    .filter(({ accounts }) => accounts.length > 0)
    .map(({ group, accounts }) => (
      <optgroup key={group.id} label={group.name}>
        {accounts.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {data.lookups.accountLabelById.get(candidate.id) ?? candidate.name}
          </option>
        ))}
      </optgroup>
    ));
}
