import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // HISD lesson-phase footer colors (from the deck templates)
        phase: {
          donow: "#2e7d32",
          direct: "#d27040",
          guided: "#474f99",
          independent: "#6db83d",
        },
        brand: {
          DEFAULT: "#1f4e79",
          light: "#2f6db3",
          ink: "#0f172a",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;