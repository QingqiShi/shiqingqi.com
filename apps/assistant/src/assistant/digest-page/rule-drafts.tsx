"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { border, color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DraftRuleView } from "../digest/read-digest.ts";
import { assistantFetch } from "../http/assistant-fetch.ts";

function RuleSentence({ rule }: { rule: DraftRuleView }) {
  const sentence =
    rule.match === "domain"
      ? t({
          en: "Mail from anyone at {pattern} {outcome}",
          zh: "来自 {pattern} 的所有邮件{outcome}",
        })
      : t({
          en: "Mail from {pattern} {outcome}",
          zh: "来自 {pattern} 的邮件{outcome}",
        });
  const filedIn = t({
    en: "is filed in {category} without showing.",
    zh: "直接归档到“{category}”，不再显示。",
  });
  const filed = t({
    en: "is filed without showing.",
    zh: "直接归档，不再显示。",
  });
  const fyi = t({
    en: "shows under Good to know.",
    zh: "显示在“知道就好”中。",
  });
  const act = t({
    en: "shows under Needs you.",
    zh: "显示在“需要你处理”中。",
  });
  const outcome =
    rule.bucket === "filed"
      ? rule.categoryName
        ? filedIn.replace("{category}", rule.categoryName)
        : filed
      : rule.bucket === "fyi"
        ? fyi
        : act;
  const [before, after] = sentence
    .replace("{outcome}", outcome)
    .split("{pattern}");
  return (
    <Text as="p">
      {before}
      <strong css={styles.pattern}>{rule.pattern}</strong>
      {after}
    </Text>
  );
}

/** Rules that corrections drafted: each applies only once the user confirms it. */
export function RuleDrafts({ rules }: { rules: readonly DraftRuleView[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const confirmLabel = t({ en: "Use this rule", zh: "使用这条规则" });
  const notNowLabel = t({ en: "Not now", zh: "暂不" });

  function run(ruleId: string, path: string, method: string) {
    setBusy(ruleId);
    assistantFetch(path, { method })
      .catch(() => undefined)
      .finally(() => {
        setBusy(null);
        router.refresh();
      });
  }

  return (
    <ul css={[stack.rows, styles.list]}>
      {rules.map((rule) => (
        <li key={rule.id} css={[stack.tight, styles.rule]}>
          <RuleSentence rule={rule} />
          <div css={styles.actions}>
            <Button
              size="sm"
              look="primary"
              loading={busy === rule.id}
              disabled={busy !== null}
              onClick={() => {
                run(rule.id, `/api/rules/${rule.id}/confirm`, "POST");
              }}
            >
              {confirmLabel}
            </Button>
            <Button
              size="sm"
              look="ghost"
              disabled={busy !== null}
              onClick={() => {
                run(rule.id, `/api/rules/${rule.id}`, "DELETE");
              }}
            >
              {notNowLabel}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

const styles = stylex.create({
  pattern: {
    fontWeight: font.weight_6,
    overflowWrap: "anywhere",
  },
  list: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
  rule: {
    paddingBlock: space._3,
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: rhythm.tight,
  },
});
