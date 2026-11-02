import { List } from "@tuja/ui/components/list";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";

const ROWS = 5;

/** A screen before it can show: a title over a list, as blocks. */
export function ScreenSkeleton() {
  return (
    <div css={stack.item} aria-busy>
      <Skeleton width="8rem" height="1.5rem" />
      <List>
        {Array.from({ length: ROWS }, (_, index) => (
          <li key={index} css={listSurface.item}>
            <span css={listSurface.row}>
              <Skeleton width="60%" height="1em" delay={index * 100} />
            </span>
          </li>
        ))}
      </List>
    </div>
  );
}
