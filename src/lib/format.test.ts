import { describe, expect, it } from "vitest";

import {
  formatArsCents,
  formatDateTime,
  parseArgentinaDateTimeLocal,
  toArgentinaDateTimeLocalInput,
} from "./format";

describe("formatArsCents", () => {
  it("formatea centavos como pesos argentinos", () => {
    // Intl.NumberFormat("es-AR") usa espacio no separable después del símbolo.
    expect(formatArsCents(1560000).replace(" ", " ")).toBe("$ 15.600,00");
  });

  it("maneja cero", () => {
    expect(formatArsCents(0).replace(" ", " ")).toBe("$ 0,00");
  });

  it("maneja montos con centavos no redondos", () => {
    expect(formatArsCents(150).replace(" ", " ")).toBe("$ 1,50");
  });
});

describe("formatDateTime", () => {
  it("devuelve un guion largo para null/undefined", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime(undefined)).toBe("—");
  });

  it("formatea una fecha real sin tirar", () => {
    const result = formatDateTime(new Date("2026-01-15T10:30:00Z"));
    expect(result).not.toBe("—");
    expect(result.length).toBeGreaterThan(0);
  });

  it("acepta un string de fecha además de un Date", () => {
    const fromDate = formatDateTime(new Date("2026-01-15T10:30:00Z"));
    const fromString = formatDateTime("2026-01-15T10:30:00Z");
    expect(fromString).toBe(fromDate);
  });

  it("siempre muestra hora de Argentina (UTC-3), sin importar el huso del proceso", () => {
    // 21:00 UTC es 18:00 (6pm) en Argentina — si esto rompe, formatDateTime
    // dejó de fijar timeZone y volvió a depender del huso del server.
    expect(formatDateTime("2026-08-27T21:00:00Z")).toContain("6:00");
  });
});

describe("parseArgentinaDateTimeLocal", () => {
  it("da null para string vacío", () => {
    expect(parseArgentinaDateTimeLocal("")).toBeNull();
  });

  it("interpreta el valor de un <input datetime-local> como hora de Argentina, no la del proceso", () => {
    // Sin esto, "18:00" cargado por alguien en Argentina se guardaba como
    // 18:00 UTC (server) en vez de 21:00 UTC (= 18:00 ART real) — un
    // corrimiento de 3hs suficiente para que un evento recién cargado
    // pareciera ya pasado.
    const parsed = parseArgentinaDateTimeLocal("2026-08-27T18:00");
    expect(parsed?.toISOString()).toBe("2026-08-27T21:00:00.000Z");
  });

  it("acepta el valor con segundos incluidos", () => {
    const parsed = parseArgentinaDateTimeLocal("2026-08-27T18:00:30");
    expect(parsed?.toISOString()).toBe("2026-08-27T21:00:30.000Z");
  });
});

describe("toArgentinaDateTimeLocalInput", () => {
  it("da string vacío para null/undefined", () => {
    expect(toArgentinaDateTimeLocalInput(null)).toBe("");
    expect(toArgentinaDateTimeLocalInput(undefined)).toBe("");
  });

  it("es la inversa de parseArgentinaDateTimeLocal — round-trip sin corrimiento", () => {
    // Precondición del form de editar: precargar el <input datetime-local>
    // con lo que ya está guardado tiene que reproducir el mismo string que
    // el usuario habría tipeado, no uno corrido por el huso del proceso.
    const parsed = parseArgentinaDateTimeLocal("2026-08-27T18:00");
    expect(toArgentinaDateTimeLocalInput(parsed)).toBe("2026-08-27T18:00");
  });

  it("acepta un string de fecha además de un Date", () => {
    expect(toArgentinaDateTimeLocalInput("2026-08-27T21:00:00.000Z")).toBe("2026-08-27T18:00");
  });
});
