import { SuitcaseRollingIcon } from "@phosphor-icons/react/dist/ssr/SuitcaseRolling";
import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { EmptyState } from "@tuja/ui/components/empty-state";
import type { Metadata } from "next";
import { LandingPage } from "#src/landing/landing-page.tsx";
import { publicPageMetadata } from "#src/landing/public-page-metadata.ts";
import { getTrips, getViewerId } from "#src/trips/get-trips.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const locale = validateLocale((await props.params).locale);
  if ((await getViewerId()) !== null) return {};
  return {
    title: {
      absolute: t({
        en: "Trips: one plan for everyone on the trip",
        zh: "旅行计划：同行的每个人，看同一份行程",
      }),
    },
    description: t({
      en: "A group’s trip on one page, day by day, on a phone: flights, places, food and beds. It reads offline after one visit.",
      zh: "把结伴旅行按天放在一页上，手机上就能看：航班、景点、餐厅和住宿。打开过一次，离线也能看。",
    }),
    ...publicPageMetadata("/", locale),
  };
}

/**
 * The landing page for a visitor who is not signed in. For a member, it is
 * beside the trip list before a trip is open; where the list has no room,
 * the list is this page.
 */
export default async function HomePage() {
  const icon = <SuitcaseRollingIcon weight="bold" />;
  if ((await getViewerId()) === null) return <LandingPage />;
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
