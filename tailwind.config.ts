import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Midnight-blue companion-app palette (dark navy + indigo glow)
        sidebar: "#05070d",
        main: "#0a0e1a",
        bubble: "#131a2e",
        composer: "#10162a",
        hover: "#1b2340",
        brand: "#4f6bff",
      },
      fontFamily: {
        sans: [
          "var(--font-quicksand)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;
