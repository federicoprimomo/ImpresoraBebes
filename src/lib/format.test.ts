import { describe, expect, it } from "vitest";

import { formatArsCents, formatDateTime } from "./format";

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
});
