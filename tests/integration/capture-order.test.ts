import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { capturePayment } from "@/lib/mercadopago";
import {
  captureOrder,
  finalizeReleasedOrder,
  OrderExpiredError,
} from "@/lib/capture-order";
import { cleanupUsers, createTestListing, createTestOrder, createTestUser } from "./helpers";

vi.mock("@/lib/connected-account", () => ({
  getSellerAccessToken: vi.fn().mockResolvedValue("fixture-access-token"),
}));

vi.mock("@/lib/mercadopago", () => ({
  capturePayment: vi.fn().mockResolvedValue({ status: "approved", captured: true, id: 999 }),
  extractSettlementInfo: vi.fn().mockReturnValue({ mpFeeArs: null, netReceivedArs: null }),
}));

describe("captureOrder — condición de carrera de idempotencyKeyCapture", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    await cleanupUsers(userIds);
    userIds.length = 0;
    vi.mocked(capturePayment).mockClear();
  });

  it("dos llamados concurrentes usan la MISMA idempotencyKey contra Mercado Pago", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    userIds.push(seller.id, buyer.id);
    const listing = await createTestListing(seller.id);
    const order = await createTestOrder({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
    });

    // Simula el cron y un click de admin capturando la misma orden casi
    // al mismo tiempo — exactamente el escenario que rompía antes del fix.
    const results = await Promise.allSettled([
      captureOrder(order.id),
      captureOrder(order.id),
    ]);

    // Ninguna de las dos debería tirar con el mock configurado para
    // aprobar siempre.
    for (const result of results) {
      expect(result.status).toBe("fulfilled");
    }

    const calls = vi.mocked(capturePayment).mock.calls;
    expect(calls.length).toBe(2);
    const keys = calls.map((call) => call[0].idempotencyKey);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[0]).toBeTruthy();

    const finalOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(finalOrder.idempotencyKeyCapture).toBe(keys[0]);
    expect(finalOrder.status).toBe("RELEASED");
  });

  it("reintentar sobre una orden ya con idempotencyKeyCapture reutiliza la misma key", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    userIds.push(seller.id, buyer.id);
    const listing = await createTestListing(seller.id);
    const order = await createTestOrder({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
    });

    await captureOrder(order.id);
    const firstKey = vi.mocked(capturePayment).mock.calls[0][0].idempotencyKey;

    // Ya está RELEASED, así que un segundo llamado tiene que fallar por
    // estado — pero si alguna vez se permitiera reintentar, tiene que ser
    // con la misma key, nunca una nueva.
    await expect(captureOrder(order.id)).rejects.toThrow();

    const finalOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(finalOrder.idempotencyKeyCapture).toBe(firstKey);
  });

  it("marca la orden EXPIRED (sin llamar a Mercado Pago) si se pasó el deadline de 7 días", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    userIds.push(seller.id, buyer.id);
    const listing = await createTestListing(seller.id);
    const order = await createTestOrder({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
      captureDeadlineAt: new Date(Date.now() - 1000), // ya vencido
    });

    await expect(captureOrder(order.id)).rejects.toThrow(OrderExpiredError);
    expect(capturePayment).not.toHaveBeenCalled();

    const [finalOrder, finalListing] = await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
      prisma.listing.findUniqueOrThrow({ where: { id: listing.id } }),
    ]);
    expect(finalOrder.status).toBe("EXPIRED");
    // El vendedor tiene que poder volver a vender la misma entrada.
    expect(finalListing.status).toBe("ACTIVE");
  });
});

describe("finalizeReleasedOrder — idempotencia del ledger de comisiones", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    await cleanupUsers(userIds);
    userIds.length = 0;
  });

  it("llamarla dos veces para la misma orden no duplica la fila del ledger", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    userIds.push(seller.id, buyer.id);
    const listing = await createTestListing(seller.id);
    const order = await createTestOrder({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
    });

    await finalizeReleasedOrder(order);
    await finalizeReleasedOrder(order); // ej. el webhook reconciliando algo que el capture ya hizo

    const entries = await prisma.commissionLedgerEntry.findMany({
      where: { orderId: order.id },
    });
    expect(entries).toHaveLength(1);
    expect(entries[0].totalFeeArs).toBe(order.buyerFeeArs + order.sellerFeeArs);
  });
});
