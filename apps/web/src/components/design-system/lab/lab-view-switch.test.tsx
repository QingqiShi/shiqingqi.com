import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { LocaleContext } from "#src/i18n/locale-context.ts";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import type { SupportedLocale } from "#src/types.ts";
import { LabViewSwitch } from "./lab-view-switch.tsx";

const DOCS_PATH = "/design-system/components/button";

// The real navigation hooks, fed the contexts the app router fills in.
function mountedAt(pathname: string, locale: SupportedLocale = "en") {
  const push = vi.fn();
  const router: AppRouterInstance = {
    bfcacheId: "test",
    push,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  };
  const wrap = (children: ReactNode) => (
    <AppRouterContext value={router}>
      <PathnameContext value={pathname}>
        <LocaleContext value={locale}>{children}</LocaleContext>
      </PathnameContext>
    </AppRouterContext>
  );
  render(wrap(<LabViewSwitch docsPath={DOCS_PATH} />));
  return { push };
}

describe("LabViewSwitch", () => {
  it("marks the documentation selected on the documentation route", () => {
    mountedAt(DOCS_PATH);
    expect(screen.getByRole("radio", { name: "Docs" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Lab" })).not.toBeChecked();
  });

  it("marks the Lab selected on the Lab route", () => {
    mountedAt(`${DOCS_PATH}/lab`);
    expect(screen.getByRole("radio", { name: "Lab" })).toBeChecked();
  });

  it("navigates to the Lab", async () => {
    const { push } = mountedAt(DOCS_PATH);
    await userEvent.click(screen.getByRole("radio", { name: "Lab" }));
    expect(push).toHaveBeenCalledWith(`${DOCS_PATH}/lab`);
  });

  it("navigates back to the documentation", async () => {
    const { push } = mountedAt(`${DOCS_PATH}/lab`);
    await userEvent.click(screen.getByRole("radio", { name: "Docs" }));
    expect(push).toHaveBeenCalledWith(DOCS_PATH);
  });

  it("keeps the locale prefix", async () => {
    const { push } = mountedAt(`/zh${DOCS_PATH}`, "zh");
    await userEvent.click(screen.getByRole("radio", { name: "Lab" }));
    expect(push).toHaveBeenCalledWith(`/zh${DOCS_PATH}/lab`);
  });
});
