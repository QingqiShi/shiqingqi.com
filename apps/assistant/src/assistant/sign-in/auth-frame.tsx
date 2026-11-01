import { t } from "@tuja/i18n";
import type { ReactNode } from "react";
import { AssistantFrame } from "../shell/assistant-frame.tsx";

/** The narrow column the sign-in and invite pages sit in, under the app name. */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <AssistantFrame brand={t({ en: "Mail Assistant", zh: "邮件助手" })}>
      {children}
    </AssistantFrame>
  );
}
