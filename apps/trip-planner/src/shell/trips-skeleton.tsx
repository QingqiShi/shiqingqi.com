import { SkeletonRows } from "./skeleton-rows.tsx";

/** The list of trips before it can show. */
export function TripsSkeleton() {
  return (
    <div aria-busy>
      <SkeletonRows rows={3} />
    </div>
  );
}
