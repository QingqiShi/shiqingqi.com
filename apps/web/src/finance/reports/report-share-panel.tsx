"use client";

import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { ShareNetworkIcon } from "@phosphor-icons/react/dist/ssr/ShareNetwork";
import * as stylex from "@stylexjs/stylex";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@tuja/ui/components/button";
import { Switch } from "@tuja/ui/components/switch";
import { cluster, row } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import { useId, useState } from "react";
import { copyTextToClipboard } from "#src/browser/copy-text-to-clipboard.ts";
import { downloadBlob } from "#src/browser/download-blob.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { reportImageQuery } from "../queries/report-image-query.ts";
import { useToast } from "../shell/toast-provider.tsx";
import {
  buildReportSummary,
  type ReportSummaryCopy,
} from "./build-report-summary.ts";
import type { WeeklyReportResponse } from "./report-api-schemas.ts";
import { canShareFiles, shareReportImage } from "./share-report-image.ts";
import { useCategoryLineName } from "./use-category-line-name.ts";

/**
 * Share the Report as an image, save it, or copy a short text summary.
 * Where the browser can share files, the image is read ahead: Safari
 * refuses a share that starts too long after the tap.
 */
export function ReportSharePanel({ report }: { report: WeeklyReportResponse }) {
  const locale = useLocale();
  const queryClient = useQueryClient();
  const showToast = useToast();
  const categoryName = useCategoryLineName();
  const switchId = useId();
  const [includeNames, setIncludeNames] = useState(false);
  const [busy, setBusy] = useState<"share" | "download" | null>(null);
  const [sharesFiles] = useState(
    () => typeof navigator !== "undefined" && canShareFiles(navigator),
  );
  const imageOptions = { locale, includeNames };
  const image = useQuery({
    ...reportImageQuery(report.id, imageOptions),
    enabled: sharesFiles,
  });
  const fileName = `weekly-report-${report.periodEnd}.png`;
  const messages = {
    title: t({ en: "Weekly report", zh: "周报" }),
    retry: t({
      en: "The image is ready. Tap Share image again.",
      zh: "图片已准备好，请再点一次“分享图片”。",
    }),
    downloaded: t({ en: "Image saved.", zh: "图片已保存。" }),
    imageFailed: t({
      en: "The image could not be made. Try again when you are online.",
      zh: "图片未能生成，请联网后重试。",
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
    return (
      image.data ??
      (await queryClient.query(reportImageQuery(report.id, imageOptions)))
    );
  }

  async function share() {
    setBusy("share");
    try {
      const outcome = await shareReportImage(await readImage(), {
        fileName,
        title: messages.title,
        target: navigator,
        download: downloadBlob,
      });
      if (outcome === "retry") showToast({ message: messages.retry });
      if (outcome === "downloaded") {
        showToast({ message: messages.downloaded, durationMs: 4000 });
      }
    } catch {
      showToast({ message: messages.imageFailed });
    } finally {
      setBusy(null);
    }
  }

  async function download() {
    setBusy("download");
    try {
      downloadBlob(await readImage(), fileName);
    } catch {
      showToast({ message: messages.imageFailed });
    } finally {
      setBusy(null);
    }
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
    <div css={[cluster.item, styles.panel]}>
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
      <div css={row.tight}>
        <Switch
          id={switchId}
          size="sm"
          value={includeNames ? "on" : "off"}
          onChange={(state) => {
            setIncludeNames(state === "on");
          }}
        />
        <label htmlFor={switchId} css={[typeRole.bodySmall, styles.label]}>
          {t({
            en: "Include account names in the image",
            zh: "图片中显示账户名称",
          })}
        </label>
      </div>
    </div>
  );
}

const styles = stylex.create({
  panel: {
    rowGap: rhythm.tight,
  },
  label: {
    color: color.fgMuted,
  },
});
