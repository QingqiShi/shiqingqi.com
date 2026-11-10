import { act, fireEvent, render, screen } from "@testing-library/react";
import { I18nContext } from "@tuja/i18n/i18n-context";
import {
  AppRouterContext,
  type AppRouterInstance,
} from "next/dist/shared/lib/app-router-context.shared-runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import translations from "#src/_generated/i18n/translations.en.json";
import type { TodoItemData } from "./to-todo-item-data.ts";
import { TodoItem } from "./todo-item.tsx";
import { TodoStoreProvider } from "./todo-store-provider.tsx";

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

function page(
  renderedAt: number,
  { refreshesOnLeave = false }: { refreshesOnLeave?: boolean } = {},
) {
  const row: TodoItemData = {
    id: "todo-1",
    title: "Pay the invoice",
    detail: null,
    dueDate: null,
    startDate: null,
    calendarSlot: null,
    checklist: [],
    waitingOn: null,
    followUpDate: null,
    waitingNote: null,
    createdBy: "owner",
    doneAt: null,
    doneReason: null,
    reAdded: false,
    openHref: null,
  };
  return (
    <I18nContext value={{ translations }}>
      <AppRouterContext value={router}>
        <TodoStoreProvider
          todos={[row]}
          today="2026-11-02"
          timeZone="UTC"
          openCount={1}
          renderedAt={renderedAt}
          refreshesOnLeave={refreshesOnLeave}
        >
          <ul>
            <TodoItem id="todo-1" />
          </ul>
        </TodoStoreProvider>
      </AppRouterContext>
    </I18nContext>
  );
}

async function landSave() {
  await act(async () => {
    finishSave(new Response("{}"));
    await Promise.resolve();
  });
}

function tick() {
  fireEvent.click(screen.getByRole("checkbox", { name: "Pay the invoice" }));
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

describe("TodoItem in a store", () => {
  it("clears the cached pages once the save has landed", async () => {
    render(page(0));
    tick();
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce();
    });
    expect(refresh).not.toHaveBeenCalled();

    await landSave();
    await vi.waitFor(() => {
      expect(refresh).toHaveBeenCalledOnce();
    });
  });

  it("keeps the page that a refresh would replace until the owner leaves", async () => {
    const { unmount } = render(page(0, { refreshesOnLeave: true }));
    tick();
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce();
    });

    await landSave();
    await vi.waitFor(() => {
      expect(screen.getByRole("checkbox")).toBeChecked();
    });
    expect(refresh).not.toHaveBeenCalled();

    unmount();
    await vi.waitFor(() => {
      expect(refresh).toHaveBeenCalledOnce();
    });
  });

  it("clears the cached pages after a save that lands when the owner has left", async () => {
    const { unmount } = render(page(0, { refreshesOnLeave: true }));
    tick();
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce();
    });

    unmount();
    expect(refresh).not.toHaveBeenCalled();

    await landSave();
    await vi.waitFor(() => {
      expect(refresh).toHaveBeenCalledOnce();
    });
  });

  it("keeps a saved change when a refresh from before the save lands", async () => {
    const { rerender } = render(page(0));
    tick();
    await vi.waitFor(() => {
      expect(fetch).toHaveBeenCalledOnce();
    });
    await landSave();
    await vi.waitFor(() => {
      expect(refresh).toHaveBeenCalledOnce();
    });

    rerender(page(0));
    expect(screen.getByRole("checkbox")).toBeChecked();

    rerender(page(Date.now() + 60_000));
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });
});
