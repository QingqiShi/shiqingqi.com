import type { ReactElement } from "react";
import type {
  DesignSystemFoundationPath,
  DesignSystemPath,
} from "#src/design-system/routes/types.ts";
import { AccessibilityIllustration } from "./accessibility-illustration.tsx";
import { ColorIllustration } from "./color-illustration.tsx";
import { CustomizationIllustration } from "./customization-illustration.tsx";
import { GetStartedIllustration } from "./get-started-illustration.tsx";
import { IconographyIllustration } from "./iconography-illustration.tsx";
import { LayoutIllustration } from "./layout-illustration.tsx";
import { MaterialIllustration } from "./material-illustration.tsx";
import { MotionIllustration } from "./motion-illustration.tsx";
import { SurfacesIllustration } from "./surfaces-illustration.tsx";
import { TypographyIllustration } from "./typography-illustration.tsx";

/**
 * Each foundations route's card illustration; other overview cards render without
 * one. Total, so a foundation registered in `routes.ts` without an illustration
 * fails to compile rather than shipping a blank tile.
 */
const FOUNDATION_ILLUSTRATIONS: Record<
  DesignSystemFoundationPath,
  ReactElement
> = {
  "/design-system/foundations/get-started": <GetStartedIllustration />,
  "/design-system/foundations/customization": <CustomizationIllustration />,
  "/design-system/foundations/color": <ColorIllustration />,
  "/design-system/foundations/typography": <TypographyIllustration />,
  "/design-system/foundations/layout": <LayoutIllustration />,
  "/design-system/foundations/surfaces": <SurfacesIllustration />,
  "/design-system/foundations/material": <MaterialIllustration />,
  "/design-system/foundations/iconography": <IconographyIllustration />,
  "/design-system/foundations/motion": <MotionIllustration />,
  "/design-system/foundations/accessibility": <AccessibilityIllustration />,
};

/**
 * The same map widened, so the overview can ask about any route. Sound without an
 * assertion because the narrow keys are a subset of the wide ones.
 */
const BY_PATH: Partial<Record<DesignSystemPath, ReactElement>> =
  FOUNDATION_ILLUSTRATIONS;

export function getFoundationIllustration(
  path: DesignSystemPath,
): ReactElement | undefined {
  return BY_PATH[path];
}
