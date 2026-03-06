import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    files: ["cypress/**/*.ts"],
    languageOptions: {
      globals: {
        after: "readonly",
        afterEach: "readonly",
        before: "readonly",
        beforeEach: "readonly",
        Cypress: "readonly",
        cy: "readonly",
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
      },
    },
  },
  {
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-inline-comments": "warn",
      "react-hooks/rules-of-hooks": "error",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
