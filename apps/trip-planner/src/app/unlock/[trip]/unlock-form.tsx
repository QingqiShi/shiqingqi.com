"use client";

import { useActionState } from "react";
import { type UnlockState, unlockTrip } from "./actions";
import { Button } from "@/components/ui/button";

const initialState: UnlockState = {};

export function UnlockForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(unlockTrip, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="slug" value={slug} />
      <input
        autoFocus
        type="password"
        name="password"
        autoComplete="current-password"
        placeholder="行程密码"
        aria-label="行程密码"
        aria-invalid={state.error ? true : undefined}
        className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20"
      />
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "验证中…" : "进入行程"}
      </Button>
    </form>
  );
}
