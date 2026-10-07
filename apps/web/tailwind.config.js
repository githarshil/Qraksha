const path = require("path");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media",
  content: [
    path.join(__dirname, "src/**/*.{js,ts,jsx,tsx,mdx}"),
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./apps/web/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "var(--bg-ink)",
          2: "var(--bg-ink-2)",
        },
        peach: {
          DEFAULT: "var(--bg-peach)",
          2: "var(--bg-peach-2)",
        },
        brand: {
          DEFAULT: "var(--brand)",
          soft: "var(--brand-soft)",
          deep: "var(--brand-deep)",
        },
        primary: {
          DEFAULT: "var(--brand)",
          dark: "var(--brand-soft)",
        },
        secondary: {
          DEFAULT: "var(--text-on-dark)",
          dark: "var(--text-on-dark)",
        },
        background: {
          DEFAULT: "var(--bg-ink)",
          dark: "var(--bg-ink)",
        },
        surface: {
          DEFAULT: "var(--bg-ink-2)",
          dark: "var(--bg-ink-2)",
        },
        text: {
          DEFAULT: "var(--text-on-dark)",
          dark: "var(--text-on-dark)",
        },
        muted: {
          DEFAULT: "var(--text-on-dark-muted)",
          dark: "var(--text-on-dark-muted)",
        },
        border: {
          DEFAULT: "var(--line-dark)",
          dark: "var(--line-dark)",
        },
        verdict: {
          ok: "var(--ok)",
          warn: "var(--warn)",
          danger: "var(--danger)",
        },
        ok: "var(--ok)",
        warn: "var(--warn)",
        danger: "var(--danger)",
        tier: {
          verified: {
            DEFAULT: "var(--ok)",
            bg: "rgba(47, 191, 113, 0.15)",
          },
          unverified: {
            DEFAULT: "var(--warn)",
            bg: "rgba(242, 181, 49, 0.15)",
          },
          warning: {
            DEFAULT: "var(--danger)",
            bg: "rgba(229, 56, 79, 0.15)",
          },
          info: {
            DEFAULT: "var(--brand)",
            bg: "rgba(255, 75, 31, 0.15)",
          },
        },
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "2px",
        md: "var(--radius)",
        lg: "var(--radius)",
        xl: "var(--radius)",
        "2xl": "var(--radius)",
        "3xl": "var(--radius)",
        full: "9999px",
      },
      fontFamily: {
        sans: [
          '"Inter Tight"',
          "Geist",
          '"General Sans"',
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "sans-serif",
        ],
        mono: ['"JetBrains Mono"', '"Geist Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
