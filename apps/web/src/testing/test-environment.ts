import { builtinEnvironments, type Environment } from "vitest/runtime";

const jsdom = builtinEnvironments.jsdom;

/**
 * The jsdom environment, without the empty web-storage globals of Node 26.
 * Vitest skips a jsdom key that the global scope already holds, so those
 * globals hide `localStorage` and `sessionStorage`. Delete them first.
 */
const jsdomWebStorage: Environment = {
  ...jsdom,
  name: "jsdom-web-storage",
  setup(global, options) {
    Reflect.deleteProperty(globalThis, "localStorage");
    Reflect.deleteProperty(globalThis, "sessionStorage");
    return jsdom.setup(global, options);
  },
};

export default jsdomWebStorage;
