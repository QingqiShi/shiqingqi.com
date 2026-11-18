"use client";

import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { FormFooter } from "@tuja/ui/components/form-footer";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTripApi } from "#src/trips/trip-api.ts";

/**
 * Asks an owner to confirm that a trip goes for everyone. Delete deletes it,
 * gives `announce` the words that say so, and opens the list of trips.
 */
export function DeleteTripConfirm({
  tripId,
  title,
  onCancel,
  announce,
}: {
  tripId: string;
  title: string;
  onCancel: () => void;
  /** Shows a message that stays when the person leaves the trip. */
  announce: (message: string) => void;
}) {
  const api = useTripApi();
  const router = useRouter();
  const locale = useLocale();
  const [state, setState] = useState<"idle" | "busy" | "failed">("idle");
  const question = t({ en: "Delete “{title}”?", zh: "删除“{title}”？" });
  const deleted = t({ en: "“{title}” is deleted", zh: "已删除“{title}”" });

  return (
    <div css={stack.item}>
      <Text as="p" weight="semibold">
        {question.replace("{title}", title)}
      </Text>
      <Text as="p" tone="muted">
        {t({
          en: "This deletes the trip for everyone on it, with its history. You cannot take this back.",
          zh: "这会为所有成员删除这个行程及其历史记录，且无法恢复。",
        })}
      </Text>
      {state === "failed" ? (
        <Callout intent="destructive" role="alert">
          {t({
            en: "The trip was not deleted. Try again.",
            zh: "行程没有删除，请重试。",
          })}
        </Callout>
      ) : null}
      <FormFooter>
        <Button look="ghost" onClick={onCancel}>
          {t({ en: "Cancel", zh: "取消" })}
        </Button>
        <Button
          look="primary"
          intent="destructive"
          loading={state === "busy"}
          onClick={() => {
            setState("busy");
            api
              .remove(tripId)
              .then((isDeleted) => {
                if (!isDeleted) throw new Error("not deleted");
                announce(deleted.replace("{title}", title));
                router.replace(getLocalePath("/", locale));
              })
              .catch(() => {
                setState("failed");
              });
          }}
        >
          {t({ en: "Delete trip", zh: "删除行程" })}
        </Button>
      </FormFooter>
    </div>
  );
}
