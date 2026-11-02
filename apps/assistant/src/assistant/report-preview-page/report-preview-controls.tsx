"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { AssistantApiError } from "../http/assistant-api-error.ts";
import { assistantFetch } from "../http/assistant-fetch.ts";

const REFRESH_MS = 5000;

/** Starts a new preview, and reloads the page's data while one runs. */
export function ReportPreviewControls({
  running,
  hasPreview,
}: {
  running: boolean;
  hasPreview: boolean;
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [starting, setStarting] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      router.refresh();
    }, REFRESH_MS);
    return () => {
      clearInterval(timer);
    };
  }, [running, router]);

  function start() {
    setStarting(true);
    setFailed(false);
    assistantFetch("/api/report-preview", { method: "POST" })
      .catch((error: unknown) => {
        // A 409 says that a preview runs, which the refresh shows.
        if (!(error instanceof AssistantApiError && error.status === 409)) {
          setFailed(true);
        }
      })
      .finally(() => {
        setStarting(false);
        startRefresh(() => {
          router.refresh();
        });
      });
  }

  return (
    <div css={stack.tight}>
      <div>
        <Button
          look="primary"
          size="sm"
          loading={starting || refreshing}
          disabled={running}
          onClick={start}
        >
          {hasPreview
            ? t({ en: "Run a new preview", zh: "重新预览" })
            : t({ en: "Run a preview", zh: "开始预览" })}
        </Button>
      </div>
      <div role="status">
        {failed ? (
          <Text as="p" look="bodySmall">
            {t({
              en: "That did not work. Try again.",
              zh: "没有成功，请重试。",
            })}
          </Text>
        ) : null}
      </div>
    </div>
  );
}
