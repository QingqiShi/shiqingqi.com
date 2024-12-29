import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";
import { tokens } from "@/tokens.stylex";

interface WtcLogoProps {
  className?: string;
  style?: CSSProperties;
}

export default function WtcLogo({ className, style }: WtcLogoProps) {
  return (
    <svg viewBox="-51 -14.008 115 39.953" className={className} style={style}>
      <title>Wunderman Thompson Commerce</title>
      <path
        css={styles.plusPath}
        d="M-40.465-10.079h-3.929v-3.929h-2.672v3.929H-51v2.672h3.934v3.929h2.672v-3.929h3.929z"
      ></path>
      <path
        css={styles.letterPath}
        d="M21.3 8.519zM27.594.165a3.643 3.643 0 00-3.638-3.638h-3.995V8.523H21.3V3.802h2.656c.103 0 .205-.005.308-.015l2.166 4.736h1.472L25.561 3.43A3.667 3.667 0 0027.594.165zm-3.638 2.304H21.3v-4.614h2.656a2.314 2.314 0 012.31 2.31 2.312 2.312 0 01-2.31 2.304zm-43.713 2.386c0 1.783-1.206 2.498-2.662 2.498-1.461 0-2.662-.715-2.662-2.498v-8.333h-1.333v8.344c0 2.355 1.629 3.816 3.995 3.816 2.371 0 3.996-1.461 3.996-3.816v-8.344h-1.333v8.333zm-12.518.915l-1.773-9.242h-1.62L-37.44 5.77l-1.666-9.242h-1.359l2.304 11.996h1.411l1.89-9.288 1.891 9.288h1.41l2.304-11.996h-1.359l-1.661 9.242zm45.564 8.016H9.304v11.996h1.334v-4.711h2.651a3.64 3.64 0 003.638-3.637 3.628 3.628 0 00-3.638-3.648zm0 5.947h-2.651v-4.608h2.651a2.308 2.308 0 012.31 2.31 2.306 2.306 0 01-2.31 2.298zm-2.651 6.049zM47.09-3.478L43.269 8.519h1.39l.89-2.764h4.547l.879 2.764h1.41L48.541-3.478H47.09zm-1.123 7.904l1.859-5.778 1.839 5.778h-3.698zm-10.362 9.197a3.889 3.889 0 00-3.883 3.893v4.537a3.889 3.889 0 003.883 3.893 3.899 3.899 0 003.894-3.893v-4.537a3.898 3.898 0 00-3.894-3.893zm2.555 8.43a2.55 2.55 0 01-2.555 2.555 2.55 2.55 0 01-2.555-2.555v-4.537c0-1.42 1.145-2.564 2.555-2.564s2.555 1.145 2.555 2.564v4.537zm-48.767-8.43a3.896 3.896 0 00-3.888 3.893v4.537a3.898 3.898 0 003.888 3.893 3.898 3.898 0 003.893-3.893v-4.537a3.898 3.898 0 00-3.893-3.893zm2.56 8.43c0 1.41-1.145 2.555-2.56 2.555s-2.56-1.135-2.56-2.555v-4.537a2.559 2.559 0 012.56-2.564c1.41 0 2.56 1.145 2.56 2.564v4.537zM-7.93 5.77l-5.431-9.242h-1.257V8.523h1.333V-.725l5.431 9.243h1.257V-3.478H-7.93V5.77zm70.552-9.243V5.77l-5.416-9.242h-1.267V8.523h1.328V-.725l5.437 9.243h1.268V-3.478l-1.35.005zM50.504 23.033l-5.437-9.247H43.81v11.996h1.339v-9.247l5.426 9.247h1.257V13.786h-1.328v9.247zM5.104 4.63V.416a3.89 3.89 0 00-3.888-3.888h-3.99V8.523h3.99A3.9 3.9 0 005.104 4.63zm-6.545-6.775H1.21A2.559 2.559 0 013.77.415V4.63c0 1.41-1.139 2.56-2.56 2.56h-2.651v-9.335zM16.446 7.19h-6.014V3.174h5.359V1.841h-5.359v-3.985h6.014v-1.333H9.1V8.519h7.347V7.19zm19.159-4.741l-2.984-5.921h-1.39V8.523h1.329V-.725l2.615 5.278h.858l2.616-5.278v9.243h1.349V-3.478h-1.39l-3.003 5.927zm-75.416 12.676h4.287v10.657h1.333V15.125h4.281v-1.339h-9.901v1.339zm20.007 3.994h-5.232v-5.333h-1.333v11.996h1.333v-5.334h5.227v5.334h1.339V13.786h-1.339v5.333h.005zm44.618.011l-1.91-.756c-1.288-.542-1.462-1.145-1.462-1.676 0-.49.185-.899.542-1.196.429-.356 1.094-.562 1.85-.562.776 0 1.431.215 1.86.582.397.348.602.839.602 1.462v.215h1.339v-.215c0-2.084-1.553-3.372-3.801-3.372-2.238 0-3.729 1.268-3.729 3.075 0 1.604 1.134 2.483 2.523 3.015l1.696.674c1.645.635 2.126 1.104 2.126 2.086 0 .643-.226 1.154-.655 1.522-.459.397-1.185.623-2.002.623-.858 0-1.584-.205-2.054-.593-.419-.348-.634-.838-.634-1.44v-.297h-1.339v.297c0 2.074 1.646 3.371 4.026 3.371 2.37 0 3.985-1.369 3.985-3.483.001-2.045-1.573-2.78-2.963-3.332zm-23.65.572l-2.994-5.916h-1.385v11.996h1.333v-9.247l2.621 5.282h.854l2.621-5.282v9.247h1.333V13.786H4.164l-3 5.916z"
      ></path>
    </svg>
  );
}

const styles = stylex.create({
  plusPath: {
    fill: tokens.wtcLogoPlusFill,
  },
  letterPath: {
    fill: tokens.wtcLogoLetterFill,
  },
});
