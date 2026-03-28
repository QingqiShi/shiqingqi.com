"use client";

import { PlayIcon } from "@phosphor-icons/react/Play";
import * as stylex from "@stylexjs/stylex";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import type { SupportedLocale } from "#src/types.ts";
import { Button } from "../shared/button";
import { Overlay } from "../shared/overlay";

interface TrailerButtonProps {
  trailerId: string;
  locale: SupportedLocale;
  iframeTitle: string;
}

export function TrailerButton({
  children,
  trailerId,
  locale,
  iframeTitle,
}: PropsWithChildren<TrailerButtonProps>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        icon={<PlayIcon weight="fill" role="presentation" />}
        isActive
        onClick={() => setIsOpen(true)}
      >
        {children}
      </Button>
      <Overlay isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <iframe
          css={styles.video}
          width="720"
          height="405"
          src={`https://www.youtube.com/embed/${trailerId}?hl=${locale}`}
          title={iframeTitle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </Overlay>
    </>
  );
}

const styles = stylex.create({
  video: {
    width: "100%",
    height: "100%",
    borderWidth: 0,
  },
});
