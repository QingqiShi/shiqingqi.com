import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import type { ReactNode } from "react";
import { BuddyFrame } from "./buddy-frame.tsx";

/** The narrow column that the owner's pages sit in, under the wordmark that leads home: sign-in, sign-up, recovery, connect and the Macs list. */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <BuddyFrame
      brand={t({ en: "Buddy", zh: "搭子" })}
      homeHref={getLocalePath("/", getLocale())}
    >
      {children}
    </BuddyFrame>
  );
}
