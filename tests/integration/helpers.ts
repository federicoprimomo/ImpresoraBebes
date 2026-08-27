import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

/**
 * Fixtures mínimas para los tests de integración. Todo lo que crean estas
 * funciones se borra explícitamente con cleanupUsers() al final de cada
 * test — no hay una base de test separada, esto corre contra la misma
 * DATABASE_URL que el desarrollo local, así que hay que dejarla como estaba.
 */

let counter = 0;
function unique(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${randomUUID().slice(0, 8)}`;
}

export async function createTestUser() {
  return prisma.user.create({
    data: { email: `${unique("test-user")}@example.com`, name: "Test User" },
  });
}

export async function createTestListing(
  sellerId: string,
  overrides: Partial<{ priceArs: number; status: "ACTIVE" | "RESERVED" | "SOLD" | "CANCELLED" }> = {},
) {
  return prisma.listing.create({
    data: {
      sellerId,
      title: unique("Entrada de test"),
      description: "Fixture de test de integración",
      priceArs: overrides.priceArs ?? 1000000,
      status: overrides.status ?? "ACTIVE",
    },
  });
}

export async function createConnectedAccount(userId: string) {
  return prisma.connectedAccount.create({
    data: {
      userId,
      accessTokenEnc: "fixture-no-real-token",
      refreshTokenEnc: "fixture-no-real-token",
      status: "CONNECTED",
    },
  });
}

export async function createTestOrder(input: {
  listingId: string;
  buyerId: string;
  sellerId: string;
  amountArs?: number;
  buyerFeeArs?: number;
  sellerFeeArs?: number;
  sellerPayoutArs?: number;
  status?:
    | "PENDING_PAYMENT"
    | "PAYMENT_HELD"
    | "DELIVERED"
    | "DISPUTED"
    | "RELEASED"
    | "EXPIRED";
  mpPaymentId?: string;
  captureDeadlineAt?: Date;
  downloadedAt?: Date;
}) {
  return prisma.order.create({
    data: {
      listingId: input.listingId,
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      amountArs: input.amountArs ?? 1040000,
      buyerFeeArs: input.buyerFeeArs ?? 40000,
      sellerFeeArs: input.sellerFeeArs ?? 40000,
      sellerPayoutArs: input.sellerPayoutArs ?? 960000,
      payerEmail: "buyer-fixture@example.com",
      status: input.status ?? "PAYMENT_HELD",
      mpPaymentId: input.mpPaymentId ?? `mp-${unique("payment")}`,
      captureDeadlineAt:
        input.captureDeadlineAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      downloadedAt: input.downloadedAt,
      idempotencyKeyCreate: randomUUID(),
    },
  });
}

/** Borra en el orden correcto para no chocar con las foreign keys. */
export async function cleanupUsers(userIds: string[]) {
  const orders = await prisma.order.findMany({
    where: { OR: [{ buyerId: { in: userIds } }, { sellerId: { in: userIds } }] },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);

  if (orderIds.length > 0) {
    const deliveryFiles = await prisma.deliveryFile.findMany({
      where: { orderId: { in: orderIds } },
      select: { storageKey: true },
    });

    await prisma.dispute.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.deliveryFile.deleteMany({ where: { orderId: { in: orderIds } } });
    if (deliveryFiles.length > 0) {
      await prisma.fileBlob.deleteMany({
        where: { key: { in: deliveryFiles.map((f) => f.storageKey) } },
      });
    }
    await prisma.commissionLedgerEntry.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.invoice.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  }

  await prisma.listing.deleteMany({ where: { sellerId: { in: userIds } } });
  await prisma.connectedAccount.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
