"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Spinner } from "@tuja/ui/components/spinner";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { useEffect, useEffectEvent, useState } from "react";

type Loaded<T> =
  { status: "loading" } | { status: "failed" } | { status: "ok"; value: T };

/** Reads once on mount, and again on `reload`. */
export function useLoad<T>(read: () => Promise<T>) {
  const [loaded, setLoaded] = useState<Loaded<T>>({ status: "loading" });
  const [round, setRound] = useState(0);
  const readNow = useEffectEvent(read);
  useEffect(() => {
    let isCurrent = true;
    readNow().then(
      (value) => {
        if (isCurrent) setLoaded({ status: "ok", value });
      },
      () => {
        if (isCurrent) setLoaded({ status: "failed" });
      },
    );
    return () => {
      isCurrent = false;
    };
  }, [round]);
  return {
    loaded,
    reload: () => {
      setRound((n) => n + 1);
    },
  };
}

/** A spinner while a screen loads, or a way to try again when it did not. */
export function LoadState({
  loaded,
  onRetry,
}: {
  loaded: { status: "loading" } | { status: "failed" };
  onRetry: () => void;
}) {
  return (
    <div css={styles.centred}>
      {loaded.status === "loading" ? (
        <Spinner label={t({ en: "Loading", zh: "加载中" })} />
      ) : (
        <div css={[stack.tight, styles.centredText]}>
          <Text as="p" tone="muted">
            {t({ en: "This did not load.", zh: "没有加载出来。" })}
          </Text>
          <div>
            <Button size="sm" onClick={onRetry}>
              {t({ en: "Try again", zh: "重试" })}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = stylex.create({
  centred: {
    display: "flex",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBlock: space._8,
  },
  centredText: {
    alignItems: "center",
    textAlign: "center",
  },
});
