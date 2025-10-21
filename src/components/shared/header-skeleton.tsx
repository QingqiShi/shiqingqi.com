import { cn } from "@/lib/utils";
import { Skeleton } from "./skeleton";

export function HeaderSkeleton() {
  return (
    <div className="fixed top-0 right-0 left-0 h-20 z-header pointer-events-none pr-[var(--removed-body-scroll-bar-size,0px)]">
      <div
        className={cn(
          "max-w-[1080px] xl:max-w-[calc((1080/24)*1rem)]",
          "my-0 mx-auto py-0 h-full",
          "flex justify-between items-center",
          "pointer-events-none",
          "pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))]",
        )}
      >
        <div />
        <div className="pointer-events-auto flex items-center gap-1">
          <Skeleton width={120} height={40} className="md:h-[32px]" />
        </div>
      </div>
    </div>
  );
}
