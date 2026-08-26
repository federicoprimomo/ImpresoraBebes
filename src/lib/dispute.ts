import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { getSellerAccessToken } from "@/lib/connected-account";
import { cancelPayment } from "@/lib/mercadopago";
import { captureOrder } from "@/lib/capture-order";

export class DisputeError extends Error {}

const DISPUTABLE_STATUSES = ["PAYMENT_HELD", "DELIVERED"] as const;

/**
 * El comprador abre un reclamo. Congela la orden en DISPUTED — el worker de
 * capturas automáticas (/api/cron/capture-orders) solo toca órdenes en
 * DELIVERED, así que apenas cambia el estado deja de tocarla sola.
 */
export async function openDispute(input: {
  orderId: string;
  buyerId: string;
  reason: string;
  evidence?: string;
}) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: input.orderId },
    include: { dispute: true },
  });

  if (order.buyerId !== input.buyerId) {
    throw new DisputeError("No sos el comprador de esta orden.");
  }
  if (!DISPUTABLE_STATUSES.includes(order.status as (typeof DISPUTABLE_STATUSES)[number])) {
    throw new DisputeError(
      "Esta orden no está en un estado que permita abrir un reclamo.",
    );
  }
  if (order.dispute) {
    throw new DisputeError("Ya hay un reclamo abierto para esta orden.");
  }
  if (!input.reason.trim()) {
    throw new DisputeError("Contá el motivo del reclamo.");
  }

  await prisma.$transaction([
    prisma.dispute.create({
      data: {
        orderId: order.id,
        reason: input.reason.trim(),
        evidence: input.evidence?.trim() || null,
      },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: { status: "DISPUTED" },
    }),
  ]);
}

export type DisputeResolution = "RELEASE" | "REFUND";

/**
 * Un admin resuelve el reclamo: libera el pago al vendedor (captura), o lo
 * cancela y el dinero vuelve a la tarjeta del comprador. Como el pago
 * nunca se capturó, "reembolsar" acá es cancelar la autorización — no hay
 * nada que devolver porque nunca se le pagó a nadie.
 */
export async function resolveDispute(input: {
  orderId: string;
  adminId: string;
  resolution: DisputeResolution;
  note?: string;
}) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: input.orderId },
    include: { dispute: true },
  });

  if (!order.dispute || order.dispute.status !== "OPEN") {
    throw new DisputeError("Esta orden no tiene un reclamo abierto.");
  }

  if (input.resolution === "RELEASE") {
    await captureOrder(order.id); // ya deja la orden en RELEASED

    await prisma.dispute.update({
      where: { orderId: order.id },
      data: {
        status: "RESOLVED_RELEASE",
        resolvedById: input.adminId,
        resolution: input.note?.trim() || null,
        resolvedAt: new Date(),
      },
    });
    return;
  }

  // REFUND: cancelar la autorización de Mercado Pago (nunca se capturó).
  if (!order.mpPaymentId) {
    throw new DisputeError("La orden no tiene un pago de Mercado Pago asociado.");
  }

  try {
    const sellerAccessToken = await getSellerAccessToken(order.sellerId);
    await cancelPayment({
      sellerAccessToken,
      mpPaymentId: order.mpPaymentId,
      idempotencyKey: randomUUID(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error cancelando el pago en Mercado Pago.";
    await prisma.order.update({
      where: { id: order.id },
      data: { lastPaymentError: message },
    });
    throw error;
  }

  await prisma.$transaction([
    prisma.order.update({
      where: { id: order.id },
      data: { status: "REFUNDED", cancelledAt: new Date(), lastPaymentError: null },
    }),
    // No reactivamos la publicación sola: hubo un reclamo de por medio, que
    // el vendedor la vuelva a publicar si corresponde en vez de revenderla
    // automáticamente.
    prisma.listing.update({
      where: { id: order.listingId },
      data: { status: "CANCELLED" },
    }),
    prisma.dispute.update({
      where: { orderId: order.id },
      data: {
        status: "RESOLVED_REFUND",
        resolvedById: input.adminId,
        resolution: input.note?.trim() || null,
        resolvedAt: new Date(),
      },
    }),
  ]);
}
