import * as stylex from "@stylexjs/stylex";
import { ViewTransition, type ReactNode } from "react";
import { Card } from "#src/components/shared/card.tsx";
import { svgTokens } from "#src/logos/svg.stylex.ts";
import { color, font, space } from "#src/tokens.stylex.ts";

interface ProjectCardProps extends React.ComponentProps<typeof Card> {
  icon: ReactNode;
  name: string;
  description: string;
}

export function ProjectCard({
  icon,
  name,
  description,
  className,
  style,
  ...rest
}: ProjectCardProps) {
  return (
    <Card {...rest} className={className} style={style} css={styles.card}>
      <div css={styles.row}>
        <div css={styles.logo}>{icon}</div>
        <ViewTransition name={`project-card-name-${name}`}>
          <div css={styles.name}>{name}</div>
        </ViewTransition>
      </div>
      <div css={styles.description}>{description}</div>
    </Card>
  );
}

const styles = stylex.create({
  card: {
    position: "relative",
    color: color.textMuted,
    containerType: "inline-size",
    [svgTokens.fill]: { ":not(:hover)": color.textMuted },
  },
  row: {
    display: "grid",
    gridTemplateColumns: {
      default: "1fr",
      "@container (min-width: 180px)": "64px 1fr",
    },
    alignItems: "center",
    gap: space._0,
    marginBottom: space._1,
  },
  logo: {
    alignItems: "center",
    display: "flex",
    justifyContent: "flex-start",
    minHeight: 0,
    color: svgTokens.fill,
  },
  name: {
    fontSize: {
      default: font.size_0,
      "@container (min-width: 180px)": font.size_1,
      "@container (min-width: 220px)": font.size_3,
      "@container (min-width: 300px)": font.size_4,
    },
    fontWeight: font.weight_7,
    color: color.textMuted,
  },
  description: {
    fontSize: font.size_00,
    fontWeight: font.weight_4,
    color: color.textMuted,
  },
});
