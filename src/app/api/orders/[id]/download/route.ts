import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { DeliveryError, getDeliveryForDownload } from "@/lib/delivery";
import { captureError } from "@/lib/monitoring";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", request.url));
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
