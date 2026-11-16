import { setLocale } from "@tuja/i18n/server-locale";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { SIDEBAR_COLLAPSED_COOKIE } from "@tuja/ui/components/sidebar-collapsed-cookie";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { AppFrame } from "#src/shell/app-frame.tsx";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  setLocale(validateLocale((await params).locale));
  return (
    <AppFrame
      defaultCollapsed={
        (await cookies()).get(SIDEBAR_COLLAPSED_COOKIE)?.value === "1"
      }
    >
      {children}
    </AppFrame>
  );
}
