import type { ComponentProps } from "react";

/** The `<tbody>` group holding the table's rows. */
export function TableBody({
  css,
  ref,
  children,
  ...restProps
}: Omit<ComponentProps<"tbody">, "className" | "style">) {
  return (
    <tbody {...restProps} ref={ref} css={css}>
      {children}
    </tbody>
  );
}
