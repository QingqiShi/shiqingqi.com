"use client";

import * as stylex from "@stylexjs/stylex";
import { Switch } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { useId, useState } from "react";
import { t } from "#src/i18n.ts";
import { measure } from "../../measure.stylex.ts";
import { MovieDetailScreen } from "./movie-detail-screen.tsx";

/**
 * The exemplar and its one piece of documentation chrome: a switch that turns
 * the screen's region annotations on.
 *
 * The switch owns the state and the screen consumes it, which is why this
 * boundary exists at all — the composed screen has to be able to render without
 * a trace of documentation on it, and the reader has to be able to ask what
 * everything is without leaving the page.
 */
export function MovieDetailExemplar() {
  const [annotated, setAnnotated] = useState(false);
  const switchId = useId();
  const helperId = useId();

  return (
    <div css={styles.exemplar}>
      <div css={styles.toggle}>
        <div css={styles.toggleControl}>
          {/*
            A real `<label>` bound by `htmlFor`, so the caption is a hit target as
            well as a name — `Switch` renders the input and takes native
            attributes, but it ships no label of its own.
          */}
          <label css={styles.toggleLabel} htmlFor={switchId}>
            {t({ en: "Annotate the composition", zh: "标注组成结构" })}
          </label>
          <Switch
            id={switchId}
            aria-describedby={helperId}
            value={annotated ? "on" : "off"}
            onChange={(next) => {
              setAnnotated(next === "on");
            }}
          />
        </div>
        <Text
          id={helperId}
          variant="caption"
          tone="subtle"
          css={styles.toggleHelper}
        >
          {t({
            en: "Outlines each region and names the @tuja/ui entry points it composes.",
            zh: "为每个区域勾出轮廓，并列出它所组合的 @tuja/ui 入口。",
          })}
        </Text>
      </div>
      <MovieDetailScreen annotated={annotated} />
    </div>
  );
}

const styles = stylex.create({
  exemplar: {
    display: "flex",
    flexDirection: "column",
    gap: space._3,
  },
  toggle: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: space._0,
  },
  // The switch sits next to its label rather than at the far end of the column.
  // A settings row pushes the control to the trailing edge because every row in
  // the list shares that edge; one lone switch out there is a thousand pixels
  // from the words that name it.
  toggleControl: {
    display: "flex",
    alignItems: "center",
    gap: space._2,
  },
  toggleLabel: {
    color: color.textMain,
    cursor: "pointer",
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_5,
  },
  toggleHelper: {
    maxInlineSize: measure.prose,
  },
});
