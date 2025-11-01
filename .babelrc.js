module.exports = {
  presets: [
    [
      "next/babel",
      {
        "preset-react": {
          runtime: "automatic",
        },
        "preset-env": {
          // Required to make Server Actions work
          // Without it server actions compile to non-async functions which breaks the build.
          targets: { node: "current" },
          // Preserve ESM modules for test environment to work with Vitest
          modules: process.env.NODE_ENV === "test" ? false : "auto",
        },
      },
    ],
  ],
  plugins: [
    [
      "module-resolver",
      {
        alias: {
          "#src": "./src",
        },
      },
    ],
    "./tooling/stylex-css-prop",
    [
      "./tooling/stylex-breakpoints",
      {
        rootDir: __dirname,
      },
    ],
    [
      "@stylexjs/babel-plugin",
      {
        dev: process.env.NODE_ENV === "development",
        test: process.env.NODE_ENV === "test",
        runtimeInjection: false,
        genConditionalClasses: true,
        treeshakeCompensation: true,
        styleResolution: "property-specificity",
        enableMediaQueryOrder: true,
        unstable_moduleResolution: {
          type: "commonJS",
          rootDir: __dirname,
        },
      },
    ],
  ],
};
