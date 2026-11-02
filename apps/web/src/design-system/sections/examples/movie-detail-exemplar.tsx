"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Switch } from "@tuja/ui/components/switch";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { measure } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
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

  return (
    <div css={stack.item}>
      <Switch
        css={styles.toggle}
        label={t({ en: "Annotate the composition", zh: "标注组成结构" })}
        description={t({
          en: "Outlines each region and names the @tuja/ui entry points it composes.",
          zh: "为每个区域勾出轮廓，并列出它所组合的 @tuja/ui 入口。",
        })}
        value={annotated ? "on" : "off"}
        onChange={(next) => {
          setAnnotated(next === "on");
        }}
      />
      <MovieDetailScreen annotated={annotated} />
    </div>
  );
}

const styles = stylex.create({
  toggle: { maxInlineSize: measure.form },
});
