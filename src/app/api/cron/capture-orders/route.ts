import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { captureOrder } from "@/lib/capture-order";
import { notifyOrderEvent } from "@/lib/email";

/**
 * Worker de liberación automática. Pensado para correr como cron (ej.
 * Vercel Cron cada 15-30 min) contra este endpoint, con
 * `Authorization: Bearer $CRON_SECRET`.
 *
 * Hace dos cosas, en este orden:
 *   1) Marca EXPIRED las órdenes que superaron el límite de 7 días que da
 *      Mercado Pago para capturar una autorización, sin intentar capturarlas
 *      (si nunca se entregó la entrada, no corresponde pagarle al vendedor).
 *      Si la orden tenía una disputa abierta, Mercado Pago ya canceló la
 *      autorización sola por el lado de ellos — cerramos el reclamo como
 *      RESOLVED_REFUND para que no quede "abierto" para siempre esperando
 *      una decisión que ya no tiene nada para ejecutar.
 *   2) Captura (libera) las órdenes entregadas cuya ventana de disputa ya
 *      venció y no tienen una disputa abierta.
 */
function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${expected}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const now = new Date();

  const overdue = await prisma.order.findMany({
    where: {
      status: { in: ["PAYMENT_HELD", "DELIVERED", "DISPUTED"] },
      captureDeadlineAt: { lte: now },
    },
    include: { dispute: true },
  });

  const expiredIds: string[] = [];
  for (const order of overdue) {
    await prisma.$transaction([
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: "EXPIRED",
          lastPaymentError:
            "Se venció la ventana de 7 días de Mercado Pago sin capturarse.",
        },
      }),
      // Nadie cobró nada — el vendedor tiene que poder volver a intentar
      // vender la misma entrada.
      prisma.listing.update({
        where: { id: order.listingId },
        data: { status: "ACTIVE" },
      }),
    ]);
    if (order.dispute && order.dispute.status === "OPEN") {
      await prisma.dispute.update({
        where: { orderId: order.id },
        data: {
          status: "RESOLVED_REFUND",
          resolution:
            "Cerrado automáticamente: venció el plazo de Mercado Pago sin que se resolviera el reclamo.",
          resolvedAt: now,
        },
      });
    }
    await notifyOrderEvent("order-expired", order.id, { to: "both" });
    expiredIds.push(order.id);
  }

  const dueForCapture = await prisma.order.findMany({
    where: {
      status: "DELIVERED",
      releaseDueAt: { lte: now },
      NOT: { dispute: { status: "OPEN" } },
    },
    select: { id: true },
  });

  const capturedIds: string[] = [];
  const failedCaptures: Array<{ id: string; error: string }> = [];

  for (const { id } of dueForCapture) {
    try {
      await captureOrder(id);
      capturedIds.push(id);
    } catch (error) {
      failedCaptures.push({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({
    expired: expiredIds,
    captured: capturedIds,
    failed: failedCaptures,
  });
}
