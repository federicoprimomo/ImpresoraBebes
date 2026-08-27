import { describe, expect, it } from "vitest";

import { isEventPast } from "@/lib/listing";

describe("isEventPast", () => {
  it("da false si no hay fecha cargada (evento a confirmar)", () => {
    expect(isEventPast(null)).toBe(false);
    expect(isEventPast(undefined)).toBe(false);
  });

  it("da true para una fecha en el pasado", () => {
    expect(isEventPast(new Date(Date.now() - 60_000))).toBe(true);
  });

  it("da false para una fecha en el futuro", () => {
    expect(isEventPast(new Date(Date.now() + 60_000))).toBe(false);
  });

  it("acepta un string ISO igual que un Date", () => {
    expect(isEventPast(new Date(Date.now() - 60_000).toISOString())).toBe(true);
  });
});
