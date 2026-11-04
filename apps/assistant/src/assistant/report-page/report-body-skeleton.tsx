import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { SkeletonList } from "../shell/skeleton-list.tsx";

/** The open report before it can show: its headline over a list. */
export function ReportBodySkeleton() {
  return (
    <div css={stack.group} aria-busy>
      <div css={stack.tight}>
        <Skeleton width="10rem" height="1em" />
        <Skeleton width="min(28rem, 100%)" height="2rem" />
      </div>
      <SkeletonList rows={3} width="70%" />
    </div>
  );
}
