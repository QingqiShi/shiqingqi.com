import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { act, render, screen } from "#src/test-utils.tsx";
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

  it("keeps the image on the iOS lazy false positive (complete + naturalWidth === 0) instead of erroring", () => {
    // iOS Safari reports complete=true / naturalWidth=0 for a loading="lazy"
    // image that hasn't loaded yet (deferred, off-screen). The ref probe must
    // NOT read that as a failed fetch: doing so removed the <img> before it
    // could load and blanked every poster. The image stays and the skeleton
    // remains; onError is the only signal that renders the fallback.
    restore = stubImageElement({ complete: true, naturalWidth: 0 });
    const { container } = render(
      <TmdbImage {...COMMON_PROPS} errorFallback={<span>fallback ui</span>} />,
    );

    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(screen.queryByText("fallback ui")).not.toBeInTheDocument();
    // Skeleton sibling still present because the image hasn't reported loaded.
    expect(container.querySelectorAll("div, img")).toHaveLength(2);
  });

  it("resets the error state when the path prop changes", () => {
    // Reproduces the virtuoso-slot reuse bug: the same component instance
    // receives path "/a.jpg", errors, then is reused with "/b.jpg". Before
    // the fix the prior errored=true stuck and the slot rendered the
    // fallback forever. After the fix the new path restores the <img>.
    restore = stubImageElement({ complete: false, naturalWidth: 0 });
    const { rerender } = render(
      <TmdbImage
        {...COMMON_PROPS}
        path="/a.jpg"
        errorFallback={<span>fallback ui</span>}
      />,
    );

    act(() => {
      fireEvent.error(screen.getByRole("img"));
    });

    expect(screen.getByText("fallback ui")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();

    rerender(
      <TmdbImage
        {...COMMON_PROPS}
        path="/b.jpg"
        errorFallback={<span>fallback ui</span>}
      />,
    );

    expect(screen.getByRole("img")).toBeInTheDocument();
    expect(screen.queryByText("fallback ui")).not.toBeInTheDocument();
  });

  it("resets the loaded state when the path prop changes so the skeleton re-appears", () => {
    // The twin failure mode: loaded=true from the previous path would
    // suppress the skeleton while the new src is still decoding,
    // briefly revealing stale pixels or a blank frame.
    restore = stubImageElement({ complete: false, naturalWidth: 0 });
    const { container, rerender } = render(
      <TmdbImage {...COMMON_PROPS} path="/a.jpg" />,
    );

    fireEvent.load(screen.getByRole("img"));

    // Skeleton gone after load settles for path A.
    expect(container.querySelectorAll("div, img")).toHaveLength(1);

    rerender(<TmdbImage {...COMMON_PROPS} path="/b.jpg" />);

    // Skeleton back while path B loads.
    expect(container.querySelectorAll("div, img")).toHaveLength(2);
  });
});
