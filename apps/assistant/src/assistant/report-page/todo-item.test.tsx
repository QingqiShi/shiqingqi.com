import { act, fireEvent, render, screen } from "@testing-library/react";
import { I18nContext } from "@tuja/i18n/i18n-context";
import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import translations from "#src/_generated/i18n/translations.en.json";
import { TodoItem } from "./todo-item.tsx";

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
let finishSave: (response: Response) => void;

function renderRow() {
  return render(
    <I18nContext value={{ translations }}>
      <AppRouterContext value={router}>
        <ul>
          <TodoItem
            todo={{
              id: "todo-1",
              title: "Pay the invoice",
              detail: null,
              dueDate: null,
              done: false,
              openHref: null,
            }}
            today="2026-11-02"
            locale="en"
          />
        </ul>
      </AppRouterContext>
    </I18nContext>,
  );
}

async function landSave(response: Response) {
  await act(async () => {
    finishSave(response);
    await Promise.resolve();
  });
}

beforeEach(() => {
  refresh.mockClear();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          finishSave = resolve;
        }),
    ),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("TodoItem", () => {
  it("clears the cached pages only after a save that lands when the row has gone", async () => {
    const { unmount } = renderRow();
    fireEvent.click(screen.getByRole("checkbox", { name: "Pay the invoice" }));

    unmount();
    expect(refresh).not.toHaveBeenCalled();

    await landSave(new Response("{}"));
    await vi.waitFor(() => {
      expect(refresh).toHaveBeenCalledOnce();
    });
  });

  it("stays in place after the save, and clears the cached pages when it goes", async () => {
    const { unmount } = renderRow();
    fireEvent.click(screen.getByRole("checkbox", { name: "Pay the invoice" }));

    await landSave(new Response("{}"));
    await vi.waitFor(() => {
      expect(screen.getByRole("checkbox")).toBeEnabled();
    });
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(refresh).not.toHaveBeenCalled();

    unmount();
    await vi.waitFor(() => {
      expect(refresh).toHaveBeenCalledOnce();
    });
  });
});
