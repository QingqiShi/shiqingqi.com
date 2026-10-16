"use client";

import { PlayIcon } from "@phosphor-icons/react/dist/ssr/Play";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Sheet } from "@tuja/ui/components/sheet";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { ratio } from "@tuja/ui/tokens.stylex";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { t } from "#src/i18n.ts";

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
        look="primary"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        {children}
      </Button>
      <Sheet
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        closeLabel={t({ en: "Close", zh: "关闭" })}
        aria-label={iframeTitle}
      >
        <iframe
          css={[corner.radius_3, styles.video]}
          width="720"
          height="405"
          src={`https://www.youtube.com/embed/${trailerId}?autoplay=1&hl=${locale}`}
          title={iframeTitle}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </Sheet>
    </>
  );
}

const styles = stylex.create({
  video: {
    display: "block",
    inlineSize: "100%",
    blockSize: "auto",
    aspectRatio: ratio.wide,
    borderWidth: 0,
  },
});
