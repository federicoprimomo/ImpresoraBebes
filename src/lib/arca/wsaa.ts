import forge from "node-forge";

import { prisma } from "@/lib/prisma";
import type { ArcaConfig } from "@/lib/arca/config";
import {
  assertNoSoapFault,
  extractTag,
  unescapeXmlEntities,
} from "@/lib/arca/xml";

export type AuthTicket = { token: string; sign: string };

// Margen de seguridad: el ticket dura ~12hs, lo renovamos un poco antes.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

function buildLoginTicketRequestXml(service: string): string {
  const now = new Date();
  const generationTime = new Date(now.getTime() - 10 * 60 * 1000);
  const expirationTime = new Date(now.getTime() + 10 * 60 * 1000);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<loginTicketRequest version="1.0">',
    "<header>",
    `<uniqueId>${Math.floor(now.getTime() / 1000)}</uniqueId>`,
    `<generationTime>${generationTime.toISOString()}</generationTime>`,
    `<expirationTime>${expirationTime.toISOString()}</expirationTime>`,
    "</header>",
    `<service>${service}</service>`,
    "</loginTicketRequest>",
  ].join("");
}

/** Firma el Login Ticket Request como CMS/PKCS#7 (lo que WSAA exige) y lo devuelve en base64. */
function signLoginTicketRequest(
  xml: string,
  certPem: string,
  keyPem: string,
): string {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(xml, "utf8");
  p7.addCertificate(certPem);
  p7.addSigner({
    key: forge.pki.privateKeyFromPem(keyPem),
    certificate: certPem,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      // @types/node-forge solo tipa `value` como string, pero en runtime
      // forge acepta (y espera) un Date nativo acá y lo codifica como
      // UTCTime/GeneralizedTime internamente.
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign({ detached: false });

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return forge.util.encode64(der);
}

async function callLoginCms(wsaaUrl: string, cms: string): Promise<string> {
  const envelope = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.afip.gov.ar">',
    "<soapenv:Header/>",
    "<soapenv:Body>",
    "<wsaa:loginCms>",
    `<wsaa:in0>${cms}</wsaa:in0>`,
    "</wsaa:loginCms>",
    "</soapenv:Body>",
    "</soapenv:Envelope>",
  ].join("");

  const response = await fetch(wsaaUrl, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: "" },
    body: envelope,
  });

  const body = await response.text();
  assertNoSoapFault(body);

  const loginCmsReturn = extractTag(body, "loginCmsReturn");
  if (!loginCmsReturn) {
    throw new Error("WSAA no devolvió loginCmsReturn.");
  }
  return unescapeXmlEntities(loginCmsReturn);
}

function parseLoginTicketResponse(xml: string): AuthTicket & { expirationTime: Date } {
  const token = extractTag(xml, "token");
  const sign = extractTag(xml, "sign");
  const expirationTime = extractTag(xml, "expirationTime");
  if (!token || !sign || !expirationTime) {
    throw new Error("No se pudo parsear el loginTicketResponse de WSAA.");
  }
  return { token, sign, expirationTime: new Date(expirationTime) };
}

/**
 * Devuelve un ticket de acceso vigente para el servicio pedido (ej. "wsfe"),
 * usando el cacheado en base si todavía no está por vencer, o pidiendo uno
 * nuevo a WSAA si hace falta.
 */
export async function getAuthTicket(
  config: ArcaConfig,
  service: string,
): Promise<AuthTicket> {
  const cached = await prisma.arcaAuthTicket.findUnique({ where: { service } });

  if (
    cached &&
    cached.expirationTime.getTime() - Date.now() > REFRESH_MARGIN_MS
  ) {
    return { token: cached.token, sign: cached.sign };
  }

  const requestXml = buildLoginTicketRequestXml(service);
  const cms = signLoginTicketRequest(requestXml, config.certPem, config.keyPem);
  const responseXml = await callLoginCms(config.wsaaUrl, cms);
  const ticket = parseLoginTicketResponse(responseXml);

  await prisma.arcaAuthTicket.upsert({
    where: { service },
    create: {
      service,
      token: ticket.token,
      sign: ticket.sign,
      expirationTime: ticket.expirationTime,
    },
    update: {
      token: ticket.token,
      sign: ticket.sign,
      expirationTime: ticket.expirationTime,
    },
  });

  return { token: ticket.token, sign: ticket.sign };
}
