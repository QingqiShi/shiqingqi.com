import { render } from "@testing-library/react";
import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarkReportSeen } from "./mark-report-seen.tsx";

const refresh = vi.fn();
const router: AppRouterInstance = {
  back: () => {},
  forward: () => {},
  prefetch: () => {},
  push: () => {},
  refresh,
  replace: () => {},
  bfcacheId: "test",
};

function renderMark() {
  window.history.replaceState(null, "", "/");
  return render(
    <AppRouterContext value={router}>
      <MarkReportSeen reportId="report-1" />
    </AppRouterContext>,
  );
}

beforeEach(() => {
  refresh.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))),
  );
});

describe("MarkReportSeen", () => {
  it("clears the cached report once the owner goes to a different page", async () => {
    const { unmount } = renderMark();

    window.history.pushState(null, "", "/todos");
    unmount();

    await vi.waitFor(() => {
      expect(refresh).toHaveBeenCalledOnce();
    });
  });

  it("does not refresh again when a refresh replaces the report on the same page", async () => {
    const { unmount } = renderMark();

    unmount();

    await new Promise((resolve) => setTimeout(resolve));
    expect(refresh).not.toHaveBeenCalled();
  });
});
