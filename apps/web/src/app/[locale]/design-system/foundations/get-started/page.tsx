import type { Metadata } from "next";
import { DocPage } from "#src/design-system/doc-page.tsx";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { GetStartedFirstComponent } from "#src/design-system/sections/foundations/get-started-first-component.tsx";
import { GetStartedImportMap } from "#src/design-system/sections/foundations/get-started-import-map.tsx";
import { GetStartedLightDark } from "#src/design-system/sections/foundations/get-started-light-dark.tsx";
import { GetStartedNextSteps } from "#src/design-system/sections/foundations/get-started-next-steps.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import type { PageProps } from "#src/i18n/types.ts";
import { validateLocale } from "#src/i18n/validate-locale.ts";
import { t } from "#src/i18n.ts";
import { designSystemMetadata } from "../../design-system-metadata.ts";

const INSTALL = `npm install @tuja/ui @stylexjs/stylex @phosphor-icons/react
npm install --save-dev @stylexjs/babel-plugin @stylexjs/postcss-plugin @babel/parser @babel/traverse`;

const NEXT_CONFIG = `// next.config.js
module.exports = {
  transpilePackages: ["@tuja/ui"],
};`;

const BABEL_CONFIG = `// babel.config.js
const path = require("node:path");

const uiRoot = path.dirname(require.resolve("@tuja/ui/package.json"));

module.exports = {
  presets: ["next/babel"],
  plugins: [
    // A copy of stylex-breakpoints. It must run first.
    ["./stylex-breakpoints.js", { rootDir: uiRoot }],
    [
      "@stylexjs/babel-plugin",
      {
        sxPropName: "css",
        styleResolution: "property-specificity",
        enableMediaQueryOrder: true,
        runtimeInjection: false,
        genConditionalClasses: true,
        treeshakeCompensation: true,
        dev: process.env.NODE_ENV === "development",
        test: process.env.NODE_ENV === "test",
        unstable_moduleResolution: { type: "commonJS", rootDir: __dirname },
      },
    ],
  ],
};`;

const POSTCSS_CONFIG = `// postcss.config.js
const path = require("node:path");

module.exports = {
  plugins: {
    "@stylexjs/postcss-plugin": {
      include: [
        "src/**/*.{js,jsx,ts,tsx}",
        "node_modules/@tuja/ui/src/**/*.{ts,tsx}",
      ],
      useCSSLayers: true,
      babelConfig: { configFile: path.resolve(__dirname, "babel.config.js") },
    },
  },
};`;

const TSCONFIG = `// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}`;

const CSS_PROP_TYPES = `// css-prop.d.ts
/// <reference types="@tuja/ui/css-prop" />`;

const GLOBAL_CSS = `/* src/app/global.css */
@font-face {
  font-family: "Inter";
  src: url("/fonts/InterVariable.woff2");
  font-weight: 100 900;
  font-display: fallback;
}

@font-face {
  font-family: "Inter-fallback";
  size-adjust: 107%;
  ascent-override: 90%;
  src: local("Segoe UI"), local("Roboto"), local("Helvetica Neue"),
    local("Arial");
}

@stylex;`;

const ROOT_LAYOUT = `// src/app/layout.tsx
import * as stylex from "@stylexjs/stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import "./global.css";

const styles = stylex.create({
  html: {
    colorScheme: "light dark",
    backgroundColor: color.bgCanvas,
  },
  body: {
    color: color.fg,
    fontFamily: font.family,
  },
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" css={styles.html}>
      <body css={styles.body}>{children}</body>
    </html>
  );
}`;

const CSS_PROP = `import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";

const styles = stylex.create({
  bar: { gap: space._2 },
  push: { marginInlineStart: "auto" },
});

export function TripActions({ css }: { css?: StyleProp }) {
  return (
    <div css={[flex.row, styles.bar, css]}>
      <Button look="ghost">Edit</Button>
      <Button look="primary" css={styles.push}>
        Share trip
      </Button>
    </div>
  );
}`;

const THIRD_PARTY = `import * as stylex from "@stylexjs/stylex";
import Link from "next/link";

<Link href="/trips" {...stylex.props(styles.link)}>
  All trips
</Link>;`;

const RUNTIME_VALUE = `const styles = stylex.create({
  swatch: (background: string) => ({ backgroundColor: background }),
});

<div css={styles.swatch(hex)} />;`;

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/foundations/get-started",
    description: t({
      en: "Install @tuja/ui, set up the StyleX build and TypeScript for Next.js, prepare the root of the page, and put a styled component on screen.",
      zh: "安装 @tuja/ui，为 Next.js 配置 StyleX 构建与 TypeScript，准备页面的根元素，然后让一个带样式的组件出现在屏幕上。",
    }),
  });
}

export default function GetStartedPage() {
  return (
    <DocPage
      path="/design-system/foundations/get-started"
      description={t({
        en: "@tuja/ui ships TypeScript source and no stylesheet. Your build compiles its styles together with yours, so you set the build up once before the first component renders with its styles. The steps are for Next.js; another bundler needs the same Babel and PostCSS plugins.",
        zh: "@tuja/ui 以 TypeScript 源码发布，不附带样式表。它的样式由你的构建与你自己的样式一起编译，因此在第一个组件带着样式渲染出来之前，你需要先配置一次构建。以下步骤以 Next.js 为例；其他打包工具需要同样的 Babel 与 PostCSS 插件。",
      })}
    >
      <GuideSection
        title={t({ en: "Install", zh: "安装" })}
        lead={t({
          en: "Add the package, its StyleX runtime, and the plugins that compile it.",
          zh: "添加这个包、它所需的 StyleX 运行时，以及编译它的插件。",
        })}
      >
        <UsageSnippet
          code={INSTALL}
          source={[["plain", INSTALL]]}
          label={t({ en: "Terminal", zh: "终端" })}
        />
        <GuideList
          items={[
            {
              term: t({ en: "Peer dependencies", zh: "对等依赖" }),
              value: "react · react-dom ≥19.3 <20 · @stylexjs/stylex ^0.19",
              note: t({
                en: "Your app provides these, and the package expects these ranges.",
                zh: "这些由你的应用提供，这个包要求它们处于上述版本范围内。",
              }),
            },
            {
              term: "@phosphor-icons/react",
              note: t({
                en: "The default icons inside components come from Phosphor. @tuja/ui does not re-export it, so install it to import an icon of your own.",
                zh: "组件内的默认图标来自 Phosphor。@tuja/ui 不会重新导出它，因此要导入自己的图标，请另行安装。",
              }),
            },
            {
              term: "@babel/parser · @babel/traverse",
              note: t({
                en: "The stylex-breakpoints plugin below needs them.",
                zh: "下文的 stylex-breakpoints 插件需要它们。",
              }),
            },
          ]}
        />
      </GuideSection>

      <GuideSection
        title={t({ en: "Set up the build", zh: "配置构建" })}
        lead={t({
          en: "Next.js transpiles the package, Babel compiles every StyleX call in it and in your code, and PostCSS writes the stylesheet. Run next dev --webpack and next build --webpack: Turbopack, the default since Next.js 16, does not run Babel on files in node_modules, so it leaves @tuja/ui uncompiled.",
          zh: "Next.js 转译这个包，Babel 编译包内与你代码中的每个 StyleX 调用，PostCSS 写出样式表。请运行 next dev --webpack 与 next build --webpack：Next.js 16 起默认使用的 Turbopack 不会对 node_modules 中的文件运行 Babel，会让 @tuja/ui 未经编译。",
        })}
      >
        <UsageSnippet code={NEXT_CONFIG} label="next.config.js" />
        <UsageSnippet code={BABEL_CONFIG} label="babel.config.js" />
        <GuideList
          items={[
            {
              term: "stylex-breakpoints",
              note: t({
                en: "@tuja/ui writes responsive styles with breakpoints.md and its siblings as keys. StyleX alone compiles those keys into CSS that no browser applies, so this plugin replaces them with media queries first. Without it, no breakpoint style in the package applies, including the responsive sizes of the font Tokens.",
                zh: "@tuja/ui 以 breakpoints.md 等常量作为键来编写响应式样式。仅靠 StyleX，这些键会被编译成浏览器不会应用的 CSS，因此这个插件先把它们替换成媒体查询。没有它，包内任何按断点设置的样式都不会生效，包括 font 令牌的响应式尺寸。",
              }),
            },
            {
              term: t({ en: "Where to get it", zh: "从哪里获取" }),
              note: t({
                en: "The plugin lives in @tuja/babel-plugins, which is not published. Copy packages/babel-plugins/src/stylex-breakpoints/index.js from the repository into your project as stylex-breakpoints.js. Its rootDir is the @tuja/ui package, because it reads the shipped src/breakpoints.stylex.ts.",
                zh: "这个插件位于 @tuja/babel-plugins，而该包尚未发布。请把仓库中的 packages/babel-plugins/src/stylex-breakpoints/index.js 复制到你的项目，命名为 stylex-breakpoints.js。它的 rootDir 指向 @tuja/ui 包，因为它要读取随包发布的 src/breakpoints.stylex.ts。",
              }),
            },
            {
              term: 'sxPropName: "css"',
              note: t({
                en: "Required. The components write css on their own elements, and this option turns it into class names.",
                zh: "必需。组件在自己的元素上使用 css，这个选项把它转换为类名。",
              }),
            },
            {
              term: 'styleResolution: "property-specificity"',
              note: t({
                en: "The rule that decides which style wins when your css meets a component's own. The override advice on Customisation assumes it.",
                zh: "当你的 css 与组件自身的样式相遇时，由这条规则决定谁胜出。“定制”页面中关于覆盖样式的说明都以它为前提。",
              }),
            },
          ]}
        />
        <UsageSnippet code={POSTCSS_CONFIG} label="postcss.config.js" />
        <GuideNote>
          {t({
            en: "The include globs must reach the @tuja/ui source as well as your own, or its components render unstyled. useCSSLayers puts every StyleX rule in a cascade layer; the next section says what that means for your own global CSS.",
            zh: "include 匹配规则既要覆盖你自己的源码，也要覆盖 @tuja/ui 的源码，否则它的组件会没有样式。useCSSLayers 把每条 StyleX 规则放进一个级联层；下一节会说明这对你自己的全局 CSS 意味着什么。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Set up TypeScript", zh: "配置 TypeScript" })}
        lead={t({
          en: "Your type check reads the package source too. It imports its own files with a .ts extension and writes css on elements, so your project has to allow both.",
          zh: "你的类型检查也会读取这个包的源码。它以 .ts 扩展名导入自己的文件，并在元素上使用 css，因此你的项目必须同时允许这两点。",
        })}
      >
        <UsageSnippet
          code={TSCONFIG}
          source={[["plain", TSCONFIG]]}
          label="tsconfig.json"
        />
        <UsageSnippet code={CSS_PROP_TYPES} label="css-prop.d.ts" />
        <GuideNote>
          {t({
            en: "Put css-prop.d.ts anywhere your tsconfig.json includes. Without it, the type check fails inside @tuja/ui itself, even if your own code never writes css on an element. Without allowImportingTsExtensions, it fails on every import inside the package.",
            zh: "把 css-prop.d.ts 放在 tsconfig.json 所包含的任意位置。没有它，类型检查会在 @tuja/ui 内部失败，哪怕你自己的代码从未在元素上写过 css。没有 allowImportingTsExtensions，包内的每一条导入都会报错。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Prepare the root", zh: "准备根元素" })}
        lead={t({
          en: "The components paint themselves, but they leave the page to you: the canvas, the text colour, the typeface and the colour scheme come from the root.",
          zh: "组件会绘制自身，但页面本身交给你：画布、文字颜色、字体与配色方案都来自根元素。",
        })}
      >
        <UsageSnippet
          code={GLOBAL_CSS}
          source={[["plain", GLOBAL_CSS]]}
          label="global.css"
        />
        <UsageSnippet code={ROOT_LAYOUT} label="layout.tsx" />
        <GuideList
          items={[
            {
              term: "@stylex",
              note: t({
                en: "The PostCSS plugin replaces this line with the compiled stylesheet. Without it, no StyleX rule reaches the page.",
                zh: "PostCSS 插件会把这一行替换为编译后的样式表。没有它，任何 StyleX 规则都到不了页面上。",
              }),
            },
            {
              term: t({ en: "Your own global CSS", zh: "你自己的全局 CSS" }),
              note: t({
                en: "Put it in a cascade layer, such as a reset imported with layer(normalize). StyleX writes into layers, and a rule outside every layer beats all of them, whatever its specificity.",
                zh: "把它放进一个级联层，例如用 layer(normalize) 导入的重置样式。StyleX 把规则写进各个层，而不在任何层中的规则会压过它们全部，与选择器优先级无关。",
              }),
            },
            {
              term: t({ en: "The typeface", zh: "字体" }),
              value: "font.family",
              note: t({
                en: 'Only controls such as Button and the form fields set a font family; all other text inherits the root\'s. font.family asks for "Inter", then "Inter-fallback", then the platform sans-serif. The package ships no font files: serve Inter yourself, or text renders in the fallback. Code blocks use font.familyMono, which asks for "IBM Plex Mono" first.',
                zh: "只有 Button 与表单字段这样的控件会设置字体族；其余文字都继承根元素的字体。font.family 先请求 “Inter”，再请求 “Inter-fallback”，最后是平台的无衬线字体。这个包不附带字体文件：请自行提供 Inter，否则文字会以后备字体渲染。代码块使用 font.familyMono，它优先请求 “IBM Plex Mono”。",
              }),
            },
          ]}
        />
      </GuideSection>

      <GetStartedFirstComponent />

      <GuideSection
        title={t({ en: "Style with the css prop", zh: "用 css 属性设置样式" })}
        lead={t({
          en: "css is how you style an element and how you pass styles to a @tuja/ui component. It takes what stylex.create returns, an array of those, and false or null to leave one out.",
          zh: "css 既用于给元素设置样式，也用于把样式传给 @tuja/ui 组件。它接收 stylex.create 的返回值、由这些值组成的数组，以及用来略去某项的 false 或 null。",
        })}
      >
        <UsageSnippet code={CSS_PROP} />
        <GuideList
          items={[
            {
              term: t({ en: "On an element", zh: "在元素上" }),
              note: t({
                en: "The Babel plugin turns css on a lowercase element, such as div or svg, into class names at build time.",
                zh: "Babel 插件在构建时把小写元素（如 div 或 svg）上的 css 转换为类名。",
              }),
            },
            {
              term: t({
                en: "On a @tuja/ui component",
                zh: "在 @tuja/ui 组件上",
              }),
              note: t({
                en: "css is an ordinary prop that the component adds after its own styles. No component takes className or style. Give your own components a css prop typed StyleProp from @tuja/ui/types, added last, as above.",
                zh: "css 是一个普通属性，组件把它加在自身样式之后。没有一个组件接收 className 或 style。你自己的组件也可以提供一个用 @tuja/ui/types 中的 StyleProp 标注类型的 css 属性，并像上面那样放在最后。",
              }),
            },
            {
              term: t({
                en: "On a component from another package",
                zh: "在其他包的组件上",
              }),
              note: t({
                en: "next/link or a Phosphor icon does not know css. Spread stylex.props onto it instead.",
                zh: "next/link 或 Phosphor 图标并不认识 css。请改为把 stylex.props 展开到它上面。",
              }),
            },
          ]}
        />
        <UsageSnippet
          code={THIRD_PARTY}
          label={t({ en: "On next/link", zh: "在 next/link 上" })}
        />
        <UsageSnippet
          code={RUNTIME_VALUE}
          label={t({
            en: "A value known only at runtime",
            zh: "仅在运行时才知道的值",
          })}
        />
        <GuideNote>
          {t({
            en: "A style written as a function has its properties fixed at build time and takes its value when you call it, so a runtime value also goes through css.",
            zh: "写成函数的样式在构建时就固定了要设置的属性，在调用时才取值，因此运行时的值同样通过 css 传入。",
          })}
        </GuideNote>
      </GuideSection>

      <GetStartedLightDark />

      <GetStartedImportMap />

      <GetStartedNextSteps />
    </DocPage>
  );
}
