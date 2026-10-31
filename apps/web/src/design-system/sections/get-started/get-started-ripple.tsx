"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { useRipple } from "@tuja/ui/hooks/use-ripple";
import { rhythm } from "@tuja/ui/tokens.stylex";

/**
 * One neutral Button on the page's own surface. A press pulses rings out from
 * its edge, drawn by the effect layer on the GPU.
 */
export function GetStartedRipple() {
  const ref = useRipple();
  return (
    <div css={styles.stage}>
      <Button ref={ref}>{t({ en: "Save changes", zh: "保存更改" })}</Button>
    </div>
  );
}

const styles = stylex.create({
  stage: {
    display: "flex",
    paddingBlock: rhythm.group,
  },
});
