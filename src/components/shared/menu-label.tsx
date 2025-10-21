import type { PropsWithChildren } from "react";

export function MenuLabel({ children }: PropsWithChildren) {
  return (
    <div className="text-base pb-2 text-gray-11 dark:text-grayDark-11">
      {children}
    </div>
  );
}
