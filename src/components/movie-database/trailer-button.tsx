"use client";

import { PlayIcon } from "@phosphor-icons/react/Play";
import * as stylex from "@stylexjs/stylex";
import type { PropsWithChildren } from "react";
import type { SupportedLocale } from "@/types";
import { Button } from "../shared/button";
import { Dialog } from "../shared/dialog";

interface TrailerButtonProps {
  trailerId: string;
  locale: SupportedLocale;
  title: string;
}

export function TrailerButton({
  children,
  trailerId,
  locale,
  title,
}: PropsWithChildren<TrailerButtonProps>) {
  const dialogId = `trailer-dialog-${trailerId}`;

  return (
    <>
      <Button
        icon={<PlayIcon weight="fill" role="presentation" />}
        isActive
        commandfor={dialogId}
        command="show-modal"
      >
        {children}
      </Button>
      <Dialog id={dialogId} ariaLabel={`Trailer for ${title}`}>
        <div css={styles.videoContainer}>
          <iframe
            css={styles.video}
            src={`https://www.youtube.com/embed/${trailerId}?hl=${locale}&autoplay=1`}
            frameBorder="0"
            allowFullScreen
            title="Trailer video player"
          />
        </div>
      </Dialog>
    </>
  );
}

const styles = stylex.create({
  videoContainer: {
    width: "100%",
    paddingBottom: "56.25%", // 16:9 aspect ratio (9/16 = 0.5625)
    position: "relative",
    height: 0,
  },
  video: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },
});
