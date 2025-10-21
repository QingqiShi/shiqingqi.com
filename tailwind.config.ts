import * as radixColors from "@radix-ui/colors";
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Custom breakpoints matching current StyleX setup
      screens: {
        sm: "320px",
        md: "768px",
        lg: "1080px",
        xl: "2000px",
      },

      // Radix Colors integration
      colors: {
        // Gray scale (semantic neutrals)
        gray: {
          1: radixColors.gray.gray1,
          2: radixColors.gray.gray2,
          3: radixColors.gray.gray3,
          4: radixColors.gray.gray4,
          5: radixColors.gray.gray5,
          6: radixColors.gray.gray6,
          7: radixColors.gray.gray7,
          8: radixColors.gray.gray8,
          9: radixColors.gray.gray9,
          10: radixColors.gray.gray10,
          11: radixColors.gray.gray11,
          12: radixColors.gray.gray12,
        },
        grayDark: {
          1: radixColors.grayDark.gray1,
          2: radixColors.grayDark.gray2,
          3: radixColors.grayDark.gray3,
          4: radixColors.grayDark.gray4,
          5: radixColors.grayDark.gray5,
          6: radixColors.grayDark.gray6,
          7: radixColors.grayDark.gray7,
          8: radixColors.grayDark.gray8,
          9: radixColors.grayDark.gray9,
          10: radixColors.grayDark.gray10,
          11: radixColors.grayDark.gray11,
          12: radixColors.grayDark.gray12,
        },

        // Purple (primary accent)
        purple: {
          1: radixColors.purple.purple1,
          2: radixColors.purple.purple2,
          3: radixColors.purple.purple3,
          4: radixColors.purple.purple4,
          5: radixColors.purple.purple5,
          6: radixColors.purple.purple6,
          7: radixColors.purple.purple7,
          8: radixColors.purple.purple8,
          9: radixColors.purple.purple9,
          10: radixColors.purple.purple10,
          11: radixColors.purple.purple11,
          12: radixColors.purple.purple12,
        },
        purpleDark: {
          1: radixColors.purpleDark.purple1,
          2: radixColors.purpleDark.purple2,
          3: radixColors.purpleDark.purple3,
          4: radixColors.purpleDark.purple4,
          5: radixColors.purpleDark.purple5,
          6: radixColors.purpleDark.purple6,
          7: radixColors.purpleDark.purple7,
          8: radixColors.purpleDark.purple8,
          9: radixColors.purpleDark.purple9,
          10: radixColors.purpleDark.purple10,
          11: radixColors.purpleDark.purple11,
          12: radixColors.purpleDark.purple12,
        },

        // Green (for TMDB brand)
        green: {
          1: radixColors.green.green1,
          2: radixColors.green.green2,
          3: radixColors.green.green3,
          4: radixColors.green.green4,
          5: radixColors.green.green5,
          6: radixColors.green.green6,
          7: radixColors.green.green7,
          8: radixColors.green.green8,
          9: radixColors.green.green9,
          10: radixColors.green.green10,
          11: radixColors.green.green11,
          12: radixColors.green.green12,
        },
        greenDark: {
          1: radixColors.greenDark.green1,
          2: radixColors.greenDark.green2,
          3: radixColors.greenDark.green3,
          4: radixColors.greenDark.green4,
          5: radixColors.greenDark.green5,
          6: radixColors.greenDark.green6,
          7: radixColors.greenDark.green7,
          8: radixColors.greenDark.green8,
          9: radixColors.greenDark.green9,
          10: radixColors.greenDark.green10,
          11: radixColors.greenDark.green11,
          12: radixColors.greenDark.green12,
        },

        // Brand colors (as CSS variables, defined in globals.css)
        brand: {
          tmdb: "var(--brand-tmdb)",
          citadel: "var(--brand-citadel)",
          wtcPlus: "var(--brand-wtc-plus)",
          wtcLetter: "var(--brand-wtc-letter)",
          bristol: "var(--brand-bristol)",
          nottingham: "var(--brand-nottingham)",
          spotify: "var(--brand-spotify)",
        },
      },

      // Fluid typography scale
      fontSize: {
        xs: [
          "clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)",
          { lineHeight: "1.5" },
        ],
        sm: ["clamp(0.875rem, 0.8rem + 0.375vw, 1rem)", { lineHeight: "1.5" }],
        base: [
          "clamp(1rem, 0.95rem + 0.25vw, 1.125rem)",
          { lineHeight: "1.6" },
        ],
        lg: [
          "clamp(1.125rem, 1rem + 0.625vw, 1.375rem)",
          { lineHeight: "1.5" },
        ],
        xl: [
          "clamp(1.25rem, 1.1rem + 0.75vw, 1.625rem)",
          { lineHeight: "1.4" },
        ],
        "2xl": ["clamp(1.5rem, 1.3rem + 1vw, 2rem)", { lineHeight: "1.3" }],
        "3xl": ["clamp(2rem, 1.6rem + 2vw, 3rem)", { lineHeight: "1.2" }],
        "4xl": ["clamp(2.5rem, 2rem + 2.5vw, 4rem)", { lineHeight: "1.1" }],
      },

      // Font weights (match Inter variable font)
      fontWeight: {
        thin: "100",
        extralight: "200",
        light: "300",
        normal: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        extrabold: "800",
        black: "900",
      },

      // Border radius
      borderRadius: {
        sm: "0.3rem",
        DEFAULT: "0.5rem",
        md: "0.5rem",
        lg: "1rem",
        xl: "2rem",
        "2xl": "3rem",
        full: "9999px",
      },

      // Box shadows with Radix-inspired depth
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        DEFAULT:
          "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
      },

      // Z-index scale
      zIndex: {
        background: "-100",
        base: "0",
        content: "100",
        overlay: "200",
        header: "300",
        tooltip: "400",
        toaster: "500",
      },

      // Aspect ratios
      aspectRatio: {
        square: "1",
        golden: "1.618",
        tv: "4/3",
        double: "2/1",
        wide: "16/9",
        poster: "2/3",
        portrait: "3/4",
      },
    },
  },
  plugins: [],
};

export default config;
