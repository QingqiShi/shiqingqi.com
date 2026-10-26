import { Skeleton } from "@tuja/ui/components/skeleton";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { controlSize } from "@tuja/ui/tokens.stylex";

/** The widths of the Category chips, in rem. */
const CHIPS = [6, 5, 6.5, 5, 5, 5, 5, 5.5, 5];

function FieldSkeleton({ label }: { label: string }) {
  return (
    <div css={stack.tight}>
      <Skeleton width={label} height="1.5rem" />
      <Skeleton width="100%" height={controlSize._10} />
    </div>
  );
}

/**
 * `TransactionEditor` before it shows: the headline, the kind, and the
 * first fields, as blocks of their size. On a phone it is taller than the
 * sheet, as the editor is, so the sheet has the same size with either.
 */
export function TransactionEditorSkeleton() {
  return (
    <div aria-busy css={stack.group}>
      <div css={stack.tight}>
        <Skeleton width="8rem" height="2.75rem" />
        <Skeleton width="10rem" height="1.25rem" />
      </div>
      <div css={stack.item}>
        <Skeleton width="100%" height={controlSize._8} />
        <FieldSkeleton label="5rem" />
        <FieldSkeleton label="4.5rem" />
        <div css={stack.tight}>
          <Skeleton width="6rem" height="1.5rem" />
          <div css={cluster.tight}>
            {CHIPS.map((width, index) => (
              <Skeleton
                key={index}
                width={`${String(width)}rem`}
                height={controlSize._8}
                css={corner.radius_round}
              />
            ))}
          </div>
        </div>
        <FieldSkeleton label="5.5rem" />
        <FieldSkeleton label="3.5rem" />
        <FieldSkeleton label="3rem" />
        <FieldSkeleton label="4rem" />
      </div>
    </div>
  );
}
