import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import {
  TabViewBrand,
  TabViewIconsOnly,
  TabViewLabelsOnly,
  TabViewLink,
} from "@tuja/ui/components/tab-view";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { controlSize } from "@tuja/ui/tokens.stylex";
import { FinanceLogo } from "../pwa/finance-logo.tsx";
import { FinanceRailAdd } from "./finance-rail-add.tsx";

/**
 * The top of the sidebar and of the rail: the Finance mark with the name of
 * the Household, a link to the Net worth screen, and the Add action on its
 * own line.
 */
export function FinanceRailHeader({
  locale,
  householdName,
}: {
  locale: SupportedLocale;
  householdName: string;
}) {
  const name = t({ en: "Finance", zh: "家庭账本" });
  return (
    <>
      <TabViewLink
        href={getLocalePath("/", locale)}
        aria-label={name}
        {...stylex.props(corner.radius_3, a11y.focusRing, styles.brand)}
      >
        <TabViewBrand
          name={name}
          detail={householdName}
          mark={<FinanceLogo css={styles.logo} />}
        />
      </TabViewLink>
      <div css={styles.add}>
        <TabViewIconsOnly>
          <FinanceRailAdd />
        </TabViewIconsOnly>
        <TabViewLabelsOnly>
          <FinanceRailAdd labelled />
        </TabViewLabelsOnly>
      </div>
    </>
  );
}

const styles = stylex.create({
  brand: {
    display: "inline-flex",
    minInlineSize: 0,
    color: "inherit",
    textDecoration: "none",
  },
  logo: {
    inlineSize: controlSize._9,
    blockSize: controlSize._9,
  },
  // The line of the Add action, as wide as the sidebar.
  add: {
    gridColumn: "1 / -1",
    justifySelf: "stretch",
    textAlign: "center",
  },
});
