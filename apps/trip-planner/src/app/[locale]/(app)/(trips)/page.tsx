import { SuitcaseRollingIcon } from "@phosphor-icons/react/dist/ssr/SuitcaseRolling";
import { t } from "@tuja/i18n";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { getTrips, getViewerId } from "#src/trips/get-trips.ts";

/** Beside the trip list, before a trip is open. Where the list has no room, the list is this page. */
export default async function HomePage() {
  const icon = <SuitcaseRollingIcon weight="bold" />;
  if ((await getViewerId()) === null) {
    return (
      <EmptyState
        level={2}
        icon={icon}
        title={t({ en: "Sign in to see your trips", zh: "登录后查看你的行程" })}
        description={t({
          en: "A trip shows only to its members.",
          zh: "行程只对其成员可见。",
        })}
      />
    );
  }
  if ((await getTrips()).length === 0) {
    return (
      <EmptyState
        level={2}
        icon={icon}
        title={t({ en: "No trips yet", zh: "还没有行程" })}
        description={t({
          en: "You see a trip when you are one of its members.",
          zh: "成为某个行程的成员后，就能看到它。",
        })}
      />
    );
  }
  return (
    <EmptyState
      level={2}
      icon={icon}
      title={t({ en: "Pick a trip", zh: "选择一个行程" })}
    />
  );
}
