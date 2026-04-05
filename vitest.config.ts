import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Use happy-dom instead of jsdom for better canvas support
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "vitest.setup.ts",
        "src/__tests__/**",
        "src/main.tsx",
        "vite.config.ts",
        "vitest.config.ts",
        "eslint.config.js",
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
