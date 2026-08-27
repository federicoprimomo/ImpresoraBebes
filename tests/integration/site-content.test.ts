import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import {
  getSiteContent,
  getSiteContentMap,
  SITE_CONTENT_DEFAULTS,
  setSiteContent,
} from "@/lib/site-content";

// Usamos keys que no existen en SITE_CONTENT_DEFAULTS para no pisar
// contenido real mientras corre el test contra la DB de desarrollo.
const TEST_KEY = "test.integration.only";
const TEST_KEY_2 = "test.integration.only.2";

describe("getSiteContent / setSiteContent", () => {
  afterEach(async () => {
    await prisma.siteContent.deleteMany({ where: { key: { in: [TEST_KEY, TEST_KEY_2] } } });
  });

  it("sin fila y sin default, devuelve string vacío (nunca undefined/null)", async () => {
    expect(await getSiteContent(TEST_KEY)).toBe("");
  });

  it("setSiteContent crea la fila si no existe, y getSiteContent la lee", async () => {
    await setSiteContent(TEST_KEY, "Contenido de prueba");
    expect(await getSiteContent(TEST_KEY)).toBe("Contenido de prueba");
  });

  it("setSiteContent sobre una key existente actualiza el valor (upsert)", async () => {
    await setSiteContent(TEST_KEY, "Primero");
    await setSiteContent(TEST_KEY, "Segundo");
    expect(await getSiteContent(TEST_KEY)).toBe("Segundo");

    const rows = await prisma.siteContent.findMany({ where: { key: TEST_KEY } });
    expect(rows).toHaveLength(1);
  });

  it("una key real de SITE_CONTENT_DEFAULTS sin fila propia cae al default", async () => {
    const key = "hero.title";
    await prisma.siteContent.deleteMany({ where: { key } }); // asegura que no haya override
    expect(await getSiteContent(key)).toBe(SITE_CONTENT_DEFAULTS[key]);
  });
});

describe("getSiteContentMap", () => {
  afterEach(async () => {
    await prisma.siteContent.deleteMany({ where: { key: { in: [TEST_KEY, TEST_KEY_2] } } });
  });

  it("combina filas guardadas con defaults para las keys sin fila, en un solo llamado", async () => {
    await setSiteContent(TEST_KEY, "Guardado");

    const map = await getSiteContentMap([TEST_KEY, TEST_KEY_2, "hero.title"] as const);
    expect(map[TEST_KEY]).toBe("Guardado");
    expect(map[TEST_KEY_2]).toBe(""); // no default definido para esta key de test
    expect(map["hero.title"]).toBe(SITE_CONTENT_DEFAULTS["hero.title"]);
  });
});
