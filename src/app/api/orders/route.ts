import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoError } from "mercadopago";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { calculateOrderFees, centsToMpAmount } from "@/lib/fees";
import {
  getSellerAccessToken,
  SellerNotConnectedError,
} from "@/lib/connected-account";
import { createReservePayment } from "@/lib/mercadopago";
import { describePaymentRejection } from "@/lib/payment-status-messages";

// Ver docs/tarjetas-de-prueba de Mercado Pago — 7 días es el límite de MP
// para capturar una autorización, no algo que definamos nosotros.
const CAPTURE_DEADLINE_DAYS = 7;

type CreateOrderBody = {
  listingId?: string;
  cardToken?: string;
  paymentMethodId?: string;
  issuerId?: string;
  installments?: number;
  identificationType?: string;
  identificationNumber?: string;
  payerEmail?: string;
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as CreateOrderBody;
  const {
    listingId,
    cardToken,
    paymentMethodId,
    issuerId,
    installments,
    identificationType,
    identificationNumber,
    payerEmail,
  } = body;

  if (!listingId || !cardToken || !payerEmail || !installments) {
    return NextResponse.json(
      { error: "Faltan datos del pago." },
      { status: 400 },
    );
  }

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { seller: { include: { connectedAccount: true } } },
  });

  if (!listing) {
    return NextResponse.json({ error: "La entrada no existe." }, { status: 404 });
  }
  if (listing.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Esta entrada ya no está disponible." },
      { status: 409 },
    );
  }
  if (listing.sellerId === session.user.id) {
    return NextResponse.json(
      { error: "No podés comprar tu propia entrada." },
      { status: 400 },
    );
  }
  if (listing.seller.connectedAccount?.status !== "CONNECTED") {
    return NextResponse.json(
      { error: "El vendedor no tiene una cuenta de Mercado Pago conectada." },
      { status: 400 },
    );
  }

  const fees = calculateOrderFees(listing.priceArs);

  const order = await prisma.order.create({
    data: {
      listingId: listing.id,
      buyerId: session.user.id,
      sellerId: listing.sellerId,
      amountArs: fees.amountArs,
      buyerFeeArs: fees.buyerFeeArs,
      sellerFeeArs: fees.sellerFeeArs,
      sellerPayoutArs: fees.sellerPayoutArs,
      payerEmail,
      payerDocType: identificationType,
      payerDocNumber: identificationNumber,
      idempotencyKeyCreate: randomUUID(),
    },
  });

  try {
    const sellerAccessToken = await getSellerAccessToken(listing.sellerId);

    const payment = await createReservePayment({
      sellerAccessToken,
      idempotencyKey: order.idempotencyKeyCreate,
      transactionAmount: centsToMpAmount(fees.amountArs),
      applicationFee: centsToMpAmount(fees.applicationFeeArs),
      cardToken,
      installments,
      paymentMethodId,
      issuerId: issuerId ? Number(issuerId) : undefined,
      payer: {
        email: payerEmail,
        identification:
          identificationType && identificationNumber
            ? { type: identificationType, number: identificationNumber }
            : undefined,
      },
      externalReference: order.id,
      description: `Entrada: ${listing.title}`,
      notificationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/mercadopago`,
    });

    if (payment.status === "authorized") {
      const now = new Date();
      const captureDeadlineAt = new Date(
        now.getTime() + CAPTURE_DEADLINE_DAYS * 24 * 60 * 60 * 1000,
      );

      await prisma.$transaction([
        prisma.order.update({
          where: { id: order.id },
          data: {
            status: "PAYMENT_HELD",
            mpPaymentId: String(payment.id),
            authorizedAt: now,
            captureDeadlineAt,
          },
        }),
        prisma.listing.update({
          where: { id: listing.id },
          data: { status: "RESERVED" },
        }),
      ]);

      return NextResponse.json({ orderId: order.id, status: "PAYMENT_HELD" });
    }

    // Rechazado, cancelado, o cualquier otro estado no exitoso.
    const rejectionMessage = describePaymentRejection(payment.status_detail);
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAYMENT_FAILED",
        mpPaymentId: payment.id ? String(payment.id) : undefined,
        lastPaymentError: payment.status_detail ?? payment.status ?? "unknown",
      },
    });

    return NextResponse.json({ error: rejectionMessage }, { status: 402 });
  } catch (error) {
    const message =
      error instanceof SellerNotConnectedError
        ? "El vendedor no tiene una cuenta de Mercado Pago conectada."
        : error instanceof MercadoPagoError
          ? error.message
          : "No pudimos procesar el pago. Probá de nuevo.";

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "PAYMENT_FAILED", lastPaymentError: message },
    });

    console.error("Error creando el pago retenido", error);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
