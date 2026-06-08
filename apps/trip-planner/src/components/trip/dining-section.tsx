import { MapPin, Star } from "lucide-react";
import { MapsLink, MenuLink, NavLink, WebLink } from "./links";
import { Badge } from "@/components/ui/badge";
import type { Booking, Restaurant } from "@/data/itinerary";
import { cn } from "@/lib/utils";

const michelinLabel: Record<1 | 2 | 3, string> = {
  1: "米其林一星",
  2: "米其林二星",
  3: "米其林三星",
};

function BookingDetails({
  booking,
  query,
}: {
  booking: Booking;
  query: string;
}) {
  const lines = [
    [booking.date, booking.time].filter(Boolean).join(" "),
    booking.party,
  ].filter(Boolean);
  const meta = [
    booking.by ? `预订人 ${booking.by}` : null,
    booking.contact,
    booking.note,
  ].filter(Boolean);

  return (
    <div className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        {lines.length > 0 ? (
          <p className="font-medium">{lines.join(" · ")}</p>
        ) : (
          <span />
        )}
        <NavLink to={query} mode="transit" label="导航前往" />
      </div>
      {meta.length > 0 ? (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {meta.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}

export function RestaurantCard({
  restaurant,
  featured = false,
}: {
  restaurant: Restaurant;
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-card p-4",
        featured && "border-foreground/25 bg-accent/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <MapsLink query={restaurant.query} className="font-medium">
          {restaurant.name}
        </MapsLink>
        {restaurant.status === "booked" ? (
          <Badge className="shrink-0">已预订</Badge>
        ) : null}
        {restaurant.status === "pick" ? (
          <Badge variant="secondary" className="shrink-0">
            首选
          </Badge>
        ) : null}
      </div>

      {restaurant.area ? (
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" />
          {restaurant.area}
        </p>
      ) : null}

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {restaurant.michelin ? (
          <Badge variant="outline">
            <Star className="size-3 fill-current" />
            {michelinLabel[restaurant.michelin]}
          </Badge>
        ) : null}
        <Badge variant="outline">{restaurant.tag}</Badge>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {restaurant.description}
      </p>

      {restaurant.booking ? (
        <BookingDetails booking={restaurant.booking} query={restaurant.query} />
      ) : null}

      {restaurant.price || restaurant.website || restaurant.menu ? (
        <div className="mt-3 flex items-center justify-between gap-2 pt-1 text-xs">
          <span className="text-muted-foreground">{restaurant.price}</span>
          <span className="flex items-center gap-3">
            {restaurant.menu ? <MenuLink href={restaurant.menu} /> : null}
            {restaurant.website ? <WebLink href={restaurant.website} /> : null}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The dining grid on its own: confirmed pick(s) featured first, the rest under
 * an "其他选择" label. Used inline inside a feed moment and inside DiningSection.
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
