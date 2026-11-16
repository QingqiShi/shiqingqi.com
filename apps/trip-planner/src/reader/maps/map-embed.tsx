import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";

/** A Google Maps embed that loads when it comes near the screen. */
export function MapEmbed({ src, title }: { src: string; title: string }) {
  return (
    <iframe
      src={src}
      title={title}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      allowFullScreen
      css={[styles.frame, corner.radius_3]}
    />
  );
}

const styles = stylex.create({
  frame: {
    display: "block",
    inlineSize: "100%",
    aspectRatio: "16 / 10",
    maxBlockSize: "28rem",
    borderWidth: 0,
    backgroundColor: color.muted,
  },
});
