import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e1f2fc",
          100: "#c5e6f8",
          500: "#1ca0e0",
          600: "#1788bf",
          700: "#116a97",
        },
        valenet: {
          indigo: "#2b2380",
          navy: "#0b2a7a",
        },
      },
    },
  },
  plugins: [],
};

export default config;
