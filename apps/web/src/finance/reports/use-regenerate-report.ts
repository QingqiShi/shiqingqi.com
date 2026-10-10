import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useToast } from "../shell/toast-provider.tsx";
import { reportApiClient } from "./report-api-client.ts";

/**
 * Builds a Report again on the server (last week when `periodEnd` is left
 * out), then pulls so the list shows it and drops the cached data.
 * Resolves to the Report's id, or null when it failed.
 */
export function useRegenerateReport() {
  const runtime = useFinanceRuntime().runtime;
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [pending, setPending] = useState(false);
  const failed = t({
    en: "The report could not be made. Try again when you are online.",
    zh: "周报未能生成，请联网后重试。",
  });

  async function regenerate(periodEnd?: string): Promise<string | null> {
    setPending(true);
    try {
      const result = await reportApiClient.regenerate(periodEnd);
      await queryClient.invalidateQueries({
        queryKey: ["finance", "report", result.id],
      });
      queryClient.removeQueries({
        queryKey: ["finance", "report-image", result.id],
      });
      await runtime.loop.sync();
      return result.id;
    } catch {
      showToast({ message: failed });
      return null;
    } finally {
      setPending(false);
    }
  }

  return { regenerate, pending };
}
