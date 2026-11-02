"use client";

import { useEffect, useRef } from "react";
import { assistantFetch } from "../http/assistant-fetch.ts";

/**
 * Marks a report seen once the owner can see it. It runs only in the browser,
 * never in the server's render, because a prefetch must not count as seen. A
 * failed request changes nothing: the report shows again on the next visit.
 */
export function MarkReportSeen({ reportId }: { reportId: string }) {
  const sentRef = useRef(false);

  useEffect(() => {
    function send() {
      if (sentRef.current || document.visibilityState !== "visible") return;
      sentRef.current = true;
      assistantFetch(`/api/reports/${reportId}/seen`, {
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
