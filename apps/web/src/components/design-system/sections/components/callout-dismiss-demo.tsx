"use client";

import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { useState } from "react";
import { t } from "#src/i18n.ts";

/**
 * Interactive dismiss island. Isolated in its own `"use client"` module so the
 * surrounding showcase stays a server component (and can freely render the
 * server-only doc components). All `t()` strings resolve unconditionally at the
 * top of render, so the conditional branch never varies the hook call order.
 */
export function CalloutDismissDemo() {
  const [dismissed, setDismissed] = useState(false);
  const title = t({ en: "Storage almost full", zh: "存储空间即将用满" });
  const body = t({
    en: "You're using 92% of your plan's space. Free up room or upgrade before uploads start failing.",
    zh: "你已使用套餐 92% 的空间。请在上传开始失败前清理空间或升级套餐。",
  });
  const dismissLabel = t({ en: "Dismiss", zh: "关闭" });
  const restoreLabel = t({ en: "Restore callout", zh: "恢复提示框" });

  return dismissed ? (
    <Button
      onClick={() => {
        setDismissed(false);
      }}
    >
      {restoreLabel}
    </Button>
  ) : (
    <Callout
      variant="warning"
      title={title}
      onDismiss={() => {
        setDismissed(true);
      }}
      dismissLabel={dismissLabel}
    >
      {body}
    </Callout>
  );
}
