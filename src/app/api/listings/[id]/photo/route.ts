import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { readFile } from "@/lib/storage";

/**
 * Foto de una publicación — pública a propósito (se muestra en /listings y
 * en el detalle de la entrada sin necesidad de estar logueado), a
 * diferencia de la entrega de la entrada en sí (esa es privada y
 * gateada por sesión, ver /api/orders/[id]/download).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const listing = await prisma.listing.findUnique({
    where: { id },
    select: { photoStorageKey: true },
  });

  if (!listing?.photoStorageKey) {
    return NextResponse.json({ error: "No hay foto para esta publicación." }, { status: 404 });
  }

  const file = await readFile(listing.photoStorageKey);
  if (!file) {
    return NextResponse.json({ error: "No se encontró el archivo." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.data.length),
      "Cache-Control": "public, max-age=86400",
    },
  });
}
