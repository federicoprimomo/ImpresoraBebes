import { randomUUID } from "node:crypto";

import type { Order } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getSellerAccessToken } from "@/lib/connected-account";
import { capturePayment } from "@/lib/mercadopago";
import { getArcaConfig } from "@/lib/arca/config";
import { issueCommissionInvoice } from "@/lib/arca/invoice";

export class OrderNotCapturableError extends Error {}
export class OrderExpiredError extends Error {}

// DISPUTED entra acá porque resolver una disputa a favor del vendedor
// también termina en una captura — ver lib/dispute.ts.
const CAPTURABLE_STATUSES = ["PAYMENT_HELD", "DELIVERED", "DISPUTED"] as const;

/**
 * Aplica los efectos de "el pago ya se liberó": marca la orden RELEASED, la
 * publicación SOLD, y registra la comisión cobrada. Se llama tanto después
 * de una captura exitosa como desde el webhook, si necesita reconciliar un
 * estado que no vimos en el momento (ej. el server se cayó justo después de
 * capturar). Es idempotente — `upsert` en el ledger evita duplicarlo.
 */
export async function finalizeReleasedOrder(order: Order, releasedAt = new Date()) {
  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { status: "RELEASED", releasedAt, lastPaymentError: null },
    }),
    prisma.listing.update({
      where: { id: order.listingId },
      data: { status: "SOLD" },
    }),
    prisma.commissionLedgerEntry.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        buyerFeeArs: order.buyerFeeArs,
        sellerFeeArs: order.sellerFeeArs,
        totalFeeArs: order.buyerFeeArs + order.sellerFeeArs,
      },
      update: {},
    }),
  ]);

  // La facturación es un efecto secundario: si ARCA está apagado o falla,
  // no queremos que eso reviente la liberación del pago (que ya sucedió).
  // issueCommissionInvoice ya atrapa sus propios errores y los deja en la
  // fila de Invoice — acá solo respetamos el flag de "automático".
  const config = getArcaConfig();
  if (config?.autoInvoiceOnRelease) {
    await issueCommissionInvoice(order).catch((error) => {
      console.error(`Error facturando automáticamente la orden ${order.id}`, error);
    });
  }
}

/**
 * Captura (libera) el pago retenido de una orden. Es la única función que
 * debería llamar a Payment.capture — la usan tanto el endpoint de admin
 * (POST /api/orders/:id/capture) como el worker de vencimientos
 * (/api/cron/capture-orders), para no duplicar la lógica de idempotencia.
 *
 * Idempotencia: la clave se genera una sola vez y se persiste ANTES de
 * llamar a Mercado Pago, así un reintento (por un crash a mitad de camino,
 * o el propio worker corriendo de nuevo) reutiliza la misma clave en vez
 * de arriesgarse a una doble captura.
 */
export async function captureOrder(orderId: string) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
  });

  if (!CAPTURABLE_STATUSES.includes(order.status as (typeof CAPTURABLE_STATUSES)[number])) {
    throw new OrderNotCapturableError(
      `La orden ${orderId} está en estado ${order.status}, no se puede capturar.`,
    );
  }
  if (!order.mpPaymentId) {
    throw new OrderNotCapturableError(
      `La orden ${orderId} no tiene un pago de Mercado Pago asociado.`,
    );
  }

  if (order.captureDeadlineAt && new Date() > order.captureDeadlineAt) {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: "EXPIRED",
          lastPaymentError:
            "Se venció la ventana de 7 días de Mercado Pago para capturar el pago sin resolver la entrega/disputa.",
        },
      }),
      // Nadie cobró nada — el vendedor tiene que poder volver a intentar
      // vender la misma entrada.
      prisma.listing.update({
        where: { id: order.listingId },
        data: { status: "ACTIVE" },
      }),
    ]);
    throw new OrderExpiredError(
      `La orden ${orderId} superó el deadline de captura de Mercado Pago.`,
    );
  }

  const idempotencyKeyCapture =
    order.idempotencyKeyCapture ??
    (
      await prisma.order.update({
        where: { id: orderId },
        data: { idempotencyKeyCapture: randomUUID() },
      })
    ).idempotencyKeyCapture!;

  await prisma.order.update({
    where: { id: orderId },
    data: { captureAttempts: { increment: 1 } },
  });

  try {
    const sellerAccessToken = await getSellerAccessToken(order.sellerId);
    const payment = await capturePayment({
      sellerAccessToken,
      mpPaymentId: order.mpPaymentId,
      idempotencyKey: idempotencyKeyCapture,
    });

    if (payment.status !== "approved" || !payment.captured) {
      const message = `Mercado Pago no confirmó la captura (status=${payment.status}, captured=${payment.captured}).`;
      await prisma.order.update({
        where: { id: orderId },
        data: { lastPaymentError: message },
      });
      throw new Error(message);
    }

    const releasedAt = new Date();
    await finalizeReleasedOrder(order, releasedAt);

    return { ...order, status: "RELEASED" as const, releasedAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error capturando el pago.";
    await prisma.order.update({
      where: { id: orderId },
      data: { lastPaymentError: message },
    });
    throw error;
  }
}
