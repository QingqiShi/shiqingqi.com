"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { assistantFetch } from "../http/assistant-fetch.ts";
import { refreshAfterSave } from "../shell/refresh-after-save.ts";

/**
 * Marks a report seen once the owner can see it. It runs only in the browser,
 * never in the server's render, because a prefetch must not count as seen. A
 * failed request changes nothing: the report shows again on the next visit.
 */
export function MarkReportSeen({ reportId }: { reportId: string }) {
  const router = useRouter();
  const saveRef = useRef<Promise<unknown> | null>(null);

  // The router keeps this page, which shows the report, and `/` must show today
  // after the owner goes away. A refresh here would replace the report that the
  // owner reads, so it waits until the owner goes to a different page. On the
  // same path, only a refresh removes this component, so no second one is
  // necessary.
  useEffect(() => {
    const path = window.location.pathname;
    return () => {
      if (saveRef.current === null || window.location.pathname === path) return;
      refreshAfterSave(saveRef.current, () => {
        router.refresh();
      });
    };
  }, [router]);

  useEffect(() => {
    function send() {
      if (saveRef.current !== null || document.visibilityState !== "visible") {
        return;
      }
      saveRef.current = assistantFetch(`/api/reports/${reportId}/seen`, {
        method: "POST",
        keepalive: true,
      }).catch(() => undefined);
    }
    send();
    document.addEventListener("visibilitychange", send);
    return () => {
      document.removeEventListener("visibilitychange", send);
    };
  }, [reportId]);

  return null;
}
