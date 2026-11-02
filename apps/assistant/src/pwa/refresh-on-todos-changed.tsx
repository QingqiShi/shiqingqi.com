"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TODOS_CHANGED_MESSAGE } from "./todos-changed-message.ts";

/** Loads the page again and clears the cached pages when a notification's button changes a to-do. */
export function RefreshOnTodosChanged() {
  const router = useRouter();
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const refreshOnChange = ({ data }: MessageEvent<unknown>) => {
      if (data === TODOS_CHANGED_MESSAGE) router.refresh();
    };
    navigator.serviceWorker.addEventListener("message", refreshOnChange);
    return () => {
      navigator.serviceWorker.removeEventListener("message", refreshOnChange);
    };
  }, [router]);
  return null;
}
