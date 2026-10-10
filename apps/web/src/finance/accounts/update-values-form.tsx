"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Heading } from "@tuja/ui/components/heading";
import { Select } from "@tuja/ui/components/select";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type SubmitEvent,
} from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { sideOfKind } from "../domain/accounts/side-of-kind.ts";
import { accountBalanceAt } from "../domain/balance/net-worth-at.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import type { LocalMutationInput } from "../replica/create-replica-store.ts";
import { useReplica } from "../replica/use-replica.ts";
import { fillTemplate } from "../reports/fill-template.ts";
import { tabBarTokens } from "../shell/tab-bar.stylex.ts";
import { useToast } from "../shell/toast-provider.tsx";
import { useIsWideLayout } from "../shell/use-is-wide-layout.ts";
import { useUndoableMutations } from "../shell/use-undoable-mutations.ts";
import { selectBalanceSeriesByAccount } from "../store/select-balance-series-by-account.ts";
import { selectFxIndex } from "../store/select-fx-index.ts";
import { accountDetailLine } from "./account-detail-line.ts";
import type { AccountLine } from "./build-balance-sheet.ts";
import {
  buildFxRateMutations,
  fxRateText,
  type FxRateField,
} from "./build-fx-rate-mutations.ts";
import {
  buildValuationMutations,
  type ValuationField,
} from "./build-valuation-mutations.ts";
import { currencySymbol } from "./currency-symbol.ts";
import { DayChips } from "./day-chips.tsx";
import { formatPercentChange } from "./format-percent-change.ts";
import { formatValuationAge } from "./format-valuation-age.ts";
import { selectBalanceSheet } from "./select-balance-sheet.ts";
import { useBaseCurrency } from "./use-base-currency.ts";
import { useHouseholdToday } from "./use-household-today.ts";
import { useStoredIds } from "./use-stored-ids.ts";
import type { ValuationChange } from "./valuation-change.ts";
import {
  groupedDecimalText,
  valuationInputSign,
  valuationInputText,
} from "./valuation-input-sign.ts";
import { VALUATION_KINDS } from "./valuation-kinds.ts";

/**
 * "Update balances": every valuation-driven account, and any other the person
 * adds, as one field each in one form, plus the exchange rate of each
 * foreign currency among them. Enter moves to the next field; each field
 * shows its change as it is typed, a change of more than a quarter asks for
 * a second look, and "Save all" writes one Valuation per changed field with
 * one Undo for the lot.
 */
export function UpdateValuesForm() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const showToast = useToast();
  const runUndoable = useUndoableMutations();
  const isWide = useIsWideLayout();
  const today = useHouseholdToday();
  const baseCurrency = useBaseCurrency();
  const [day, setDay] = useState(today);
  const sheet = useReplica((snapshot) => selectBalanceSheet(snapshot, today));
  const seriesByAccount = useReplica(selectBalanceSeriesByAccount);
  const fx = useReplica(selectFxIndex);
  const [extraIds, setExtraIds] = useStoredIds("finance:update-values-extra");
  const [inputs, setInputs] = useState<ReadonlyMap<string, string>>(
    () => new Map(),
  );
  const [rateInputs, setRateInputs] = useState<ReadonlyMap<string, string>>(
    () => new Map(),
  );
  const [invalid, setInvalid] = useState<ReadonlySet<string>>(() => new Set());
  const [reviewing, setReviewing] = useState(false);
  const fieldsRef = useRef(new Map<string, HTMLInputElement>());
  const saveRef = useRef<HTMLButtonElement>(null);

  const isListed = (line: AccountLine) =>
    line.hidden === null &&
    (VALUATION_KINDS.has(line.account.kind) ||
      extraIds.includes(line.account.id));
  const sections = sheet.sections
    .map((section) => ({ ...section, lines: section.lines.filter(isListed) }))
    .filter((section) => section.lines.length > 0);
  const listed = sections.flatMap((section) => section.lines);
  const addable = sheet.sections
    .flatMap((section) => section.lines)
    .filter((line) => line.hidden === null && !isListed(line));
  const firstId = listed.at(0)?.account.id;

  useEffect(() => {
    if (isWide && firstId !== undefined) {
      fieldsRef.current.get(firstId)?.focus();
    }
  }, [isWide, firstId]);

  const fields: ValuationField[] = listed.map((line) => ({
    accountId: line.account.id,
    kind: line.account.kind,
    currency: line.account.currency,
    current: accountBalanceAt(
      line.account,
      seriesByAccount.get(line.account.id),
      day,
    ),
  }));
  const currentOf = new Map(
    fields.map((field) => [field.accountId, field.current]),
  );
  const rateFields: FxRateField[] = [
    ...new Set(
      listed
        .map((line) => line.account.currency)
        .filter((currency) => currency !== baseCurrency),
    ),
  ]
    .sort()
    .map((currency) => ({
      currency,
      current: fx.rateToBase(currency, toEpochDay(day)),
    }));
  const pending = buildValuationMutations(fields, inputs, day);
  const pendingRates = buildFxRateMutations(
    rateFields,
    rateInputs,
    baseCurrency,
    day,
  );
  const changed = pending.valuations.length + pendingRates.rates.length;
  const nameOf = (accountId: string) =>
    listed.find((line) => line.account.id === accountId)?.account.name ?? "";

  const notAmount = t({ en: "Enter an amount", zh: "请输入金额" });
  const notRate = t({
    en: "Enter a rate, such as 0.79",
    zh: "请输入汇率，例如 0.79",
  });
  const savedOne = t({ en: "1 balance updated", zh: "1 个余额已更新" });
  const savedMany = t({ en: "balances updated", zh: "个余额已更新" });
  const savedRates = t({ en: "Exchange rate updated", zh: "汇率已更新" });
  const nothing = t({ en: "No balance changed", zh: "没有余额变化" });
  const sentenceEnd = t({ en: ". ", zh: "。" });
  const listSeparator = t({ en: "; ", zh: "；" });
  const failed = t({
    en: "The balances did not save. Try again.",
    zh: "余额未能保存，请重试。",
  });
  const updatedLabel = t({ en: "Updated {age}", zh: "{age}更新" });
  const owedLabel = t({ en: "owed", zh: "欠款" });
  const removeLabel = t({ en: "Remove from this list:", zh: "从列表移除：" });
  const checkLabel = t({ en: "check this", zh: "请核对" });
  const rateLabel = t({
    en: "1 {currency} in {base}",
    zh: "1 {currency} 兑 {base}",
  });

  const backHref = pathname;

  function moveFrom(accountId: string, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const index = listed.findIndex((line) => line.account.id === accountId);
    const next = listed.at(index + 1);
    const target = next ? fieldsRef.current.get(next.account.id) : undefined;
    if (target) target.focus();
    else saveRef.current?.focus();
  }

  function changeText(
    change: ValuationChange,
    currency: string,
    current: number,
  ) {
    const amount = formatMoney(change.changeMinor, currency, locale, {
      signDisplay: "exceptZero",
    });
    const percent = formatPercentChange(change.changeMinor, current, locale);
    return percent === null ? amount : `${amount} · ${percent}`;
  }

  function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = buildValuationMutations(fields, inputs, day);
    const rates = buildFxRateMutations(
      rateFields,
      rateInputs,
      baseCurrency,
      day,
    );
    if (result.invalid.length > 0 || rates.invalid.length > 0) {
      setInvalid(new Set([...result.invalid, ...rates.invalid]));
      fieldsRef.current
        .get(result.invalid.at(0) ?? rates.invalid.at(0) ?? "")
        ?.focus();
      return;
    }
    if (result.large.length > 0 && !reviewing) {
      setReviewing(true);
      return;
    }
    const mutations: LocalMutationInput[] = [
      ...rates.rates.map((args): LocalMutationInput => ({
        name: "setFxRate",
        args,
      })),
      ...result.valuations.map((args): LocalMutationInput => ({
        name: "putValuation",
        args,
      })),
    ];
    const count = result.valuations.length;
    if (mutations.length === 0) {
      showToast({ message: nothing, durationMs: 4000 });
    } else {
      try {
        runUndoable(mutations, {
          message:
            count === 0
              ? savedRates
              : count === 1
                ? savedOne
                : `${new Intl.NumberFormat(locale).format(count)} ${savedMany}`,
        });
      } catch {
        showToast({ message: failed });
        return;
      }
    }
    router.push(backHref, { scroll: false });
  }

  return (
    <form onSubmit={save} css={[stack.group, styles.form]} noValidate>
      <div css={stack.tight}>
        <Heading level={1} look="h3">
          {t({ en: "Update balances", zh: "批量更新余额" })}
        </Heading>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "Type each balance as it is today. Fields you leave alone are skipped. Amounts owed are positive.",
            zh: "填写每个账户今天的余额。未改动的不会保存。欠款填正数。",
          })}
        </Text>
      </div>
      <DayChips value={day} today={today} onChange={setDay} />
      {sections.length === 0 ? (
        <Text look="bodySmall" tone="muted">
          {t({
            en: "No investment, property or loan accounts, and no money owed to you, yet. Add any account below.",
            zh: "还没有投资、房产、贷款或应收款账户。可在下方添加任意账户。",
          })}
        </Text>
      ) : null}
      {sections.map((section) => (
        <fieldset key={section.group.id} css={[stack.item, styles.fieldset]}>
          <legend css={[typeRole.label, styles.legend]}>
            {section.group.name}
          </legend>
          {section.lines.map((line) => {
            const { account } = line;
            const current = currentOf.get(account.id) ?? 0;
            const typed = inputs.get(account.id);
            const change = pending.changes.get(account.id);
            const isLiability = sideOfKind(account.kind) === "liability";
            const label = isLiability
              ? `${account.name} · ${owedLabel}`
              : account.name;
            const facts = [
              line.lastValuationOn === null
                ? ""
                : updatedLabel.replace(
                    "{age}",
                    formatValuationAge(line.lastValuationOn, today, locale),
                  ),
              accountDetailLine(account, line.ownerName),
            ].filter((fact) => fact !== "");
            const changeId = `change-${account.id}`;
            return (
              <div key={account.id} css={styles.field}>
                <div aria-hidden css={styles.fieldText}>
                  <span css={[typeRole.body, styles.fieldName]}>{label}</span>
                  <span css={[typeRole.caption, styles.fieldFacts]}>
                    {facts.join(" · ")}
                  </span>
                </div>
                <div css={styles.input}>
                  <TextField
                    ref={(element) => {
                      if (element) fieldsRef.current.set(account.id, element);
                      else fieldsRef.current.delete(account.id);
                    }}
                    label={label}
                    labelHidden
                    error={invalid.has(account.id) ? notAmount : undefined}
                    inputMode="decimal"
                    autoComplete="off"
                    enterKeyHint="next"
                    leading={currencySymbol(account.currency, locale)}
                    aria-describedby={change ? changeId : undefined}
                    value={
                      typed ??
                      valuationInputText(
                        current,
                        account.kind,
                        account.currency,
                      )
                    }
                    css={typeModifier.numeric}
                    onFocus={(event) => {
                      event.currentTarget.select();
                    }}
                    onBlur={() => {
                      const shown = pending.valuations.find(
                        (valuation) => valuation.accountId === account.id,
                      );
                      if (!shown) return;
                      const next = new Map(inputs);
                      next.set(
                        account.id,
                        groupedDecimalText(
                          shown.amountMinor * valuationInputSign(account.kind),
                          account.currency,
                        ),
                      );
                      setInputs(next);
                    }}
                    onKeyDown={(event) => {
                      moveFrom(account.id, event);
                    }}
                    onChange={(event) => {
                      const next = new Map(inputs);
                      next.set(account.id, event.target.value);
                      setInputs(next);
                      setReviewing(false);
                      if (invalid.has(account.id)) {
                        const rest = new Set(invalid);
                        rest.delete(account.id);
                        setInvalid(rest);
                      }
                    }}
                  />
                </div>
                <span
                  id={changeId}
                  css={[
                    typeRole.caption,
                    typeModifier.numeric,
                    styles.change,
                    change?.isLarge === true && styles.large,
                  ]}
                >
                  {change
                    ? changeText(
                        change,
                        account.currency,
                        current * valuationInputSign(account.kind),
                      ) + (change.isLarge ? ` · ${checkLabel}` : "")
                    : ""}
                </span>
                {extraIds.includes(account.id) ? (
                  <Button
                    size="sm"
                    look="ghost"
                    icon={<XIcon weight="bold" />}
                    aria-label={`${removeLabel} ${account.name}`}
                    css={styles.remove}
                    onClick={() => {
                      setExtraIds(extraIds.filter((id) => id !== account.id));
                    }}
                  />
                ) : null}
              </div>
            );
          })}
        </fieldset>
      ))}
      {rateFields.length > 0 ? (
        <fieldset css={[stack.item, styles.fieldset]}>
          <legend css={[typeRole.label, styles.legend]}>
            {t({ en: "Exchange rates", zh: "汇率" })}
          </legend>
          {rateFields.map((field) => (
            <div key={field.currency} css={styles.rate}>
              <TextField
                size="sm"
                label={fillTemplate(rateLabel, {
                  currency: field.currency,
                  base: baseCurrency,
                })}
                error={invalid.has(field.currency) ? notRate : undefined}
                inputMode="decimal"
                autoComplete="off"
                trailing={baseCurrency}
                value={
                  rateInputs.get(field.currency) ?? fxRateText(field.current)
                }
                css={typeModifier.numeric}
                onFocus={(event) => {
                  event.currentTarget.select();
                }}
                onChange={(event) => {
                  const next = new Map(rateInputs);
                  next.set(field.currency, event.target.value);
                  setRateInputs(next);
                  if (invalid.has(field.currency)) {
                    const rest = new Set(invalid);
                    rest.delete(field.currency);
                    setInvalid(rest);
                  }
                }}
              />
            </div>
          ))}
        </fieldset>
      ) : null}
      {addable.length > 0 ? (
        <Select
          size="sm"
          label={t({
            en: "Add an account to this list",
            zh: "将账户加入此列表",
          })}
          placeholder={t({ en: "Choose an account", zh: "选择账户" })}
          value=""
          options={addable.map((line) => ({
            value: line.account.id,
            label: [
              line.account.name,
              accountDetailLine(line.account, line.ownerName),
            ]
              .filter((part) => part !== "")
              .join(" · "),
          }))}
          onChange={(event) => {
            if (event.target.value)
              setExtraIds([...extraIds, event.target.value]);
          }}
        />
      ) : null}
      <div css={[stack.item, styles.actions]}>
        {reviewing ? (
          <Callout
            intent="warning"
            title={t({
              en: "Some balances changed a lot",
              zh: "部分余额变动较大",
            })}
          >
            {`${pending.large
              .map((accountId) => {
                const change = pending.changes.get(accountId);
                const field = fields.find(
                  (candidate) => candidate.accountId === accountId,
                );
                return change && field
                  ? `${nameOf(accountId)} ${changeText(
                      change,
                      field.currency,
                      field.current * valuationInputSign(field.kind),
                    )}`
                  : nameOf(accountId);
              })
              .join(listSeparator)}${sentenceEnd}${t({
              en: "Check for a typo, then save anyway.",
              zh: "请检查是否输错，确认后仍可保存。",
            })}`}
          </Callout>
        ) : null}
        <div css={cluster.tight}>
          <Button ref={saveRef} type="submit" look="primary">
            {reviewing
              ? t({ en: "Save anyway", zh: "仍然保存" })
              : changed === 0
                ? t({ en: "Save all", zh: "全部保存" })
                : `${t({ en: "Save all", zh: "全部保存" })} (${new Intl.NumberFormat(locale).format(changed)})`}
          </Button>
          <AnchorButton href={backHref} linkComponent={Link} look="ghost">
            {t({ en: "Cancel", zh: "取消" })}
          </AnchorButton>
        </div>
      </div>
    </form>
  );
}

const styles = stylex.create({
  form: {
    maxInlineSize: "44rem",
  },
  fieldset: {
    margin: 0,
    padding: 0,
    borderWidth: 0,
    minInlineSize: 0,
  },
  legend: {
    padding: 0,
    marginBlockEnd: rhythm.item,
    fontWeight: font.weight_6,
  },
  field: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 3fr) minmax(0, 2fr) auto",
      [breakpoints.md]: "minmax(0, 1fr) 11rem 9rem auto",
    },
    gridTemplateAreas: {
      default: '"text text text" "input change remove"',
      [breakpoints.md]: '"text input change remove"',
    },
    alignItems: "center",
    columnGap: rhythm.tight,
    rowGap: rhythm.inline,
  },
  fieldText: {
    gridArea: "text",
    display: "flex",
    flexDirection: "column",
    minInlineSize: 0,
  },
  fieldName: {
    fontWeight: font.weight_5,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  fieldFacts: {
    color: color.fgMuted,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  input: {
    gridArea: "input",
    minInlineSize: 0,
  },
  change: {
    gridArea: "change",
    minInlineSize: 0,
    color: color.fgMuted,
  },
  large: {
    color: color.fgWarning,
    fontWeight: font.weight_6,
  },
  remove: {
    gridArea: "remove",
  },
  rate: {
    maxInlineSize: "14rem",
  },
  actions: {
    position: "sticky",
    insetBlockEnd: tabBarTokens.clearance,
    paddingBlock: space._3,
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
    backgroundColor: color.bgCanvas,
  },
});
