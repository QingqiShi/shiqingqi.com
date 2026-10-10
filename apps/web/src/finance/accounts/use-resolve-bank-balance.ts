import { useState } from "react";
import { t } from "#src/i18n.ts";
import { bankApiClient } from "../bank/bank-api-client.ts";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useToast } from "../shell/toast-provider.tsx";

/**
 * "Use bank balance" or "Dismiss" on a Bank link whose balance disagrees
 * with ours. The server writes the Valuation, so a pull follows.
 */
export function useResolveBankBalance() {
  const { runtime } = useFinanceRuntime();
  const showToast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const failed = t({
    en: "The bank balance did not save. Try again when you are online.",
    zh: "银行余额未能保存，请联网后重试。",
  });

  async function resolve(linkId: string, action: "use" | "dismiss") {
    setBusy(`${linkId}:${action}`);
    try {
      await bankApiClient.resolveBalance({ linkId, action });
      await runtime.loop.sync();
    } catch {
      showToast({ message: failed });
    } finally {
      setBusy(null);
    }
  }

  return { resolve, busy };
}
