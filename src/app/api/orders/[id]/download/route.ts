import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { DeliveryError, getDeliveryForDownload } from "@/lib/delivery";
import { captureError } from "@/lib/monitoring";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    // A propósito NO se arma con `new URL(path, request.url)`: adentro del
    // contenedor, detrás del proxy de Coolify, request.url refleja el host
    // interno, no el dominio público. Mismo motivo que oauth/callback.
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  const { id } = await params;

  try {
    const { file, fileName } = await getDeliveryForDownload({
      orderId: id,
      buyerId: session.user.id,
    });

    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Length": String(file.data.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof DeliveryError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error descargando la entrega", error);
    captureError(error, { orderId: id });
    return NextResponse.json(
      { error: "No pudimos descargar el archivo." },
      { status: 500 },
    );
  }
}
