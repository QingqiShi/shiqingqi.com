import { parseDay } from "../../domain/dates/to-epoch-day.ts";
import {
  assignGroup,
  GROUP_SEEDS,
  isPropertyAccount,
  type AccountKind,
  type GroupKey,
} from "./assign-group.ts";
import { coreDataDay } from "./core-data-day.ts";
import type { Rounder } from "./create-rounder.ts";
import { importId } from "./import-id.ts";
import { splitOwnerPrefix } from "./split-owner-prefix.ts";
import { SUB_ACCOUNT_ENTITY } from "./sub-account-entity.ts";
import type { AccountGroupRow, AccountRow } from "./types.ts";
import type { MapOptions } from "./types.ts";
import type { SourceAccount, SourceData, SourceSubAccount } from "./types.ts";

const UNNAMED_POT = "未命名的储蓄账户";

const ASSET_TYPE_ORDER = [
  "Savings Account",
  "Investment Account",
  "Credit Account",
  "Recoverable Account",
  "Repayable Account",
];

export interface MappedAccounts {
  groups: AccountGroupRow[];
  accounts: AccountRow[];
  /** Balance-holding sub-account id → account id. */
  accountIdBySubAccount: Map<string, string>;
  /** Recoverable or repayable account pk → account id. */
  accountIdByLedgerAccountPk: Map<number, string>;
  /** Recoverable or repayable account source id → account id. */
  accountIdByLedgerAccountId: Map<string, string>;
  /** Account ids that MoneyThings marks as no longer used. */
  closedAccountIds: Set<string>;
  /** Ledger account ids of the recoverable kind. */
  receivableAccountIds: Set<string>;
}

function kindOf(
  sub: SourceSubAccount,
  parent: SourceAccount,
  options: MapOptions,
): AccountKind {
  switch (sub.entity) {
    case SUB_ACCOUNT_ENTITY.savings:
      return "cash";
    case SUB_ACCOUNT_ENTITY.credit:
      return "credit";
    case SUB_ACCOUNT_ENTITY.investment:
      return isPropertyAccount(parent.name, options.groupOverrides)
        ? "property"
        : "investment";
    default:
      throw new Error(`Sub-account ${sub.id} is not a balance holder`);
  }
}

function dayOfMonth(seconds: number | null, timeZone: string) {
  return seconds === null
    ? null
    : parseDay(coreDataDay(seconds, timeZone)).dayOfMonth;
}

export function isBalanceHolder(sub: SourceSubAccount) {
  return (
    sub.entity === SUB_ACCOUNT_ENTITY.savings ||
    sub.entity === SUB_ACCOUNT_ENTITY.credit ||
    sub.entity === SUB_ACCOUNT_ENTITY.investment
  );
}

export function isLedgerAccount(account: SourceAccount) {
  return (
    account.assetType === "Recoverable Account" ||
    account.assetType === "Repayable Account"
  );
}

/**
 * Accounts from MoneyThings sub-accounts (a balance holder each) and from
 * recoverable and repayable accounts (one ledger each). `closedOn` is left
 * null here: it needs the account's last activity.
 */
export function mapAccounts(
  source: SourceData,
  options: MapOptions,
  rounder: Rounder,
): MappedAccounts {
  const groupId = (key: GroupKey) => importId("group", key);
  const groups: AccountGroupRow[] = GROUP_SEEDS.map((seed, position) => ({
    id: groupId(seed.key),
    householdId: options.householdId,
    name: seed.name,
    side: seed.side,
    position,
    version: 0,
  }));

  const parents = new Map(source.accounts.map((a) => [a.pk, a]));
  const ownerId = (name: string) => {
    const { owner } = splitOwnerPrefix(name);
    return owner ? options.memberIds[owner] : null;
  };

  interface Draft {
    row: AccountRow;
    group: GroupKey;
    sortKey: number[];
  }
  const drafts: Draft[] = [];
  const result: MappedAccounts = {
    groups,
    accounts: [],
    accountIdBySubAccount: new Map(),
    accountIdByLedgerAccountPk: new Map(),
    accountIdByLedgerAccountId: new Map(),
    closedAccountIds: new Set(),
    receivableAccountIds: new Set(),
  };

  for (const sub of source.subAccounts) {
    if (!isBalanceHolder(sub)) continue;
    const parent = parents.get(sub.accountPk);
    if (!parent) throw new Error(`Sub-account ${sub.id} has no account`);
    const id = importId("account", sub.id);
    const kind = kindOf(sub, parent, options);
    const parentName = splitOwnerPrefix(parent.name).name;
    const subName = sub.name?.trim() ?? "";
    const isCredit = kind === "credit";
    drafts.push({
      group: assignGroup(parent.name, kind, options.groupOverrides),
      sortKey: [
        ASSET_TYPE_ORDER.indexOf(parent.assetType),
        parent.order,
        sub.order,
        sub.pk,
      ],
      row: {
        id,
        householdId: options.householdId,
        groupId: "",
        ownerMemberId: ownerId(parent.name),
        name:
          subName === "" || subName === UNNAMED_POT
            ? parentName
            : splitOwnerPrefix(subName).name,
        institution: parentName,
        kind,
        currency: sub.currency,
        excludedFromNetWorth: parent.notCounted || sub.notCounted,
        closedOn: null,
        creditLimitMinor:
          isCredit && sub.creditLimit !== null
            ? rounder.toMinor(sub.creditLimit, sub.currency, {
                table: "accounts",
                id,
              })
            : null,
        statementDay: isCredit
          ? dayOfMonth(sub.statementDate, options.timeZone)
          : null,
        paymentDueDay: isCredit
          ? dayOfMonth(sub.paymentDueDate, options.timeZone)
          : null,
        defaultPaymentAccountId: null,
        version: 0,
      },
    });
    result.accountIdBySubAccount.set(sub.id, id);
    if (parent.noLongerUsed || sub.noLongerUsed) {
      result.closedAccountIds.add(id);
    }
  }

  for (const parent of source.accounts) {
    if (!isLedgerAccount(parent)) continue;
    const id = importId("account", parent.id);
    const kind =
      parent.assetType === "Recoverable Account" ? "receivable" : "loan";
    drafts.push({
      group: assignGroup(parent.name, kind, options.groupOverrides),
      sortKey: [
        ASSET_TYPE_ORDER.indexOf(parent.assetType),
        parent.order,
        0,
        parent.pk,
      ],
      row: {
        id,
        householdId: options.householdId,
        groupId: "",
        ownerMemberId: ownerId(parent.name),
        name: splitOwnerPrefix(parent.name).name,
        institution: "",
        kind,
        currency: options.baseCurrency,
        excludedFromNetWorth: parent.notCounted,
        closedOn: null,
        version: 0,
      },
    });
    result.accountIdByLedgerAccountPk.set(parent.pk, id);
    result.accountIdByLedgerAccountId.set(parent.id, id);
    if (parent.noLongerUsed) result.closedAccountIds.add(id);
    if (kind === "receivable") result.receivableAccountIds.add(id);
  }

  const compare = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
  };
  drafts.sort((a, b) => compare(a.sortKey, b.sortKey));
  const positions = new Map<GroupKey, number>();
  for (const { row, group } of drafts) {
    const position = positions.get(group) ?? 0;
    positions.set(group, position + 1);
    result.accounts.push({ ...row, groupId: groupId(group), position });
  }

  for (const sub of source.subAccounts) {
    if (!isBalanceHolder(sub) || sub.paymentSubAccountId === null) continue;
    const account = result.accounts.find(
      (a) => a.id === result.accountIdBySubAccount.get(sub.id),
    );
    const payment = result.accountIdBySubAccount.get(sub.paymentSubAccountId);
    if (account?.kind === "credit" && payment) {
      account.defaultPaymentAccountId = payment;
    }
  }

  return result;
}
