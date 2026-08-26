import { NextRequest, NextResponse } from "next/server";
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";

import { prisma } from "@/lib/prisma";
import { getSellerAccessToken } from "@/lib/connected-account";
import { getPayment } from "@/lib/mercadopago";
import { finalizeReleasedOrder } from "@/lib/capture-order";

/**
 * Recibe las notificaciones de cambio de estado de pago de Mercado Pago.
 * No confiamos en el contenido del body para el estado del pago — solo nos
 * dice "algo cambió"; volvemos a pedirle el pago a la API para saber su
 * estado real, y desde ahí reconciliamos nuestra orden.
 *
 * Documentación de la firma: la validamos con el helper del SDK
 * (WebhookSignatureValidator), que ya hace la comparación en tiempo
 * constante y valida el timestamp.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Falta MERCADOPAGO_WEBHOOK_SECRET.");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  const dataId = request.nextUrl.searchParams.get("data.id");

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret,
      toleranceSeconds: 300,
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      console.warn("Webhook de Mercado Pago con firma inválida", error.reason);
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
    throw error;
  }

  const body = await request.json().catch(() => null);
  const type = body?.type ?? request.nextUrl.searchParams.get("type");

  // Solo nos interesan las notificaciones de pagos (no las de otros
  // recursos que Mercado Pago también manda por este mismo webhook).
  if (type !== "payment") {
    return NextResponse.json({ received: true });
  }

  const paymentId = dataId ?? body?.data?.id;
  if (!paymentId) {
    return NextResponse.json({ received: true });
  }

  const order = await prisma.order.findFirst({
    where: { mpPaymentId: String(paymentId) },
  });

  // No es un pago nuestro (o la orden ni se llegó a crear del lado nuestro
  // antes de que MP mande la notificación) — no hay nada que reconciliar.
  if (!order) {
    return NextResponse.json({ received: true });
  }

  try {
    const sellerAccessToken = await getSellerAccessToken(order.sellerId);
    const payment = await getPayment({
      sellerAccessToken,
      mpPaymentId: order.mpPaymentId!,
    });

    if (payment.status === "authorized" && order.status === "PENDING_PAYMENT") {
      const authorizedAt = new Date();
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PAYMENT_HELD",
          authorizedAt,
          captureDeadlineAt: new Date(
            authorizedAt.getTime() + 7 * 24 * 60 * 60 * 1000,
          ),
        },
      });
    } else if (
      payment.status === "approved" &&
      payment.captured &&
      order.status !== "RELEASED"
    ) {
      await finalizeReleasedOrder(order);
    } else if (
      (payment.status === "rejected" || payment.status === "cancelled") &&
      order.status === "PENDING_PAYMENT"
    ) {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "PAYMENT_FAILED",
          lastPaymentError: payment.status_detail ?? payment.status,
        },
      });
    } else if (
      payment.status === "cancelled" &&
      (order.status === "PAYMENT_HELD" || order.status === "DELIVERED")
    ) {
      // Mercado Pago canceló la autorización de su lado (típicamente, se
      // venció sola a los 7 días sin que la hayamos capturado).
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "EXPIRED",
          lastPaymentError: "Mercado Pago canceló la autorización del pago.",
        },
      });
    } else if (payment.status === "refunded" && order.status === "RELEASED") {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "REFUNDED" },
      });
    }
  } catch (error) {
    console.error("Error reconciliando webhook de Mercado Pago", error);
    // Devolvemos 200 igual: si devolvemos error, MP reintenta indefinidamente
    // esta misma notificación, y el problema (ej. token del vendedor vencido)
    // no se va a resolver solo reintentando.
  }

  return NextResponse.json({ received: true });
}
