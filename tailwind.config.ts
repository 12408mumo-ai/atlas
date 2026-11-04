import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#070a10",
        abyss: "#0b1119",
        ink: "#111a24",
        marble: "#efe7d6",
        parchment: "#e8dcc0",
        bronze: "#b98a4a",
        gold: "#e2b563",
        goldBright: "#f3d79a",
        laurel: "#7f9a7a",
        aegean: "#2f6f8f",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Georgia", "serif"],
        ui: ["var(--font-ui)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        relic: "0 30px 80px -30px rgba(0,0,0,.9), inset 0 0 60px rgba(226,181,99,.05)",
        glow: "0 0 40px rgba(226,181,99,.35)",
      },
    },
  },
  plugins: [],
};
export default config;
