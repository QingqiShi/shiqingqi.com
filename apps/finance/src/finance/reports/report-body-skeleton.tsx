import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";

/** The open Report before it can show. */
export function ReportBodySkeleton() {
  return (
    <div css={stack.item} aria-busy>
      <Skeleton width="12rem" height="1.3rem" />
      <Skeleton width="60%" height="3rem" />
      <Skeleton width="100%" height="14rem" />
      <Skeleton width="100%" height="20rem" />
    </div>
  );
}
