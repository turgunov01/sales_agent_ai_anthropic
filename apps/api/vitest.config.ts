import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/modules/**/*.ts", "src/core/**/*.ts"],
      exclude: [
        "src/**/*.routes.ts",
        "src/**/*.d.ts",
        // Файлы только с типами: исполняемого кода нет.
        "src/**/types.ts",
        // Фабрика PrismaClient проверяется миграциями и прогоном на dev-БД.
        "src/core/prisma.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        statements: 80,
        branches: 70,
      },
    },
  },
});