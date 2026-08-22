import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.nuxt/**",
      "**/.output/**",
      "**/coverage/**",
      "**/*.vue",
      "apps/web/.nuxt/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.es2023 },
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "no-console": "error",
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
      "no-param-reassign": "error",
      complexity: ["warn", 15],
      "max-depth": ["warn", 4],
    },
  },
  {
    files: ["**/tests/**/*.ts", "**/*.test.ts", "**/prisma/seed.ts", "**/scripts/**/*.ts"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);