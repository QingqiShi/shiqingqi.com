"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { reviewReason } from "../transactions/review-reason.ts";
import { useReviewReasonText } from "../transactions/use-review-reason-text.ts";
import type { TransactionForm } from "./use-transaction-form.ts";

export function ReviewNotice({ form }: { form: TransactionForm }) {
  const {
    data,
    existing,
    existingEntries,
    inReview,
    account,
    accountRef,
    toAccountRef,
    save,
  } = form;
  const reasonText = useReviewReasonText();
  const reason = existing
    ? reviewReason(existing, existingEntries, data.lookups)
    : null;

  return inReview ? (
    <Callout intent="info" title={t({ en: "From the bank", zh: "来自银行" })}>
      <div css={stack.tight}>
        <span>
          {reason === null
            ? t({
                en: "Check the payee and category, then confirm.",
                zh: "请检查商家和分类，然后确认。",
              })
            : reasonText(reason)}
        </span>
        <div>
          {reason?.type === "inTransit" ? (
            <Button
              size="sm"
              onClick={() => {
                (account?.isSystem
                  ? accountRef
                  : toAccountRef
                ).current?.focus();
              }}
            >
              {t({ en: "Choose account", zh: "选择账户" })}
            </Button>
          ) : (
            <Button
              size="sm"
              icon={<CheckIcon weight="bold" />}
              onClick={() => {
                save(false);
              }}
            >
              {t({ en: "Looks right", zh: "没问题" })}
            </Button>
          )}
        </div>
      </div>
    </Callout>
  ) : reason?.type === "ai" ? (
    <span css={[typeRole.caption, styles.muted]}>
      {`${t({ en: "Labelled by AI", zh: "由 AI 标注" })} · ${reason.text}`}
    </span>
  ) : null;
}

const styles = stylex.create({
  muted: {
    color: color.fgMuted,
  },
});
