import type { ReactElement } from "react";
import type {
  DesignSystemFoundationPath,
  DesignSystemPath,
} from "#src/design-system/routes/types.ts";
import accessibility from "./accessibility.png";
import color from "./color.png";
import customization from "./customization.png";
import {
  FoundationIllustration,
  type FoundationIllustrationArt,
} from "./foundation-illustration.tsx";
import getStarted from "./get-started.png";
import iconography from "./iconography.png";
import layout from "./layout.png";
import material from "./material.png";
import motion from "./motion.png";
import principles from "./principles.png";
import surfaces from "./surfaces.png";
import typography from "./typography.png";

/**
 * Get started is not a foundation, but it is the first tile on the overview. It
 * has art so that it is not shorter than the foundation tiles below it.
 */
type IllustratedPath =
  | Extract<DesignSystemPath, "/design-system/get-started">
  | DesignSystemFoundationPath;

/**
 * The card illustration of Get started and of each foundations route; the other
 * overview cards render without one. Total, so a foundation registered in
 * `routes.ts` without an illustration fails to compile rather than shipping a
 * blank tile.
 */
const ILLUSTRATIONS: Record<IllustratedPath, FoundationIllustrationArt> = {
  "/design-system/get-started": { src: getStarted },
  "/design-system/foundations/principles": {
    src: principles,
    bleeds: "inline-end",
  },
  "/design-system/foundations/customization": { src: customization },
  "/design-system/foundations/color": { src: color, bleeds: "block-end" },
  "/design-system/foundations/typography": { src: typography },
  "/design-system/foundations/layout": { src: layout, bleeds: "inline-end" },
  "/design-system/foundations/surfaces": {
    src: surfaces,
    bleeds: "inline-end",
  },
  "/design-system/foundations/material": { src: material },
  "/design-system/foundations/iconography": { src: iconography },
  "/design-system/foundations/motion": { src: motion },
  "/design-system/foundations/accessibility": { src: accessibility },
};

/**
 * The same map widened, so the overview can ask about any route. Sound without an
 * assertion because the narrow keys are a subset of the wide ones.
 */
const BY_PATH: Partial<Record<DesignSystemPath, FoundationIllustrationArt>> =
  ILLUSTRATIONS;

export function getFoundationIllustration(
  path: DesignSystemPath,
): ReactElement | undefined {
  const art = BY_PATH[path];
  return art ? <FoundationIllustration {...art} /> : undefined;
}
