import type { ReactElement } from "react";
import type {
  DesignSystemPath,
  DesignSystemSectionPath,
} from "#src/design-system/routes/types.ts";
import accessibility from "./accessibility.png";
import color from "./color.png";
import customization from "./customization.png";
import effectLayer from "./effect-layer.png";
import getStarted from "./get-started.png";
import hooks from "./hooks.png";
import iconography from "./iconography.png";
import layout from "./layout.png";
import material from "./material.png";
import motion from "./motion.png";
import primitives from "./primitives.png";
import principles from "./principles.png";
import surfaces from "./surfaces.png";
import {
  TileIllustration,
  type TileIllustrationArt,
} from "./tile-illustration.tsx";
import typography from "./typography.png";

/**
 * Of the overview section only Get started has a tile, so it is named here
 * rather than taking its whole section.
 */
type IllustratedPath =
  | Extract<DesignSystemPath, "/design-system/get-started">
  | DesignSystemSectionPath<"foundations" | "buildingBlocks">;

/**
 * The card illustration of each overview tile that is not a component; the
 * component tiles show a live specimen instead. Total, so a foundation or
 * building block registered in `design-system-routes.ts` without an
 * illustration fails to compile rather than shipping a blank tile.
 */
const ILLUSTRATIONS: Record<IllustratedPath, TileIllustrationArt> = {
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
  "/design-system/primitives": { src: primitives },
  "/design-system/hooks": { src: hooks },
  "/design-system/effect-layer": { src: effectLayer },
};

/**
 * The same map widened, so the overview can ask about any route. Sound without an
 * assertion because the narrow keys are a subset of the wide ones.
 */
const BY_PATH: Partial<Record<DesignSystemPath, TileIllustrationArt>> =
  ILLUSTRATIONS;

export function getTileIllustration(
  path: DesignSystemPath,
): ReactElement | undefined {
  const art = BY_PATH[path];
  return art ? <TileIllustration {...art} /> : undefined;
}
