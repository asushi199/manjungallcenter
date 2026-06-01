import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      ".npm-cache/**",
      "node_modules/**",
      "next-env.d.ts",
      "public/sw.js",
      "public/sw.js.map",
      "public/workbox-*.js",
      "public/workbox-*.js.map",
      "public/swe-worker-*.js",
      "public/fallback-*.js",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@next/next/no-img-element": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "import/no-anonymous-default-export": "off",
    },
  },
];

export default eslintConfig;
