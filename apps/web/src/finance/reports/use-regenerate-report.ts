import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { useToast } from "../shell/toast-provider.tsx";
import { reportApiClient } from "./report-api-client.ts";

/**
 * Builds a Report again on the server (last week when `periodEnd` is left
 * out), then reads the list and the Report again and drops its share image.
 * Resolves to the Report's id, or null when it failed.
 */
export function useRegenerateReport() {
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
      await queryClient.invalidateQueries({ queryKey: ["finance", "reports"] });
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
