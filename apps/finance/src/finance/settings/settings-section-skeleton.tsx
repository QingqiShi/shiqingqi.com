import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { controlHeight } from "@tuja/ui/tokens.stylex";

const FIELDS = 3;

/** A Settings section before it can show: a title over a few fields. */
export function SettingsSectionSkeleton() {
  return (
    <div css={[stack.group, styles.section]} aria-busy>
      <div css={stack.tight}>
        <Skeleton width="8rem" height="1.75rem" />
        <Skeleton width="70%" height="1.25rem" />
      </div>
      <div css={stack.item}>
        {Array.from({ length: FIELDS }, (_, index) => (
          <div key={index} css={stack.tight}>
            <Skeleton width="7rem" height="1.25rem" />
            <Skeleton width="100%" height={controlHeight.md} shape="control" />
          </div>
        ))}
        <Skeleton width="4rem" height={controlHeight.md} shape="control" />
      </div>
    </div>
  );
}

const styles = stylex.create({
  section: {
    maxInlineSize: "32rem",
  },
});
