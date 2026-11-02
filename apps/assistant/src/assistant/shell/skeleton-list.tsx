import { List } from "@tuja/ui/components/list";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";

/** A list before it can show: each row holds one block, `width` wide. */
export function SkeletonList({ rows, width }: { rows: number; width: string }) {
  return (
    <List>
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} css={listSurface.item}>
          <span css={listSurface.row}>
            <Skeleton width={width} height="1em" delay={index * 100} />
          </span>
        </li>
      ))}
    </List>
  );
}
