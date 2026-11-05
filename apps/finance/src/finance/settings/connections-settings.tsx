"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useEffect, useState } from "react";
import { bankApiClient } from "../bank/bank-api-client.ts";
import type { ProviderAccountsResponse } from "../bank/types.ts";
import { FinanceApiError } from "../http/finance-api-error.ts";
import { ConnectedSettings } from "./connected-settings.tsx";
import { CredentialForm } from "./credential-form.tsx";
import { SettingsPanel } from "./settings-panel.tsx";
import { useHouseholdAccess } from "./use-household-access.ts";

type Load =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "refused" }
  | { state: "ready"; response: ProviderAccountsResponse; version: number };

/**
 * Lunch Flow: each provider account, under its Bank login, beside the
 * finance account it feeds, and the last sync. The owner saves every
 * changed link at once; "Sync now" runs every link and says what came in.
 * Until the owner stores the Household's Lunch Flow API key, or when the
 * stored key no longer opens, it asks the owner for one.
 */
export function ConnectionsSettings() {
  const access = useHouseholdAccess();
  const isOwner = access === "owner";
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
  const notConnected = t({ en: "Not connected", zh: "尚未连接" });
  const keyUnreadable =
    load.state === "ready" &&
    load.response.status === "not_connected" &&
    load.response.keyUnreadable === true;

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
          {keyUnreadable ? (
            <Callout
              intent="warning"
              title={t({
                en: "Enter the Lunch Flow API key again",
                zh: "重新输入 Lunch Flow API 密钥",
              })}
            >
              <Text look="bodySmall">
                {t({
                  en: "The saved key can no longer be read. Paste it again to resume syncing. Your bank links are kept.",
                  zh: "已保存的密钥无法再读取。重新粘贴即可恢复同步，银行关联会保留。",
                })}
              </Text>
            </Callout>
          ) : (
            <Text look="bodySmall">
              {t({
                en: "Connect Lunch Flow with an API key. The bank accounts you connected in Lunch Flow then appear in this list to link.",
                zh: "用 API 密钥连接 Lunch Flow。之后你在 Lunch Flow 连接的银行账户会显示在这里以供关联。",
              })}
            </Text>
          )}
          <CredentialForm onSaved={reload} />
        </div>
      ) : access === "viewer" ? (
        <Callout intent="info">{notConnected}</Callout>
      ) : (
        <Callout intent="info" title={notConnected}>
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
