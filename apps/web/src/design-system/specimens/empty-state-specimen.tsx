import { ListChecksIcon } from "@phosphor-icons/react/dist/ssr/ListChecks";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { space } from "@tuja/ui/tokens.stylex";

/**
 * An icon and a title, with no description or action, so it fits the plate.
 * The `css` override takes out the space that the component keeps above and
 * below it in a card.
 */
export function EmptyStateSpecimen() {
  return (
    <EmptyState
      icon={<ListChecksIcon weight="bold" />}
      title={t({ en: "No rules yet", zh: "还没有规则" })}
      css={styles.compact}
    />
  );
}

const styles = stylex.create({
  compact: {
    paddingBlock: space._0,
  },
});
