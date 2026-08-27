import { describe, expect, it } from "vitest";

import {
  assertNoSoapFault,
  escapeXml,
  extractAllTags,
  extractTag,
  SoapFaultError,
  unescapeXmlEntities,
} from "./xml";

describe("extractTag", () => {
  it("extrae el contenido de un tag simple", () => {
    expect(extractTag("<a:CAE>12345</a:CAE>", "a:CAE")).toBe("12345");
  });

  it("devuelve null si el tag no existe", () => {
    expect(extractTag("<a:CAE>12345</a:CAE>", "a:Otro")).toBeNull();
  });

  it("no le importan los atributos del tag de apertura", () => {
    expect(extractTag('<CAE attr="x">12345</CAE>', "CAE")).toBe("12345");
  });
});

describe("extractAllTags", () => {
  it("extrae todas las ocurrencias", () => {
    const xml = "<Obs>uno</Obs><Obs>dos</Obs><Obs>tres</Obs>";
    expect(extractAllTags(xml, "Obs")).toEqual(["uno", "dos", "tres"]);
  });

  it("devuelve un array vacío si no hay ninguna", () => {
    expect(extractAllTags("<a></a>", "Obs")).toEqual([]);
  });
});

describe("escapeXml / unescapeXmlEntities", () => {
  it("escapa los cinco caracteres especiales de XML", () => {
    expect(escapeXml(`< > & " '`)).toBe("&lt; &gt; &amp; &quot; &apos;");
  });

  it("unescapeXmlEntities revierte exactamente lo que escapeXml hizo", () => {
    const original = `Juan & José <script> dice "hola"`;
    expect(unescapeXmlEntities(escapeXml(original))).toBe(original);
  });

  it("escapa & antes que las demás entidades (no doble-escapa)", () => {
    // Si escapara & al final, "&lt;" ya generado se convertiría en "&amp;lt;".
    expect(escapeXml("<")).toBe("&lt;");
  });
});

describe("assertNoSoapFault", () => {
  it("no tira si no hay <faultstring>", () => {
    expect(() => assertNoSoapFault("<soap:Envelope>ok</soap:Envelope>")).not.toThrow();
  });

  it("tira SoapFaultError con el mensaje del fault si lo hay", () => {
    const xml = "<soap:Fault><faultstring>CUIT inválido</faultstring></soap:Fault>";
    expect(() => assertNoSoapFault(xml)).toThrow(SoapFaultError);
    expect(() => assertNoSoapFault(xml)).toThrow("CUIT inválido");
  });

  it("desescapa entidades XML dentro del faultstring", () => {
    const xml = "<soap:Fault><faultstring>Error: CUIT &lt;vacío&gt;</faultstring></soap:Fault>";
    expect(() => assertNoSoapFault(xml)).toThrow("Error: CUIT <vacío>");
  });
});
