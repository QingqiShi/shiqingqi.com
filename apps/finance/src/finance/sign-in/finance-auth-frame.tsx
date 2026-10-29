import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { FinanceFrame } from "../shell/finance-frame.tsx";

/** The narrow column the sign-in and invite pages sit in, under the Finance name. */
export function FinanceAuthFrame({ children }: { children: ReactNode }) {
  return (
    <FinanceFrame brand={t({ en: "Finance", zh: "家庭账本" })}>
      {children}
    </FinanceFrame>
  );
}
