/**
 * The app's own additions to the normalize layer, from
 * `apps/web/src/app/global.css`. Font smoothing is the part that shows: it
 * changes the weight text renders at on macOS.
 */
export function pageResetCss() {
  return `@layer normalize {
  :root {
    font-size: 16px;
  }

  body {
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
  }

  * {
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
  }
}
`;
}
