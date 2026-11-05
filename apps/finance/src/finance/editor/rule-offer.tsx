"use client";

import { RepeatIcon } from "@phosphor-icons/react/dist/ssr/Repeat";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { displayDay } from "../domain/dates/display-day.ts";
import { detectRecurring } from "../transactions/detect-recurring.ts";
import { ruleFromTransaction } from "../transactions/rule-from-transaction.ts";
import { ruleDeclines } from "./rule-declines.ts";
import type { TransactionForm } from "./use-transaction-form.ts";

export function useRuleOffer(form: TransactionForm) {
  const { data, store, undoable, existing, shownOf, setFailure, saveFailed } =
    form;
  const locale = useLocale();
  const [ruleOffer, setRuleOffer] = useState<"open" | "declined">("open");
  const toastRule = t({ en: "Rule added", zh: "已添加周期规则" });

  const pattern =
    existing && existing.status === "posted" && existing.payeeId !== null
      ? detectRecurring(
          existing,
          data.byPayee.get(existing.payeeId) ?? [],
          shownOf,
        )
      : null;
  const payeeHasRule =
    existing?.payeeId != null &&
    data.rules.some((rule) => rule.template.payeeId === existing.payeeId);
  const showRuleOffer =
    pattern !== null &&
    !payeeHasRule &&
    existing?.ruleId === null &&
    ruleOffer === "open" &&
    existing.payeeId !== null &&
    !ruleDeclines.has(existing.payeeId);

  const cadenceLabels = {
    week: t({ en: "every week", zh: "每周" }),
    month: t({ en: "every month", zh: "每月" }),
    year: t({ en: "every year", zh: "每年" }),
  };

  const makeRule = () => {
    if (!existing) return;
    const payee =
      existing.payeeId === null
        ? undefined
        : data.lookups.payeeById.get(existing.payeeId);
    const category =
      existing.categoryId === null
        ? undefined
        : data.lookups.categoryById.get(existing.categoryId);
    const ruleId = crypto.randomUUID();
    const args = ruleFromTransaction({
      ruleId,
      name: payee?.name ?? category?.name ?? existing.note.slice(0, 60),
      transaction: existing,
      entries: data.entriesByTransaction.get(existing.id) ?? [],
      tagIds: data.tagIdsByTransaction.get(existing.id) ?? [],
      pattern,
      today: data.today,
    });
    try {
      store.applyLocal({ name: "upsertRule", args });
    } catch {
      setFailure(saveFailed);
      return;
    }
    setRuleOffer("declined");
    undoable(
      `${toastRule} · ${cadenceLabels[args.unit ?? "month"]} · ${displayDay(args.startsOn ?? data.today, locale, "weekday")}`,
      [{ name: "upsertRule", args: { id: ruleId, deleted: true } }],
    );
  };

  const decline = () => {
    if (existing?.payeeId) ruleDeclines.add(existing.payeeId);
    setRuleOffer("declined");
  };

  return {
    offeredCadence: showRuleOffer ? cadenceLabels[pattern.unit] : null,
    makeRule,
    decline,
  };
}

interface RuleOfferProps {
  cadence: string;
  onMake: () => void;
  onDecline: () => void;
}

export function RuleOffer({ cadence, onMake, onDecline }: RuleOfferProps) {
  return (
    <Callout
      intent="info"
      icon={<RepeatIcon weight="bold" />}
      title={t({
        en: "This looks like it repeats",
        zh: "这笔交易似乎会重复",
      })}
    >
      <div css={stack.tight}>
        <span>
          {`${t({
            en: "Same amount ",
            zh: "金额相同，",
          })}${cadence}${t({
            en: ". Make it a rule so it shows up as Expected?",
            zh: "。设为周期规则，以后提前生成待确认交易？",
          })}`}
        </span>
        <div css={cluster.tight}>
          <Button size="sm" onClick={onMake}>
            {t({ en: "Make it a rule", zh: "设为周期规则" })}
          </Button>
          <Button size="sm" look="ghost" onClick={onDecline}>
            {t({ en: "Not this one", zh: "不用了" })}
          </Button>
        </div>
      </div>
    </Callout>
  );
}
