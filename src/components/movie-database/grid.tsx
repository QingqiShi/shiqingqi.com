import type { HTMLAttributes, PropsWithChildren, Ref } from "react";

export function Grid({
  children,
  ref,
  ...props
}: PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & { ref?: Ref<HTMLDivElement> }
>) {
  return (
    <div
      {...props}
      ref={ref}
      className="p-2 grid gap-2 grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(230px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]"
    >
      {children}
    </div>
  );
}
