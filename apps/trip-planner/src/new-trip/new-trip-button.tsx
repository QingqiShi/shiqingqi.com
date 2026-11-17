"use client";

import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import {
  TabViewIconsOnly,
  TabViewLabelsOnly,
} from "@tuja/ui/components/tab-view";
import { tabViewWidth } from "@tuja/ui/primitives/view-width.stylex";
import type { StyleProp } from "@tuja/ui/types";
import { useOpenNewTrip } from "./new-trip-provider.tsx";

/** The button that opens the New trip sheet, such as the action of an empty list. */
export function NewTripButton({
  iconOnly = false,
  size = "md",
  css,
}: {
  iconOnly?: boolean;
  size?: "md" | "lg";
  css?: StyleProp;
}) {
  const open = useOpenNewTrip();
  const label = t({ en: "New trip", zh: "新建行程" });
  return (
    <Button
      look="primary"
      size={size}
      icon={<PlusIcon weight="bold" />}
      aria-label={iconOnly ? label : undefined}
      css={css}
      onClick={(event) => {
        open(event.currentTarget);
      }}
    >
      {iconOnly ? null : label}
    </Button>
  );
}

/** New trip at the top of the sidebar, and as an icon in the rail. */
export function NewTripRailAction() {
  return (
    <div css={styles.railLine}>
      <TabViewIconsOnly>
        <NewTripButton iconOnly size="lg" />
      </TabViewIconsOnly>
      <TabViewLabelsOnly>
        <NewTripButton css={styles.wide} />
      </TabViewLabelsOnly>
    </div>
  );
}

/**
 * New trip as the action of the empty trip list where the rail shows. Where
 * the tab bar shows, `NewTripFloatingButton` is the action, in reach of the
 * thumb.
 */
export function NewTripEmptyAction() {
  return (
    <div css={styles.railOnly}>
      <NewTripButton />
    </div>
  );
}

/** New trip over the trip list, in reach of the thumb, where the tab bar shows and the rail does not. */
export function NewTripFloatingButton() {
  return (
    <div css={styles.barOnly}>
      <NewTripButton size="lg" />
    </div>
  );
}

const styles = stylex.create({
  railLine: {
    gridColumn: "1 / -1",
    justifySelf: "stretch",
    textAlign: "center",
  },
  wide: {
    inlineSize: "100%",
  },
  barOnly: {
    display: { default: "block", [tabViewWidth.fromRail]: "none" },
  },
  railOnly: {
    display: { default: "none", [tabViewWidth.fromRail]: "block" },
  },
});
