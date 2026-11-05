"use client";

import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Text } from "@tuja/ui/components/text";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { useRef } from "react";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { useReplica } from "../replica/use-replica.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import type { RuleRow } from "../sync/row-schemas.ts";
import { EditSheet } from "./edit-sheet.tsx";
import { RuleEditorFields } from "./rule-editor-fields.tsx";
import { SettingsPanel } from "./settings-panel.tsx";
import { templateAmount } from "./simple-template-accounts.ts";
import { useApplyMutations } from "./use-apply-mutations.ts";
import { useDescribeSchedule } from "./use-describe-schedule.ts";
import { useRuleEditor } from "./use-rule-editor.ts";

/** The recurring Rules: make one from scratch, change its schedule, amount, accounts, Payee and Category, pause or resume, delete. */
export function RulesSettings() {
  const locale = useLocale();
  const rules = useReplica(liveRowSelectors.rules);
  const payeeRef = useRef<HTMLInputElement>(null);
  const apply = useApplyMutations();
  const nameRef = useRef<HTMLInputElement>(null);
  const {
    draft,
    setDraft,
    error,
    templateEditable,
    autoPostBlocked,
    templateCurrency,
    openNew,
    openRule,
    save,
  } = useRuleEditor();

  const describeSchedule = useDescribeSchedule();
  const nextLabel = t({ en: "next", zh: "下次" });
  const pausedLabel = t({ en: "Paused", zh: "已暂停" });
  const autoLabel = t({ en: "Posts automatically", zh: "自动入账" });
  const pauseLabel = t({ en: "Pause", zh: "暂停" });
  const resumeLabel = t({ en: "Resume", zh: "恢复" });
  const messages = {
    paused: t({ en: "Rule paused", zh: "规则已暂停" }),
    resumed: t({ en: "Rule resumed", zh: "规则已恢复" }),
    deleted: t({ en: "Rule deleted", zh: "规则已删除" }),
  };

  function summary(rule: RuleRow) {
    return [
      formatMoney(
        templateAmount(rule.template),
        templateCurrency(rule),
        locale,
      ),
      rule.pausedAt === null
        ? `${nextLabel} ${displayDay(rule.nextOn, locale, "day")}`
        : "",
      describeSchedule(rule),
    ]
      .filter((part) => part !== "")
      .join(" · ");
  }

  function toggle(rule: RuleRow) {
    const pausing = rule.pausedAt === null;
    apply([{ name: "upsertRule", args: { id: rule.id, paused: pausing } }], {
      message: pausing ? messages.paused : messages.resumed,
    });
  }

  return (
    <SettingsPanel
      title={t({ en: "Recurring rules", zh: "周期规则" })}
      description={t({
        en: "Each rule adds an expected transaction before it happens. Confirm it on the day, or let the bank sync match it.",
        zh: "每条规则会提前生成待确认交易；到期时确认，或由银行同步自动匹配。",
      })}
      actions={
        <Button size="sm" icon={<PlusIcon weight="bold" />} onClick={openNew}>
          {t({ en: "New rule", zh: "新建规则" })}
        </Button>
      }
    >
      {rules.length === 0 ? (
        <Text look="bodySmall" tone="muted">
          {t({
            en: "No rules yet. Start a new rule, or make one from a transaction that repeats.",
            zh: "还没有规则。可在这里新建，或从重复出现的交易创建。",
          })}
        </Text>
      ) : (
        <List>
          {rules.map((rule) => (
            <ListRow
              key={rule.id}
              detail={summary(rule)}
              trailing={
                <span css={cluster.inline}>
                  {rule.autoPost ? (
                    <Badge size="sm" intent="neutral">
                      {autoLabel}
                    </Badge>
                  ) : null}
                  {rule.pausedAt === null ? null : (
                    <Badge size="sm" intent="warning">
                      {pausedLabel}
                    </Badge>
                  )}
                </span>
              }
              actions={
                <Button
                  size="sm"
                  look="ghost"
                  aria-label={`${rule.pausedAt === null ? pauseLabel : resumeLabel}: ${rule.name}`}
                  onClick={() => {
                    toggle(rule);
                  }}
                >
                  {rule.pausedAt === null ? pauseLabel : resumeLabel}
                </Button>
              }
              onClick={() => {
                openRule(rule);
              }}
            >
              {rule.name}
            </ListRow>
          ))}
        </List>
      )}
      <EditSheet
        isOpen={draft !== null}
        onClose={() => {
          setDraft(null);
        }}
        title={
          draft?.rule === null
            ? t({ en: "New rule", zh: "新建规则" })
            : t({ en: "Edit rule", zh: "编辑规则" })
        }
        initialFocusRef={draft?.rule === null ? payeeRef : nameRef}
        onSave={save}
        danger={
          draft?.rule
            ? {
                label: t({ en: "Delete", zh: "删除" }),
                onAction: () => {
                  const id = draft.rule?.id;
                  if (id === undefined) return;
                  apply([{ name: "upsertRule", args: { id, deleted: true } }], {
                    message: messages.deleted,
                  });
                },
              }
            : undefined
        }
      >
        {draft ? (
          <RuleEditorFields
            draft={draft}
            setDraft={setDraft}
            error={error}
            templateEditable={templateEditable}
            autoPostBlocked={autoPostBlocked}
            payeeRef={payeeRef}
            nameRef={nameRef}
          />
        ) : null}
      </EditSheet>
    </SettingsPanel>
  );
}
