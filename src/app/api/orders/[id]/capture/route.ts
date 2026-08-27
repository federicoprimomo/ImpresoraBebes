import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import {
  captureOrder,
  OrderExpiredError,
  OrderNotCapturableError,
} from "@/lib/capture-order";
import { captureError } from "@/lib/monitoring";

/**
 * Captura manual, para uso de un admin (ej. resolver una disputa a favor
 * del vendedor, o destrabar una orden en pruebas). El worker automático de
 * timeouts vive en /api/cron/capture-orders y llama a la misma lógica.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await params;

  try {
    const order = await captureOrder(id);
    return NextResponse.json({ orderId: order.id, status: order.status });
  } catch (error) {
    if (error instanceof OrderNotCapturableError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof OrderExpiredError) {
      return NextResponse.json({ error: error.message }, { status: 410 });
    }
    console.error("Error en captura manual", error);
    captureError(error, { orderId: id });
    return NextResponse.json(
      { error: "No pudimos capturar el pago." },
      { status: 502 },
    );
  }
}
