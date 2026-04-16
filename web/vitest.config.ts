import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    env: {
      USE_MOCK_DATA: "true",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.{ts,tsx}",
        "src/app/**/layout.tsx",
        "src/app/**/loading.tsx",
        "src/app/**/not-found.tsx",
        "src/app/**/error.tsx",
        "src/app/**/page.tsx",
      ],
      thresholds: {
        lines: 40,
        branches: 30,
        functions: 30,
        statements: 40,
      },
    },
    // Component/hook tests use jsdom; backend tests use node (default).
    // Note: environmentMatchGlobs is deprecated in vitest 3.x but remains functional.
    // Migrating to workspace-based config requires duplicating resolve.alias across
    // each project, which adds maintenance burden for no functional benefit.
    environmentMatchGlobs: [
      ["tests/components/**", "jsdom"],
      ["tests/hooks/**", "jsdom"],
    ],
  },
});
