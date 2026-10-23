"use client";

import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList, type NavListLinkProps } from "@tuja/ui/components/nav-list";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { Link } from "#src/links/link.tsx";
import { isCurrentDestination } from "./finance-destination-paths.ts";
import {
  PendingScreenMarker,
  useShownFinancePath,
} from "./finance-screen-slot.tsx";
import { useFinanceDestinations } from "./use-finance-destinations.ts";

function DestinationLink(props: NavListLinkProps) {
  return <Link prefetchOnIntent {...props} />;
}

/** The five Finance destinations in the rail at `md` and wider; below `md` the tab bar holds them. */
export function FinanceNav() {
  const locale = useLocale();
  const current = useShownFinancePath();
  const destinations = useFinanceDestinations();

  return (
    <nav aria-label={t({ en: "Finance", zh: "家庭账本" })}>
      <NavList linkComponent={DestinationLink}>
        {destinations.map((destination) => (
          <NavLink
            key={destination.path}
            href={getLocalePath(destination.path, locale)}
            current={isCurrentDestination(current, destination.path)}
            leading={<destination.icon weight="bold" role="presentation" />}
          >
            {destination.label}
            <PendingScreenMarker href={destination.path} />
          </NavLink>
        ))}
      </NavList>
    </nav>
  );
}
