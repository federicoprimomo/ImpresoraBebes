import { defineConfig } from "vitest/config";

/**
 * Tests unitarios: funciones puras, sin base de datos. Corren en cualquier
 * lado (local o CI) sin levantar nada aparte. Los tests que sí necesitan
 * Postgres viven en tests/integration/ y usan vitest.integration.config.mts.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
