import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { deleteFile, readFile, saveFile } from "@/lib/storage";
import { notifyOrderEvent } from "@/lib/email";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB — de sobra para un PDF/QR de entrada.
const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export class DeliveryError extends Error {}

/**
 * El vendedor sube el archivo/código de la entrada. Calcula el hash del
 * contenido y lo compara contra el de cualquier OTRA orden ya entregada —
 * es la defensa contra vender la misma entrada dos veces subiendo el mismo
 * PDF/QR en dos ventas distintas.
 */
export async function uploadDelivery(input: {
  orderId: string;
  sellerId: string;
  fileName: string;
  contentType: string;
  data: Buffer;
}) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: input.orderId },
    include: { delivery: true },
  });

  if (order.sellerId !== input.sellerId) {
    throw new DeliveryError("No sos el vendedor de esta orden.");
  }
  if (order.status !== "PAYMENT_HELD" && order.status !== "DELIVERED") {
    throw new DeliveryError(
      "Esta orden no está en un estado que permita subir la entrada.",
    );
  }
  if (order.downloadedAt) {
    throw new DeliveryError(
      "El comprador ya descargó la entrada — no se puede reemplazar el archivo.",
    );
  }
  if (!ALLOWED_CONTENT_TYPES.has(input.contentType)) {
    throw new DeliveryError("Formato no admitido. Subí un PDF, PNG, JPG o WEBP.");
  }
  if (input.data.length === 0) {
    throw new DeliveryError("El archivo está vacío.");
  }
  if (input.data.length > MAX_FILE_SIZE_BYTES) {
    throw new DeliveryError("El archivo es demasiado grande (máximo 8MB).");
  }

  const fileHash = createHash("sha256").update(input.data).digest("hex");

  const duplicate = await prisma.deliveryFile.findFirst({
    where: { fileHash, orderId: { not: input.orderId } },
  });
  if (duplicate) {
    throw new DeliveryError(
      "Ese mismo archivo ya se usó para entregar otra entrada — no se puede reutilizar.",
    );
  }

  const storageKey = await saveFile(input.data, input.contentType);

  await prisma.$transaction([
    prisma.deliveryFile.upsert({
      where: { orderId: input.orderId },
      create: {
        orderId: input.orderId,
        storageKey,
        fileName: input.fileName,
        contentType: input.contentType,
        sizeBytes: input.data.length,
        fileHash,
      },
      update: {
        storageKey,
        fileName: input.fileName,
        contentType: input.contentType,
        sizeBytes: input.data.length,
        fileHash,
        uploadedAt: new Date(),
      },
    }),
    prisma.order.update({
      where: { id: input.orderId },
      data: {
        status: "DELIVERED",
        deliveredAt: order.deliveredAt ?? new Date(),
      },
    }),
  ]);

  // Best-effort: si había un archivo previo (re-subida), borrar el blob
  // viejo ahora que el nuevo ya quedó guardado. Si esto falla no revierte
  // nada — solo queda un blob huérfano que se puede limpiar después.
  if (order.delivery) {
    await deleteFile(order.delivery.storageKey);
  }

  await notifyOrderEvent("delivery-ready", input.orderId, { to: "buyer" });
}

/**
 * El comprador descarga la entrada. La primera descarga dispara la
 * ventana de liberación automática (RELEASE_TIMEOUT_HOURS, 24hs por
 * defecto) — el comprador sigue pudiendo reclamar durante esa ventana
 * aunque ya haya descargado (ver openDispute, sin restricción por
 * downloadedAt a propósito: descargar es para poder revisar la entrada,
 * no una renuncia a reclamar). El pago se libera con lo que pase
 * primero: un admin lo libera a mano, o se cumple la ventana sin
 * reclamo abierto (worker de /api/cron/capture-orders).
 */
export async function getDeliveryForDownload(input: {
  orderId: string;
  buyerId: string;
}) {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: input.orderId },
    include: { delivery: true },
  });

  if (order.buyerId !== input.buyerId) {
    throw new DeliveryError("No sos el comprador de esta orden.");
  }
  if (!order.delivery) {
    throw new DeliveryError("Todavía no se subió la entrada para esta orden.");
  }

  const file = await readFile(order.delivery.storageKey);
  if (!file) {
    throw new DeliveryError("No se encontró el archivo de la entrega.");
  }

  if (!order.downloadedAt) {
    const timeoutHours = Number(process.env.RELEASE_TIMEOUT_HOURS ?? "24");
    const downloadedAt = new Date();
    const releaseDueAt = new Date(
      downloadedAt.getTime() + timeoutHours * 60 * 60 * 1000,
    );
    await prisma.order.update({
      where: { id: order.id },
      data: { downloadedAt, releaseDueAt },
    });

    await notifyOrderEvent("delivery-downloaded", order.id, { to: "seller" });
  }

  return { file, fileName: order.delivery.fileName };
}
