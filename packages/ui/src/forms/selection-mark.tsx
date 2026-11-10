import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import * as stylex from "@stylexjs/stylex";
import { useLayoutEffect, useRef } from "react";
import { color } from "../color.stylex.ts";
import { cssTween } from "../motion/css-tween.ts";
import { unit } from "../motion/mix.ts";
import type { Styles } from "../motion/px.ts";
import { springOf, springRoles } from "../motion/spring-roles.ts";
import { useBinding } from "../motion/use-binding.ts";
import {
  useMotionEngine,
  useMotionValue,
} from "../motion/use-motion-engine.ts";
import { corner } from "../primitives/corner.stylex.ts";
import { flex, shrink } from "../primitives/flex.stylex.ts";
import { duration, easing, transition } from "../primitives/motion.stylex.ts";
import { typeRole } from "../primitives/type.stylex.ts";
import { border } from "../tokens.stylex.ts";
import { optionCardMark, optionCardPart } from "./option-card.stylex.ts";
import type { OptionCardRole } from "./option-card.tsx";

const MARK_SPRING = springOf(springRoles.surface);
const REDUCED_FADE = cssTween(duration._150, easing.ease);

function markPose(shown: number): Styles {
  return {
    transform: `scale(${Math.max(0, shown).toFixed(4)})`,
    opacity: "1",
  };
}

function reducedMarkPose(shown: number): Styles {
  return { transform: "none", opacity: unit(shown).toFixed(3) };
}

/**
 * The default `OptionCard` indicator: an empty ring or box at rest. Once
 * selected, a radio shows a heavier ring around a dot, and a checkbox a filled
 * box with a tick. The mark appearing is the state change, so
 * selection reads without relying on colour (WCAG 1.4.1). The dot or tick
 * grows from the centre of the mark on the spring, and shrinks back
 * into it.
 *
 * With `fillGrows`, the ring does not follow the card's ARIA state: the fill
 * grows in with the dot, so that the mark can wait for the plate of its
 * group.
 * @internal
 */
export function SelectionMark({
  role,
  selected,
  fillGrows = false,
}: {
  role: OptionCardRole;
  selected: boolean;
  fillGrows?: boolean;
}) {
  const shownRef = useRef<HTMLSpanElement>(null);
  const engine = useMotionEngine();
  const shown = useMotionValue(engine, selected ? 1 : 0, {
    spring: MARK_SPRING,
  });
  useBinding(shownRef, shown, {
    pose: markPose,
    reducedPose: reducedMarkPose,
    // WebKit does not draw the cards of a group while the mark moves on the
    // compositor.
    renderer: "frame",
  });
  useLayoutEffect(() => {
    const target = selected ? 1 : 0;
    if (shown.target === target) return;
    shown.to(target, { reduced: REDUCED_FADE });
  }, [selected, shown]);

  // The nested-corner rule: the card radius minus the 8px inset of the mark.
  const outline = role === "radio" ? corner.radius_round : corner.radius_2;
  return (
    <span
      css={[
        flex.inlineCenter,
        shrink._0,
        transition.colors,
        markStyles.base,
        outline,
        role === "radio" || fillGrows ? markStyles.ring : optionCardPart.mark,
      ]}
    >
      <span
        ref={shownRef}
        css={[
          flex.inlineCenter,
          markStyles.shown,
          outline,
          role === "radio"
            ? markStyles.checkedRing
            : fillGrows && markStyles.fill,
          !selected && markStyles.hidden,
        ]}
      >
        {role === "radio" ? (
          <span css={[corner.radius_round, markStyles.dot]} />
        ) : (
          // The caption size does not scale, as the mark does not. It makes
          // the tick three quarters of the mark.
          <span css={[typeRole.caption, flex.inlineCenter]}>
            <CheckIcon weight="bold" />
          </span>
        )}
      </span>
    </span>
  );
}

const markStyles = stylex.create({
  base: {
    position: "relative",
    boxSizing: "border-box",
    inlineSize: optionCardMark.size,
    blockSize: optionCardMark.size,
    borderWidth: border.size_1,
    borderStyle: "solid",
    color: color.bgSurface,
  },
  ring: {
    borderColor: color.borderControl,
  },
  // It covers the ring, so that a fill can rise past it.
  shown: {
    position: "absolute",
    inset: `calc(-1 * ${border.size_1})`,
  },
  fill: {
    backgroundColor: color.fg,
  },
  // A dot in the colour of the surface reads as a hole in a filled disc, so
  // the checked radio has the ink in its centre.
  checkedRing: {
    borderWidth: border.size_2,
    borderStyle: "solid",
    borderColor: color.fg,
  },
  hidden: {
    transform: "scale(0)",
  },
  dot: {
    inlineSize: `calc(${optionCardMark.size} / 2)`,
    blockSize: `calc(${optionCardMark.size} / 2)`,
    backgroundColor: color.fg,
  },
});
