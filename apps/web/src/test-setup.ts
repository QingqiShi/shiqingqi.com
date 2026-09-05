import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { installJsdomShims } from "@tuja/ui/test-support/install-jsdom-shims";
import { afterEach } from "vitest";

installJsdomShims();

afterEach(() => {
  cleanup();
  // Components that read `window.location` on mount must not see the URL a
  // test left behind.
  window.history.replaceState({}, "", "/");
});
