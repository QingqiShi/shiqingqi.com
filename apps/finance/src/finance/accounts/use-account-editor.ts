import { t } from "@tuja/i18n";
import { useToast } from "@tuja/ui/components/toast-provider";
import { useState, type SubmitEvent } from "react";
import { institutionFieldsAfter } from "../domain/accounts/institution-fields-after.ts";
import { isPickableAccount } from "../domain/accounts/is-pickable-account.ts";
import { parseInstitutionDomain } from "../domain/accounts/parse-institution-domain.ts";
import {
  sideOfKind,
  type AccountKind,
} from "../domain/accounts/side-of-kind.ts";
import { parseMoney } from "../domain/money/parse-money.ts";
import { minorUnitsToDecimalString } from "../domain/money/to-minor-units.ts";
import { isSupportedCurrency } from "../exchange-rates/supported-currencies.ts";
import { useReplicaStore } from "../replica/use-replica-store.ts";
import { useReplica } from "../replica/use-replica.ts";
import { nextPosition } from "../settings/next-position.ts";
import { useUndoableMutations } from "../shell/use-undoable-mutations.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import type { AccountRow } from "../sync/row-schemas.ts";
import { useBaseCurrency } from "./use-base-currency.ts";
import { useHouseholdToday } from "./use-household-today.ts";
import { valuationInputSign } from "./valuation-input-sign.ts";

interface AccountEditorOptions {
  account: AccountRow | null;
  onDone: () => void;
  onDeleted?: () => void;
}

function dayText(value: number | null) {
  return value === null ? "" : String(value);
}

export function useAccountEditor({
  account,
  onDone,
  onDeleted,
}: AccountEditorOptions) {
  const store = useReplicaStore();
  const showToast = useToast();
  const runUndoable = useUndoableMutations();
  const today = useHouseholdToday();
  const groups = useReplica(liveRowSelectors.accountGroups);
  const accounts = useReplica(liveRowSelectors.accounts);
  const baseCurrency = useBaseCurrency();

  const [name, setName] = useState(account?.name ?? "");
  const [institution, setInstitution] = useState(account?.institution ?? "");
  const [domain, setDomain] = useState(account?.institutionDomain ?? "");
  const guessedDomain = account
    ? {
        ...account,
        ...institutionFieldsAfter(account, { institution: institution.trim() }),
      }.guessedInstitutionDomain
    : null;
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? "cash");
  const [groupId, setGroupId] = useState(account?.groupId ?? "");
  const [ownerId, setOwnerId] = useState(account?.ownerMemberId ?? "");
  const [currency, setCurrency] = useState(account?.currency ?? baseCurrency);
  const [creditLimit, setCreditLimit] = useState(() =>
    account?.creditLimitMinor == null
      ? ""
      : minorUnitsToDecimalString(account.creditLimitMinor, account.currency),
  );
  const [statementDay, setStatementDay] = useState(() =>
    dayText(account?.statementDay ?? null),
  );
  const [dueDay, setDueDay] = useState(() =>
    dayText(account?.paymentDueDay ?? null),
  );
  const [excluded, setExcluded] = useState(
    account?.excludedFromNetWorth ?? false,
  );
  const [closed, setClosed] = useState(account?.closedOn != null);
  const [closedOn, setClosedOn] = useState(account?.closedOn ?? today);
  const [opening, setOpening] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState(
    account?.defaultPaymentAccountId ?? "",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const side = sideOfKind(kind);
  const groupOptions = groups.filter((group) => group.side === side);
  const resolvedGroupId = groupOptions.some((group) => group.id === groupId)
    ? groupId
    : (groupOptions[0]?.id ?? "");

  const messages = {
    name: t({ en: "Give the account a name", zh: "请填写账户名称" }),
    group: t({
      en: "Create a group for this side of the balance sheet first",
      zh: "请先在资产负债表的这一侧创建分组",
    }),
    currency: t({
      en: "Choose a currency from the list",
      zh: "请从列表中选择币种",
    }),
    amount: t({ en: "Enter an amount", zh: "请输入金额" }),
    day: t({ en: "Enter a day from 1 to 31", zh: "请输入 1 到 31 之间的日期" }),
    domain: t({
      en: "Enter a website such as barclays.co.uk",
      zh: "请输入网站，例如 barclays.co.uk",
    }),
    failed: t({
      en: "The account did not save. Try again.",
      zh: "账户未能保存，请重试。",
    }),
    saved: t({ en: "Account saved", zh: "账户已保存" }),
    deleted: t({ en: "Account deleted", zh: "账户已删除" }),
    deleteFailed: t({
      en: "The account still has history, so it was not deleted. Close it instead.",
      zh: "该账户仍有历史记录，无法删除。请改为关闭。",
    }),
  };

  function readDay(text: string, key: string, found: Record<string, string>) {
    if (text.trim() === "") return null;
    const value = Number(text);
    if (!Number.isInteger(value) || value < 1 || value > 31) {
      found[key] = messages.day;
      return null;
    }
    return value;
  }

  function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: Record<string, string> = {};
    const code = currency.trim().toUpperCase();
    if (name.trim() === "") found.name = messages.name;
    if (resolvedGroupId === "") found.group = messages.group;
    if (
      code !== account?.currency &&
      code !== baseCurrency &&
      !isSupportedCurrency(code)
    ) {
      found.currency = messages.currency;
    }
    const isCredit = kind === "credit";
    const limit =
      isCredit && creditLimit.trim() !== ""
        ? parseMoney(creditLimit, code)
        : null;
    if (isCredit && creditLimit.trim() !== "" && limit === null) {
      found.creditLimit = messages.amount;
    }
    const statement = isCredit
      ? readDay(statementDay, "statementDay", found)
      : null;
    const due = isCredit ? readDay(dueDay, "dueDay", found) : null;
    const institutionDomain = parseInstitutionDomain(domain);
    if (domain.trim() !== "" && institutionDomain === null) {
      found.domain = messages.domain;
    }
    const openingMinor =
      opening.trim() === "" ? null : parseMoney(opening, code);
    if (opening.trim() !== "" && openingMinor === null)
      found.opening = messages.amount;
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const fields = {
      name: name.trim(),
      institution: institution.trim(),
      institutionDomain,
      kind,
      groupId: resolvedGroupId,
      ownerMemberId: ownerId === "" ? null : ownerId,
      currency: code,
      creditLimitMinor: limit === null ? null : Math.abs(limit),
      statementDay: statement,
      paymentDueDay: due,
      defaultPaymentAccountId:
        isCredit && paymentAccountId !== "" ? paymentAccountId : null,
      excludedFromNetWorth: excluded,
      closedOn: closed ? closedOn : null,
    };
    const opensWithValue = openingMinor !== null && openingMinor !== 0;
    try {
      if (account) {
        store.applyLocal({
          name: "upsertAccount",
          args: { id: account.id, ...fields },
        });
      } else {
        const id = crypto.randomUUID();
        const position = nextPosition(
          accounts.filter((other) => other.groupId === resolvedGroupId),
        );
        store.applyLocal({
          name: "upsertAccount",
          args: { id, ...fields, position },
        });
        if (opensWithValue) {
          store.applyLocal({
            name: "putValuation",
            args: {
              id: crypto.randomUUID(),
              accountId: id,
              on: today,
              amountMinor: openingMinor * valuationInputSign(kind),
            },
          });
        }
      }
    } catch {
      showToast({ message: messages.failed });
      return;
    }
    showToast({ message: messages.saved, durationMs: 4000 });
    onDone();
  }

  function remove() {
    if (!account) return;
    try {
      runUndoable(
        [{ name: "upsertAccount", args: { id: account.id, deleted: true } }],
        { message: messages.deleted },
      );
    } catch {
      showToast({ message: messages.deleteFailed });
      return;
    }
    onDone();
    onDeleted?.();
  }

  const paymentOptions = accounts.filter(
    (other) =>
      other.kind === "cash" &&
      other.id !== account?.id &&
      isPickableAccount(other),
  );

  return {
    baseCurrency,
    name,
    setName,
    institution,
    setInstitution,
    domain,
    setDomain,
    guessedDomain,
    kind,
    setKind,
    setGroupId,
    ownerId,
    setOwnerId,
    currency,
    setCurrency,
    creditLimit,
    setCreditLimit,
    statementDay,
    setStatementDay,
    dueDay,
    setDueDay,
    excluded,
    setExcluded,
    closed,
    setClosed,
    closedOn,
    setClosedOn,
    opening,
    setOpening,
    paymentAccountId,
    setPaymentAccountId,
    errors,
    side,
    groupOptions,
    resolvedGroupId,
    paymentOptions,
    save,
    remove,
  };
}
