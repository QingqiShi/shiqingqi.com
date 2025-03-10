import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";
import { Card } from "@/components/shared/card";
import { svgTokens } from "@/logos/svg.stylex";
import { color, font, space } from "@/tokens.stylex";

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
        <div css={styles.name}>{name}</div>
      </div>
      <div css={styles.description}>{description}</div>
    </Card>
  );
}

const styles = stylex.create({
  card: {
    position: "relative",
    color: color.textMuted,
    [svgTokens.fill]: { ":not(:hover)": color.textMuted },
  },
  row: {
    display: "grid",
    gridTemplateColumns: "64px 1fr",
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
    fontSize: font.size_0,
    fontWeight: font.weight_7,
    color: color.textMuted,
  },
  description: {
    fontSize: font.size_00,
    fontWeight: font.weight_4,
    color: color.textMuted,
  },
});
