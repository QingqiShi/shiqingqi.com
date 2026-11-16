import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { SkeletonRows } from "./skeleton-rows.tsx";

/** A trip before it can show: its title, the day stepper and the day's rows. */
export function TripSkeleton() {
  return (
    <div css={stack.group} aria-busy>
      <div css={stack.tight}>
        <Skeleton width="10rem" height="1em" />
        <Skeleton width="14rem" height="2rem" />
      </div>
      <Skeleton width="16rem" height="2rem" />
      <Skeleton width="100%" height="6rem" delay={100} />
      <SkeletonRows rows={4} />
    </div>
  );
}
