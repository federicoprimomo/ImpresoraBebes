import { randomUUID } from "node:crypto";

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/prisma";
import { cleanupUsers, createConnectedAccount, createTestListing, createTestUser } from "./helpers";

const authMock = vi.fn();
vi.mock("@/auth", () => ({ auth: authMock }));

const createReservePaymentMock = vi.fn();
vi.mock("@/lib/mercadopago", () => ({
  createReservePayment: createReservePaymentMock,
}));

// getSellerAccessToken se mockea para no depender de desencriptar un token
// real — el chequeo de "vendedor conectado" que importa para esta prueba
// (reserva de la publicación) ya pasa por el ConnectedAccount real de la
// fixture, no por esta función.
vi.mock("@/lib/connected-account", () => ({
  getSellerAccessToken: vi.fn().mockResolvedValue("fixture-access-token"),
  SellerNotConnectedError: class SellerNotConnectedError extends Error {},
}));

const { POST } = await import("@/app/api/orders/route");

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/orders — condición de carrera al reservar la publicación", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    await cleanupUsers(userIds);
    userIds.length = 0;
    authMock.mockReset();
    createReservePaymentMock.mockReset();
  });

  it("dos compradores casi simultáneos: solo uno reserva, el otro recibe 409", async () => {
    const seller = await createTestUser();
    const buyerA = await createTestUser();
    const buyerB = await createTestUser();
    userIds.push(seller.id, buyerA.id, buyerB.id);
    await createConnectedAccount(seller.id);
    const listing = await createTestListing(seller.id, { priceArs: 1000000 });

    authMock
      .mockResolvedValueOnce({ user: { id: buyerA.id, email: "a@example.com", role: "USER" } })
      .mockResolvedValueOnce({ user: { id: buyerB.id, email: "b@example.com", role: "USER" } });

    createReservePaymentMock.mockResolvedValue({
      id: randomUUID(),
      status: "authorized",
      status_detail: "accredited",
    });

    const body = {
      listingId: listing.id,
      cardToken: "fixture-card-token",
      paymentMethodId: "visa",
      installments: 1,
      payerEmail: "buyer@example.com",
    };

    const [responseA, responseB] = await Promise.all([
      POST(buildRequest(body)),
      POST(buildRequest(body)),
    ]);

    const statuses = [responseA.status, responseB.status].sort();
    // Uno gana la reserva (200), el otro llega tarde y la entrada ya no
    // está disponible (409) — nunca los dos ganan.
    expect(statuses).toEqual([200, 409]);

    // Mercado Pago solo se llamó una vez: el que perdió la reserva ni
    // intenta autorizar un pago.
    expect(createReservePaymentMock).toHaveBeenCalledTimes(1);

    const finalListing = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(finalListing.status).toBe("RESERVED");

    const orders = await prisma.order.findMany({ where: { listingId: listing.id } });
    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe("PAYMENT_HELD");
  });

  it("si Mercado Pago rechaza el pago, la publicación vuelve a ACTIVE", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    userIds.push(seller.id, buyer.id);
    await createConnectedAccount(seller.id);
    const listing = await createTestListing(seller.id);

    authMock.mockResolvedValueOnce({ user: { id: buyer.id, email: "b@example.com", role: "USER" } });
    createReservePaymentMock.mockResolvedValueOnce({
      id: randomUUID(),
      status: "rejected",
      status_detail: "cc_rejected_insufficient_amount",
    });

    const response = await POST(
      buildRequest({
        listingId: listing.id,
        cardToken: "fixture-card-token",
        paymentMethodId: "visa",
        installments: 1,
        payerEmail: "buyer@example.com",
      }),
    );

    expect(response.status).toBe(402);
    const finalListing = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
    expect(finalListing.status).toBe("ACTIVE");
  });
});
