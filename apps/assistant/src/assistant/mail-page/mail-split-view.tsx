"use client";

import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { normalizePath } from "@tuja/i18n/normalize-path";
import { useLocale } from "@tuja/i18n/use-locale";
import type { ReactNode } from "react";
import { askedHomeView } from "../home/choose-home-view.ts";
import { formatDay } from "../report-page/format-day.ts";
import { useDateLocale } from "../shell/date-locale-provider.tsx";
import { PageWithBack } from "../shell/page-with-back.tsx";
import { useCameFrom } from "../shell/use-came-from.ts";

const REPORT_PATH = /^\/reports\/(\d{4}-\d{2}-\d{2})$/;

/** The words of the mail page's frame: its name, Home's, and the name of each page that can open it, by its path. */
export interface MailFrameLabels {
  mail: string;
  home: string;
  /** Home's Report view, at `/?view=report`. */
  homeReport: string;
  /** Home's Plan view, at `/?view=plan`. */
  homePlan: string;
  pages: [path: string, label: string][];
}

/**
 * The mail page, with a way back to the page of the app that opened it, or
 * else to Home, because a mail opened from a notification or from the home
 * screen has no page under it. The labels come from the server, because the
 * page's loading screen has no translations of its own on the client.
 */
export function MailSplitView({
  labels,
  children,
}: {
  labels: MailFrameLabels;
  children: ReactNode;
}) {
  const locale = useLocale();
  const dateLocale = useDateLocale();
  const cameFrom = useCameFrom();
  const from =
    cameFrom === null ? null : normalizePath(cameFrom.split("?")[0] ?? "");
  const reportDate = from === null ? null : REPORT_PATH.exec(from)?.[1];
  const homeView =
    cameFrom === null
      ? null
      : askedHomeView(
          new URL(cameFrom, "http://localhost").searchParams.get("view") ??
            undefined,
        );
  const label =
    from === null || from === "/"
      ? homeView === "report"
        ? labels.homeReport
        : homeView === "today"
          ? labels.homePlan
          : labels.home
      : reportDate
        ? formatDay(reportDate, dateLocale)
        : labels.pages.find(
            ([path]) => from === path || from.startsWith(`${path}/`),
          )?.[1];
  const back =
    cameFrom !== null && label !== undefined
      ? { href: cameFrom, label }
      : { href: getLocalePath("/", locale), label: labels.home };
  return (
    <PageWithBack label={labels.mail} back={back}>
      {children}
    </PageWithBack>
  );
}
