import type { ArcaConfig } from "@/lib/arca/config";
import type { AuthTicket } from "@/lib/arca/wsaa";
import { assertNoSoapFault, extractAllTags, extractTag } from "@/lib/arca/xml";

const SOAP_NS = "http://ar.gov.afip.dif.FEV1/";

function formatFechaArca(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

async function callWsfe(
  wsfeUrl: string,
  soapAction: string,
  bodyXml: string,
): Promise<string> {
  const envelope = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="${SOAP_NS}">`,
    "<soapenv:Header/>",
    "<soapenv:Body>",
    bodyXml,
    "</soapenv:Body>",
    "</soapenv:Envelope>",
  ].join("");

  const response = await fetch(wsfeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `${SOAP_NS}${soapAction}`,
    },
    body: envelope,
  });

  const body = await response.text();
  assertNoSoapFault(body);

  const topLevelErrors = extractTag(body, "Errors");
  if (topLevelErrors) {
    const messages = extractAllTags(topLevelErrors, "Msg");
    if (messages.length > 0) {
      throw new Error(`ARCA rechazó la solicitud: ${messages.join("; ")}`);
    }
  }

  return body;
}

function authXml(config: ArcaConfig, auth: AuthTicket): string {
  return [
    "<ar:Auth>",
    `<ar:Token>${auth.token}</ar:Token>`,
    `<ar:Sign>${auth.sign}</ar:Sign>`,
    `<ar:Cuit>${config.cuit}</ar:Cuit>`,
    "</ar:Auth>",
  ].join("");
}

/** Último número de comprobante autorizado para el punto de venta/tipo dados. */
export async function getLastInvoiceNumber(
  config: ArcaConfig,
  auth: AuthTicket,
): Promise<number> {
  const bodyXml = [
    "<ar:FECompUltimoAutorizado>",
    authXml(config, auth),
    `<ar:PtoVta>${config.puntoVenta}</ar:PtoVta>`,
    `<ar:CbteTipo>${config.tipoComprobante}</ar:CbteTipo>`,
    "</ar:FECompUltimoAutorizado>",
  ].join("");

  const response = await callWsfe(
    config.wsfeUrl,
    "FECompUltimoAutorizado",
    bodyXml,
  );

  const cbteNro = extractTag(response, "CbteNro");
  return cbteNro ? Number(cbteNro) : 0;
}

export type CaeRequest = {
  numero: number;
  receptorDocTipo: number; // 80=CUIT, 96=DNI, 99=Consumidor Final
  receptorDocNro: string; // "0" para Consumidor Final
  condicionIvaReceptorId: number;
  importeTotalArs: number; // en pesos (no centavos), con hasta 2 decimales
  fecha: Date;
};

export type CaeResult =
  | { approved: true; cae: string; caeVencimiento: string; raw: string }
  | { approved: false; observaciones: string; raw: string };

/** Pide el CAE (Código de Autorización Electrónico) para una única factura. */
export async function requestCae(
  config: ArcaConfig,
  auth: AuthTicket,
  input: CaeRequest,
): Promise<CaeResult> {
  const fecha = formatFechaArca(input.fecha);
  const importe = input.importeTotalArs.toFixed(2);

  const detalleXml = [
    "<ar:FECAEDetRequest>",
    "<ar:Concepto>2</ar:Concepto>", // 2 = Servicios (la comisión es un servicio de intermediación)
    `<ar:DocTipo>${input.receptorDocTipo}</ar:DocTipo>`,
    `<ar:DocNro>${input.receptorDocNro}</ar:DocNro>`,
    `<ar:CbteDesde>${input.numero}</ar:CbteDesde>`,
    `<ar:CbteHasta>${input.numero}</ar:CbteHasta>`,
    `<ar:CbteFch>${fecha}</ar:CbteFch>`,
    `<ar:ImpTotal>${importe}</ar:ImpTotal>`,
    "<ar:ImpTotConc>0.00</ar:ImpTotConc>",
    `<ar:ImpNeto>${importe}</ar:ImpNeto>`, // Factura C: no discrimina IVA
    "<ar:ImpOpEx>0.00</ar:ImpOpEx>",
    "<ar:ImpIVA>0.00</ar:ImpIVA>",
    "<ar:ImpTrib>0.00</ar:ImpTrib>",
    `<ar:FchServDesde>${fecha}</ar:FchServDesde>`,
    `<ar:FchServHasta>${fecha}</ar:FchServHasta>`,
    `<ar:FchVtoPago>${fecha}</ar:FchVtoPago>`,
    "<ar:MonId>PES</ar:MonId>",
    "<ar:MonCotiz>1</ar:MonCotiz>",
    `<ar:CondicionIVAReceptorId>${input.condicionIvaReceptorId}</ar:CondicionIVAReceptorId>`,
    "</ar:FECAEDetRequest>",
  ].join("");

  const bodyXml = [
    "<ar:FECAESolicitar>",
    authXml(config, auth),
    "<ar:FeCAEReq>",
    "<ar:FeCabReq>",
    "<ar:CantReg>1</ar:CantReg>",
    `<ar:PtoVta>${config.puntoVenta}</ar:PtoVta>`,
    `<ar:CbteTipo>${config.tipoComprobante}</ar:CbteTipo>`,
    "</ar:FeCabReq>",
    "<ar:FeDetReq>",
    detalleXml,
    "</ar:FeDetReq>",
    "</ar:FeCAEReq>",
    "</ar:FECAESolicitar>",
  ].join("");

  const response = await callWsfe(config.wsfeUrl, "FECAESolicitar", bodyXml);

  // CantReg siempre es 1 acá, así que asumimos que el segundo <Resultado> del
  // documento (el primero es el de FeCabResp) es el de este único detalle.
  const resultados = extractAllTags(response, "Resultado");
  const detalleResultado = resultados[1] ?? resultados[0];

  if (detalleResultado === "A") {
    const cae = extractTag(response, "CAE");
    const caeVencimiento = extractTag(response, "CAEFchVto");
    if (!cae || !caeVencimiento) {
      throw new Error("ARCA aprobó la factura pero no devolvió CAE.");
    }
    return { approved: true, cae, caeVencimiento, raw: response };
  }

  const observacionesBlock = extractTag(response, "Observaciones") ?? "";
  const mensajes = extractAllTags(observacionesBlock, "Msg");
  return {
    approved: false,
    observaciones: mensajes.length > 0 ? mensajes.join("; ") : "Rechazada por ARCA sin detalle.",
    raw: response,
  };
}
