"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import type { ComponentProps } from "react";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";

/** Gets the newest code when this tab runs older code than the server or another tab. */
export function ReloadButton(
  props: Pick<ComponentProps<typeof Button>, "size" | "look">,
) {
  const { runtime } = useFinanceRuntime();
  return (
    <Button
      {...props}
      onClick={() => {
        runtime.reload();
      }}
    >
      {t({ en: "Reload", zh: "刷新" })}
    </Button>
  );
}
