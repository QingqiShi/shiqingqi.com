import type { Icon } from "@phosphor-icons/react";
import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import { svgTokens } from "#src/brand/svg.stylex.ts";
import { Card } from "#src/links/card.tsx";

interface ProjectCardProps extends React.ComponentProps<typeof Card> {
  icon: Icon;
  name: string;
  description: string;
}

export function ProjectCard({
  icon: ProjectIcon,
  name,
  description,
  css,
  ...rest
}: ProjectCardProps) {
  return (
    <Card {...rest} css={[stack.tight, styles.card, css]}>
      <div css={styles.row}>
        <ProjectIcon
          weight="fill"
          aria-hidden="true"
          {...stylex.props(styles.logo)}
        />
        <div css={[typeRole.cardTitle, styles.name]}>{name}</div>
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
    [svgTokens.fill]: {
      ":not(:hover)": {
        default: null,
        [pointer.canHover]: color.fgMuted,
      },
    },
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
  // This box has the same size as the brand logos on the other cards. That
  // size is not a step of a type role or of controlSize, thus the icon fills
  // the box.
  logo: {
    inlineSize: "64px",
    blockSize: "64px",
    color: svgTokens.fill,
  },
  name: {
    color: color.fgMuted,
  },
});
