"use client";

import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { ShareNetworkIcon } from "@phosphor-icons/react/dist/ssr/ShareNetwork";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@tuja/ui/components/button";
import { useToast } from "@tuja/ui/components/toast-provider";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { useEffect, useState } from "react";
import { copyTextToClipboard } from "#src/browser/copy-text-to-clipboard.ts";
import { downloadBlob } from "#src/browser/download-blob.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { reportImageQuery } from "../queries/report-image-query.ts";
import { withPendingKey } from "../shell/with-pending.ts";
import {
  buildReportSummary,
  type ReportSummaryCopy,
} from "./build-report-summary.ts";
import type { WeeklyReportResponse } from "./report-api-schemas.ts";
import { canShareFiles, shareReportImage } from "./share-report-image.ts";
import { useCategoryLineName } from "./use-category-line-name.ts";
import { useReportImageCopy } from "./use-report-image-copy.ts";

/** The longest wait for an idle moment before the image is drawn. Safari has no idle callback, so it always waits this long. */
const IDLE_TIMEOUT_MS = 1000;

/**
 * Share the Report as an image, save it, or copy a short text summary. The
 * image is drawn on the device when the browser is idle, before a tap:
 * Safari refuses a share that starts too long after the tap. A tap before
 * then draws it at once.
 */
export function ReportSharePanel({ report }: { report: WeeklyReportResponse }) {
  const locale = useLocale();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const categoryName = useCategoryLineName();
  const [busy, setBusy] = useState<"share" | "download" | null>(null);
  const [sharesFiles] = useState(
    () => typeof navigator !== "undefined" && canShareFiles(navigator),
  );
  const imageCopy = useReportImageCopy();
  const imageQuery = reportImageQuery(report, { locale }, imageCopy);
  const [drawAhead, setDrawAhead] = useState(false);
  const image = useQuery({ ...imageQuery, enabled: drawAhead });
  useEffect(() => {
    const draw = () => {
      setDrawAhead(true);
    };
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(draw, { timeout: IDLE_TIMEOUT_MS });
      return () => {
        cancelIdleCallback(id);
      };
    }
    const id = setTimeout(draw, IDLE_TIMEOUT_MS);
    return () => {
      clearTimeout(id);
    };
  }, []);
  const fileName = `weekly-report-${report.periodEnd}.png`;
  const messages = {
    retry: t({
      en: "The image is ready. Tap Share image again.",
      zh: "图片已准备好，请再点一次“分享图片”。",
    }),
    downloaded: t({ en: "Image saved.", zh: "图片已保存。" }),
    imageFailed: t({
      en: "The image could not be made. Try again.",
      zh: "图片未能生成，请重试。",
    }),
    copied: t({ en: "Summary copied.", zh: "摘要已复制。" }),
    copyFailed: t({
      en: "The summary could not be copied.",
      zh: "摘要未能复制。",
    }),
  };
  const summaryCopy: ReportSummaryCopy = {
    title: t({ en: "Weekly report, {week}", zh: "周报 {week}" }),
    netWorth: t({ en: "Net worth {amount}", zh: "净资产 {amount}" }),
    vsLastWeek: t({ en: "{amount} vs last week", zh: "较上周 {amount}" }),
    sinceYearStart: t({ en: "{amount} since 1 Jan", zh: "今年以来 {amount}" }),
    spent: t({
      en: "Spent {amount} ({change} vs 4-week average)",
      zh: "本周支出 {amount}（较 4 周平均 {change}）",
    }),
    noSpending: t({ en: "Nothing spent this week", zh: "本周没有支出" }),
    top: t({ en: "Most on: {list}", zh: "支出最多：{list}" }),
    listSeparator: t({ en: ", ", zh: "、" }),
  };

  async function readImage() {
    return image.data ?? (await queryClient.query(imageQuery));
  }

  async function share() {
    await withPendingKey(setBusy, "share", async () => {
      try {
        const outcome = await shareReportImage(await readImage(), {
          fileName,
          title: imageCopy.title,
          target: navigator,
          download: downloadBlob,
        });
        if (outcome === "retry") showToast({ message: messages.retry });
        if (outcome === "downloaded") {
          showToast({ message: messages.downloaded, durationMs: 4000 });
        }
      } catch {
        showToast({ message: messages.imageFailed });
      }
    });
  }

  async function download() {
    await withPendingKey(setBusy, "download", async () => {
      try {
        downloadBlob(await readImage(), fileName);
      } catch {
        showToast({ message: messages.imageFailed });
      }
    });
  }

  async function copySummary() {
    const copied = await copyTextToClipboard(
      buildReportSummary(report.data, summaryCopy, locale, categoryName),
    );
    showToast(
      copied
        ? { message: messages.copied, durationMs: 4000 }
        : { message: messages.copyFailed },
    );
  }

  return (
    <div css={cluster.tight}>
      {sharesFiles ? (
        <>
          <Button
            size="sm"
            look="primary"
            icon={<ShareNetworkIcon weight="bold" />}
            loading={busy === "share"}
            onClick={() => {
              void share();
            }}
          >
            {t({ en: "Share image", zh: "分享图片" })}
          </Button>
          <Button
            size="sm"
            icon={<DownloadSimpleIcon weight="bold" />}
            loading={busy === "download"}
            onClick={() => {
              void download();
            }}
          >
            {t({ en: "Save image", zh: "保存图片" })}
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          look="primary"
          icon={<DownloadSimpleIcon weight="bold" />}
          loading={busy === "download"}
          onClick={() => {
            void download();
          }}
        >
          {t({ en: "Save image", zh: "保存图片" })}
        </Button>
      )}
      <Button
        size="sm"
        icon={<CopyIcon weight="bold" />}
        onClick={() => {
          void copySummary();
        }}
      >
        {t({ en: "Copy summary", zh: "复制摘要" })}
      </Button>
    </div>
  );
}
