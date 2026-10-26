import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, userEvent } from "#src/testing/test-utils.tsx";
import { useColumnReplace } from "./column-link.tsx";

function withRouter(children: ReactNode) {
  const navigations: { kind: "push" | "replace"; href: string }[] = [];
  const router: AppRouterInstance = {
    back: () => undefined,
    forward: () => undefined,
    refresh: () => undefined,
    push: (href) => {
      navigations.push({ kind: "push", href });
    },
    replace: (href) => {
      navigations.push({ kind: "replace", href });
    },
    prefetch: () => undefined,
    bfcacheId: "test",
  };
  render(<AppRouterContext value={router}>{children}</AppRouterContext>);
  return navigations;
}

function ReplaceButton({ href }: { href: string }) {
  const replace = useColumnReplace();
  return (
    <button
      type="button"
      onClick={() => {
        replace(href);
      }}
    >
      Replace
    </button>
  );
}

beforeEach(() => {
  window.history.replaceState(null, "", "/finance");
});

describe("useColumnReplace", () => {
  it("replaces the entry in the browser where only the query changes", async () => {
    window.history.replaceState(null, "", "/finance?account=a1");
    const navigations = withRouter(<ReplaceButton href="/finance" />);
    const entries = window.history.length;

    await userEvent.click(screen.getByRole("button", { name: "Replace" }));

    expect(window.location.search).toBe("");
    expect(window.history.length).toBe(entries);
    expect(navigations).toEqual([]);
  });

  it("replaces through the router where the screen changes", async () => {
    const navigations = withRouter(
      <ReplaceButton href="/finance/transactions?account=a1" />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Replace" }));

    expect(navigations).toEqual([
      { kind: "replace", href: "/finance/transactions?account=a1" },
    ]);
    expect(window.location.pathname).toBe("/finance");
  });
});
