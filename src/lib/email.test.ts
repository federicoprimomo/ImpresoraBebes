import { describe, expect, it } from "vitest";

import { EMAIL_TEMPLATE_DEFAULTS, EMAIL_TEMPLATE_LABELS, renderTemplate } from "./email";

describe("renderTemplate", () => {
  it("reemplaza {{variable}} por su valor", () => {
    const result = renderTemplate(
      { subject: 'Vendiste "{{listingTitle}}"', body: "Cobraste {{amount}}." },
      { listingTitle: "Entrada Test", amount: "$1.000" },
    );
    expect(result.subject).toBe('Vendiste "Entrada Test"');
    expect(result.body).toBe("Cobraste $1.000.");
  });

  it("una variable sin valor provisto se reemplaza por string vacío, no rompe", () => {
    const result = renderTemplate(
      { subject: "Hola {{nombre}}", body: "{{sinValor}}" },
      { nombre: "Fede" },
    );
    expect(result.subject).toBe("Hola Fede");
    expect(result.body).toBe("");
  });

  it("tolera espacios adentro de las llaves ({{ var }})", () => {
    const result = renderTemplate({ subject: "{{ x }}", body: "" }, { x: "ok" });
    expect(result.subject).toBe("ok");
  });

  it("no toca texto sin placeholders", () => {
    const result = renderTemplate({ subject: "Asunto fijo", body: "Cuerpo fijo" }, {});
    expect(result).toEqual({ subject: "Asunto fijo", body: "Cuerpo fijo" });
  });
});

describe("EMAIL_TEMPLATE_DEFAULTS", () => {
  it("tiene una etiqueta (EMAIL_TEMPLATE_LABELS) para cada plantilla, y viceversa", () => {
    const templateKeys = Object.keys(EMAIL_TEMPLATE_DEFAULTS).sort();
    const labelKeys = Object.keys(EMAIL_TEMPLATE_LABELS).sort();
    expect(labelKeys).toEqual(templateKeys);
  });

  it("cada plantilla tiene asunto y cuerpo no vacíos", () => {
    for (const [key, template] of Object.entries(EMAIL_TEMPLATE_DEFAULTS)) {
      expect(template.subject.trim(), `${key}.subject`).not.toBe("");
      expect(template.body.trim(), `${key}.body`).not.toBe("");
    }
  });

  it("todas las plantillas solo usan variables conocidas (listingTitle, amount, orderUrl, resolutionSummary)", () => {
    const known = new Set(["listingTitle", "amount", "orderUrl", "resolutionSummary"]);
    for (const [key, template] of Object.entries(EMAIL_TEMPLATE_DEFAULTS)) {
      const used = [
        ...template.subject.matchAll(/{{\s*(\w+)\s*}}/g),
        ...template.body.matchAll(/{{\s*(\w+)\s*}}/g),
      ].map((m) => m[1]);
      for (const variable of used) {
        expect(known.has(variable), `${key} usa {{${variable}}}`).toBe(true);
      }
    }
  });

  it("solo dispute-resolved usa {{resolutionSummary}} (las demás no la necesitan)", () => {
    for (const [key, template] of Object.entries(EMAIL_TEMPLATE_DEFAULTS)) {
      const usesIt =
        template.subject.includes("{{resolutionSummary}}") ||
        template.body.includes("{{resolutionSummary}}");
      expect(usesIt, key).toBe(key === "dispute-resolved");
    }
  });
});
