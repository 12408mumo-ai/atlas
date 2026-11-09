import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        marble: "rgb(var(--atlas-sand-rgb) / <alpha-value>)",
        marbleDim: "rgb(var(--atlas-light-rgb) / <alpha-value>)",
        wine: "rgb(var(--atlas-charcoal-rgb) / <alpha-value>)",
        wineDeep: "rgb(var(--atlas-deep-rgb) / <alpha-value>)",
        gold: "rgb(var(--atlas-sand-rgb) / <alpha-value>)",
        goldSoft: "rgb(var(--atlas-light-rgb) / <alpha-value>)",
        ink: "rgb(var(--atlas-deep-rgb) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Georgia", "serif"],
        ui: ["var(--font-ui)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        pill: "999px",
      },
    },
  },
  plugins: [],
};
export default config;
