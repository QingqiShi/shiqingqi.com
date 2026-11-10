"use client";

import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { FlowBlock } from "@tuja/ui/components/flow-block";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { useToast } from "@tuja/ui/components/toast-provider";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { bankApiClient } from "../bank/bank-api-client.ts";
import type {
  ProviderAccountsResponse,
  SyncNowResponse,
} from "../bank/types.ts";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { useFinanceNavigator } from "../navigation/finance-navigator.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useReplica } from "../replica/use-replica.ts";
import { withPending } from "../shell/with-pending.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { selectTransactionsByAccount } from "../store/select-transactions-by-account.ts";
import { selectReviewIds } from "../transactions/select-review-ids.ts";
import { CredentialSummary } from "./credential-summary.tsx";
import { groupByBankLogin } from "./group-by-bank-login.ts";
import {
  choiceOf,
  choicesOf,
  isSameChoice,
  planBankLinkChanges,
  type BankLinkChoice,
} from "./plan-bank-link-changes.ts";
import { ProviderAccountCard } from "./provider-account-card.tsx";
import { SettingsPanel } from "./settings-panel.tsx";
import { summariseBankSync, type BankSyncLine } from "./summarise-bank-sync.ts";
import { useBankErrorMessage } from "./use-bank-error-message.ts";
import { useHouseholdAccess } from "./use-household-access.ts";

type ConnectedResponse = Extract<
  ProviderAccountsResponse,
  { status: "connected" }
>;

interface ConnectedSettingsProps {
  title: string;
  description: string;
  response: ConnectedResponse;
  onReload: () => void;
}

export function ConnectedSettings({
  title,
  description,
  response,
  onReload,
}: ConnectedSettingsProps) {
  const locale = useLocale();
  const navigator = useFinanceNavigator();
  const { runtime } = useFinanceRuntime();
  const access = useHouseholdAccess();
  const isOwner = access === "owner";
  const showToast = useToast();
  const bankErrorMessage = useBankErrorMessage();
  const accounts = useReplica(liveRowSelectors.accounts);
  const members = useReplica(liveRowSelectors.members);
  const memberNames = new Map(
    members.map((member) => [member.id, member.name]),
  );
  const [choices, setChoices] = useState<ReadonlyMap<string, BankLinkChoice>>(
    () => choicesOf(response.accounts),
  );
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const changed = response.accounts.filter((account) => {
    const choice = choices.get(account.providerAccountId);
    return choice !== undefined && !isSameChoice(choice, choiceOf(account));
  });
  const chosenBy = new Map<string, string>();
  for (const [providerAccountId, choice] of choices) {
    if (choice.accountId !== "") {
      chosenBy.set(choice.accountId, providerAccountId);
    }
  }

  const labels = {
    saveChanges: t({ en: "Save changes", zh: "保存更改" }),
    reset: t({ en: "Reset", zh: "还原" }),
    saved: t({ en: "Bank links saved", zh: "银行关联已保存" }),
    failed: t({
      en: "The bank links did not save. Try again when you are online.",
      zh: "银行关联未能保存，请联网后重试。",
    }),
    undo: t({ en: "Undo", zh: "撤销" }),
    undone: t({ en: "Bank links restored", zh: "银行关联已还原" }),
    syncFailed: t({
      en: "The bank sync did not run. Try again when you are online.",
      zh: "银行同步未能运行，请联网后重试。",
    }),
    nothingNew: t({
      en: "Bank sync finished. Nothing new.",
      zh: "银行同步完成，没有新内容。",
    }),
    view: t({ en: "View", zh: "查看" }),
    syncedRecently: t({
      en: "A sync ran a moment ago. Try again in a few minutes.",
      zh: "刚刚同步过。请几分钟后再试。",
    }),
    newCount: t({ en: "new", zh: "新增" }),
    matchedCount: t({ en: "matched", zh: "匹配" }),
    reviewCount: t({ en: "to review", zh: "待审核" }),
    didNotSync: t({ en: "did not sync", zh: "未能同步" }),
    ownerOnly: t({
      en: "Only the owner can change connections.",
      zh: "只有所有者可以更改银行连接。",
    }),
  };

  function lineText(line: BankSyncLine) {
    if (line.failed) return `${line.name}: ${labels.didNotSync}`;
    const numbers = new Intl.NumberFormat(locale);
    const parts =
      locale === "zh"
        ? [
            `${labels.newCount} ${numbers.format(line.waiting)}`,
            `${labels.matchedCount} ${numbers.format(line.matched)}`,
            `${labels.reviewCount} ${numbers.format(line.review)}`,
          ]
        : [
            `${numbers.format(line.waiting)} ${labels.newCount}`,
            `${numbers.format(line.matched)} ${labels.matchedCount}`,
            `${numbers.format(line.review)} ${labels.reviewCount}`,
          ];
    return `${line.name}: ${parts.join(locale === "zh" ? "，" : ", ")}`;
  }

  async function runPlan(target: ReadonlyMap<string, BankLinkChoice>) {
    const current = await bankApiClient.listProviderAccounts();
    if (current.status !== "connected") return;
    const plan = planBankLinkChanges(current.accounts, target);
    for (const linkId of plan.removals) await bankApiClient.removeLink(linkId);
    for (const put of plan.puts) await bankApiClient.putLink(put);
    await runtime.loop.sync();
  }

  async function save() {
    const before = choicesOf(response.accounts);
    await withPending(setSaving, async () => {
      try {
        await runPlan(choices);
        showToast({
          message: labels.saved,
          action: {
            label: labels.undo,
            onAction: () => {
              void runPlan(before).then(
                () => {
                  showToast({ message: labels.undone, durationMs: 4000 });
                  onReload();
                },
                () => {
                  showToast({ message: labels.failed });
                  onReload();
                },
              );
            },
          },
        });
        onReload();
      } catch (error) {
        showToast({
          message:
            error instanceof FinanceApiError && error.code === "owner-only"
              ? labels.ownerOnly
              : labels.failed,
        });
        onReload();
      }
    });
  }

  function showSyncResult(result: SyncNowResponse) {
    const snapshot = runtime.store.getSnapshot();
    const byAccount = selectTransactionsByAccount(snapshot);
    const reviewIds = selectReviewIds(snapshot);
    const lines = summariseBankSync(
      result,
      (accountId) =>
        accounts.find((account) => account.id === accountId)?.name ?? "",
      (accountId) =>
        (byAccount.get(accountId) ?? []).filter(
          (transaction) =>
            reviewIds.has(transaction.id) &&
            transaction.status === "posted" &&
            transaction.deletedAt === null,
        ).length,
    );
    const toReview = lines.some((line) => line.review > 0);
    showToast(
      lines.length === 0
        ? { message: labels.nothingNew, durationMs: 4000 }
        : {
            message: lines.map(lineText).join(locale === "zh" ? "；" : "; "),
            ...(toReview
              ? {
                  action: {
                    label: labels.view,
                    onAction: () => {
                      navigator.push({
                        screen: "transactions",
                        filters: { review: true },
                      });
                    },
                  },
                }
              : {}),
          },
    );
  }

  async function syncNow() {
    await withPending(setSyncing, async () => {
      try {
        const result = await bankApiClient.syncNow();
        await runtime.loop.sync();
        showSyncResult(result);
        onReload();
      } catch (error) {
        const code = error instanceof FinanceApiError ? error.code : null;
        showToast({
          message:
            code === "too-many-requests"
              ? labels.syncedRecently
              : code === "rate_limited"
                ? (bankErrorMessage(code) ?? labels.syncFailed)
                : labels.syncFailed,
        });
      }
    });
  }

  return (
    <SettingsPanel
      title={title}
      description={description}
      actions={
        isOwner ? (
          <Button
            size="sm"
            icon={<ArrowsClockwiseIcon weight="bold" />}
            loading={syncing}
            onClick={() => void syncNow()}
          >
            {t({ en: "Sync now", zh: "立即同步" })}
          </Button>
        ) : null
      }
    >
      <div css={stack.item}>
        <CredentialSummary
          credential={response.credential}
          editable={isOwner}
          onChanged={onReload}
        />
        {response.mode === "fake" ? (
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Demo mode: these bank accounts and transactions are made up from your own records.",
              zh: "演示模式：这些银行账户和交易由你自己的记录生成。",
            })}
          </Text>
        ) : null}
        {access === "member" ? (
          <Text look="bodySmall" tone="muted">
            {labels.ownerOnly}
          </Text>
        ) : null}
        {isOwner && changed.length > 0 ? (
          <div css={[cluster.tight, styles.saveBar]}>
            <Button
              size="sm"
              look="primary"
              loading={saving}
              onClick={() => void save()}
            >
              {`${labels.saveChanges} (${new Intl.NumberFormat(locale).format(changed.length)})`}
            </Button>
            <Button
              size="sm"
              look="ghost"
              disabled={saving}
              onClick={() => {
                setChoices(choicesOf(response.accounts));
              }}
            >
              {labels.reset}
            </Button>
          </div>
        ) : null}
        {response.accounts.length === 0 ? (
          <Text look="bodySmall" tone="muted">
            {t({
              en: "No bank accounts in Lunch Flow yet. Connect a bank there first.",
              zh: "Lunch Flow 中还没有银行账户。请先在那里连接银行。",
            })}
          </Text>
        ) : (
          <div css={stack.group}>
            {groupByBankLogin(response.accounts).map((group) => (
              <FlowBlock as="section" key={group.bankLoginId} css={stack.tight}>
                <Heading level={3} look="h4">
                  {group.title}
                </Heading>
                <ul css={[stack.tight, styles.list]}>
                  {group.accounts.map((account) => (
                    <ProviderAccountCard
                      key={account.providerAccountId}
                      account={account}
                      accounts={accounts}
                      memberNames={memberNames}
                      editable={isOwner}
                      choice={
                        choices.get(account.providerAccountId) ??
                        choiceOf(account)
                      }
                      takenBy={chosenBy}
                      onChange={(choice) => {
                        const next = new Map(choices);
                        next.set(account.providerAccountId, choice);
                        setChoices(next);
                      }}
                    />
                  ))}
                </ul>
              </FlowBlock>
            ))}
          </div>
        )}
      </div>
    </SettingsPanel>
  );
}

const styles = stylex.create({
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  saveBar: {
    justifyContent: "flex-start",
  },
});
