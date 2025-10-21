import type { ReactNode } from "react";

interface FiltersContainerProps {
  desktopChildren?: ReactNode;
  mobileChildren?: ReactNode;
}

export function FiltersContainer({
  desktopChildren,
  mobileChildren,
}: FiltersContainerProps) {
  return (
    <>
      <div className="hidden md:inline-flex fixed top-[calc(2.5rem+env(safe-area-inset-top))] right-0 left-0 z-overlay pointer-events-none pr-[var(--removed-body-scroll-bar-size,0px)]">
        <div className="w-full max-w-[1080px] xl:max-w-[calc((1080/24)*1rem)] mx-auto pl-[calc(0.75rem+env(safe-area-inset-left))] pr-[calc(0.75rem+env(safe-area-inset-right))] pointer-events-none flex">
          <div className="pointer-events-auto flex items-center gap-1">
            {desktopChildren}
          </div>
        </div>
      </div>
      <div className="inline-flex md:hidden fixed right-[calc(0.75rem+var(--removed-body-scroll-bar-size,0px))] top-[calc(2.5rem+env(safe-area-inset-top))] z-overlay">
        {mobileChildren}
      </div>
    </>
  );
}
