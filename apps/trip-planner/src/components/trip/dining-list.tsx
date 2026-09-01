import { RestaurantCard } from "./restaurant-card";
import type { Restaurant } from "@/data/types";

/**
 * The dining grid on its own: confirmed pick(s) featured first, the rest under
 * an "其他选择" label. Used inline inside a feed moment and inside a day Section.
 */
export function DiningList({
  restaurants,
  altLabel = "其他选择",
}: {
  restaurants: Restaurant[];
  altLabel?: string;
}) {
  const featured = restaurants.filter((r) => r.status);
  const alternatives = restaurants.filter((r) => !r.status);

  return (
    <>
      {featured.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {featured.map((r) => (
            <RestaurantCard key={r.name} restaurant={r} featured />
          ))}
        </div>
      ) : null}

      {alternatives.length > 0 ? (
        <>
          {featured.length > 0 ? (
            <p className="mt-4 mb-3 text-xs font-medium tracking-wide text-muted-foreground">
              {altLabel}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {alternatives.map((r) => (
              <RestaurantCard key={r.name} restaurant={r} />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
