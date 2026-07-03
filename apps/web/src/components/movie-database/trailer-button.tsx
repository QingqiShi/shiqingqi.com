"use client";

import { PlayIcon } from "@phosphor-icons/react/dist/ssr/Play";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Overlay } from "@tuja/ui/components/overlay";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import { usePortalTarget } from "#src/contexts/portal-context.tsx";
import { t } from "#src/i18n.ts";
import type { SupportedLocale } from "#src/types.ts";

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
  const portalTarget = usePortalTarget();

  return (
    <>
      <Button
        icon={<PlayIcon weight="fill" role="presentation" />}
        variant="primary"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        {children}
      </Button>
      <Overlay
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        closeLabel={t({ en: "Close", zh: "关闭" })}
        portalTarget={portalTarget}
        aria-label={iframeTitle}
      >
        <iframe
          css={styles.video}
          width="720"
          height="405"
          src={`https://www.youtube.com/embed/${trailerId}?autoplay=1&hl=${locale}`}
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
