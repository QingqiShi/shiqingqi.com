import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { installJsdomShims } from "@tuja/ui/test-support/install-jsdom-shims";
import { afterEach } from "vitest";

installJsdomShims();

afterEach(() => {
  cleanup();
});
