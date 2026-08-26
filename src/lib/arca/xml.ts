/**
 * Los webservices de ARCA devuelven SOAP 1.1 con estructuras XML fijas y
 * bien conocidas (no HTML ni XML arbitrario de terceros), así que en vez de
 * sumar una dependencia de parseo XML completa alcanza con extraer tags por
 * regex — más simple y suficiente para este contrato estable.
 */

export function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? match[1] : null;
}

export function extractAllTags(xml: string, tag: string): string[] {
  const matches = xml.matchAll(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "gi"),
  );
  return Array.from(matches, (m) => m[1]);
}

export function unescapeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export class SoapFaultError extends Error {}

/** Lanza SoapFaultError si la respuesta SOAP es un <soap:Fault>. */
export function assertNoSoapFault(xml: string) {
  const faultString = extractTag(xml, "faultstring");
  if (faultString) {
    throw new SoapFaultError(unescapeXmlEntities(faultString));
  }
}
