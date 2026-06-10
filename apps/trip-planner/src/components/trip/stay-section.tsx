import type { LucideIcon } from "lucide-react";
import {
  BedDouble,
  ChevronRight,
  LogIn,
  LogOut,
  MapPin,
  Phone,
} from "lucide-react";
import { MapsLink } from "./links";
import { Section } from "./section";
import { Badge } from "@/components/ui/badge";
import type { Lodging, Stay } from "@/data/types";

function StatusBadge({ lodging }: { lodging: Lodging }) {
  if (lodging.status === "booked") return <Badge>已预订</Badge>;
  if (lodging.status === "pending")
    return <Badge variant="secondary">待定</Badge>;
  if (lodging.recommended) return <Badge>推荐</Badge>;
  return <Badge variant="outline">备选</Badge>;
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="w-8 shrink-0 text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function LodgingCard({ lodging }: { lodging: Lodging }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium">{lodging.name}</div>
        <span className="shrink-0">
          <StatusBadge lodging={lodging} />
        </span>
      </div>

      {lodging.address ? (
        <MapsLink
          query={lodging.query ?? lodging.address}
          className="mt-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <MapPin className="size-3.5 shrink-0" />
          {lodging.address}
        </MapsLink>
      ) : null}

      {lodging.checkIn || lodging.checkOut || lodging.room || lodging.phone ? (
        <div className="mt-3 grid gap-1.5">
          {lodging.checkIn ? (
            <DetailRow icon={LogIn} label="入住" value={lodging.checkIn} />
          ) : null}
          {lodging.checkOut ? (
            <DetailRow icon={LogOut} label="退房" value={lodging.checkOut} />
          ) : null}
          {lodging.room ? (
            <DetailRow icon={BedDouble} label="房型" value={lodging.room} />
          ) : null}
          {lodging.phone ? (
            <DetailRow icon={Phone} label="电话" value={lodging.phone} />
          ) : null}
        </div>
      ) : null}

      {lodging.note ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {lodging.note}
        </p>
      ) : null}
    </div>
  );
}

export function StaySection({
  stay,
  onOpenDay,
}: {
  stay: Stay;
  onOpenDay: (index: number) => void;
}) {
  const ref = stay.ref;

  return (
    <Section icon={BedDouble} title="住宿">
      {ref ? (
        <button
          type="button"
          onClick={() => {
            onOpenDay(ref.dayN);
          }}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-left text-sm transition-colors hover:bg-accent"
        >
          <span className="flex items-center gap-2 text-muted-foreground">
            <BedDouble className="size-4 shrink-0" />
            {ref.label}
          </span>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {stay.lodging.map((lodging) => (
            <LodgingCard key={lodging.name} lodging={lodging} />
          ))}
        </div>
      )}

      {stay.note ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {stay.note}
        </p>
      ) : null}

      {stay.bookingUrl ? (
        <a
          href={stay.bookingUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          <MapPin className="size-3.5" />
          Booking.com 搜索 ≤£50/晚
        </a>
      ) : null}
    </Section>
  );
}
