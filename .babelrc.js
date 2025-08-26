module.exports = {
  presets: [
    [
      "next/babel",
      {
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
          "@": "./src",
        },
      },
    ],
    [
      "./tooling/stylex-breakpoints",
      {
        breakpoints: {
          sm: 320,
          md: 768,
          lg: 1080,
          xl: 2000,
        },
      },
    ],
    "./tooling/stylex-css-prop",
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
