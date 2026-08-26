import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { captureOrder } from "@/lib/capture-order";

/**
 * Worker de liberación automática. Pensado para correr como cron (ej.
 * Vercel Cron cada 15-30 min) contra este endpoint, con
 * `Authorization: Bearer $CRON_SECRET`.
 *
 * Hace dos cosas, en este orden:
 *   1) Marca EXPIRED las órdenes que superaron el límite de 7 días que da
 *      Mercado Pago para capturar una autorización, sin intentar capturarlas
 *      (si nunca se entregó la entrada, no corresponde pagarle al vendedor).
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
      status: { in: ["PAYMENT_HELD", "DELIVERED"] },
      captureDeadlineAt: { lte: now },
    },
    select: { id: true },
  });

  const expiredIds: string[] = [];
  for (const { id } of overdue) {
    await prisma.order.update({
      where: { id },
      data: {
        status: "EXPIRED",
        lastPaymentError:
          "Se venció la ventana de 7 días de Mercado Pago sin capturarse.",
      },
    });
    expiredIds.push(id);
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
