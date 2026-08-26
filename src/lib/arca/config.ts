/**
 * Configuración de la integración con los webservices de ARCA (ex-AFIP)
 * para facturar electrónicamente la comisión de la plataforma.
 *
 * Las URLs de WSAA/WSFEv1 son las históricas de AFIP (arca.gob.ar no migró
 * los dominios técnicos al momento de escribir esto) — quedan overrideables
 * por env var por si ARCA las cambia más adelante.
 */

export type ArcaEnvironment = "testing" | "production";

const WSAA_URLS: Record<ArcaEnvironment, string> = {
  testing: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
  production: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
};

const WSFE_URLS: Record<ArcaEnvironment, string> = {
  testing: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
  production: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
};

export type ArcaConfig = {
  enabled: boolean;
  autoInvoiceOnRelease: boolean;
  cuit: string;
  certPem: string;
  keyPem: string;
  environment: ArcaEnvironment;
  puntoVenta: number;
  tipoComprobante: number; // 11 = Factura C
  wsaaUrl: string;
  wsfeUrl: string;
};

let cached: ArcaConfig | null | undefined;

/**
 * Devuelve la config si ARCA_ENABLED="true" y están todos los datos
 * necesarios, o null si la integración está apagada / incompleta (en cuyo
 * caso simplemente no se emiten facturas, sin romper el resto del flujo).
 */
export function getArcaConfig(): ArcaConfig | null {
  if (cached !== undefined) return cached;

  if (process.env.ARCA_ENABLED !== "true") {
    cached = null;
    return cached;
  }

  const cuit = process.env.ARCA_CUIT;
  const certBase64 = process.env.ARCA_CERT_BASE64;
  const keyBase64 = process.env.ARCA_KEY_BASE64;
  const environment = (process.env.ARCA_ENVIRONMENT as ArcaEnvironment) || "testing";
  const puntoVenta = Number(process.env.ARCA_PUNTO_VENTA ?? "1");
  const tipoComprobante = Number(process.env.ARCA_TIPO_COMPROBANTE ?? "11"); // Factura C

  if (!cuit || !certBase64 || !keyBase64) {
    console.warn(
      "ARCA_ENABLED=true pero faltan ARCA_CUIT / ARCA_CERT_BASE64 / ARCA_KEY_BASE64 — la facturación queda desactivada.",
    );
    cached = null;
    return cached;
  }

  cached = {
    enabled: true,
    autoInvoiceOnRelease: process.env.ARCA_AUTO_INVOICE_ON_RELEASE !== "false",
    cuit,
    certPem: Buffer.from(certBase64, "base64").toString("utf8"),
    keyPem: Buffer.from(keyBase64, "base64").toString("utf8"),
    environment,
    puntoVenta,
    tipoComprobante,
    wsaaUrl: process.env.ARCA_WSAA_URL || WSAA_URLS[environment],
    wsfeUrl: process.env.ARCA_WSFE_URL || WSFE_URLS[environment],
  };

  return cached;
}

/** Solo para tests — evita que la config quede cacheada entre casos. */
export function resetArcaConfigCache() {
  cached = undefined;
}
