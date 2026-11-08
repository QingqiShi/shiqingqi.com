import * as stylex from "@stylexjs/stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { SvgMarkup } from "./svg-markup.tsx";

type DrawingProps = {
  svg: string;
  alt: string;
  /** Read the change aloud when the drawing changes, as the pet's line does. */
  live?: boolean;
};

/** An SVG drawing of the pet code, inline so that it takes the page's theme. */
export function Drawing({ svg, alt, live = false }: DrawingProps) {
  return (
    <div css={styles.drawing}>
      <div aria-live={live ? "polite" : undefined} css={a11y.srOnly}>
        {alt}
      </div>
      <div aria-hidden>
        <SvgMarkup markup={svg} />
      </div>
    </div>
  );
}

const styles = stylex.create({
  drawing: {
    position: "relative",
    lineHeight: 0,
  },
});
