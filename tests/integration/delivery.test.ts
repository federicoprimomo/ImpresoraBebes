import { afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";
import { DeliveryError, getDeliveryForDownload, uploadDelivery } from "@/lib/delivery";
import { cleanupUsers, createTestListing, createTestOrder, createTestUser } from "./helpers";

const PDF_BYTES = Buffer.from("%PDF-1.4 contenido de prueba");

describe("uploadDelivery", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    await cleanupUsers(userIds);
    userIds.length = 0;
  });

  it("sube el archivo y deja la orden en DELIVERED", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    userIds.push(seller.id, buyer.id);
    const listing = await createTestListing(seller.id);
    const order = await createTestOrder({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
    });

    await uploadDelivery({
      orderId: order.id,
      sellerId: seller.id,
      fileName: "entrada.pdf",
      contentType: "application/pdf",
      data: PDF_BYTES,
    });

    const [finalOrder, delivery] = await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
      prisma.deliveryFile.findUniqueOrThrow({ where: { orderId: order.id } }),
    ]);
    expect(finalOrder.status).toBe("DELIVERED");
    expect(delivery.fileName).toBe("entrada.pdf");
  });

  it("rechaza si el mismo archivo ya se usó en otra orden (misma entrada revendida)", async () => {
    const seller = await createTestUser();
    const buyerA = await createTestUser();
    const buyerB = await createTestUser();
    userIds.push(seller.id, buyerA.id, buyerB.id);
    const listingA = await createTestListing(seller.id);
    const listingB = await createTestListing(seller.id);
    const orderA = await createTestOrder({
      listingId: listingA.id,
      buyerId: buyerA.id,
      sellerId: seller.id,
    });
    const orderB = await createTestOrder({
      listingId: listingB.id,
      buyerId: buyerB.id,
      sellerId: seller.id,
    });

    await uploadDelivery({
      orderId: orderA.id,
      sellerId: seller.id,
      fileName: "entrada.pdf",
      contentType: "application/pdf",
      data: PDF_BYTES,
    });

    await expect(
      uploadDelivery({
        orderId: orderB.id,
        sellerId: seller.id,
        fileName: "entrada-copia.pdf",
        contentType: "application/pdf",
        data: PDF_BYTES, // mismo contenido exacto
      }),
    ).rejects.toThrow(DeliveryError);

    const deliveryB = await prisma.deliveryFile.findUnique({ where: { orderId: orderB.id } });
    expect(deliveryB).toBeNull();
  });

  it("no deja subir si no sos el vendedor de esa orden", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const otroVendedor = await createTestUser();
    userIds.push(seller.id, buyer.id, otroVendedor.id);
    const listing = await createTestListing(seller.id);
    const order = await createTestOrder({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
    });

    await expect(
      uploadDelivery({
        orderId: order.id,
        sellerId: otroVendedor.id,
        fileName: "entrada.pdf",
        contentType: "application/pdf",
        data: PDF_BYTES,
      }),
    ).rejects.toThrow(DeliveryError);
  });

  it("rechaza un content-type no admitido", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    userIds.push(seller.id, buyer.id);
    const listing = await createTestListing(seller.id);
    const order = await createTestOrder({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
    });

    await expect(
      uploadDelivery({
        orderId: order.id,
        sellerId: seller.id,
        fileName: "entrada.exe",
        contentType: "application/x-msdownload",
        data: PDF_BYTES,
      }),
    ).rejects.toThrow(DeliveryError);
  });
});

describe("getDeliveryForDownload", () => {
  const userIds: string[] = [];

  afterEach(async () => {
    await cleanupUsers(userIds);
    userIds.length = 0;
  });

  it("la primera descarga fija downloadedAt y releaseDueAt", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    userIds.push(seller.id, buyer.id);
    const listing = await createTestListing(seller.id);
    const order = await createTestOrder({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
    });
    await uploadDelivery({
      orderId: order.id,
      sellerId: seller.id,
      fileName: "entrada.pdf",
      contentType: "application/pdf",
      data: PDF_BYTES,
    });

    const result = await getDeliveryForDownload({ orderId: order.id, buyerId: buyer.id });
    expect(result.fileName).toBe("entrada.pdf");
    expect(result.file.data.equals(PDF_BYTES)).toBe(true);

    const finalOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(finalOrder.downloadedAt).not.toBeNull();
    expect(finalOrder.releaseDueAt).not.toBeNull();
  });

  it("una segunda descarga NO corre de nuevo el reloj de releaseDueAt", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    userIds.push(seller.id, buyer.id);
    const listing = await createTestListing(seller.id);
    const order = await createTestOrder({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
    });
    await uploadDelivery({
      orderId: order.id,
      sellerId: seller.id,
      fileName: "entrada.pdf",
      contentType: "application/pdf",
      data: PDF_BYTES,
    });

    await getDeliveryForDownload({ orderId: order.id, buyerId: buyer.id });
    const afterFirst = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });

    await getDeliveryForDownload({ orderId: order.id, buyerId: buyer.id });
    const afterSecond = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });

    expect(afterSecond.releaseDueAt?.getTime()).toBe(afterFirst.releaseDueAt?.getTime());
  });

  it("no deja descargar si no sos el comprador", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    const otroComprador = await createTestUser();
    userIds.push(seller.id, buyer.id, otroComprador.id);
    const listing = await createTestListing(seller.id);
    const order = await createTestOrder({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
    });
    await uploadDelivery({
      orderId: order.id,
      sellerId: seller.id,
      fileName: "entrada.pdf",
      contentType: "application/pdf",
      data: PDF_BYTES,
    });

    await expect(
      getDeliveryForDownload({ orderId: order.id, buyerId: otroComprador.id }),
    ).rejects.toThrow(DeliveryError);
  });

  it("tira si todavía no se subió ninguna entrega", async () => {
    const seller = await createTestUser();
    const buyer = await createTestUser();
    userIds.push(seller.id, buyer.id);
    const listing = await createTestListing(seller.id);
    const order = await createTestOrder({
      listingId: listing.id,
      buyerId: buyer.id,
      sellerId: seller.id,
    });

    await expect(
      getDeliveryForDownload({ orderId: order.id, buyerId: buyer.id }),
    ).rejects.toThrow(DeliveryError);
  });
});
