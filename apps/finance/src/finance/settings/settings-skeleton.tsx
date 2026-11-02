"use client";

import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { controlHeight } from "@tuja/ui/tokens.stylex";
import { SettingsIslands } from "./settings-islands.tsx";

const FIELDS = 3;

/** `/settings` before it can show: the menu is real, as nothing in it waits, beside the open section as blocks. */
export function SettingsSkeleton() {
  return (
    <SettingsIslands current={null}>
      <div css={[stack.group, styles.section]} aria-busy>
        <div css={stack.tight}>
          <Skeleton width="8rem" height="1.75rem" />
          <Skeleton width="70%" height="1.25rem" />
        </div>
        <div css={stack.item}>
          {Array.from({ length: FIELDS }, (_, index) => (
            <div key={index} css={stack.tight}>
              <Skeleton width="7rem" height="1.25rem" />
              <Skeleton width="100%" css={styles.control} />
            </div>
          ))}
          <Skeleton width="4rem" css={styles.control} />
        </div>
      </div>
    </SettingsIslands>
  );
}

const styles = stylex.create({
  section: {
    maxInlineSize: "32rem",
  },
  control: {
    height: controlHeight.md,
  },
});
