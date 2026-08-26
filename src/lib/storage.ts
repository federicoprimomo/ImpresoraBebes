import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

/**
 * Backend de storage de archivos. La interfaz es intencionalmente mínima
 * (guardar/leer/borrar por una key opaca) para poder reemplazar la
 * implementación por un storage de objetos real (S3, R2, etc.) sin tocar
 * el resto del código — hoy el archivo vive en la base (tabla FileBlob),
 * que alcanza sobra para el tamaño de un PDF/QR de entrada.
 */

export async function saveFile(data: Buffer, contentType: string): Promise<string> {
  const key = randomUUID();
  // Prisma tipa `Bytes` como Uint8Array<ArrayBuffer> — un Buffer normal no
  // siempre matchea exacto en TS estricto, así que lo normalizamos acá.
  const bytes = new Uint8Array(data);
  await prisma.fileBlob.create({ data: { key, data: bytes, contentType } });
  return key;
}

export async function readFile(
  key: string,
): Promise<{ data: Buffer; contentType: string } | null> {
  const blob = await prisma.fileBlob.findUnique({ where: { key } });
  if (!blob) return null;
  return { data: Buffer.from(blob.data), contentType: blob.contentType };
}

export async function deleteFile(key: string): Promise<void> {
  await prisma.fileBlob.delete({ where: { key } }).catch(() => {
    // no-op si ya no existe
  });
}
