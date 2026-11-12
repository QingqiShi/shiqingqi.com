"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import {
  usePathname,
  useRouter,
  useSelectedLayoutSegments,
} from "next/navigation";
import { useSyncExternalStore, type ReactNode } from "react";
import { useBackOverride } from "#src/site-shell/back-override-provider.tsx";

const subscribeToNothing = () => () => {};

/**
 * The search of the URL as it is at this render. `useSearchParams` makes a
 * page that Next prerenders wait for the browser, and only the open chat,
 * which the visitor opens after that, needs the search.
 */
function useSearchNow() {
  return useSyncExternalStore(
    subscribeToNothing,
    () => window.location.search,
    () => "",
  );
}

interface MovieDatabaseStackProps {
  locale: SupportedLocale;
  /** The theme and language controls of the site. */
  toolbar: ReactNode;
  children: ReactNode;
}

/**
 * The screen of the movie database. The list leads back to the home page, a
 * title leads back to the list, and the open chat leads back to the list too.
 */
export function MovieDatabaseStack({
  locale,
  toolbar,
  children,
}: MovieDatabaseStackProps) {
  const isTitle = useSelectedLayoutSegments().some(
    (segment) => !segment.startsWith("("),
  );
  const label = t({ en: "Movie database", zh: "影视数据库" });
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchNow();
  // While the chat is open, the way back closes it and stays on the list. The
  // link then leads to the URL that shows already, which the screen replaces.
  const { hasBackOverride, triggerBack } = useBackOverride();
  const here = `${pathname}${search}`;
  return (
    <NavigationStack
      label={label}
      css={pageColumn.wide}
      toolbar={toolbar}
      flush
      replace={(href) => {
        if (hasBackOverride) {
          triggerBack();
        } else {
          router.replace(href);
        }
      }}
      back={
        hasBackOverride
          ? { href: here, label }
          : isTitle
            ? { href: getLocalePath("/movie-database", locale), label }
            : {
                href: getLocalePath("/", locale),
                label: t({ en: "Home", zh: "首页" }),
              }
      }
    >
      {children}
    </NavigationStack>
  );
}
