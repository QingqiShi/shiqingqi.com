"use client";

import { XIcon } from "@phosphor-icons/react/X";
import * as stylex from "@stylexjs/stylex";
import {
  useDeferredValue,
  ViewTransition,
  type PropsWithChildren,
} from "react";
import { createPortal } from "react-dom";
import { RemoveScroll } from "react-remove-scroll";
import { breakpoints } from "@/breakpoints.stylex";
import { usePortalTarget } from "@/contexts/portal-context";
import { border, color, layer, space } from "@/tokens.stylex";
import { Button } from "./button";

interface OverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Overlay({
  children,
  isOpen,
  onClose,
}: PropsWithChildren<OverlayProps>) {
  const portalTarget = usePortalTarget();
  const deferredIsOpen = useDeferredValue(isOpen);

  if (!deferredIsOpen || !portalTarget) {
    return null;
  }

  return createPortal(
    <>
      <ViewTransition>
        <div css={styles.backdrop} onClick={onClose} />
      </ViewTransition>
      <ViewTransition enter="slide-in" exit="slide-out">
        <RemoveScroll enabled={deferredIsOpen} allowPinchZoom forwardProps>
          <div css={styles.content}>
            <Button
              css={styles.closeButton}
              icon={<XIcon />}
              onClick={onClose}
            />
            {children}
          </div>
        </RemoveScroll>
      </ViewTransition>
    </>,
    portalTarget,
  );
}

const styles = stylex.create({
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: layer.tooltip,
    pointerEvents: "all",
  },
  closeButton: {
    position: "absolute",
    right: { default: space._2, [breakpoints.md]: space._5 },
    top: { default: space._2, [breakpoints.md]: space._5 },
  },
  content: {
    position: "absolute",
    top: space._8,
    left: 0,
    width: "calc(100% - var(--removed-body-scroll-bar-size, 0px))",
    height: `100%`,
    backgroundColor: color.backgroundRaised,
    paddingBottom: space._8,
    zIndex: layer.tooltip,
    borderRadius: border.radius_4,
    overflow: "hidden",
    pointerEvents: "all",
  },
});
