"use client";

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Says which version of a trip the page shows, and puts it back as the
 * newest version after one question. The newest version that the person
 * saw guards the restore: when someone changed the trip since, nothing
 * changes, and the person gets the versions as they are now.
 */
export function VersionBar({
  tripId,
  revision,
  seen,
  savedAt,
  author,
  isCurrent,
  readerHref,
  historyHref,
}: {
  tripId: string;
  revision: number;
  seen: { revision: number; stamp: string };
  /** When the version was saved, in words. */
  savedAt: string;
  author: "you" | "member" | "unknown";
  isCurrent: boolean;
  readerHref: string;
  historyHref: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "asking" | "busy" | "failed">(
    "idle",
  );

  const restore = async () => {
    setState("busy");
    try {
      const response = await fetch("/api/trips/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ tripId, revision, seen }),
      });
      if (response.status === 409) {
        router.replace(`${historyHref}?changed`);
        router.refresh();
        return;
      }
      if (!response.ok) {
        setState("failed");
        return;
      }
      router.replace(readerHref);
      router.refresh();
    } catch {
      setState("failed");
    }
  };

  const title = t({
    en: "Version of {date}",
    zh: "{date} 的版本",
  }).replace("{date}", savedAt);

  if (isCurrent) {
    return (
      <Callout intent="info" title={title}>
        {t({
          en: "This is the current version of the trip.",
          zh: "这是行程的当前版本。",
        })}
      </Callout>
    );
  }

  if (state === "asking" || state === "busy") {
    return (
      <Callout
        intent="info"
        title={t({ en: "Restore this version?", zh: "恢复这个版本？" })}
        action={
          <div css={cluster.tight}>
            <Button
              size="sm"
              look="ghost"
              disabled={state === "busy"}
              onClick={() => {
                setState("idle");
              }}
            >
              {t({ en: "Cancel", zh: "取消" })}
            </Button>
            <Button
              size="sm"
              look="primary"
              loading={state === "busy"}
              onClick={() => {
                void restore();
              }}
            >
              {t({ en: "Restore", zh: "恢复" })}
            </Button>
          </div>
        }
      >
        {t({
          en: "The trip goes back to how it was on {date}. The versions after it stay in the history.",
          zh: "行程将回到 {date} 时的样子。之后的版本仍保留在历史中。",
        }).replace("{date}", savedAt)}
      </Callout>
    );
  }

  return (
    <Callout
      intent={state === "failed" ? "destructive" : "info"}
      role={state === "failed" ? "alert" : undefined}
      title={title}
      action={
        <Button
          size="sm"
          look="outline"
          icon={<ClockCounterClockwiseIcon weight="bold" />}
          onClick={() => {
            setState("asking");
          }}
        >
          {t({ en: "Restore this version", zh: "恢复这个版本" })}
        </Button>
      }
    >
      {state === "failed"
        ? t({
            en: "The version was not restored. Try again.",
            zh: "版本没有恢复，请重试。",
          })
        : `${authorSentence(author)}${t({
            en: "This is how the trip was then. You can read it, not change it.",
            zh: "这是行程当时的样子，只能查看，不能修改。",
          })}`}
    </Callout>
  );
}

function authorSentence(author: "you" | "member" | "unknown") {
  switch (author) {
    case "you":
      return t({ en: "Saved by you. ", zh: "由你保存。" });
    case "member":
      return t({ en: "Saved by another member. ", zh: "由其他成员保存。" });
    case "unknown":
      return "";
  }
}
