import * as stylex from "@stylexjs/stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

interface SettingsPanelProps {
  title: string;
  description?: string;
  /** Buttons beside the title, such as "Add". */
  actions?: ReactNode;
  children: ReactNode;
}

/** One Settings section: its title, a line on what it holds, and its content. */
export function SettingsPanel({
  title,
  description,
  actions,
  children,
}: SettingsPanelProps) {
  return (
    <section css={stack.group}>
      <div css={stack.tight}>
        <div css={[cluster.item, styles.header]}>
          <Heading level={2} look="h3">
            {title}
          </Heading>
          {actions ? <div css={cluster.tight}>{actions}</div> : null}
        </div>
        {description ? (
          <Text look="bodySmall" tone="muted">
            {description}
          </Text>
        ) : null}
      </div>
      {children}
    </section>
  );
}

const styles = stylex.create({
  header: {
    justifyContent: "space-between",
    rowGap: rhythm.tight,
  },
});
