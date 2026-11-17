import { flex, justify } from "@tuja/ui/primitives/flex.stylex";
import { row } from "@tuja/ui/primitives/stack.stylex";
import type { ReactNode } from "react";

/** The actions at the end of a sheet: the one that removes at the start of the line, the others at its end. */
export function SheetActions({
  remove,
  children,
}: {
  remove?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div css={[flex.row, remove ? justify.between : justify.end]}>
      {remove}
      <div css={row.tight}>{children}</div>
    </div>
  );
}
