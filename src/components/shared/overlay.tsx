import { X } from "@phosphor-icons/react/X";
import * as stylex from "@stylexjs/stylex";

import type { PropsWithChildren } from "react";
import { breakpoints } from "@/breakpoints";
import { useCssId } from "@/hooks/use-css-id";
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
  const id = useCssId();

  return (
    <>
      {/* Using inline style until the new viewTransitionClass API is ready https://github.com/facebook/stylex/issues/866 */}
      <style>
        {`
          ::view-transition-new(${id}-overlay) {
            animation-name: ${slideIn};
          }
          ::view-transition-old(${id}-overlay) {
            animation-name: ${slideOut};
          }
      `}
      </style>
      {isOpen && (
        <div>
          <div
            css={styles.backdrop}
            onClick={onClose}
            style={{ viewTransitionName: `${id}-backdrop` }}
          />
          <div
            css={styles.content}
            style={{ viewTransitionName: `${id}-overlay` }}
          >
            <Button css={styles.closeButton} icon={<X />} onClick={onClose} />
            {children}
          </div>
        </div>
      )}
    </>
  );
}

const slideIn = stylex.keyframes({
  from: {
    transform: "translateY(100dvh)",
  },
});

const slideOut = stylex.keyframes({
  to: {
    transform: "translateY(100dvh)",
  },
});

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
