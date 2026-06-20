import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effaf9",
          100: "#d7f3f1",
          200: "#aee8e3",
          300: "#75d8d1",
          400: "#2bbeb7",
          500: "#0f9f99",
          600: "#078f86",
          700: "#0646a3",
          800: "#073a78",
          900: "#05275a",
        },
        sentra: {
          gold: "#d39a00",
        },
      },
    },
  },
  plugins: [],
};

export default config;
