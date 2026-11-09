"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import type { CareKind } from "./use-pet-scene.ts";

/** Water and pat, the buttons of the Mac's pane, for anyone who looks at the page. */
export function CareButtons({ onCare }: { onCare: (kind: CareKind) => void }) {
  return (
    <div
      role="group"
      aria-label={t({ en: "Look after Miao", zh: "照顾小苗" })}
      css={cluster.tight}
    >
      <Button
        onClick={() => {
          onCare("feed");
        }}
      >
        {t({ en: "Water", zh: "喂水" })}
      </Button>
      <Button
        onClick={() => {
          onCare("pat");
        }}
      >
        {t({ en: "Pat", zh: "摸摸" })}
      </Button>
    </div>
  );
}
