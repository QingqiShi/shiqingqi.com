"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { Card } from "@tuja/ui/components/card";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { font } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import {
  toBuddyApiError,
  type BuddyApiError,
} from "../http/buddy-api-error.ts";
import { postJson } from "../http/post-json.ts";
import { AuthNotice } from "../sign-in/auth-notice.tsx";

type Decision = "approve" | "deny";

/** Asks the signed-in owner to connect the Mac that shows `code` to their account. */
export function ConnectPanel({
  code,
  machineName,
}: {
  code: string;
  machineName: string;
}) {
  const locale = useLocale();
  const [busy, setBusy] = useState<Decision | null>(null);
  const [done, setDone] = useState<Decision | null>(null);
  const [error, setError] = useState<BuddyApiError | null>(null);

  const errorMessages: Record<string, string> = {
    not_found: t({
      en: "This code has expired. Start again on your Mac.",
      zh: "此代码已过期。请在 Mac 上重新开始。",
    }),
    already_decided: t({
      en: "This request was answered already.",
      zh: "此请求已经处理过了。",
    }),
  };
  const fallback = t({
    en: "Something went wrong. Try again.",
    zh: "出现问题，请重试。",
  });
  const macsHref = getLocalePath("/macs", locale);
  const macsLabel = t({ en: "See your Macs", zh: "查看你的 Mac" });

  if (done === "approve") {
    return (
      <AuthNotice
        heading={t({ en: "Connected", zh: "已连接" })}
        text={t({
          en: "Your Mac starts syncing in a moment. You can close this page.",
          zh: "你的 Mac 稍后开始同步。可以关闭此页面了。",
        })}
        href={macsHref}
        linkLabel={macsLabel}
      />
    );
  }
  if (done === "deny") {
    return (
      <AuthNotice
        heading={t({ en: "Not connected", zh: "未连接" })}
        text={t({
          en: "The Mac cannot sync to your account.",
          zh: "这台 Mac 无法同步到你的账号。",
        })}
        href={macsHref}
        linkLabel={macsLabel}
      />
    );
  }

  function decide(decision: Decision) {
    setBusy(decision);
    setError(null);
    postJson("/api/connect/decide", { code, decision })
      .then(() => {
        setDone(decision);
      })
      .catch((caught: unknown) => {
        setError(toBuddyApiError(caught));
        setBusy(null);
      });
  }

  return (
    <div css={stack.group}>
      <Heading level={1} look="h1">
        {t({
          en: "Connect this Mac to your account?",
          zh: "要把这台 Mac 连接到你的账号吗？",
        })}
      </Heading>
      <Card>
        <Text look="label" tone="muted">
          {t({ en: "Code", zh: "代码" })}
        </Text>
        <span css={[typeRole.subDisplay, styles.code]}>{code}</span>
        <Text tone="muted">{machineName}</Text>
      </Card>
      <Text>
        {t({
          en: "Connect only if your Mac shows this same code. If it does not, someone else is asking: cancel.",
          zh: "只有当你的 Mac 显示相同的代码时才连接。如果不同，说明是别人在请求，请取消。",
        })}
      </Text>
      {error ? (
        <Callout intent="danger" role="alert">
          {errorMessages[error.code] ?? fallback}
        </Callout>
      ) : null}
      <div css={[row.item, styles.actions]}>
        <Button
          look="primary"
          size="lg"
          loading={busy === "approve"}
          disabled={busy !== null}
          css={styles.action}
          onClick={() => {
            decide("approve");
          }}
        >
          {t({ en: "Connect", zh: "连接" })}
        </Button>
        <Button
          look="outline"
          size="lg"
          loading={busy === "deny"}
          disabled={busy !== null}
          css={styles.action}
          onClick={() => {
            decide("deny");
          }}
        >
          {t({ en: "Cancel", zh: "取消" })}
        </Button>
      </div>
    </div>
  );
}

const styles = stylex.create({
  code: {
    fontFamily: font.familyMono,
  },
  actions: {
    flexWrap: "wrap",
  },
  action: {
    flexGrow: 1,
  },
});
