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
 * The default `OptionCard` indicator: an empty ring or box at rest, a filled
 * dot or tick once selected. The mark appearing is the state change, so
 * selection reads without relying on colour (WCAG 1.4.1). The dot or tick
 * grows from the centre of the mark on the spring, and shrinks back
 * into it.
 * @internal
 */
export function SelectionMark({
  role,
  selected,
}: {
  role: OptionCardRole;
  selected: boolean;
}) {
  const shownRef = useRef<HTMLSpanElement>(null);
  const engine = useMotionEngine();
  const shown = useMotionValue(engine, selected ? 1 : 0, {
    spring: MARK_SPRING,
  });
  useBinding(shownRef, shown, { pose: markPose, reducedPose: reducedMarkPose });
  useLayoutEffect(() => {
    const target = selected ? 1 : 0;
    if (shown.target === target) return;
    shown.to(target, { reduced: REDUCED_FADE });
  }, [selected, shown]);

  return (
    <span
      css={[
        flex.inlineCenter,
        shrink._0,
        transition.colors,
        markStyles.base,
        // The nested-corner rule: the card radius minus the 8px inset of the
        // mark.
        role === "radio" ? corner.radius_round : corner.radius_2,
        optionCardPart.mark,
      ]}
    >
      {role === "radio" ? (
        <span
          ref={shownRef}
          css={[corner.radius_round, markStyles.dot, optionCardPart.markShown]}
        />
      ) : (
        <span
          ref={shownRef}
          // The caption size does not scale, as the mark does not. It makes
          // the tick three quarters of the mark.
          css={[typeRole.caption, flex.inlineCenter, optionCardPart.markShown]}
        >
          <CheckIcon weight="bold" />
        </span>
      )}
    </span>
  );
}

const markStyles = stylex.create({
  base: {
    boxSizing: "border-box",
    inlineSize: optionCardMark.size,
    blockSize: optionCardMark.size,
    borderWidth: border.size_1,
    borderStyle: "solid",
    color: color.bgSurface,
  },
  dot: {
    inlineSize: `calc(${optionCardMark.size} / 2)`,
    blockSize: `calc(${optionCardMark.size} / 2)`,
    backgroundColor: color.bgSurface,
  },
});
