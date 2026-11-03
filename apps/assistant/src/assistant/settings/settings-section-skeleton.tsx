import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";

const ROWS = 3;

/** A Settings section before it can show: a title over a few fields. */
export function SettingsSectionSkeleton() {
  return (
    <div css={stack.group} aria-busy>
      <Skeleton width="14rem" height="2rem" />
      {Array.from({ length: ROWS }, (_, index) => (
        <div key={index} css={stack.tight}>
          <Skeleton width="6rem" height="1em" delay={index * 100} />
          <Skeleton width="100%" height="2.5rem" delay={index * 100} />
        </div>
      ))}
    </div>
  );
}
