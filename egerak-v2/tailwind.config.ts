import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff1f6",
          100: "#ffe1ec",
          200: "#ffc4d9",
          300: "#ff95b9",
          400: "#ff5b92",
          500: "#f5306f",
          600: "#dc1858",
          700: "#b81049",
          800: "#92103e",
          900: "#761035",
        },
      },
    },
  },
  plugins: [],
};

export default config;
