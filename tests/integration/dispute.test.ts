import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { cancelPayment, capturePayment } from "@/lib/mercadopago";
import { DisputeError, openDispute, resolveDispute } from "@/lib/dispute";
import { cleanupUsers, createTestListing, createTestOrder, createTestUser } from "./helpers";

vi.mock("@/lib/connected-account", () => ({
  getSellerAccessToken: vi.fn().mockResolvedValue("fixture-access-token"),
}));

vi.mock("@/lib/mercadopago", () => ({
  capturePayment: vi.fn().mockResolvedValue({ status: "approved", captured: true, id: 999 }),
  cancelPayment: vi.fn().mockResolvedValue({ status: "cancelled" }),
  extractSettlementInfo: vi.fn().mockReturnValue({ mpFeeArs: null, netReceivedArs: null }),
}));

describe("openDispute", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    await cleanupUsers(userIds);
    userIds.length = 0;
  });

  it("deja la orden en DISPUTED y crea la fila del reclamo", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    userIds.push(seller.id, buyer.id);
    const listing = await createTestListing(seller.id);
    const order = await createTestOrder({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
    });

    await openDispute({ orderId: order.id, buyerId: buyer.id, reason: "No llegó la entrada" });

    const [finalOrder, dispute] = await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
      prisma.dispute.findUniqueOrThrow({ where: { orderId: order.id } }),
    ]);
    expect(finalOrder.status).toBe("DISPUTED");
    expect(dispute.status).toBe("OPEN");
    expect(dispute.reason).toBe("No llegó la entrada");
  });

  it("no deja abrir un segundo reclamo sobre la misma orden", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    userIds.push(seller.id, buyer.id);
    const listing = await createTestListing(seller.id);
    const order = await createTestOrder({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
    });

    await openDispute({ orderId: order.id, buyerId: buyer.id, reason: "Primero" });
    await expect(
      openDispute({ orderId: order.id, buyerId: buyer.id, reason: "Segundo" }),
    ).rejects.toThrow(DisputeError);
  });

  it("no deja abrir un reclamo si no sos el comprador de esa orden", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const otroUsuario = await createTestUser();
    userIds.push(seller.id, buyer.id, otroUsuario.id);
    const listing = await createTestListing(seller.id);
    const order = await createTestOrder({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
    });

    await expect(
      openDispute({ orderId: order.id, buyerId: otroUsuario.id, reason: "No soy yo" }),
    ).rejects.toThrow(DisputeError);
  });
});

describe("resolveDispute", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    await cleanupUsers(userIds);
    userIds.length = 0;
    vi.mocked(capturePayment).mockClear();
    vi.mocked(cancelPayment).mockClear();
  });

  it("RELEASE: captura el pago y marca el reclamo RESOLVED_RELEASE", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const admin = await createTestUser();
    userIds.push(seller.id, buyer.id, admin.id);
    const listing = await createTestListing(seller.id);
    const order = await createTestOrder({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
    });
    await openDispute({ orderId: order.id, buyerId: buyer.id, reason: "Duda" });

    await resolveDispute({
      orderId: order.id,
      adminId: admin.id,
      resolution: "RELEASE",
      note: "Se verificó la entrega",
    });

    expect(capturePayment).toHaveBeenCalledTimes(1);
    const [finalOrder, dispute] = await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
      prisma.dispute.findUniqueOrThrow({ where: { orderId: order.id } }),
    ]);
    expect(finalOrder.status).toBe("RELEASED");
    expect(dispute.status).toBe("RESOLVED_RELEASE");
    expect(dispute.resolution).toBe("Se verificó la entrega");
  });

  it("REFUND: cancela la autorización, marca la orden REFUNDED y la publicación CANCELLED", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const admin = await createTestUser();
    userIds.push(seller.id, buyer.id, admin.id);
    const listing = await createTestListing(seller.id);
    const order = await createTestOrder({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
    });
    await openDispute({ orderId: order.id, buyerId: buyer.id, reason: "Entrada inválida" });

    await resolveDispute({ orderId: order.id, adminId: admin.id, resolution: "REFUND" });

    expect(cancelPayment).toHaveBeenCalledTimes(1);
    expect(capturePayment).not.toHaveBeenCalled();

    const [finalOrder, finalListing, dispute] = await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
      prisma.listing.findUniqueOrThrow({ where: { id: listing.id } }),
      prisma.dispute.findUniqueOrThrow({ where: { orderId: order.id } }),
    ]);
    expect(finalOrder.status).toBe("REFUNDED");
    // A propósito no vuelve a ACTIVE — hubo un reclamo de por medio.
    expect(finalListing.status).toBe("CANCELLED");
    expect(dispute.status).toBe("RESOLVED_REFUND");
  });

  it("no deja resolver una orden sin reclamo abierto", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const admin = await createTestUser();
    userIds.push(seller.id, buyer.id, admin.id);
    const listing = await createTestListing(seller.id);
    const order = await createTestOrder({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
    });

    await expect(
      resolveDispute({ orderId: order.id, adminId: admin.id, resolution: "RELEASE" }),
    ).rejects.toThrow(DisputeError);
  });
});
