import "dotenv/config";

import { defineConfig } from "vitest/config";

/**
 * Tests de integración: ejercitan lib/ contra una base Postgres real (la
 * de DATABASE_URL) — son los que cubren las condiciones de carrera y la
 * lógica que vive en transacciones. Corren en serie (fileParallelism:
 * false) para que no se pisen entre sí escribiendo en las mismas tablas.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
