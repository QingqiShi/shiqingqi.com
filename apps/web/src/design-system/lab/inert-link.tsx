import type { ComponentProps } from "react";

/** A link that keeps the Lab on its page when the visitor follows it. */
export function InertLink({ onClick, ...props }: ComponentProps<"a">) {
  return (
    <a
      {...props}
      onClick={(event) => {
        onClick?.(event);
        event.preventDefault();
      }}
    />
  );
}
