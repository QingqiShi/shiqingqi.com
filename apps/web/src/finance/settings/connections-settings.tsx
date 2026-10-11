"use client";

import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Select } from "@tuja/ui/components/select";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { Switch } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { cluster, row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { bankApiClient } from "../bank/bank-api-client.ts";
import type {
  ProviderAccountView,
  ProviderAccountsResponse,
} from "../bank/types.ts";
import { displayMoment } from "../domain/dates/display-moment.ts";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useReplica } from "../replica/use-replica.ts";
import { useToast } from "../shell/toast-provider.tsx";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { selectTransactionsByAccount } from "../store/select-transactions-by-account.ts";
import type { AccountRow } from "../sync/row-schemas.ts";
import { CredentialForm } from "./credential-form.tsx";
import { CredentialSummary } from "./credential-summary.tsx";
import {
  choiceOf,
  isSameChoice,
  planBankLinkChanges,
  type BankLinkChoice,
} from "./plan-bank-link-changes.ts";
import { SettingsPanel } from "./settings-panel.tsx";
import { suggestBankLinks } from "./suggest-bank-links.ts";
import { summariseBankSync, type BankSyncLine } from "./summarise-bank-sync.ts";
import { useBankErrorMessage } from "./use-bank-error-message.ts";
import { useIsOwner } from "./use-is-owner.ts";

type Load =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "refused" }
  | { state: "ready"; response: ProviderAccountsResponse; version: number };

type ConnectedResponse = Extract<
  ProviderAccountsResponse,
  { status: "connected" }
>;

/**
 * Lunch Flow: each provider account beside the finance account it feeds,
 * with the best match picked in advance, and the last sync. The owner saves
 * every changed link at once; "Sync now" runs every link and says what came
 * in. Until the owner stores the Household's Lunch Flow API key, it asks
 * the owner for one.
 */
export function ConnectionsSettings() {
  const isOwner = useIsOwner();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    bankApiClient.listProviderAccounts().then(
      (response) => {
        if (live) setLoad({ state: "ready", response, version: attempt });
      },
      (error: unknown) => {
        if (!live) return;
        setLoad({
          state:
            error instanceof FinanceApiError && error.code === "auth"
              ? "refused"
              : "failed",
        });
      },
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  const reload = () => {
    setAttempt((value) => value + 1);
  };
  const description = t({
    en: "Lunch Flow reads your bank transactions every six hours and matches them to what you recorded.",
    zh: "Lunch Flow 每六小时读取一次银行交易，并与已记录的交易匹配。",
  });
  const title = t({ en: "Connections", zh: "银行连接" });

  if (load.state === "ready" && load.response.status === "connected") {
    return (
      <ConnectedSettings
        key={load.version}
        title={title}
        description={description}
        response={load.response}
        onReload={reload}
      />
    );
  }

  return (
    <SettingsPanel title={title} description={description}>
      {load.state === "loading" ? (
        <div css={stack.tight} aria-busy>
          <Skeleton width="100%" height="4rem" />
          <Skeleton width="100%" height="4rem" />
        </div>
      ) : load.state === "failed" ? (
        <Callout
          intent="warning"
          title={t({
            en: "Lunch Flow did not answer",
            zh: "Lunch Flow 没有响应",
          })}
        >
          <div css={stack.tight}>
            <Text look="bodySmall">
              {t({
                en: "This needs you to be online. Your accounts and balances still work offline.",
                zh: "这里需要联网。账户和余额离线仍可使用。",
              })}
            </Text>
            <div>
              <Button
                size="sm"
                look="outline"
                onClick={() => {
                  setLoad({ state: "loading" });
                  reload();
                }}
              >
                {t({ en: "Try again", zh: "重试" })}
              </Button>
            </div>
          </div>
        </Callout>
      ) : load.state === "refused" ? (
        <div css={stack.item}>
          <Callout
            intent="warning"
            title={t({
              en: "Lunch Flow refused the API key",
              zh: "Lunch Flow 拒绝了 API 密钥",
            })}
          >
            <Text look="bodySmall">
              {isOwner
                ? t({
                    en: "The key may be revoked, or the Lunch Flow subscription may have ended. Paste a new key to sync again.",
                    zh: "密钥可能已被撤销，或 Lunch Flow 订阅已到期。粘贴新密钥即可恢复同步。",
                  })
                : t({
                    en: "Nothing syncs until the owner pastes a new key.",
                    zh: "在所有者粘贴新密钥之前不会同步。",
                  })}
            </Text>
          </Callout>
          {isOwner ? <CredentialForm replacing onSaved={reload} /> : null}
        </div>
      ) : isOwner ? (
        <div css={stack.item}>
          <Text look="bodySmall">
            {t({
              en: "Connect Lunch Flow with an API key. The bank accounts you connected in Lunch Flow then appear in this list to link.",
              zh: "用 API 密钥连接 Lunch Flow。之后你在 Lunch Flow 连接的银行账户会显示在这里以供关联。",
            })}
          </Text>
          <CredentialForm onSaved={reload} />
        </div>
      ) : (
        <Callout
          intent="info"
          title={t({ en: "Not connected", zh: "尚未连接" })}
        >
          <Text look="bodySmall">
            {t({
              en: "The owner connects Lunch Flow with an API key.",
              zh: "由所有者用 API 密钥连接 Lunch Flow。",
            })}
          </Text>
        </Callout>
      )}
    </SettingsPanel>
  );
}

interface ConnectedSettingsProps {
  title: string;
  description: string;
  response: ConnectedResponse;
  onReload: () => void;
}

function ConnectedSettings({
  title,
  description,
  response,
  onReload,
}: ConnectedSettingsProps) {
  const locale = useLocale();
  const router = useRouter();
  const { runtime } = useFinanceRuntime();
  const isOwner = useIsOwner();
  const showToast = useToast();
  const bankErrorMessage = useBankErrorMessage();
  const accounts = useReplica(liveRowSelectors.accounts);
  const [suggestions] = useState(() =>
    suggestBankLinks(response.accounts, accounts),
  );
  const [choices, setChoices] = useState<ReadonlyMap<string, BankLinkChoice>>(
    () =>
      new Map(
        response.accounts.map((account) => {
          const current = choiceOf(account);
          const suggested = suggestions.get(account.providerAccountId);
          return [
            account.providerAccountId,
            suggested === undefined
              ? current
              : { ...current, accountId: suggested },
          ];
        }),
      ),
  );
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const changed = response.accounts.filter((account) => {
    const choice = choices.get(account.providerAccountId);
    return choice !== undefined && !isSameChoice(choice, choiceOf(account));
  });
  const onlySuggestions =
    changed.length > 0 &&
    changed.every(
      (account) =>
        account.link === null &&
        choices.get(account.providerAccountId)?.accountId ===
          suggestions.get(account.providerAccountId),
    );
  const chosenBy = new Map<string, string>();
  for (const [providerAccountId, choice] of choices) {
    if (choice.accountId !== "") {
      chosenBy.set(choice.accountId, providerAccountId);
    }
  }

  const labels = {
    linkSuggested: t({ en: "Link suggested", zh: "关联建议账户" }),
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
            `${labels.newCount} ${numbers.format(line.created)}`,
            `${labels.matchedCount} ${numbers.format(line.matched)}`,
            `${labels.reviewCount} ${numbers.format(line.review)}`,
          ]
        : [
            `${numbers.format(line.created)} ${labels.newCount}`,
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
    const before = new Map(
      response.accounts.map((account) => [
        account.providerAccountId,
        choiceOf(account),
      ]),
    );
    setSaving(true);
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
    } finally {
      setSaving(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    try {
      const result = await bankApiClient.syncNow();
      await runtime.loop.sync();
      const byAccount = selectTransactionsByAccount(
        runtime.store.getSnapshot(),
      );
      const lines = summariseBankSync(
        result,
        (accountId) =>
          accounts.find((account) => account.id === accountId)?.name ?? "",
        (accountId) =>
          (byAccount.get(accountId) ?? []).filter(
            (transaction) =>
              transaction.needsReview &&
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
                        router.push(
                          getLocalePath(
                            "/finance/transactions?review=1",
                            locale,
                          ),
                        );
                      },
                    },
                  }
                : {}),
            },
      );
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
    } finally {
      setSyncing(false);
    }
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
        {isOwner ? null : (
          <Text look="bodySmall" tone="muted">
            {labels.ownerOnly}
          </Text>
        )}
        {isOwner && changed.length > 0 ? (
          <div css={[cluster.tight, styles.saveBar]}>
            <Button
              size="sm"
              look="primary"
              loading={saving}
              onClick={() => void save()}
            >
              {`${onlySuggestions ? labels.linkSuggested : labels.saveChanges} (${new Intl.NumberFormat(locale).format(changed.length)})`}
            </Button>
            <Button
              size="sm"
              look="ghost"
              disabled={saving}
              onClick={() => {
                setChoices(
                  new Map(
                    response.accounts.map((account) => [
                      account.providerAccountId,
                      choiceOf(account),
                    ]),
                  ),
                );
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
          <ul css={[stack.tight, styles.list]}>
            {response.accounts.map((account) => (
              <ProviderAccountCard
                key={account.providerAccountId}
                account={account}
                accounts={accounts}
                editable={isOwner}
                choice={
                  choices.get(account.providerAccountId) ?? choiceOf(account)
                }
                suggested={
                  account.link === null &&
                  suggestions.get(account.providerAccountId) !== undefined &&
                  choices.get(account.providerAccountId)?.accountId ===
                    suggestions.get(account.providerAccountId)
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
        )}
      </div>
    </SettingsPanel>
  );
}

interface ProviderAccountCardProps {
  account: ProviderAccountView;
  accounts: readonly AccountRow[];
  editable: boolean;
  choice: BankLinkChoice;
  suggested: boolean;
  /** Finance account id → the provider account that has it picked. */
  takenBy: ReadonlyMap<string, string>;
  onChange: (choice: BankLinkChoice) => void;
}

function ProviderAccountCard({
  account,
  accounts,
  editable,
  choice,
  suggested,
  takenBy,
  onChange,
}: ProviderAccountCardProps) {
  const locale = useLocale();
  const bankLinks = useReplica(liveRowSelectors.bankLinks);
  const switchId = useId();
  const hintId = useId();
  const moreId = useId();
  const [moreOpen, setMoreOpen] = useState(() => choiceOf(account).flipped);
  const replicaLink = account.link
    ? bankLinks.find((link) => link.id === account.link?.id)
    : undefined;
  const lastSyncAt =
    replicaLink?.lastSyncAt ?? account.link?.lastSyncAt ?? null;
  const lastError = replicaLink?.lastError ?? account.link?.lastError ?? null;
  const bankErrorMessage = useBankErrorMessage();
  const linkable = accounts.filter(
    (finance) =>
      (finance.kind === "cash" || finance.kind === "credit") &&
      finance.closedOn === null &&
      (account.currency === null || finance.currency === account.currency),
  );
  const linkedName =
    accounts.find((finance) => finance.id === account.link?.accountId)?.name ??
    null;

  return (
    <li css={[corner.radius_3, stack.item, styles.card]}>
      <div css={[row.tight, styles.head]}>
        <div css={styles.names}>
          <span css={[typeRole.body, styles.name]}>{account.name}</span>
          <span css={[typeRole.caption, styles.muted]}>
            {[account.institution, account.currency ?? ""]
              .filter((part) => part !== "")
              .join(" · ")}
          </span>
        </div>
        {account.needsReconnect || replicaLink?.status === "reconnect" ? (
          <Badge size="sm" intent="warning">
            {t({
              en: "Reconnect in Lunch Flow",
              zh: "需在 Lunch Flow 重新连接",
            })}
          </Badge>
        ) : account.link ? (
          <Badge size="sm" intent="success">
            {t({ en: "Linked", zh: "已关联" })}
          </Badge>
        ) : suggested && editable ? (
          <Badge size="sm" intent="neutral">
            {t({ en: "Suggested", zh: "建议" })}
          </Badge>
        ) : null}
      </div>
      {editable ? (
        <Select
          size="sm"
          label={t({ en: "Feeds this account", zh: "关联到账户" })}
          value={choice.accountId}
          options={[
            { value: "", label: t({ en: "Not linked", zh: "不关联" }) },
            ...linkable.map((finance) => ({
              value: finance.id,
              label: finance.name,
              disabled:
                (takenBy.get(finance.id) ?? account.providerAccountId) !==
                account.providerAccountId,
            })),
          ]}
          onChange={(event) => {
            onChange({ ...choice, accountId: event.target.value });
          }}
        />
      ) : (
        <Text look="bodySmall">
          {linkedName === null
            ? t({ en: "Not linked", zh: "未关联" })
            : `${t({ en: "Feeds", zh: "关联到" })} ${linkedName}`}
        </Text>
      )}
      {account.link ? (
        <Text look="caption" tone="muted">
          {lastSyncAt === null
            ? t({ en: "Not synced yet", zh: "尚未同步" })
            : `${t({ en: "Last synced", zh: "上次同步" })} ${displayMoment(lastSyncAt, locale)}`}
        </Text>
      ) : null}
      {lastError ? (
        <Callout intent="warning">{bankErrorMessage(lastError)}</Callout>
      ) : null}
      {account.link && editable ? (
        <div css={stack.tight}>
          <div>
            <Button
              size="sm"
              look="ghost"
              aria-expanded={moreOpen}
              aria-controls={moreId}
              icon={
                <span
                  css={[
                    transition.transform,
                    styles.caret,
                    moreOpen && styles.caretOpen,
                  ]}
                >
                  <CaretDownIcon weight="bold" />
                </span>
              }
              onClick={() => {
                setMoreOpen(!moreOpen);
              }}
            >
              {t({ en: "More", zh: "更多" })}
            </Button>
          </div>
          {moreOpen ? (
            <div id={moreId} css={stack.tight}>
              <div css={row.tight}>
                <Switch
                  id={switchId}
                  size="sm"
                  aria-describedby={hintId}
                  value={choice.flipped ? "on" : "off"}
                  onChange={(state) => {
                    onChange({ ...choice, flipped: state === "on" });
                  }}
                />
                <label htmlFor={switchId} css={typeRole.bodySmall}>
                  {t({
                    en: "Spending arrives as a positive amount",
                    zh: "银行把支出显示为正数",
                  })}
                </label>
              </div>
              <span id={hintId} css={[typeRole.caption, styles.muted]}>
                {t({
                  en: "Turn on only if this account's purchases arrive as money in. Most banks and cards show purchases as negative.",
                  zh: "仅当此账户的消费显示为入账时才打开。大多数银行和信用卡把消费显示为负数。",
                })}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

const styles = stylex.create({
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  card: {
    padding: space._3,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
  head: {
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  names: {
    display: "flex",
    flexDirection: "column",
    minInlineSize: 0,
  },
  name: {
    fontWeight: font.weight_6,
  },
  muted: {
    color: color.fgMuted,
  },
  saveBar: {
    justifyContent: "flex-start",
  },
  caret: {
    display: "inline-flex",
  },
  caretOpen: {
    transform: "rotate(180deg)",
  },
});
