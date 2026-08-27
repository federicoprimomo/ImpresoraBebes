import type { Order } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getArcaConfig } from "@/lib/arca/config";
import { getAuthTicket } from "@/lib/arca/wsaa";
import { getLastInvoiceNumber, requestCae } from "@/lib/arca/wsfe";
import { centsToMpAmount } from "@/lib/fees";
import { captureError } from "@/lib/monitoring";

const DOC_TIPO_CUIT = 80;
const DOC_TIPO_DNI = 96;
const DOC_TIPO_CONSUMIDOR_FINAL = 99;

// Condición de IVA del receptor (RG 5259) — no consultamos el padrón de
// ARCA para conocer la condición real del vendedor (eso requeriría integrar
// además ws_sr_padron_a13), así que usamos un default configurable. Es una
// simplificación conocida: para producción con volumen conviene resolverla
// automáticamente contra el padrón en vez de asumirla.
const CONDICION_IVA_CONSUMIDOR_FINAL = 5;
const DEFAULT_CONDICION_IVA_CON_CUIT = Number(
  process.env.ARCA_DEFAULT_CONDICION_IVA_RECEPTOR_CUIT ?? "6", // 6 = Responsable Monotributo
);

/**
 * Emite (o reintenta) la Factura C de la comisión de la plataforma sobre
 * una orden ya liberada. No lanza para arriba en casos de negocio (ARCA
 * apagado, rechazo, error de red) — nunca debe romper el flujo de pago que
 * la llama; el estado queda reflejado en la fila de Invoice.
 *
 * Devuelve null si la integración con ARCA está apagada.
 */
export async function issueCommissionInvoice(order: Order) {
  const config = getArcaConfig();
  if (!config) return null;

  const totalFeeArs = order.buyerFeeArs + order.sellerFeeArs;
  if (totalFeeArs <= 0) return null; // nada que facturar

  const seller = await prisma.user.findUniqueOrThrow({
    where: { id: order.sellerId },
  });

  const receptorDocTipo =
    seller.taxIdType === "CUIT"
      ? DOC_TIPO_CUIT
      : seller.taxIdType === "DNI"
        ? DOC_TIPO_DNI
        : DOC_TIPO_CONSUMIDOR_FINAL;
  const receptorDocNro =
    receptorDocTipo === DOC_TIPO_CONSUMIDOR_FINAL
      ? "0"
      : (seller.taxIdNumber ?? "0");
  const condicionIvaReceptorId =
    receptorDocTipo === DOC_TIPO_CONSUMIDOR_FINAL
      ? CONDICION_IVA_CONSUMIDOR_FINAL
      : DEFAULT_CONDICION_IVA_CON_CUIT;

  const invoice = await prisma.invoice.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      status: "PENDING",
      tipoComprobante: config.tipoComprobante,
      puntoVenta: config.puntoVenta,
      receptorDocTipo,
      receptorDocNro,
      importeTotalArs: totalFeeArs,
    },
    update: {
      status: "PENDING",
      receptorDocTipo,
      receptorDocNro,
      importeTotalArs: totalFeeArs,
    },
  });

  try {
    const auth = await getAuthTicket(config, "wsfe");

    // "Pedile a ARCA el último número y sumale 1" no es seguro si dos
    // facturas se emiten en simultáneo (ej. el auto-invoice del webhook de
    // una orden se solapa con el cron liberando otra) — las dos leerían el
    // mismo último número y pedirían el mismo CAE. Un advisory lock de
    // Postgres, scoped a (puntoVenta, tipoComprobante) y con vida atada a
    // la transacción, serializa ese tramo sin necesitar una tabla contador
    // aparte. Se banca el timeout más largo porque adentro hay dos llamadas
    // de red a ARCA (consultar último número + pedir el CAE).
    const lockKey = config.puntoVenta * 100 + config.tipoComprobante;
    const { numero, result } = await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

        const lastNumber = await getLastInvoiceNumber(config, auth);
        const numero = lastNumber + 1;

        const result = await requestCae(config, auth, {
          numero,
          receptorDocTipo,
          receptorDocNro,
          condicionIvaReceptorId,
          importeTotalArs: centsToMpAmount(totalFeeArs),
          fecha: new Date(),
        });

        return { numero, result };
      },
      { timeout: 20000 },
    );

    if (result.approved) {
      return prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: "ISSUED",
          numero,
          cae: result.cae,
          caeVencimiento: parseArcaDate(result.caeVencimiento),
          issuedAt: new Date(),
          rawResponse: result.raw,
          errorMessage: null,
        },
      });
    }

    return prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "FAILED",
        errorMessage: result.observaciones,
        rawResponse: result.raw,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido facturando en ARCA.";
    console.error(`Error emitiendo factura ARCA para la orden ${order.id}`, error);
    captureError(error, { orderId: order.id });
    return prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "FAILED", errorMessage: message },
    });
  }
}

/** ARCA devuelve fechas como "AAAAMMDD". */
function parseArcaDate(value: string): Date {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6)) - 1;
  const day = Number(value.slice(6, 8));
  return new Date(year, month, day);
}
