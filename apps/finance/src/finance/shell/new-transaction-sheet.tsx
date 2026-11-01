"use client";

import dynamic from "next/dynamic";

/**
 * The new Transaction that the Add action and the `n` key open (`?new=`),
 * in a sheet over a screen with no Transaction of its own, such as
 * Analytics. The editor loads after the screen. Put it outside a
 * `NavigationSplitView`.
 */
export const NewTransactionSheet = dynamic(
  () =>
    import("../editor/use-transaction-task.tsx").then(
      (mod) => mod.NewTransactionTask,
    ),
  { ssr: false },
);
