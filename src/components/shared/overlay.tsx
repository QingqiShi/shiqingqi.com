"use client";

import { XIcon } from "@phosphor-icons/react/X";
import * as stylex from "@stylexjs/stylex";

import {
  Activity,
  ViewTransition,
  startTransition,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { createPortal } from "react-dom";
import { RemoveScroll } from "react-remove-scroll";
import { breakpoints } from "@/breakpoints.stylex";
import { border, color, layer, shadow, space } from "@/tokens.stylex";
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
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setIsMounted(true);
    });
  }, []);

  if (!isMounted) {
    return null;
  }

  return createPortal(
    <ViewTransition name="overlay" enter="slide-in" exit="slide-out">
      <Activity mode={isOpen ? "visible" : "hidden"}>
        <RemoveScroll enabled={isOpen} allowPinchZoom>
          <div css={styles.backdrop} onClick={onClose} />
          <div css={styles.content}>
            <Button
              css={styles.closeButton}
              icon={<XIcon />}
              onClick={onClose}
            />
            {children}
          </div>
        </RemoveScroll>
      </Activity>
    </ViewTransition>,
    document.body,
  );
}

const styles = stylex.create({
  backdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100dvw",
    height: "100dvh",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: layer.tooltip,
  },
  closeButton: {
    position: "absolute",
    right: { default: space._2, [breakpoints.md]: space._5 },
    top: { default: space._2, [breakpoints.md]: space._5 },
  },
  content: {
    position: "fixed",
    top: space._8,
    left: 0,
    right: 0,
    height: "100dvh",
    backgroundColor: color.backgroundRaised,
    paddingBottom: space._8,
    zIndex: layer.tooltip,
    borderRadius: border.radius_4,
    overflow: "hidden",
    boxShadow: shadow._6,
  },
});
