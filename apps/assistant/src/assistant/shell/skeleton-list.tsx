import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Skeleton } from "@tuja/ui/components/skeleton";

/** A list before it can show: each row holds one block, `width` wide. */
export function SkeletonList({ rows, width }: { rows: number; width: string }) {
  return (
    <List>
      {Array.from({ length: rows }, (_, index) => (
        <ListRow key={index}>
          <Skeleton width={width} height="1em" delay={index * 100} />
        </ListRow>
      ))}
    </List>
  );
}
