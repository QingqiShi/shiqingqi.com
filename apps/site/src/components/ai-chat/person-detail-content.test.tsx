import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import { ExpandableBiography } from "./person-detail-content";

// jsdom does not compute layout, so scrollHeight/clientHeight default to 0 and
// the biography never registers as "clamped". Stub the Element prototype so
// ExpandableBiography's ResizeObserver callback computes scrollHeight > clientHeight.
// ResizeObserver is also absent in jsdom — provide a no-op to avoid
// constructor errors.
const originalScrollHeight = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "scrollHeight",
);
const originalClientHeight = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "clientHeight",
);
const originalResizeObserver = globalThis.ResizeObserver;

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => 200,
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 100,
  });
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterAll(() => {
  if (originalScrollHeight) {
    Object.defineProperty(
      HTMLElement.prototype,
      "scrollHeight",
      originalScrollHeight,
    );
  }
  if (originalClientHeight) {
    Object.defineProperty(
      HTMLElement.prototype,
      "clientHeight",
      originalClientHeight,
    );
  }
  globalThis.ResizeObserver = originalResizeObserver;
});

const LONG_BIO =
  "Tom Hanks is an American actor and filmmaker known for both his comedic and dramatic roles.";

describe("ExpandableBiography disclosure semantics", () => {
  it("exposes aria-expanded='false' when collapsed", () => {
    render(<ExpandableBiography text={LONG_BIO} />);

    const button = screen.getByRole("button", { name: "Read more" });
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("flips aria-expanded to 'true' after clicking Read more", async () => {
    const user = userEvent.setup();
    render(<ExpandableBiography text={LONG_BIO} />);

    await user.click(screen.getByRole("button", { name: "Read more" }));

    const button = screen.getByRole("button", { name: "Read less" });
    expect(button).toHaveAttribute("aria-expanded", "true");
  });

  it("points aria-controls at the biography paragraph", () => {
    render(<ExpandableBiography text={LONG_BIO} />);

    const button = screen.getByRole("button", { name: "Read more" });
    const controlsId = button.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();
    const paragraph = document.getElementById(controlsId ?? "");
    expect(paragraph).toHaveTextContent(LONG_BIO);
  });
});
