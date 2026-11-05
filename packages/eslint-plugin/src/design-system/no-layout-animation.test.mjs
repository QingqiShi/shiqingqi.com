import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
const rule = require("./no-layout-animation");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

ruleTester.run("no-layout-animation", rule, {
  valid: [
    // V1: a static height, and a transition of what does not lay out
    {
      code: `const styles = stylex.create({
        box: {
          height: "10rem",
          transition: \`opacity \${duration._200} \${easing.ease}, translate \${duration._200} \${easing.ease}\`,
        },
        still: { transition: "none" },
      });`,
    },
    // V2: names that only contain a block size, and width, which is out of scope
    {
      code: `const styles = stylex.create({
        box: { transition: "line-height 1s, var(--height) 1s, width 1s" },
      });`,
    },
    // V3: a transition string outside StyleX
    {
      code: `const plain = { transition: "height 1s" };`,
    },
    // V4: keyframes and a pose that move only what does not lay out
    {
      code: `const rise = stylex.keyframes({ from: { opacity: 0, translate: "0 1rem" } });
      bind(element, shown, {
        pose: (at) => ({ opacity: at.toFixed(3) }),
        hold: { height: "10rem" },
      });`,
    },
    // V5: a height in a local object that the pose does not return
    {
      code: `bind(element, shown, {
        pose: (at) => {
          const box = { height: at };
          return { translate: \`0 \${box.height}px\` };
        },
      });`,
    },
    // V6: a function with the same name on an object
    {
      code: `tool.bind(element, shown, { pose: () => ({ height: "1px" }) });`,
    },
  ],

  invalid: [
    // I1: a transition string and a transition list
    {
      code: `const styles = stylex.create({
        box: { transition: "height 1s" },
        list: { transitionProperty: ["opacity", "max-block-size"] },
      });`,
      errors: [
        { messageId: "transition", data: { name: "height" } },
        { messageId: "transition", data: { name: "max-block-size" } },
      ],
    },
    // I2: a conditional value with a token in a template, and a local constant
    {
      code: `const property = "block-size";
      const styles = stylex.create({
        box: {
          transition: {
            default: "none",
            [pointer.canHover]: \`min-height \${duration._200} \${easing.ease}\`,
          },
          transitionProperty: property,
        },
      });`,
      errors: [
        { messageId: "transition", data: { name: "min-height" } },
        { messageId: "transition", data: { name: "block-size" } },
      ],
    },
    // I3: a dynamic style
    {
      code: `const styles = stylex.create({
        box: (time) => ({ transition: \`height \${time}\` }),
      });`,
      errors: [{ messageId: "transition" }],
    },
    // I4: a keyframe
    {
      code: `const grow = stylex.keyframes({
        from: { blockSize: 0 },
        to: { maxHeight: "10rem" },
      });`,
      errors: [
        { messageId: "keyframes", data: { name: "blockSize" } },
        { messageId: "keyframes", data: { name: "maxHeight" } },
      ],
    },
    // I5: an inline pose, and a reduced pose with a block body and a CSS name
    {
      code: `useBinding(ref, progress, {
        pose: (at) => ({ height: px(at) }),
        reducedPose: (at) => {
          if (at > 0) return { "block-size": px(at) };
          return { opacity: "0" };
        },
      });`,
      errors: [
        { messageId: "pose", data: { name: "height" } },
        { messageId: "pose", data: { name: "block-size" } },
      ],
    },
    // I6: a pose by name, from a local factory, with a spread of local styles
    {
      code: `const grown = (at) => ({ "min-height": px(at) });
      const poseOf = (look) => (at) => ({ ...grown(at), color: look });
      bind(element, shown, { pose: poseOf("red") });`,
      errors: [{ messageId: "pose", data: { name: "min-height" } }],
    },
  ],
});
