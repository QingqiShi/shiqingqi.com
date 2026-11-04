import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { AssistantFrame } from "../shell/assistant-frame.tsx";

/** The narrow column the sign-in page sits in, under the app name. */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <AssistantFrame brand={t({ en: "Qi Assistant", zh: "Qi Assistant" })}>
      {children}
    </AssistantFrame>
  );
}
