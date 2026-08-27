/**
 * Renderer minimalista para el contenido editable de texto largo (legal,
 * cuerpo de emails). No es Markdown completo a propósito — le pedimos al
 * admin que escriba texto simple, no que aprenda sintaxis:
 *
 *   # Un encabezado
 *
 *   Un párrafo normal, en una o más líneas.
 *
 *   - Un ítem de lista
 *   - Otro ítem
 *
 * Bloques separados por una línea en blanco. Nada de negrita/links/tablas
 * — si hace falta más que esto, el campo dejó de ser "texto editable" y
 * necesita convertirse en código de verdad.
 */

type Block =
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string };

export function parseSimpleMarkdown(source: string): Block[] {
  return source
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block): Block => {
      const lines = block.split("\n").map((line) => line.trim());

      if (lines[0]?.startsWith("# ")) {
        return { type: "heading", text: lines[0].slice(2).trim() };
      }
      if (lines.every((line) => line.startsWith("- "))) {
        return { type: "list", items: lines.map((line) => line.slice(2).trim()) };
      }
      return { type: "paragraph", text: lines.join(" ") };
    });
}

export function SimpleMarkdown({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const blocks = parseSimpleMarkdown(text);

  return (
    <div className={className}>
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h2
              key={i}
              className="mt-6 text-base font-semibold text-zinc-950 first:mt-0 dark:text-zinc-50"
            >
              {block.text}
            </h2>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="mt-2 list-disc pl-5">
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="mt-2">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

/** Versión texto plano (sin JSX), para el cuerpo de los emails. */
export function simpleMarkdownToPlainText(source: string): string {
  return parseSimpleMarkdown(source)
    .map((block) => {
      if (block.type === "heading") return block.text.toUpperCase();
      if (block.type === "list") return block.items.map((item) => `• ${item}`).join("\n");
      return block.text;
    })
    .join("\n\n");
}

/** Versión HTML (para el cuerpo de los emails, que sí necesitan HTML). */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function simpleMarkdownToHtml(source: string): string {
  return parseSimpleMarkdown(source)
    .map((block) => {
      if (block.type === "heading") {
        return `<h2 style="margin:24px 0 8px;font-size:16px;">${escapeHtml(block.text)}</h2>`;
      }
      if (block.type === "list") {
        return `<ul style="margin:8px 0;padding-left:20px;">${block.items
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join("")}</ul>`;
      }
      return `<p style="margin:8px 0;">${escapeHtml(block.text)}</p>`;
    })
    .join("\n");
}
