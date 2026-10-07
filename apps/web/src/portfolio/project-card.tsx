import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { color, font, rhythm } from "@tuja/ui/tokens.stylex";
import { type ReactNode } from "react";
import { svgTokens } from "#src/brand/svg.stylex.ts";
import { Card } from "#src/links/card.tsx";

interface ProjectCardProps extends React.ComponentProps<typeof Card> {
  icon: ReactNode;
  name: string;
  description: string;
}

export function ProjectCard({
  icon,
  name,
  description,
  css,
  ...rest
}: ProjectCardProps) {
  return (
    <Card {...rest} css={[stack.tight, styles.card, css]}>
      <div css={styles.row}>
        <div css={[flex.row, styles.logo]}>{icon}</div>
        <div css={styles.name}>{name}</div>
      </div>
      <Text as="div" look="bodySmall" tone="muted">
        {description}
      </Text>
    </Card>
  );
}

const styles = stylex.create({
  card: {
    position: "relative",
    color: color.fgMuted,
    containerType: "inline-size",
    [svgTokens.fill]: { ":not(:hover)": color.fgMuted },
  },
  row: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      "@container (min-width: 180px)": "64px 1fr",
    },
    alignItems: "center",
    gap: rhythm.tight,
  },
  logo: {
    minBlockSize: 0,
    color: svgTokens.fill,
  },
  name: {
    fontSize: font.cqTitle,
    fontWeight: font.weight_7,
    color: color.fgMuted,
  },
});
