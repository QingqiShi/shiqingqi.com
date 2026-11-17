"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { normalizePath } from "@tuja/i18n/normalize-path";
import { useToast } from "@tuja/ui/components/toast-provider";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { scrollY } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { usePathname } from "next/navigation";
import { useEffect, useEffectEvent } from "react";
import { useMadeTrip } from "./new-trip-provider.tsx";

/** Long enough to read a few sentences next to the new trip. */
const NOTICE_MS = 60_000;

/**
 * Says what happened to a trip made from a plan, as a toast, once its editor
 * shows: the model's word, such as what it left out, and that the plan was
 * only added in part when a save failed. It must be inside the toasts of the
 * app, which stay when the page changes.
 */
export function NewTripNotice() {
  const notice = useMadeTrip();
  const showToast = useToast();
  const path = normalizePath(usePathname());
  const made = notice?.made ?? null;
  const isThere = made !== null && path === `/${made.tripId}/edit`;
  const partly =
    made !== null && made.saved < made.total
      ? t({
          en: "The plan was only added in part. Check the days and add what is missing.",
          zh: "计划只加入了一部分。请检查每一天，补上缺少的内容。",
        })
      : null;

  const show = useEffectEvent(() => {
    if (!notice || !made) return;
    const message = (
      // The model's word can be 2000 characters. It scrolls, so that the
      // toast and its close button stay on the screen.
      <span
        tabIndex={0}
        css={[scrollY.base, a11y.focusRingInset, styles.message]}
      >
        {made.message}
      </span>
    );
    showToast({
      message:
        partly === null ? (
          message
        ) : (
          <span css={stack.tight}>
            <span>{partly}</span>
            {message}
          </span>
        ),
      durationMs: NOTICE_MS,
    });
    notice.clear();
  });

  useEffect(() => {
    if (isThere) show();
  }, [isThere]);

  return null;
}

const styles = stylex.create({
  message: {
    display: "block",
    maxBlockSize: "40dvh",
  },
});
