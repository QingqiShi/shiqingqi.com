import type { ReactElement } from "react";
import type { DesignSystemPath } from "#src/components/design-system/routes.ts";
import { AvatarPreview } from "./avatar-preview.tsx";
import { BadgePreview } from "./badge-preview.tsx";
import { ButtonPreview } from "./button-preview.tsx";
import { CalloutPreview } from "./callout-preview.tsx";
import { CardPreview } from "./card-preview.tsx";
import { CheckboxPreview } from "./checkbox-preview.tsx";
import { ChipPreview } from "./chip-preview.tsx";
import { DisclosurePreview } from "./disclosure-preview.tsx";
import { DividerPreview } from "./divider-preview.tsx";
import { HeaderFooterLayoutPreview } from "./header-footer-layout-preview.tsx";
import { HeadingPreview } from "./heading-preview.tsx";
import { IconButtonPreview } from "./icon-button-preview.tsx";
import { MenuButtonPreview } from "./menu-button-preview.tsx";
import { OverlayPreview } from "./overlay-preview.tsx";
import { SectionPreview } from "./section-preview.tsx";
import { SegmentedControlPreview } from "./segmented-control-preview.tsx";
import { SelectPreview } from "./select-preview.tsx";
import { SidebarLayoutPreview } from "./sidebar-layout-preview.tsx";
import { SkeletonPreview } from "./skeleton-preview.tsx";
import { SpinnerPreview } from "./spinner-preview.tsx";
import { SwitchPreview } from "./switch-preview.tsx";
import { TextFieldPreview } from "./text-field-preview.tsx";
import { TextPreview } from "./text-preview.tsx";
import { TextareaPreview } from "./textarea-preview.tsx";

interface ComponentPreview {
  element: ReactElement;
  /**
   * Fills the plate edge to edge instead of sitting on it as a scaled
   * thumbnail. Set by the three miniatures whose subject is a whole page: a
   * page reads as a page when it fills its frame and as a floating card when it
   * doesn't. They also need no scaling-down to say "not a working control" —
   * a wireframe already says that by being a wireframe, whereas a real `Button`
   * at full size does not.
   */
  fillsPlate?: boolean;
}

/**
 * Maps each components route to the specimen shown in its overview tile. The
 * counterpart to `foundation-illustrations/`: foundations get abstract art
 * because a token has no rendered form, whereas a component does — so these are
 * the real components, rendered live, and they cannot drift from the thing they
 * advertise. The four that a tile physically cannot host (Overlay, Menu button,
 * and the two page shells) fall back to a miniature drawn from the same tokens;
 * each preview's own doc comment says why.
 *
 * Values are ready-made elements, matching how the illustrations map works. The
 * overview renders them inside an `inert` tray, so a preview must never depend
 * on interaction or hold state of its own.
 *
 * `fillsPlate` rides along on the entry rather than living in a second map
 * keyed by the same routes: two structures over one key space have to be edited
 * together, and a path present in only the second one fails silently. Note it
 * is not derivable from "uses `wireframe.page`" — the Menu button preview is a
 * hand-composed diagram too, but its subject is a control, so it sits on the
 * plate with the rest.
 */
const COMPONENT_PREVIEWS: Partial<Record<DesignSystemPath, ComponentPreview>> =
  {
    "/design-system/components/text": { element: <TextPreview /> },
    "/design-system/components/heading": { element: <HeadingPreview /> },
    "/design-system/components/button": { element: <ButtonPreview /> },
    "/design-system/components/icon-button": { element: <IconButtonPreview /> },
    "/design-system/components/menu-button": { element: <MenuButtonPreview /> },
    "/design-system/components/chip": { element: <ChipPreview /> },
    "/design-system/components/badge": { element: <BadgePreview /> },
    "/design-system/components/avatar": { element: <AvatarPreview /> },
    "/design-system/components/callout": { element: <CalloutPreview /> },
    "/design-system/components/card": { element: <CardPreview /> },
    "/design-system/components/section": { element: <SectionPreview /> },
    "/design-system/components/disclosure": { element: <DisclosurePreview /> },
    "/design-system/components/spinner": { element: <SpinnerPreview /> },
    "/design-system/components/skeleton": { element: <SkeletonPreview /> },
    "/design-system/components/divider": { element: <DividerPreview /> },
    "/design-system/components/switch": { element: <SwitchPreview /> },
    "/design-system/components/text-field": { element: <TextFieldPreview /> },
    "/design-system/components/textarea": { element: <TextareaPreview /> },
    "/design-system/components/checkbox": { element: <CheckboxPreview /> },
    "/design-system/components/segmented-control": {
      element: <SegmentedControlPreview />,
    },
    "/design-system/components/select": { element: <SelectPreview /> },
    "/design-system/components/overlay": {
      element: <OverlayPreview />,
      fillsPlate: true,
    },
    "/design-system/components/sidebar-layout": {
      element: <SidebarLayoutPreview />,
      fillsPlate: true,
    },
    "/design-system/components/header-footer-layout": {
      element: <HeaderFooterLayoutPreview />,
      fillsPlate: true,
    },
  };

export function getComponentPreview(path: DesignSystemPath) {
  return COMPONENT_PREVIEWS[path];
}
