import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { Skeleton } from "@tuja/ui/components/skeleton";

/** Rows of a list before they can show. */
export function SkeletonRows({ rows }: { rows: number }) {
  return (
    <List>
      {Array.from({ length: rows }, (_, index) => (
        <ListRow key={index}>
          <Skeleton width="60%" height="1em" delay={index * 100} />
        </ListRow>
      ))}
    </List>
  );
}
