import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { TmdbImage } from "./tmdb-image";

const COMMON_PROPS = {
  baseUrl: "https://image.tmdb.org/t/p/",
  sizeConfig: ["w200", "w400"] as const,
  path: "/poster.jpg",
  alt: "Test poster",
  sizes: "100vw",
};

function stubImageElement(values: { complete: boolean; naturalWidth: number }) {
  const completeSpy = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    "complete",
  );
  const widthSpy = Object.getOwnPropertyDescriptor(
    HTMLImageElement.prototype,
    "naturalWidth",
  );
  Object.defineProperty(HTMLImageElement.prototype, "complete", {
    configurable: true,
    get() {
      return values.complete;
    },
  });
  Object.defineProperty(HTMLImageElement.prototype, "naturalWidth", {
    configurable: true,
    get() {
      return values.naturalWidth;
    },
  });
  return () => {
    if (completeSpy) {
      Object.defineProperty(
        HTMLImageElement.prototype,
        "complete",
        completeSpy,
      );
    } else {
      Reflect.deleteProperty(HTMLImageElement.prototype, "complete");
    }
    if (widthSpy) {
      Object.defineProperty(
        HTMLImageElement.prototype,
        "naturalWidth",
        widthSpy,
      );
    } else {
      Reflect.deleteProperty(HTMLImageElement.prototype, "naturalWidth");
    }
  };
}

describe("TmdbImage", () => {
  let restore: (() => void) | undefined;

  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it("renders the image and a sibling skeleton while loading", () => {
    restore = stubImageElement({ complete: false, naturalWidth: 0 });
    const { container } = render(<TmdbImage {...COMMON_PROPS} />);

    expect(screen.getByRole("img")).toBeInTheDocument();
    // Skeleton sibling = an extra div before the img
    expect(container.querySelectorAll("div, img")).toHaveLength(2);
  });

  it("removes the skeleton once onLoad fires", () => {
    restore = stubImageElement({ complete: false, naturalWidth: 0 });
    const { container } = render(<TmdbImage {...COMMON_PROPS} />);

    fireEvent.load(screen.getByRole("img"));

    expect(container.querySelectorAll("div, img")).toHaveLength(1);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("renders the errorFallback when onError fires", () => {
    restore = stubImageElement({ complete: false, naturalWidth: 0 });
    render(
      <TmdbImage {...COMMON_PROPS} errorFallback={<span>fallback ui</span>} />,
    );

    fireEvent.error(screen.getByRole("img"));

    expect(screen.getByText("fallback ui")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("detects cached successes via the ref callback (complete + naturalWidth > 0)", () => {
    restore = stubImageElement({ complete: true, naturalWidth: 200 });
    const { container } = render(<TmdbImage {...COMMON_PROPS} />);

    // Image present, no skeleton sibling
    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(container.querySelectorAll("div, img")).toHaveLength(1);
  });

  it("detects cached errors via the ref callback (complete + naturalWidth === 0) and shows the fallback", () => {
    restore = stubImageElement({ complete: true, naturalWidth: 0 });
    render(
      <TmdbImage {...COMMON_PROPS} errorFallback={<span>fallback ui</span>} />,
    );

    expect(screen.getByText("fallback ui")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
