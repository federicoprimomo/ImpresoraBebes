import { describe, expect, it } from "vitest";

import {
  parseSimpleMarkdown,
  simpleMarkdownToHtml,
  simpleMarkdownToPlainText,
} from "./simple-markdown";

describe("parseSimpleMarkdown", () => {
  it("reconoce un encabezado", () => {
    expect(parseSimpleMarkdown("# Título")).toEqual([
      { type: "heading", text: "Título" },
    ]);
  });

  it("reconoce una lista (todas las líneas empiezan con '- ')", () => {
    expect(parseSimpleMarkdown("- uno\n- dos\n- tres")).toEqual([
      { type: "list", items: ["uno", "dos", "tres"] },
    ]);
  });

  it("trata como párrafo cualquier bloque que no sea encabezado ni lista completa", () => {
    expect(parseSimpleMarkdown("Una línea.\nOtra línea.")).toEqual([
      { type: "paragraph", text: "Una línea. Otra línea." },
    ]);
  });

  it("un bloque con líneas mixtas (algunas '- ', otras no) es párrafo, no lista", () => {
    const result = parseSimpleMarkdown("- uno\nno es un ítem");
    expect(result).toEqual([{ type: "paragraph", text: "- uno no es un ítem" }]);
  });

  it("separa bloques por línea en blanco y preserva el orden", () => {
    const source = "# Encabezado\n\nUn párrafo.\n\n- a\n- b";
    expect(parseSimpleMarkdown(source)).toEqual([
      { type: "heading", text: "Encabezado" },
      { type: "paragraph", text: "Un párrafo." },
      { type: "list", items: ["a", "b"] },
    ]);
  });

  it("ignora bloques vacíos (líneas en blanco de más)", () => {
    expect(parseSimpleMarkdown("Uno\n\n\n\nDos")).toEqual([
      { type: "paragraph", text: "Uno" },
      { type: "paragraph", text: "Dos" },
    ]);
  });
});

describe("simpleMarkdownToPlainText", () => {
  it("pone el encabezado en mayúsculas y las listas con viñeta", () => {
    const source = "# Título\n\nCuerpo.\n\n- uno\n- dos";
    expect(simpleMarkdownToPlainText(source)).toBe(
      "TÍTULO\n\nCuerpo.\n\n• uno\n• dos",
    );
  });
});

describe("simpleMarkdownToHtml", () => {
  it("escapa HTML peligroso en el contenido", () => {
    const html = simpleMarkdownToHtml('<script>alert(1)</script> & "comillas"');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;comillas&quot;");
  });

  it("genera un <h2> por encabezado y un <ul><li> por lista", () => {
    const html = simpleMarkdownToHtml("# Hola\n\n- a\n- b");
    expect(html).toContain("<h2");
    expect(html).toContain(">Hola<");
    expect(html).toContain("<ul");
    expect(html).toContain("<li>a</li>");
    expect(html).toContain("<li>b</li>");
  });
});
