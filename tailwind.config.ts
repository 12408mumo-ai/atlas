import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        marble: "#f4efe6",
        marbleDim: "#ded6c7",
        wine: "#5a1220",
        wineDeep: "#4a0f1b",
        gold: "#c6a15b",
        goldSoft: "#d9bf8d",
        ink: "#2a1216",
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
