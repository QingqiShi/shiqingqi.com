"use client";

import { postJson } from "@tuja/auth-ui/fetch-json";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";

/** Accepts an invite: the signed-in user joins the trip, and the trip opens. */
export function JoinTrip({ token }: { token: string }) {
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<"ended" | "failed" | null>(null);

  return (
    <div css={stack.item}>
      {problem ? (
        <Callout intent="destructive" role="alert">
          {problem === "ended"
            ? t({
                en: "This invite has ended. Ask the person who sent it for a new one.",
                zh: "此邀请已失效。请向发给你邀请的人要一个新的。",
              })
            : t({
                en: "That did not work. Try again.",
                zh: "操作没有成功，请重试。",
              })}
        </Callout>
      ) : null}
      <Button
        look="primary"
        size="lg"
        loading={busy}
        css={fill.inline}
        onClick={() => {
          setBusy(true);
          setProblem(null);
          postJson<{ slug: string }>("/api/invites/accept", { token })
            .then(({ slug }) => {
              window.location.assign(getLocalePath(`/${slug}`, locale));
            })
            .catch((error: unknown) => {
              const isEnded =
                error instanceof Error &&
                "code" in error &&
                error.code === "invite_invalid";
              setProblem(isEnded ? "ended" : "failed");
              setBusy(false);
            });
        }}
      >
        {t({ en: "Join the trip", zh: "加入行程" })}
      </Button>
    </div>
  );
}
